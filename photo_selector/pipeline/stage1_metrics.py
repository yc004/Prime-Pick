
import os
import glob
import logging
import time
import concurrent.futures
from typing import List, Tuple, Dict, Any, Optional

from photo_selector.config import default_config
from photo_selector.pipeline.models import MetricsResult, SharpnessResult, ExposureResult
from photo_selector.io.image_reader import read_and_resize
from photo_selector.metrics.sharpness import compute_sharpness
from photo_selector.metrics.exposure import compute_exposure, score_exposure_from_stats
from photo_selector.metrics.emotions import EmotionDetector
from photo_selector.io.cache_sqlite import CacheSQLite
from photo_selector.io.results_writer import write_results
from photo_selector.io.photo_time import get_capture_timestamp

logger = logging.getLogger(__name__)

def _emotion_model_path() -> str:
    return os.path.join(os.path.dirname(os.path.dirname(__file__)), "models", "emotion-ferplus-8.onnx")

def _apply_emotion_adjustment(base_score: float, emotion_score: float) -> float:
    adjusted = float(base_score + (float(emotion_score) - 50.0) * 0.2)
    return float(max(0.0, min(100.0, adjusted)))

def _compute_emotion_from_image(img) -> Tuple[Optional[str], Optional[float]]:
    try:
        model_path = _emotion_model_path()
        detector = EmotionDetector.get_instance(model_path)
        res = detector.detect_with_score(img)
        if not res:
            return None, None
        emotion, score, _conf = res
        return (str(emotion), float(score)) if emotion else (None, None)
    except Exception:
        return None, None

def score_result(sharpness_res: SharpnessResult, exposure_res: ExposureResult):
    sharpness_norm = min((sharpness_res.score / default_config.SHARPNESS_THRESHOLD), 2.0)
    sharpness_contrib = sharpness_norm * 50
    exposure_contrib = exposure_res.score

    final_score = (
        sharpness_contrib * default_config.WEIGHT_SHARPNESS +
        exposure_contrib * default_config.WEIGHT_EXPOSURE
    )

    reasons: List[str] = []
    if sharpness_res.is_blurry:
        reasons.append("Blurry")
    reasons.extend(exposure_res.flags)

    is_unusable = False

    if sharpness_res.is_blurry:
        final_score = min(final_score, 25.0)

    if "underexposed" in reasons or "overexposed" in reasons:
        final_score = min(final_score, 55.0)

    if "Read Error" in reasons or "Exception" in reasons:
        final_score = 0
        is_unusable = True

    if final_score < 30:
        is_unusable = True
        if "Low Score" not in reasons:
            reasons.append("Low Score")

    return float(final_score), is_unusable, reasons

def rescore_cached_result(res: MetricsResult) -> MetricsResult:
    if res.sharpness:
        res.sharpness.is_blurry = bool(res.sharpness.score < default_config.SHARPNESS_THRESHOLD)

    if res.exposure:
        score, flags = score_exposure_from_stats(
            int(res.exposure.p50),
            float(res.exposure.white_ratio),
            float(res.exposure.black_ratio),
            int(res.exposure.dynamic_range),
        )
        res.exposure.score = score
        res.exposure.flags = flags

    if res.sharpness and res.exposure:
        final_score, is_unusable, reasons = score_result(res.sharpness, res.exposure)
        if res.emotion_score is None:
            try:
                img = read_and_resize(res.filename, min(768, default_config.DEFAULT_LONG_EDGE))
                if img is not None:
                    emotion, emotion_score = _compute_emotion_from_image(img)
                    if emotion:
                        res.emotion = emotion
                    res.emotion_score = emotion_score
            except Exception:
                pass
        if res.emotion_score is not None:
            final_score = _apply_emotion_adjustment(final_score, float(res.emotion_score))
        res.technical_score = final_score
        res.is_unusable = is_unusable
        res.reasons = reasons
    else:
        res.technical_score = 0.0
        res.is_unusable = True
        res.reasons = ["Read Error"]

    return res

