# photo_selector/metrics_exposure.py
import numpy as np
from .config import Config

def calculate_exposure_metrics(gray_image):
    """
    Calculates detailed exposure metrics based on histogram/percentiles.
    Args:
        gray_image: Grayscale numpy array.
    Returns:
        dict: containing score, flags, and raw metrics.
    """
    if gray_image is None:
        return {
            'exposure_score': 0,
            'p1': 0, 'p5': 0, 'p50': 0, 'p95': 0, 'p99': 0,
            'white_ratio': 0, 'black_ratio': 0, 'dynamic_range': 0,
            'is_overexposed': True, 'is_underexposed': True,
            'has_highlight_clipping': True, 'has_shadow_crushing': True,
            'exposure_flags': ['INVALID_IMAGE']
        }

    # 1. Calculate Percentiles
    # Flatten helps with percentile calculation
    flat_img = gray_image.flatten()
    p1, p5, p50, p95, p99 = np.percentile(flat_img, [1, 5, 50, 95, 99])

    # 2. Calculate Ratios
    total_pixels = flat_img.size
    
    # Count pixels above highlight threshold
    white_pixels = np.count_nonzero(flat_img >= Config.HIGHLIGHT_THRESHOLD)
    white_ratio = white_pixels / total_pixels
    
    # Count pixels below shadow threshold
    black_pixels = np.count_nonzero(flat_img <= Config.SHADOW_THRESHOLD)
    black_ratio = black_pixels / total_pixels
    
    # Dynamic Range
    dynamic_range = p95 - p5

    # 3. Determine Flags
    flags = []
    
    # Highlight Clipping
    has_highlight_clipping = white_ratio > Config.MAX_HIGHLIGHT_RATIO
    if has_highlight_clipping:
        flags.append('HIGHLIGHT_CLIP')

    # Shadow Crushing
    has_shadow_crushing = black_ratio > Config.MAX_SHADOW_RATIO
    if has_shadow_crushing:
        flags.append('SHADOW_CRUSH')

    # Overexposure Logic
    # 1. Too much pure white OR
    # 2. Brightest parts are very bright AND highlights are pushed up
    is_overexposed = (
        white_ratio > Config.MAX_WHITE_RATIO or 
        (p99 > 250 and p95 > Config.OVEREXPOSED_P95_TRIGGER)
    )
    if is_overexposed:
        flags.append('OVEREXPOSED')

    # Underexposure Logic
    # 1. Too much pure black OR
    # 2. Darkest parts are very dark AND shadows are crushed down
    is_underexposed = (
        black_ratio > Config.MAX_BLACK_RATIO or 
        (p1 < 5 and p5 < Config.UNDEREXPOSED_P5_TRIGGER)
    )
    if is_underexposed:
        flags.append('UNDEREXPOSED')

    # 4. Calculate Exposure Score (0-100)
    # Start with 100
    # Penalty 1: Deviation from mid-tone (128). Max penalty ~50 points if mean is at 0 or 255.
    mid_tone_penalty = abs(p50 - 128) * 0.4
    
    # Penalty 2: Clipping penalties (Severe punishment for lost data)
    # If 10% is clipped, deduct 20 points.
    clipping_penalty = (white_ratio * 200) + (black_ratio * 200)
    
    raw_score = 100 - mid_tone_penalty - clipping_penalty
    exposure_score = max(0.0, min(100.0, raw_score))

    return {
        'exposure_score': round(exposure_score, 2),
        'p1': int(p1),
        'p5': int(p5),
        'p50': int(p50),
        'p95': int(p95),
        'p99': int(p99),
        'white_ratio': round(white_ratio, 4),
        'black_ratio': round(black_ratio, 4),
        'dynamic_range': int(dynamic_range),
        'is_overexposed': is_overexposed,
        'is_underexposed': is_underexposed,
        'has_highlight_clipping': has_highlight_clipping,
        'has_shadow_crushing': has_shadow_crushing,
        'exposure_flags': "|".join(flags) if flags else "OK"
    }
