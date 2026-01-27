# photo_selector/scorer.py
from .config import Config

def calculate_final_score(sharpness_data, exposure_data):
    """
    Combines sharpness and exposure metrics into a final technical score and decision.
    
    Args:
        sharpness_data (dict): Result from metrics_sharpness.
        exposure_data (dict): Result from metrics_exposure.
        
    Returns:
        dict: Combined results including technical_score and unusable_reasons.
    """
    
    # 1. Normalize Sharpness Score (0-100)
    # We define a "Very Sharp" variance reference. 
    # If threshold is 100, we assume 300 is excellent.
    sharpness_target = Config.SHARPNESS_THRESHOLD * 3.0
    norm_sharpness = min((sharpness_data['sharpness_score'] / sharpness_target) * 100, 100.0)
    
    # 2. Weighted Technical Score
    # exposure_score is already 0-100
    technical_score = (
        (norm_sharpness * Config.WEIGHT_SHARPNESS) + 
        (exposure_data['exposure_score'] * Config.WEIGHT_EXPOSURE)
    )
    
    # 3. Determine Unusable Status
    reasons = []
    
    if sharpness_data['is_blurry']:
        reasons.append('BLURRY')
        
    if exposure_data['is_overexposed']:
        reasons.append('OVEREXPOSED')
        
    if exposure_data['is_underexposed']:
        reasons.append('UNDEREXPOSED')
        
    # Clipping is strictly checked here as per requirements
    if exposure_data['has_highlight_clipping']:
        reasons.append('HIGHLIGHT_CLIP')
        
    if exposure_data['has_shadow_crushing']:
        reasons.append('SHADOW_CRUSH')
        
    is_unusable = len(reasons) > 0
    
    return {
        'technical_score': round(technical_score, 2),
        'is_unusable': is_unusable,
        'unusable_reasons': "|".join(reasons) if reasons else ""
    }
