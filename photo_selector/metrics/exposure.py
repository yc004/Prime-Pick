import cv2
import numpy as np
from photo_selector.pipeline.models import ExposureResult
from photo_selector.config import default_config

def score_exposure_from_stats(p50: int, white_ratio: float, black_ratio: float, dynamic_range: int):
    flags = []
    score = 100.0

    target_mid = 128.0
    mid_dev = abs(float(p50) - target_mid) / target_mid
    score -= min(30.0, mid_dev * 30.0)

    if p50 < default_config.LOW_LIGHT_THRESHOLD:
        flags.append("underexposed")
        score -= 20
    elif p50 > default_config.HIGH_LIGHT_THRESHOLD:
        flags.append("overexposed")
        score -= 20

    if white_ratio > 0.1:
        flags.append("highlight_clipping")
        score -= 20 * (white_ratio * 10)

    if black_ratio > 0.2:
        flags.append("shadow_crushing")
        score -= 10 * (black_ratio * 5)

    if dynamic_range < 50:
        flags.append("low_contrast")
        score -= 10

    return float(max(0.0, score)), flags

def compute_exposure(img: np.ndarray) -> ExposureResult:
    """
    基于亮度计算曝光指标。
    """
    if img is None or img.size == 0:
        return ExposureResult(
            score=0.0,
            p1=0, p5=0, p50=0, p95=0, p99=0,
            white_ratio=0.0, black_ratio=0.0,
            dynamic_range=0,
            flags=["error_empty_image"]
        )

    if len(img.shape) == 3:
        # 转换为 LAB L 通道以获得更好的亮度感知，或者直接使用标准灰度图
        # 灰度图处理更快，通常对于曝光检查已经足够
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    # 百分位数
    p1, p5, p50, p95, p99 = np.percentile(gray, [1, 5, 50, 95, 99])
    
    # 比率
    # 过曝像素（接近 255）
    white_mask = gray >= 250
    white_ratio = np.mean(white_mask)
    
    # 欠曝像素（接近 0）
    black_mask = gray <= 5
    black_ratio = np.mean(black_mask)
    
    dynamic_range = p99 - p1
    
    score, flags = score_exposure_from_stats(int(p50), float(white_ratio), float(black_ratio), int(dynamic_range))
        
    return ExposureResult(
        score=score,
        p1=int(p1),
        p5=int(p5),
        p50=int(p50),
        p95=int(p95),
        p99=int(p99),
        white_ratio=float(white_ratio),
        black_ratio=float(black_ratio),
        dynamic_range=int(dynamic_range),
        flags=flags
    )
