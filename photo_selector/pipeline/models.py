
from dataclasses import dataclass, field
from typing import List, Dict, Any, Optional

@dataclass
class SharpnessResult:
    score: float
    is_blurry: bool

@dataclass
class ExposureResult:
    score: float
    p1: int
    p5: int
    p50: int
    p95: int
    p99: int
    white_ratio: float
    black_ratio: float
    dynamic_range: int
    flags: List[str] = field(default_factory=list)

@dataclass
class MetricsResult:
    filename: str
    sharpness: Optional[SharpnessResult] = None
    exposure: Optional[ExposureResult] = None
    
    technical_score: float = 0.0
    is_unusable: bool = False
    reasons: List[str] = field(default_factory=list)

    capture_ts: float = 0.0
    group_id: int = -1
    group_size: int = 1
    rank_in_group: int = 1
    is_group_best: bool = False
    
    emotion: Optional[str] = None
    emotion_score: Optional[float] = None

    # For caching, we might want to store the raw values as a dict or similar
    # but dataclass is fine.
    
    def to_dict(self) -> Dict[str, Any]:
        """Flatten for CSV writing"""
        data = {
            "filename": self.filename,
            "technical_score": self.technical_score,
            "is_unusable": self.is_unusable,
            "reasons": ";".join(self.reasons),
            "capture_ts": float(self.capture_ts or 0.0),
            "group_id": int(self.group_id),
            "group_size": int(self.group_size),
            "rank_in_group": int(self.rank_in_group),
            "is_group_best": bool(self.is_group_best),
            "emotion": self.emotion if self.emotion else "",
            "emotion_score": float(self.emotion_score) if self.emotion_score is not None else ""
        }
        
        if self.sharpness:
            data["sharpness_score"] = self.sharpness.score
            data["is_blurry"] = self.sharpness.is_blurry
            
        if self.exposure:
            data["exposure_score"] = self.exposure.score
            data["exp_p1"] = self.exposure.p1
            data["exp_p5"] = self.exposure.p5
            data["exp_p50"] = self.exposure.p50
            data["exp_p95"] = self.exposure.p95
            data["exp_p99"] = self.exposure.p99
            data["white_ratio"] = self.exposure.white_ratio
            data["black_ratio"] = self.exposure.black_ratio
            data["dynamic_range"] = self.exposure.dynamic_range
            data["exposure_flags"] = ";".join(self.exposure.flags)
            
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MetricsResult':
        # Basic reconstruction, might need more robustness
        res = cls(filename=data.get("filename", ""))
        res.technical_score = float(data.get("technical_score", 0))
        res.is_unusable = str(data.get("is_unusable", "False")).lower() == "true"
        res.reasons = data.get("reasons", "").split(";") if data.get("reasons") else []
        if "capture_ts" in data:
            try:
                res.capture_ts = float(data.get("capture_ts", 0.0) or 0.0)
            except Exception:
                res.capture_ts = 0.0
        if "group_id" in data:
            try:
                res.group_id = int(float(data.get("group_id", -1)))
            except Exception:
                res.group_id = -1
        if "group_size" in data:
            try:
                res.group_size = int(float(data.get("group_size", 1)))
            except Exception:
                res.group_size = 1
        if "rank_in_group" in data:
            try:
                res.rank_in_group = int(float(data.get("rank_in_group", 1)))
            except Exception:
                res.rank_in_group = 1
        if "is_group_best" in data:
            v = data.get("is_group_best", False)
            res.is_group_best = str(v).lower() == "true" if not isinstance(v, bool) else bool(v)
        
        res.emotion = data.get("emotion") if data.get("emotion") else None
        if "emotion_score" in data and data.get("emotion_score") not in (None, ""):
            try:
                res.emotion_score = float(data.get("emotion_score"))
            except Exception:
                res.emotion_score = None

        if "sharpness_score" in data:
            res.sharpness = SharpnessResult(
                score=float(data["sharpness_score"]),
                is_blurry=str(data.get("is_blurry", "False")).lower() == "true"
            )
            
        if "exposure_score" in data:
            res.exposure = ExposureResult(
                score=float(data["exposure_score"]),
                p1=int(data.get("exp_p1", 0)),
                p5=int(data.get("exp_p5", 0)),
                p50=int(data.get("exp_p50", 0)),
                p95=int(data.get("exp_p95", 0)),
                p99=int(data.get("exp_p99", 0)),
                white_ratio=float(data.get("white_ratio", 0)),
                black_ratio=float(data.get("black_ratio", 0)),
                dynamic_range=int(data.get("dynamic_range", 0)),
                flags=data.get("exposure_flags", "").split(";") if data.get("exposure_flags") else []
            )
        return res
