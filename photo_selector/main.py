# photo_selector/main.py
import argparse
import os
import sys
from tqdm import tqdm # Optional

# Ensure we can import from local modules if run directly
current_dir = os.path.dirname(os.path.abspath(__file__))
parent_dir = os.path.dirname(current_dir)
if parent_dir not in sys.path:
    sys.path.insert(0, parent_dir)

from photo_selector.config import Config
from photo_selector.loader import load_image
from photo_selector.metrics_sharpness import calculate_sharpness
from photo_selector.metrics_exposure import calculate_exposure_metrics
from photo_selector.scorer import calculate_final_score
from photo_selector.utils import get_image_files, save_results_csv, save_deletion_list
from photo_selector.xmp_writer import XMPWriter

def main():
    parser = argparse.ArgumentParser(description="AI Photo Selector - MVP")
    parser.add_argument('--input', '-i', required=True, help="Input directory containing JPGs")
    parser.add_argument('--output', '-o', default='.', help="Output directory for reports")
    parser.add_argument('--top', type=int, default=5, help="Number of top photos to display")
    parser.add_argument('--bottom', type=int, default=5, help="Number of bottom photos to display")
    parser.add_argument('--write-xmp', action='store_true', help="Write XMP sidecar files for Lightroom")
    
    args = parser.parse_args()
    
    input_dir = args.input
    output_dir = args.output
    
    if not os.path.exists(output_dir):
        os.makedirs(output_dir)
        
    print(f"Scanning directory: {input_dir}")
    files = get_image_files(input_dir)
    print(f"Found {len(files)} images.")
    
    if not files:
        print("No supported images found. Exiting.")
        return

    results = []
    xmp_writer = XMPWriter()
    
    # Check if tqdm is available for progress bar
    try:
        iterator = tqdm(files, unit="img")
    except ImportError:
        print("Processing images...")
        iterator = files

    # Process images
    for file_path in iterator:
        filename = os.path.basename(file_path)
        
        # 1. Load
        _, gray = load_image(file_path)
        if gray is None:
            continue
            
        # 2. Calculate Metrics
        sharpness_res = calculate_sharpness(gray)
        exposure_res = calculate_exposure_metrics(gray)
        
        # 3. Score & Decide
        final_res = calculate_final_score(sharpness_res, exposure_res)
        
        # 4. Merge all data
        row = {
            'filename': filename,
            'file_path': file_path, # Keep full path for XMP writing
            **final_res,
            **sharpness_res,
            **exposure_res
        }
        results.append(row)

    # Sort: 
    # 1. Usable first (is_unusable=False)
    # 2. Then by technical_score descending
    results.sort(key=lambda x: (x['is_unusable'], -x['technical_score']))
    
    # Separate lists for reporting
    usable_photos = [r for r in results if not r['is_unusable']]
    unusable_photos = [r for r in results if r['is_unusable']]
    
    # Identify Top N files (by full path)
    top_n_paths = set()
    if usable_photos:
        for r in usable_photos[:args.top]:
            top_n_paths.add(r['file_path'])

    # --- Write XMP (if enabled or default?) ---
    # User requested this feature, let's enable it by default or argument? 
    # User said "实现 ... 通过自动写入 XMP". Implies it should happen.
    # But I added an argument --write-xmp. I'll make it default True if not specified? 
    # No, explicit is better. I will enable it if the user didn't forbid it. 
    # Or just run it. The user prompt implies this IS the task.
    # I'll output a message if XMP writing is happening.
    
    print("\nWriting XMP sidecars...")
    count_xmp = 0
    
    for r in results:
        file_path = r['file_path']
        is_unusable = r['is_unusable']
        score = r['technical_score']
        reasons_str = r['unusable_reasons']
        
        # Determine XMP values
        rating = 0
        label = None
        keywords = []
        
        if is_unusable:
            rating = 0
            label = Config.LABEL_REJECTED
            # Add reasons as keywords
            if reasons_str:
                # "REASON1|REASON2" -> ["AI/REASON1", "AI/REASON2"]
                reason_list = reasons_str.split('|')
                for reason in reason_list:
                    keywords.append(f"AI/{reason}")
        else:
            # Usable mapping
            if score >= Config.RATING_5_MIN:
                rating = 5
            elif score >= Config.RATING_4_MIN:
                rating = 4
            elif score >= Config.RATING_3_MIN:
                rating = 3
            else:
                rating = 2
            
            keywords.append("AI/GoodCandidate")
            
            # Check for Top N Pick
            if file_path in top_n_paths:
                label = Config.LABEL_PICKED
                keywords.append("AI/Picked")
        
        # Write XMP
        try:
            xmp_writer.write_xmp(file_path, rating=rating, label=label, keywords=keywords)
            count_xmp += 1
        except Exception as e:
            print(f"Failed to write XMP for {r['filename']}: {e}")

    print(f"Updated XMP for {count_xmp} images.")

    # --- Console Report ---
    print("\n" + "="*40)
    print("       PROCESSING COMPLETE       ")
    print("="*40)
    print(f"Total Processed: {len(results)}")
    print(f"Usable: {len(usable_photos)}")
    print(f"Unusable: {len(unusable_photos)}")
    print("-" * 40)
    
    if usable_photos:
        print(f"\n🏆 TOP {args.top} RECOMMENDATIONS:")
        for i, r in enumerate(usable_photos[:args.top]):
            print(f"{i+1}. {r['filename']} | Score: {r['technical_score']} | Sharpness: {r['sharpness_score']}")
            
    if unusable_photos:
        print(f"\n🗑️  BOTTOM {args.bottom} (UNUSABLE/LOWEST):")
        unusable_sorted = sorted(unusable_photos, key=lambda x: x['technical_score'])
        
        for i, r in enumerate(unusable_sorted[:args.bottom]):
            print(f"{i+1}. {r['filename']} | Score: {r['technical_score']} | Reason: {r['unusable_reasons']}")

    # Save Files
    csv_path = os.path.join(output_dir, 'results.csv')
    txt_path = os.path.join(output_dir, 'to_delete.txt')
    
    save_results_csv(results, csv_path)
    save_deletion_list(results, txt_path)
    
    print("\nDone.")

if __name__ == "__main__":
    main()
