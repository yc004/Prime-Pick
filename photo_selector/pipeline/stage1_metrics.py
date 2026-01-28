
import os
import glob
import logging
import time
import concurrent.futures
from typing import List, Tuple, Dict, Any

from photo_selector.config import default_config
from photo_selector.pipeline.models import MetricsResult, SharpnessResult, ExposureResult
from photo_selector.io.image_reader import read_and_resize
from photo_selector.metrics.sharpness import compute_sharpness
from photo_selector.metrics.exposure import compute_exposure
from photo_selector.io.cache_sqlite import CacheSQLite
from photo_selector.io.results_writer import write_results

logger = logging.getLogger(__name__)

def process_image(file_path: str) -> MetricsResult:
    """
    Worker function to process a single image.
    Must be top-level for pickling.
    """
    try:
        # 1. Read Image (Downsampled)
        img = read_and_resize(file_path, default_config.DEFAULT_LONG_EDGE)
        
        if img is None:
            return MetricsResult(
                filename=file_path, 
                is_unusable=True, 
                reasons=["Read Error"]
            )
            
        # 2. Compute Metrics
        sharpness_res = compute_sharpness(img)
        exposure_res = compute_exposure(img)
        
        # 3. Calculate Technical Score
        # Normalize sharpness: if score == threshold -> 60 pts (Passing grade)
        # Cap at 2.0x threshold -> 100 pts?
        # Let's adjust:
        # threshold = 100. score 100 -> 60pts. score 0 -> 0pts. score 200 -> 100pts.
        # Formula: (score / threshold) * 60. Max 100.
        sharpness_norm = min((sharpness_res.score / default_config.SHARPNESS_THRESHOLD), 2.0)
        sharpness_contrib = sharpness_norm * 50 # Base contribution (0-100)
        
        exposure_contrib = exposure_res.score # 0-100
        
        final_score = (
            sharpness_contrib * default_config.WEIGHT_SHARPNESS + 
            exposure_contrib * default_config.WEIGHT_EXPOSURE
        )
        
        # Flags
        reasons = []
        if sharpness_res.is_blurry:
            reasons.append("Blurry")
        reasons.extend(exposure_res.flags)
        
        is_unusable = False
        
        # --- PENALTY SYSTEM ---
        # Strictly penalize problems to ensure they don't get high ratings
        
        if sharpness_res.is_blurry:
            # If blurry, cap the score significantly.
            # A blurry photo should rarely be above 2 stars (40 pts)
            # FORCE LOW SCORE to ensure it is marked as unusable (<30)
            final_score = min(final_score, 25.0)
            
        if "underexposed" in reasons or "overexposed" in reasons:
            # Major exposure issues, cap at 3 stars (60 pts)
            final_score = min(final_score, 55.0)
            
        if "Read Error" in reasons or "Exception" in reasons:
            final_score = 0
            is_unusable = True
            
        # Define unusable condition
        if final_score < 30:
            is_unusable = True
            if "Low Score" not in reasons:
                reasons.append("Low Score")
            
        return MetricsResult(
            filename=file_path,
            sharpness=sharpness_res,
            exposure=exposure_res,
            technical_score=final_score,
            is_unusable=is_unusable,
            reasons=reasons
        )
        
    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        return MetricsResult(
            filename=file_path,
            is_unusable=True,
            reasons=[f"Exception: {str(e)}"]
        )

def run_stage1(
    input_dir: str, 
    output_csv: str, 
    workers: int, 
    rebuild_cache: bool = False,
    progress_callback = None
) -> List[MetricsResult]:
    
    start_time = time.time()
    
    # 1. Discovery
    # Support jpg, jpeg, JPG, JPEG
    extensions = ['*.jpg', '*.JPG', '*.jpeg', '*.JPEG']
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(input_dir, ext)))
    
    files = sorted(list(set(files))) # Remove duplicates if any
    total_files = len(files)
    logger.info(f"Found {total_files} images in {input_dir}")
    
    if total_files == 0:
        return []
        
    # 2. Cache Init
    cache = CacheSQLite()
    
    # 3. Cache Check & Task Distribution
    tasks = [] # (file_path, signature)
    results = []
    
    hits = 0
    
    for fpath in files:
        signature = CacheSQLite.generate_signature(fpath, default_config.DEFAULT_LONG_EDGE)
        
        cached_data = None
        if not rebuild_cache:
            cached_data = cache.get(signature)
            
        if cached_data:
            # Cache Hit
            try:
                res = MetricsResult.from_dict(cached_data)
                # Ensure filename matches (it should, but signature includes path)
                if res.filename != fpath:
                    res.filename = fpath
                results.append(res)
                hits += 1
            except Exception as e:
                logger.warning(f"Cache data corrupted for {fpath}, recomputing.")
                tasks.append((fpath, signature))
        else:
            # Cache Miss
            tasks.append((fpath, signature))
            
    logger.info(f"Cache hits: {hits}/{total_files}. Tasks to run: {len(tasks)}")
    
    # 4. Parallel Execution
    if tasks:
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
            # Map tasks
            # We need to map only file paths
            task_paths = [t[0] for t in tasks]
            task_signatures = [t[1] for t in tasks]
            
            # Submit
            # We use map for simplicity, or submit for order control. Map is fine.
            # process_image is pure.
            
            # Show progress?
            logger.info(f"Starting execution with {workers} workers...")
            
            futures = {executor.submit(process_image, p): (p, sig) for p, sig in zip(task_paths, task_signatures)}
            
            completed_count = 0
            for future in concurrent.futures.as_completed(futures):
                path, sig = futures[future]
                try:
                    res = future.result()
                    results.append(res)
                    
                    # Write to cache
                    # Note: Writing to sqlite from main process is safe
                    cache.put(sig, res.to_dict())
                    
                except Exception as e:
                    logger.error(f"Worker exception for {path}: {e}")
                
                completed_count += 1
                if progress_callback:
                    progress_callback(completed_count, len(tasks))
                
                if completed_count % 10 == 0:
                    logger.info(f"Progress: {completed_count}/{len(tasks)}")

    # 5. Output
    write_results(results, output_csv)
    cache.close()
    
    duration = time.time() - start_time
    logger.info(f"Stage 1 completed in {duration:.2f}s. Average: {duration/total_files:.3f}s/img")
    
    return results
