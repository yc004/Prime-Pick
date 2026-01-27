# photo_selector/loader.py
import cv2
import os

def load_image(file_path):
    """
    Loads an image from path.
    Returns tuple: (original_bgr, gray_image)
    Returns (None, None) if loading fails.
    """
    if not os.path.exists(file_path):
        return None, None
        
    try:
        # Read image
        img = cv2.imread(file_path)
        if img is None:
            return None, None
            
        # Convert to Grayscale for analysis
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        return img, gray
    except Exception as e:
        print(f"Error loading {file_path}: {e}")
        return None, None
