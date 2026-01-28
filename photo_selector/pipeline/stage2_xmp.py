
import os
import csv
import logging
import concurrent.futures
from typing import List, Optional
from photo_selector.pipeline.models import MetricsResult
from photo_selector.lr.xmp_writer import XmpWriter

logger = logging.getLogger(__name__)

def apply_xmp_logic(result: MetricsResult) -> bool:
    """
    Determines what to write and calls XmpWriter.
    Returns True if changed.
    """
    xmp_path_1 = f"{result.filename}.xmp"
    base, _ext = os.path.splitext(result.filename)
    xmp_path_2 = f"{base}.xmp"
    
    # Also support sidecar naming convention: image.xmp (if image.jpg) 
    # But usually image.jpg.xmp is safer to avoid collision if image.raw exists.
    # Adobe prefers image.xmp if image is raw, but for jpg usually sidecar is image.xmp or image.jpg.xmp.
    # To avoid duplicates, we will strictly use the standard sidecar naming: base_filename.xmp
    # e.g. photo.jpg -> photo.xmp
    
    # 强制覆盖逻辑：如果 rating 或 label 发生了变化（即使是缓存结果，也需要确保 XMP 是最新的）
    # XmpWriter 内部会检查值是否一致。如果一致则不写入。
    # 这里我们只负责计算应该写入的值。
    
    # Logic
    rating = 0
    label = None
    keywords = []
    
    # Add reasons as keywords
    for r in result.reasons:
        keywords.append(f"AI/{r}")
        
    if result.is_unusable:
        label = "Red" # Often mapped to Rejected
        rating = 1
    else:
        # Score mapping
        if result.technical_score >= 80:
            rating = 5
            label = "Green"
        elif result.technical_score >= 60:
            rating = 4
        elif result.technical_score >= 40:
            rating = 3
        else:
            rating = 2

    # Write
    return XmpWriter.update_xmp(xmp_path_2, rating, label, keywords)

def run_stage2(
    results: List[MetricsResult], 
    workers: int = 4
):
    logger.info(f"Starting Stage 2 (XMP Writing) with {workers} workers...")
    
    count_updated = 0
    count_skipped = 0
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        # Submit tasks
        future_to_file = {executor.submit(apply_xmp_logic, res): res.filename for res in results}
        
        for future in concurrent.futures.as_completed(future_to_file):
            fpath = future_to_file[future]
            try:
                changed = future.result()
                if changed:
                    count_updated += 1
                else:
                    count_skipped += 1
            except Exception as e:
                logger.error(f"Error writing XMP for {fpath}: {e}")
                
    logger.info(f"Stage 2 Complete. Updated: {count_updated}, Skipped: {count_skipped}")

def load_results_from_csv(csv_path: str) -> List[MetricsResult]:
    results = []
    if not os.path.exists(csv_path):
        logger.error(f"CSV not found: {csv_path}")
        return []
        
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                results.append(MetricsResult.from_dict(row))
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        
    return results
