
import csv
import logging
from typing import List
from photo_selector.pipeline.models import MetricsResult

logger = logging.getLogger(__name__)

def write_results(results: List[MetricsResult], output_path: str):
    if not results:
        logger.warning("No results to write.")
        return

    # Convert all to dicts
    data = [r.to_dict() for r in results]
    
    # Get all keys from the first valid result (or union of all keys if schema varies, but it shouldn't)
    # We'll assume uniform schema
    fieldnames = list(data[0].keys())
    
    try:
        with open(output_path, 'w', newline='', encoding='utf-8') as f:
            writer = csv.DictWriter(f, fieldnames=fieldnames)
            writer.writeheader()
            writer.writerows(data)
        logger.info(f"Results written to {output_path}")
    except Exception as e:
        logger.error(f"Failed to write results: {e}")
