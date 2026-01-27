import cv2
import numpy as np
import os

def create_images():
    os.makedirs('test_images', exist_ok=True)
    
    # 1. Normal Image (Gray gradient)
    img_normal = np.linspace(0, 255, 256*256).reshape(256, 256).astype(np.uint8)
    cv2.imwrite('test_images/normal.jpg', img_normal)
    
    # 2. Black Image (Underexposed)
    img_black = np.zeros((256, 256), dtype=np.uint8)
    cv2.imwrite('test_images/black.jpg', img_black)
    
    # 3. White Image (Overexposed)
    img_white = np.ones((256, 256), dtype=np.uint8) * 255
    cv2.imwrite('test_images/white.jpg', img_white)
    
    # 4. Blurry Image (Gaussian Blur on noise)
    img_noise = np.random.randint(0, 256, (256, 256), dtype=np.uint8)
    img_blur = cv2.GaussianBlur(img_noise, (21, 21), 0)
    cv2.imwrite('test_images/blur.jpg', img_blur)
    
    print("Test images created in 'test_images/'")

if __name__ == "__main__":
    create_images()
