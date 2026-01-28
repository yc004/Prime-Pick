
import cv2
import numpy as np
from photo_selector.pipeline.models import SharpnessResult
from photo_selector.config import default_config

def compute_sharpness(img: np.ndarray) -> SharpnessResult:
    """
    Compute sharpness using a Grid-Based Laplacian Variance method.
    This approach is robust against bokeh/shallow depth-of-field by focusing
    on the sharpest regions (Top-K blocks) rather than the global average.
    
    Input img should be BGR (will be converted to Gray) or Gray.
    """
    if len(img.shape) == 3:
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
    else:
        gray = img
        
    # Resize if too large to speed up and reduce high-ISO noise sensitivity
    # Maintaining aspect ratio is not strictly necessary for variance calc, 
    # but let's keep it simple. If we resize to a fixed width, thresholds are more stable.
    target_width = 1024
    h, w = gray.shape
    if w > target_width:
        scale = target_width / w
        new_h = int(h * scale)
        gray = cv2.resize(gray, (target_width, new_h), interpolation=cv2.INTER_AREA)
        
    h, w = gray.shape
    
    # Grid parameters
    rows = 4
    cols = 4
    
    # Calculate block dimensions
    # We use a simple sliding window or just fixed grid. Fixed grid is faster.
    step_h = h // rows
    step_w = w // cols
    
    block_scores = []
    
    for r in range(rows):
        for c in range(cols):
            # Extract ROI
            y_start = r * step_h
            y_end = (r + 1) * step_h
            x_start = c * step_w
            x_end = (c + 1) * step_w
            
            roi = gray[y_start:y_end, x_start:x_end]
            
            # Skip empty or very small ROIs (edge cases)
            if roi.size == 0:
                continue
                
            # Compute Laplacian Variance for this block
            # cv2.CV_64F is needed to avoid overflow/underflow
            laplacian = cv2.Laplacian(roi, cv2.CV_64F)
            score = laplacian.var()
            block_scores.append(score)
            
    if not block_scores:
        return SharpnessResult(score=0.0, is_blurry=True)
        
    # Sort scores descending
    block_scores.sort(reverse=True)
    
    # Strategy: Take the Top K blocks
    # e.g., if we have 16 blocks, maybe take top 4 (25% of image)
    # This assumes at least 25% of the image should be in focus for it to be "sharp"
    # For portraits, this is usually true (face/eyes).
    top_k = 4
    valid_scores = block_scores[:top_k]
    
    # Final score is the average of the top K blocks
    # This prevents one single noisy artifact block from skewing the result (max),
    # while ignoring the blurry background (mean).
    final_score = float(np.mean(valid_scores))
    
    # The threshold in config might need adjustment because block variances 
    # can be higher than global variance.
    # However, since we resized to 1024 width, the variance values drop compared to full res.
    # Let's assume the user will tune the threshold in config.
    is_blurry = bool(final_score < default_config.SHARPNESS_THRESHOLD)
    
    return SharpnessResult(score=final_score, is_blurry=is_blurry)
