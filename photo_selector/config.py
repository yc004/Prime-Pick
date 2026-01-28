
from dataclasses import dataclass, field
from typing import Dict, List, Optional

# Version for cache invalidation
CACHE_SCHEMA_VERSION = "1.0.0"

@dataclass
class Config:
    # Decoding
    DEFAULT_LONG_EDGE: int = 1024
    
    # Thresholds
    # With grid-based detection, we focus on the sharpest 25% of the image.
    # The variance is typically higher for sharp blocks than global variance.
    # But since we also downscale to 1024px width, noise is reduced.
    # A safe starting point for "Acceptable Sharpness" is around 150-300 depending on content.
    # Let's bump it slightly from 100 to 120 as a baseline, assuming user wants strictness.
    # User feedback: "Too many sharp photos marked as blurry" -> LOWER threshold or better algo.
    # Since we improved algo to be MORE robust (higher scores for bokeh images), 
    # we can keep threshold reasonable or slightly higher.
    # But wait, if user said "NOT blurry photos were misclassified as blurry",
    # it means the algorithm gave them a LOW score.
    # The new algorithm will give them a HIGHER score (by ignoring background).
    # So we can keep the threshold or slightly increase it to match the new scale.
    # Let's set it to 100.0 (conservative) for now. 
    # Actually, for 1024px resized images, variance drops significantly compared to 6000px images.
    # 100.0 is a reasonable cutoff for 1024px width.
    SHARPNESS_THRESHOLD: float = 100.0
    
    # Exposure thresholds (percentiles)
    # If p50 < LOW_LIGHT_THRESHOLD -> underexposed
    # If p50 > HIGH_LIGHT_THRESHOLD -> overexposed
    LOW_LIGHT_THRESHOLD: int = 40
    HIGH_LIGHT_THRESHOLD: int = 220
    
    # Weights for Technical Score
    WEIGHT_SHARPNESS: float = 0.6
    WEIGHT_EXPOSURE: float = 0.4
    
    # XMP
    XMP_NAMESPACE_URI: str = "http://ns.adobe.com/xap/1.0/"

    GROUP_BEST_MIN_RATING: int = 4
    GROUP_TOP1_RATING: int = 5
    GROUP_NONBEST_MODE: str = "keep"
    GROUP_NONBEST_MAX_RATING: int = 2
    GROUP_ADD_KEYWORDS: bool = True
    GROUP_SIMILAR_BUT_WORSE_DELTA: float = 15.0
    
    # Profile specific overrides (can be implemented as needed)
    
# Global instance or load function can be used
default_config = Config()
