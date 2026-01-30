import cv2
import numpy as np
import os
import logging

logger = logging.getLogger(__name__)

EMOTION_TABLE = {
    0: 'neutral',
    1: 'happiness',
    2: 'surprise',
    3: 'sadness',
    4: 'anger',
    5: 'disgust',
    6: 'fear',
    7: 'contempt'
}

EMOTION_SCORE_TABLE = {
    'neutral': 60.0,
    'happiness': 100.0,
    'surprise': 80.0,
    'sadness': 20.0,
    'anger': 10.0,
    'disgust': 10.0,
    'fear': 10.0,
    'contempt': 15.0,
}

class EmotionDetector:
    _instance = None

    def __init__(self, model_path=None):
        self.net = None
        self.face_cascade = None
        
        # Load Face Detector (Haar)
        # Try to find haarcascade in cv2 data
        try:
            cascade_path = os.path.join(cv2.data.haarcascades, 'haarcascade_frontalface_default.xml')
            if os.path.exists(cascade_path):
                self.face_cascade = cv2.CascadeClassifier(cascade_path)
            else:
                logger.warning(f"Haar cascade not found at {cascade_path}")
        except Exception as e:
            logger.error(f"Error loading face cascade: {e}")

        # Load Emotion Model
        if model_path:
            if os.path.exists(model_path):
                try:
                    self.net = cv2.dnn.readNetFromONNX(model_path)
                    # Try to set backend to OpenCV
                    self.net.setPreferableBackend(cv2.dnn.DNN_BACKEND_OPENCV)
                    self.net.setPreferableTarget(cv2.dnn.DNN_TARGET_CPU)
                except Exception as e:
                    logger.error(f"Failed to load emotion model from {model_path}: {e}")
            else:
                # Silent fail if model not found (user didn't download)
                pass

    @classmethod
    def get_instance(cls, model_path=None):
        if cls._instance is None:
            cls._instance = cls(model_path)
        return cls._instance

    def detect(self, img_bgr):
        """
        Detects the dominant emotion in the image.
        Returns the emotion string (e.g., 'happiness') or None if no face/emotion detected.
        """
        res = self.detect_with_score(img_bgr)
        return res[0] if res else None

    def detect_with_score(self, img_bgr):
        """
        Returns (emotion_label, emotion_score_0_100, confidence_0_1) or None.
        """
        if self.face_cascade is None:
            return None
        
        # Convert to grayscale
        gray = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        
        # Detect faces
        faces = self.face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        if len(faces) == 0:
            return None

        # Process the largest face only
        faces = sorted(faces, key=lambda x: x[2]*x[3], reverse=True)
        (x, y, w, h) = faces[0]
        
        if self.net is None:
            # If no emotion model, at least we detected a face.
            # But we can't return emotion.
            return None

        try:
            roi_gray = gray[y:y+h, x:x+w]
            roi_gray = cv2.resize(roi_gray, (64, 64))
            
            # Preprocess for FERPlus
            # Input: 1x1x64x64, Float32
            roi_gray = roi_gray.astype(np.float32)
            
            # Simple normalization if needed. FERPlus usually expects 0-255 images but let's check.
            # Some sources say specific mean subtraction.
            # However, standard ONNX FERPlus usually takes raw pixels or 0-1.
            # Let's try to assume 0-255 is okay or simple normalization.
            # Actually, standard FERPlus ONNX often expects 64x64 grayscale.
            
            blob = cv2.dnn.blobFromImage(roi_gray, 1.0, (64, 64), (0, 0, 0), swapRB=False, crop=False)
            
            self.net.setInput(blob)
            preds = self.net.forward()
            
            raw = np.asarray(preds).reshape(-1).astype(np.float32)
            if raw.size < 8:
                return None

            x = raw[:8]
            x = x - np.max(x)
            exps = np.exp(x)
            denom = float(np.sum(exps))
            if denom <= 0:
                return None
            probs = exps / denom

            idx = int(np.argmax(probs))
            emotion = EMOTION_TABLE.get(idx, 'unknown')
            confidence = float(probs[idx])

            score = 0.0
            for i in range(8):
                label = EMOTION_TABLE.get(i, 'unknown')
                score += float(probs[i]) * float(EMOTION_SCORE_TABLE.get(label, 50.0))

            score = float(max(0.0, min(100.0, score)))
            return emotion, score, confidence
        except Exception as e:
            logger.error(f"Error during emotion detection: {e}")
            return None
