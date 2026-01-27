# photo_selector/utils.py
import os
import csv
from .config import Config

def get_image_files(input_dir):
    """Returns a list of absolute paths to supported image files."""
    files = []
    if not os.path.exists(input_dir):
        return files
        
    for f in os.listdir(input_dir):
        if f.lower().endswith(Config.SUPPORTED_EXTENSIONS):
            files.append(os.path.join(input_dir, f))
    return files

def save_results_csv(results, output_path):
    """
    Saves the list of result dictionaries to a CSV file.
    """
    if not results:
        return
        
    # Define headers based on the first result
    headers = [
        'filename', 
        'technical_score', 
        'is_unusable', 
        'unusable_reasons',
        'sharpness_score', 'is_blurry',
        'exposure_score', 'exposure_flags',
        'p1', 'p5', 'p50', 'p95', 'p99',
        'white_ratio', 'black_ratio', 'dynamic_range',
        'is_overexposed', 'is_underexposed', 
        'has_highlight_clipping', 'has_shadow_crushing'
    ]
    
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=headers, extrasaction='ignore')
            writer.writeheader()
            writer.writerows(results)
        print(f"Saved CSV results to: {output_path}")
    except IOError as e:
        print(f"Error saving CSV: {e}")

def save_deletion_list(results, output_path):
    """
    Saves unusable files to a text file.
    """
    try:
        with open(output_path, 'w', encoding='utf-8') as f:
            count = 0
            for r in results:
                if r['is_unusable']:
                    f.write(f"{r['filename']} {r['unusable_reasons']}\n")
                    count += 1
        print(f"Saved deletion list ({count} files) to: {output_path}")
    except IOError as e:
        print(f"Error saving deletion list: {e}")
