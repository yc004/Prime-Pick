
import cv2
import numpy as np
import os
import sys

def create_image(path, size=(1000, 1000), color=(128, 128, 128), noise_level=0, blur_k=0):
    # Base color
    img = np.full((size[1], size[0], 3), color, dtype=np.uint8)
    
    # Add some structure (grid) so sharpness isn't 0
    for i in range(0, size[0], 50):
        cv2.line(img, (i, 0), (i, size[1]), (0, 0, 0), 2)
    for i in range(0, size[1], 50):
        cv2.line(img, (0, i), (size[0], i), (0, 0, 0), 2)
        
    # Noise
    if noise_level > 0:
        noise = np.random.randint(0, noise_level, (size[1], size[0], 3), dtype=np.uint8)
        img = cv2.add(img, noise)
        
    # Blur
    if blur_k > 0:
        img = cv2.GaussianBlur(img, (blur_k, blur_k), 0)
        
    cv2.imwrite(path, img)
    print(f"Created {path}")

if __name__ == "__main__":
    test_dir = "test_images"
    os.makedirs(test_dir, exist_ok=True)
    
    # 1. Perfect Image (Sharp, Good Exposure)
    create_image(os.path.join(test_dir, "good.jpg"), noise_level=20)
    
    # 2. Blurry Image
    create_image(os.path.join(test_dir, "blurry.jpg"), noise_level=20, blur_k=51)
    
    # 3. Underexposed (Dark)
    create_image(os.path.join(test_dir, "dark.jpg"), color=(20, 20, 20), noise_level=5)
    
    # 4. Overexposed (Bright)
    create_image(os.path.join(test_dir, "bright.jpg"), color=(240, 240, 240), noise_level=5)
