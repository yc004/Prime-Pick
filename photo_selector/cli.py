import argparse
import json
import sys
import os
import logging
from typing import List

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from photo_selector.config import default_config
from photo_selector.pipeline.stage1_metrics import run_stage1
from photo_selector.pipeline.stage2_xmp import run_stage2, load_results_from_csv
from photo_selector.pipeline.models import MetricsResult
from photo_selector.io.results_writer import write_results
from photo_selector.similarity.grouping import run_grouping

# Configure logging to stderr so stdout is clean for JSON
logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger("cli")

def print_json(data):
    print(json.dumps(data), flush=True)

def apply_config(config_path):
    if not config_path or not os.path.exists(config_path):
        return
    try:
        with open(config_path, 'r') as f:
            config = json.load(f)
        
        # Apply overrides
        if 'max_long_edge' in config:
            default_config.DEFAULT_LONG_EDGE = config['max_long_edge']
        
        # Weights
        if 'weights' in config:
            w = config['weights']
            if 'sharpness' in w: default_config.WEIGHT_SHARPNESS = float(w['sharpness'])
            if 'exposure' in w: default_config.WEIGHT_EXPOSURE = float(w['exposure'])
            
        # Thresholds
        if 'thresholds' in config:
            t = config['thresholds']
            if 'sharpness' in t: default_config.SHARPNESS_THRESHOLD = float(t['sharpness'])
            if 'low_light' in t: default_config.LOW_LIGHT_THRESHOLD = float(t['low_light'])
            # Add others as needed

        grouping = config.get("grouping")
        if isinstance(grouping, dict):
            xmp = grouping.get("xmp")
            if isinstance(xmp, dict):
                if "group_best_min_rating" in xmp:
                    default_config.GROUP_BEST_MIN_RATING = int(xmp["group_best_min_rating"])
                if "group_top1_rating" in xmp:
                    default_config.GROUP_TOP1_RATING = int(xmp["group_top1_rating"])
                if "group_nonbest_mode" in xmp:
                    default_config.GROUP_NONBEST_MODE = str(xmp["group_nonbest_mode"])
                if "group_nonbest_max_rating" in xmp:
                    default_config.GROUP_NONBEST_MAX_RATING = int(xmp["group_nonbest_max_rating"])
                if "group_add_keywords" in xmp:
                    default_config.GROUP_ADD_KEYWORDS = bool(xmp["group_add_keywords"])
                if "group_similar_but_worse_delta" in xmp:
                    default_config.GROUP_SIMILAR_BUT_WORSE_DELTA = float(xmp["group_similar_but_worse_delta"])
            
        logger.info(f"Applied config from {config_path}")
    except Exception as e:
        logger.error(f"Failed to load config: {e}")

def cmd_compute(args):
    # Profile logic
    if args.profile == "night":
        default_config.LOW_LIGHT_THRESHOLD = 20
        default_config.WEIGHT_EXPOSURE = 0.3
    elif args.profile == "event_indoor":
        default_config.SHARPNESS_THRESHOLD = 80.0
    elif args.profile == "outdoor_portrait":
        default_config.WEIGHT_EXPOSURE = 2.0 # More sensitive to exposure
        # default_config.HIGHLIGHT_CLIPPING_THRESHOLD = ... (if exists)

    apply_config(args.config_json)
        
    def on_progress(done, total):
        print_json({"type": "progress", "done": done, "total": total})

    # Ensure output dir exists
    output_dir = args.output_dir or args.input_dir
    os.makedirs(output_dir, exist_ok=True)

    results = run_stage1(
        input_dir=args.input_dir,
        output_csv=os.path.join(output_dir, "results.csv"),
        workers=args.workers,
        rebuild_cache=args.rebuild_cache,
        progress_callback=on_progress
    )
    
    results_data = [r.to_dict() for r in results]
    
    json_path = os.path.join(output_dir, "results.json")
    with open(json_path, 'w') as f:
        json.dump(results_data, f, indent=2)
        
    print_json({"type": "complete", "result_file": json_path})

