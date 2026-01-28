
import cv2
import numpy as np
import logging
import os

logger = logging.getLogger(__name__)

def read_and_resize(path: str, target_long_edge: int = 1024) -> np.ndarray:
    """
    Reads an image with optimized downsampling.
    Prioritizes OpenCV's IMREAD_REDUCED_COLOR_* flags.
    """
    if not os.path.exists(path):
        logger.error(f"File not found: {path}")
        return None

    # Strategy: 
    # For typical camera JPGs (20MP+), reduction /4 is safe and efficient.
    # We can try to guess based on file size, but simply using /4 is a good heuristic for "large folders".
    # However, if the user specifically wants 1024, /4 on a 24MP (6000px) img -> 1500px.
    # /8 -> 750px.
    # We will try /4 first.
    
    flags = cv2.IMREAD_COLOR
    
    # Check if OpenCV supports reduced reading (modern versions do)
    # 1/4 size
    if hasattr(cv2, 'IMREAD_REDUCED_COLOR_4'):
        flags = cv2.IMREAD_REDUCED_COLOR_4
    elif hasattr(cv2, 'IMREAD_REDUCED_COLOR_2'):
        flags = cv2.IMREAD_REDUCED_COLOR_2
        
    try:
        img = cv2.imread(path, flags)
    except Exception as e:
        logger.error(f"Error reading {path}: {e}")
        return None
        
    if img is None:
        # Fallback to normal read if reduced failed (though it shouldn't return None unless file bad)
        # Or maybe the flag was invalid for this file type?
        img = cv2.imread(path, cv2.IMREAD_COLOR)
        
    if img is None:
        return None
        
    # Now check dimensions and resize if necessary
    h, w = img.shape[:2]
    long_edge = max(h, w)
    
    if long_edge > target_long_edge:
        scale = target_long_edge / long_edge
        new_w = int(w * scale)
        new_h = int(h * scale)
        img = cv2.resize(img, (new_w, new_h), interpolation=cv2.INTER_AREA)
        
    return img
