# photo_selector/metrics_sharpness.py
import cv2
from .config import Config

def calculate_sharpness(gray_image):
    """
    Calculates the sharpness score using the Variance of Laplacian method.
    Args:
        gray_image: Grayscale numpy array of the image.
    Returns:
        dict: {
            'sharpness_score': float,
            'is_blurry': bool
        }
    """
    if gray_image is None:
        return {'sharpness_score': 0.0, 'is_blurry': True}

    # Laplacian variance is a standard measure for blur detection
    # High variance = sharp edges; Low variance = blur
    score = cv2.Laplacian(gray_image, cv2.CV_64F).var()
    
    is_blurry = score < Config.SHARPNESS_THRESHOLD
    
    return {
        'sharpness_score': round(score, 2),
        'is_blurry': is_blurry
    }