def process_image(file_path: str) -> MetricsResult:
    """
    处理单张图像的工作函数。
    必须是顶层函数以便进行 pickle 序列化。
    """
    try:
        capture_ts = get_capture_timestamp(file_path, source="auto")
        # 1. 读取图像（降采样）
        img = read_and_resize(file_path, default_config.DEFAULT_LONG_EDGE)
        
        if img is None:
            return MetricsResult(
                filename=file_path, 
                capture_ts=capture_ts,
                is_unusable=True, 
                reasons=["Read Error"]
            )
            
        # 2. 计算指标
        sharpness_res = compute_sharpness(img)
        exposure_res = compute_exposure(img)

        final_score, is_unusable, reasons = score_result(sharpness_res, exposure_res)
        emotion, emotion_score = _compute_emotion_from_image(img)
        if emotion_score is not None:
            final_score = _apply_emotion_adjustment(final_score, float(emotion_score))

        return MetricsResult(
            filename=file_path,
            sharpness=sharpness_res,
            exposure=exposure_res,
            capture_ts=capture_ts,
            technical_score=final_score,
            is_unusable=is_unusable,
            reasons=reasons,
            emotion=emotion,
            emotion_score=emotion_score
        )
        
    except Exception as e:
        logger.error(f"Error processing {file_path}: {e}")
        return MetricsResult(
            filename=file_path,
            capture_ts=get_capture_timestamp(file_path, source="auto"),
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
    
    # 1. 发现文件
    # 支持 jpg, jpeg, JPG, JPEG
    extensions = ['*.jpg', '*.JPG', '*.jpeg', '*.JPEG']
    files = []
    for ext in extensions:
        files.extend(glob.glob(os.path.join(input_dir, ext)))
    
    files = sorted(list(set(files))) # 移除重复项（如果有）
    total_files = len(files)
    logger.info(f"Found {total_files} images in {input_dir}")
    
    if total_files == 0:
        return []
        
    # 2. 缓存初始化
    cache = CacheSQLite()
    
    # 3. 缓存检查与任务分配
    tasks = [] # (file_path, signature)
    results = []
    
    hits = 0
    
    for fpath in files:
        signature = CacheSQLite.generate_signature(fpath, default_config.DEFAULT_LONG_EDGE)
        
        cached_data = None
        if not rebuild_cache:
            cached_data = cache.get(signature)
            
        if cached_data:
            # 缓存命中
            try:
                res = MetricsResult.from_dict(cached_data)
                # 确保文件名匹配（应该匹配，但签名包含路径）
                if res.filename != fpath:
                    res.filename = fpath
                if not getattr(res, "capture_ts", 0.0):
                    res.capture_ts = get_capture_timestamp(fpath, source="auto")
                res = rescore_cached_result(res)
                results.append(res)
                hits += 1
            except Exception as e:
                logger.warning(f"Cache data corrupted for {fpath}, recomputing.")
                tasks.append((fpath, signature))
        else:
            # 缓存未命中
            tasks.append((fpath, signature))
            
    logger.info(f"Cache hits: {hits}/{total_files}. Tasks to run: {len(tasks)}")
    
    # 4. 并行执行
    if tasks:
        with concurrent.futures.ProcessPoolExecutor(max_workers=workers) as executor:
            # 映射任务
            # 我们只需要映射文件路径
            task_paths = [t[0] for t in tasks]
            task_signatures = [t[1] for t in tasks]
            
            # 提交
            # 我们使用 map 是为了简单，或者使用 submit 来控制顺序。Map 也可以。
            # process_image 是纯函数。
            
            # 显示进度？
            logger.info(f"Starting execution with {workers} workers...")
            
            futures = {executor.submit(process_image, p): (p, sig) for p, sig in zip(task_paths, task_signatures)}
            
            completed_count = 0
            for future in concurrent.futures.as_completed(futures):
                path, sig = futures[future]
                try:
                    res = future.result()
                    res = rescore_cached_result(res)
                    results.append(res)
                    
                    # 写入缓存
                    # 注意：从主进程写入 sqlite 是安全的
                    cache.put(sig, res.to_dict())
                    
                except Exception as e:
                    logger.error(f"Worker exception for {path}: {e}")
                
                completed_count += 1
                if progress_callback:
                    progress_callback(completed_count, len(tasks))
                
                if completed_count % 10 == 0:
                    logger.info(f"Progress: {completed_count}/{len(tasks)}")

    # 5. 输出
    write_results(results, output_csv)
    cache.close()
    
    duration = time.time() - start_time
    logger.info(f"Stage 1 completed in {duration:.2f}s. Average: {duration/total_files:.3f}s/img")
    
    return results