def cmd_write_xmp(args):
    apply_config(args.config_json)
    
    output_dir = args.output_dir or args.input_dir
    
    # Load selection if provided
    selected_files = None
    if args.selection_file and os.path.exists(args.selection_file):
        with open(args.selection_file, 'r') as f:
            selected_files = set(json.load(f))
            
    json_path = os.path.join(output_dir, "results.json")
    csv_path = os.path.join(output_dir, "results.csv")
    
    results = []
    if os.path.exists(json_path):
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                raw = json.load(f)
            if isinstance(raw, list):
                results = [MetricsResult.from_dict(r) for r in raw if isinstance(r, dict)]
        except Exception as e:
            logger.error(f"Failed to read results.json: {e}")
            results = []

    if not results:
        if not os.path.exists(csv_path):
            print_json({"type": "error", "msg": "results.json/results.csv not found"})
            return
        results = load_results_from_csv(csv_path)
    
    if args.only_selected and selected_files is not None:
        results = [r for r in results if r.filename in selected_files]
        
    run_stage2(results, workers=4)
    
    print_json({"type": "complete", "count": len(results)})

def cmd_group(args):
    output_dir = args.output_dir or args.input_dir
    os.makedirs(output_dir, exist_ok=True)

    json_path = os.path.join(output_dir, "results.json")
    csv_path = os.path.join(output_dir, "results.csv")

    results: List[MetricsResult] = []
    if os.path.exists(json_path):
        try:
            with open(json_path, "r", encoding="utf-8") as f:
                raw = json.load(f)
            if isinstance(raw, list):
                results = [MetricsResult.from_dict(r) for r in raw if isinstance(r, dict)]
        except Exception as e:
            logger.error(f"Failed to read results.json: {e}")
            results = []

    if not results:
        if not os.path.exists(csv_path):
            print_json({"type": "error", "msg": "results.json/results.csv not found"})
            return
        results = load_results_from_csv(csv_path)

    def on_progress(evt: dict):
        print_json(evt)

    grouped_results, groups_path = run_grouping(
        input_dir=args.input_dir,
        output_dir=output_dir,
        results=results,
        embed_model=args.embed_model,
        thumb_long_edge=args.thumb_long_edge,
        eps=args.eps,
        min_samples=args.min_samples,
        neighbor_window=args.neighbor_window,
        time_window_secs=args.time_window_secs,
        time_source=args.time_source,
        topk=args.topk,
        workers=args.workers,
        batch_size=args.batch_size,
        progress_callback=on_progress,
    )

    write_results(grouped_results, csv_path)
    results_data = [r.to_dict() for r in grouped_results]
    with open(json_path, "w", encoding="utf-8") as f:
        json.dump(results_data, f, indent=2)

    print_json(
        {
            "type": "complete",
            "groups_file": groups_path,
            "results_json": json_path,
            "results_csv": csv_path,
        }
    )

def main():
    parser = argparse.ArgumentParser()
    subparsers = parser.add_subparsers(dest="command")
    
    # Compute
    p_compute = subparsers.add_parser("compute")
    p_compute.add_argument("--input-dir", required=True)
    p_compute.add_argument("--output-dir")
    p_compute.add_argument("--profile", default="daylight")
    p_compute.add_argument("--workers", type=int, default=4)
    p_compute.add_argument("--max-long-edge", type=int, default=1024)
    p_compute.add_argument("--config-json")
    p_compute.add_argument("--rebuild-cache", action="store_true")
    
    # Write XMP
    p_write = subparsers.add_parser("write-xmp")
    p_write.add_argument("--input-dir", required=True)
    p_write.add_argument("--output-dir")
    p_write.add_argument("--only-selected", action="store_true")
    p_write.add_argument("--selection-file")
    p_write.add_argument("--config-json")

    # Group
    p_group = subparsers.add_parser("group")
    p_group.add_argument("--input-dir", required=True)
    p_group.add_argument("--output-dir")
    p_group.add_argument("--embed-model", default="mobilenet_v3_small")
    p_group.add_argument("--thumb-long-edge", type=int, default=256)
    p_group.add_argument("--eps", type=float, default=0.12)
    p_group.add_argument("--min-samples", type=int, default=2)
    p_group.add_argument("--neighbor-window", type=int, default=80)
    p_group.add_argument("--time-window-secs", type=float, default=6.0)
    p_group.add_argument("--time-source", default="auto", choices=["auto", "exif", "mtime"])
    p_group.add_argument("--topk", type=int, default=2)
    p_group.add_argument("--workers", type=int, default=4)
    p_group.add_argument("--batch-size", type=int, default=32)
    
    args = parser.parse_args()
    
    if args.command == "compute":
        cmd_compute(args)
    elif args.command == "write-xmp":
        cmd_write_xmp(args)
    elif args.command == "group":
        cmd_group(args)
    else:
        parser.print_help()

if __name__ == "__main__":
    # Fix for multiprocessing on Windows
    import multiprocessing
    multiprocessing.freeze_support()
    main()
