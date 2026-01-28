
import os
import sys

# Ensure the project root is in sys.path when running directly
if __name__ == "__main__" and __package__ is None:
    sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import argparse
import logging
import multiprocessing
from photo_selector.config import default_config
from photo_selector.pipeline.stage1_metrics import run_stage1
from photo_selector.pipeline.stage2_xmp import run_stage2, load_results_from_csv

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout)
    ]
)
logger = logging.getLogger("main")

def main():
    parser = argparse.ArgumentParser(description="AI Photo Selector - High Performance")
    
    parser.add_argument("--input-dir", required=True, help="Directory containing JPG images")
    parser.add_argument("--output-dir", help="Directory to save results.csv (default: input-dir)")
    parser.add_argument("--profile", choices=["daylight", "event_indoor", "night"], default="daylight", help="Processing profile")
    
    # Workers
    default_workers = min(os.cpu_count() or 4, 8)
    parser.add_argument("--workers", type=int, default=default_workers, help=f"Stage 1 Workers (default: {default_workers})")
    parser.add_argument("--xmp-workers", type=int, default=4, help="Stage 2 XMP Workers (default: 4)")
    
    # Config overrides
    parser.add_argument("--max-long-edge", type=int, default=1024, help="Downsampling size (default: 1024)")
    
    # Switches
    parser.add_argument("--rebuild-cache", action="store_true", help="Force re-calculation")
    parser.add_argument("--write-xmp", action="store_true", help="Enable Stage 2 (XMP Writing)")
    
    args = parser.parse_args()
    
    # Apply Config
    default_config.DEFAULT_LONG_EDGE = args.max_long_edge
    
    # Profile adjustments (example)
    if args.profile == "night":
        default_config.LOW_LIGHT_THRESHOLD = 20 # Tolerate darker
        default_config.WEIGHT_EXPOSURE = 0.3 # Focus more on sharpness
    elif args.profile == "event_indoor":
        default_config.SHARPNESS_THRESHOLD = 80.0 # Tolerate higher ISO noise/softness
    
    # Paths
    input_dir = os.path.abspath(args.input_dir)
    if not os.path.isdir(input_dir):
        logger.error(f"Input directory not found: {input_dir}")
        sys.exit(1)
        
    output_dir = args.output_dir if args.output_dir else input_dir
    os.makedirs(output_dir, exist_ok=True)
    output_csv = os.path.join(output_dir, "results.csv")
    
    # Stage 1
    logger.info("=== Stage 1: Metrics Calculation ===")
    results = run_stage1(
        input_dir=input_dir,
        output_csv=output_csv,
        workers=args.workers,
        rebuild_cache=args.rebuild_cache
    )
    
    # Stage 2
    if args.write_xmp:
        logger.info("=== Stage 2: XMP Writing ===")
        # If results is empty (e.g. from cache logic variation or if we want to support independent run),
        # we could reload from CSV. But run_stage1 returns all results (cached or new).
        if not results and os.path.exists(output_csv):
             # Fallback if for some reason we didn't get results passed (unlikely with current logic)
             results = load_results_from_csv(output_csv)
             
        run_stage2(results, workers=args.xmp_workers)
        
        print("\n" + "="*60)
        print("IMPORTANT: To see changes in Lightroom:")
        print("1. Select all photos in Library module")
        print("2. Right-click -> Metadata -> Read Metadata from File")
        print("="*60 + "\n")
        
    logger.info("Done.")

if __name__ == "__main__":
    # Fix for spawn method on Windows if needed, though default is often spawn on Windows.
    # But multiprocessing.freeze_support() is good practice.
    multiprocessing.freeze_support()
    main()
