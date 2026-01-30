import os
import urllib.request
import shutil
import logging

logger = logging.getLogger(__name__)

def _download_file(url: str, dst_path: str) -> None:
    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "PrimePick/1.0 (model-downloader)",
            "Accept": "*/*",
        },
    )
    with urllib.request.urlopen(req, timeout=60) as r:
        with open(dst_path, "wb") as f:
            shutil.copyfileobj(r, f)

def download_models(force=False):
    base_dir = os.path.dirname(os.path.abspath(__file__))
    model_dir = os.path.join(base_dir, "models")
    os.makedirs(model_dir, exist_ok=True)
    
    # 1. MobileNet V3 Small
    mobilenet_path = os.path.join(model_dir, "mobilenet_v3_small.pth")
    if force or not os.path.exists(mobilenet_path):
        try:
            # Import here to avoid dependency if not needed (though likely already imported)
            import torch
            import torchvision
            print("Downloading MobileNet V3 Small weights...")
            weights = torchvision.models.MobileNet_V3_Small_Weights.DEFAULT
            model = torchvision.models.mobilenet_v3_small(weights=weights)
            torch.save(model.state_dict(), mobilenet_path)
            print(f"Saved model to {mobilenet_path}")
        except Exception as e:
            print(f"Failed to download MobileNet V3: {e}")
    else:
        print("MobileNet V3 Small weights already exist.")

    # 2. Emotion FERPlus ONNX
    onnx_path = os.path.join(model_dir, "emotion-ferplus-8.onnx")
    if force or not os.path.exists(onnx_path):
        print("Downloading Emotion FERPlus ONNX model...")
        urls = [
            "https://huggingface.co/onnxmodelzoo/emotion-ferplus-8/resolve/main/emotion-ferplus-8.onnx?download=true",
            "https://onnxzoo.blob.core.windows.net/models/opset_8/emotion_ferplus/emotion-ferplus-8.onnx",
        ]
        last_err = None
        for url in urls:
            for _ in range(2):
                try:
                    _download_file(url, onnx_path)
                    if os.path.exists(onnx_path) and os.path.getsize(onnx_path) > 1024 * 1024:
                        print(f"Saved model to {onnx_path}")
                        return
                except Exception as e:
                    last_err = e
        if last_err:
            print(f"Failed to download ONNX model: {last_err}")
    else:
        print("Emotion FERPlus ONNX model already exists.")
