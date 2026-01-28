
import cv2
import numpy as np
from photo_selector.pipeline.models import ExposureResult
from photo_selector.config import default_config

def compute_exposure(img: np.ndarray) -> ExposureResult:
    """
    Compute exposure metrics based on luminance.
    """
    if len(img.shape) == 3:
        # Convert to LAB L channel for better luminance perception, or just standard Gray
        # Gray is faster and usually sufficient for exposure check
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    # Percentiles
    p1, p5, p50, p95, p99 = np.percentile(gray, [1, 5, 50, 95, 99])
    
    # Ratios
    # Overexposed pixels (near 255)
    white_mask = gray >= 250
    white_ratio = np.mean(white_mask)
    
    # Underexposed pixels (near 0)
    black_mask = gray <= 5
    black_ratio = np.mean(black_mask)
    
    dynamic_range = p99 - p1
    
    # Scoring & Flags
    flags = []
    score = 100.0

    # Continuous mid-tone penalty (adds sensitivity even when not "under/over")
    # Target mid-gray in 8-bit luminance is around 128.
    target_mid = 128.0
    mid_dev = abs(float(p50) - target_mid) / target_mid  # 0..~1
    score -= min(30.0, mid_dev * 30.0)
    
    # Threshold flags (stronger penalties)
    if p50 < default_config.LOW_LIGHT_THRESHOLD:
        flags.append("underexposed")
        score -= 20
    elif p50 > default_config.HIGH_LIGHT_THRESHOLD:
        flags.append("overexposed")
        score -= 20
        
    # Check clipping
    if white_ratio > 0.1: # > 10% blown out
        flags.append("highlight_clipping")
        score -= 20 * (white_ratio * 10)
        
    if black_ratio > 0.2: # > 20% crushed blacks
        flags.append("shadow_crushing")
        score -= 10 * (black_ratio * 5)
        
    if dynamic_range < 50:
        flags.append("low_contrast")
        score -= 10
        
    return ExposureResult(
        score=max(0.0, score),
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
