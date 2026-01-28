
import os
import csv
import logging
import concurrent.futures
from typing import List, Optional
from photo_selector.pipeline.models import MetricsResult
from photo_selector.lr.xmp_writer import XmpWriter
from photo_selector.config import default_config

logger = logging.getLogger(__name__)

def apply_xmp_logic(result: MetricsResult, group_best_score: Optional[dict] = None) -> bool:
    """
    Determines what to write and calls XmpWriter.
    Returns True if changed.
    """
    xmp_path_1 = f"{result.filename}.xmp"
    base, _ext = os.path.splitext(result.filename)
    xmp_path_2 = f"{base}.xmp"
    
    # Also support sidecar naming convention: image.xmp (if image.jpg) 
    # But usually image.jpg.xmp is safer to avoid collision if image.raw exists.
    # Adobe prefers image.xmp if image is raw, but for jpg usually sidecar is image.xmp or image.jpg.xmp.
    # To avoid duplicates, we will strictly use the standard sidecar naming: base_filename.xmp
    # e.g. photo.jpg -> photo.xmp
    
    # 强制覆盖逻辑：如果 rating 或 label 发生了变化（即使是缓存结果，也需要确保 XMP 是最新的）
    # XmpWriter 内部会检查值是否一致。如果一致则不写入。
    # 这里我们只负责计算应该写入的值。
    
    # Logic
    rating = 0
    label = None
    keywords = []
    
    # Add reasons as keywords
    for r in result.reasons:
        keywords.append(f"AI/{r}")
        
    if result.is_unusable:
        label = "Red" # Often mapped to Rejected
        rating = 1
    else:
        # Score mapping
        if result.technical_score >= 80:
            rating = 5
            label = "Green"
        elif result.technical_score >= 60:
            rating = 4
        elif result.technical_score >= 40:
            rating = 3
        else:
            rating = 2

        gid = int(getattr(result, "group_id", -1) or -1)
        if gid >= 0:
            if default_config.GROUP_ADD_KEYWORDS:
                keywords.append(f"AI/Group/{gid}")
                keywords.append(f"AI/GroupRank/{int(getattr(result, 'rank_in_group', 0) or 0)}")

            if bool(getattr(result, "is_group_best", False)):
                if default_config.GROUP_ADD_KEYWORDS:
                    keywords.append("AI/BestInGroup")
                rank = int(getattr(result, "rank_in_group", 0) or 0)
                if rank == 1:
                    rating = max(int(rating), int(default_config.GROUP_TOP1_RATING))
                else:
                    rating = max(int(rating), int(default_config.GROUP_BEST_MIN_RATING))
            else:
                if default_config.GROUP_ADD_KEYWORDS:
                    keywords.append("AI/Similar")
                    if isinstance(group_best_score, dict) and gid in group_best_score:
                        best = float(group_best_score[gid])
                        if best - float(result.technical_score) >= float(default_config.GROUP_SIMILAR_BUT_WORSE_DELTA):
                            keywords.append("AI/SimilarButWorse")

                mode = str(default_config.GROUP_NONBEST_MODE or "keep").lower()
                if mode == "clear":
                    rating = 0
                elif mode == "downgrade":
                    rating = min(int(rating), int(default_config.GROUP_NONBEST_MAX_RATING))

    # Write
    return XmpWriter.update_xmp(xmp_path_2, rating, label, keywords)

def run_stage2(
    results: List[MetricsResult], 
    workers: int = 4
):
    logger.info(f"Starting Stage 2 (XMP Writing) with {workers} workers...")
    
    count_updated = 0
    count_skipped = 0

    best_score_by_group = {}
    for r in results:
        gid = int(getattr(r, "group_id", -1) or -1)
        if gid < 0:
            continue
        s = float(getattr(r, "technical_score", 0.0) or 0.0)
        best_score_by_group[gid] = max(float(best_score_by_group.get(gid, -1e9)), s)
    
    with concurrent.futures.ThreadPoolExecutor(max_workers=workers) as executor:
        # Submit tasks
        future_to_file = {
            executor.submit(apply_xmp_logic, res, best_score_by_group): res.filename for res in results
        }
        
        for future in concurrent.futures.as_completed(future_to_file):
            fpath = future_to_file[future]
            try:
                changed = future.result()
                if changed:
                    count_updated += 1
                else:
                    count_skipped += 1
            except Exception as e:
                logger.error(f"Error writing XMP for {fpath}: {e}")
                
    logger.info(f"Stage 2 Complete. Updated: {count_updated}, Skipped: {count_skipped}")

def load_results_from_csv(csv_path: str) -> List[MetricsResult]:
    results = []
    if not os.path.exists(csv_path):
        logger.error(f"CSV not found: {csv_path}")
        return []
        
    try:
        with open(csv_path, 'r', encoding='utf-8') as f:
            reader = csv.DictReader(f)
            for row in reader:
                results.append(MetricsResult.from_dict(row))
    except Exception as e:
        logger.error(f"Error reading CSV: {e}")
        
    return results
