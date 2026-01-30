
import os
import sys

def download_and_save():
    project_root = os.path.dirname(os.path.abspath(__file__))
    if project_root not in sys.path:
        sys.path.insert(0, project_root)
    from photo_selector.download_utils import download_models
    download_models(force=False)

if __name__ == "__main__":
    download_and_save()
