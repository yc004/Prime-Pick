
import torch
import torchvision
import os

def download_and_save():
    model_dir = os.path.join(os.path.dirname(__file__), "photo_selector", "models")
    os.makedirs(model_dir, exist_ok=True)
    
    print("Downloading MobileNet V3 Small weights...")
    weights = torchvision.models.MobileNet_V3_Small_Weights.DEFAULT
    # This will trigger download to torch cache
    model = torchvision.models.mobilenet_v3_small(weights=weights)
    
    # Save the state dict
    save_path = os.path.join(model_dir, "mobilenet_v3_small.pth")
    torch.save(model.state_dict(), save_path)
    print(f"Saved model to {save_path}")

if __name__ == "__main__":
    download_and_save()
