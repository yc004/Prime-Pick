# photo_selector/config.py
# -*- coding: utf-8 -*-

from dataclasses import dataclass
from typing import Dict


@dataclass(frozen=True)
class ExposureThresholds:
    """
    曝光判定阈值（基于 8-bit 亮度通道 0~255）
    说明：
    - white_ratio / black_ratio：分别是高亮/暗部像素占比
    - p1/p5/p95/p99：亮度分位数（百分位）
    - dynamic_range：p95 - p5，代表有效动态范围（越大通常越好）
    """
    # 统计像素占比时使用的阈值（可按相机/风格微调）
    white_pixel_value: int = 250   # >= 250 视为“接近纯白”
    black_pixel_value: int = 5     # <= 5 视为“接近纯黑”

    # 欠曝判定（可用/不可用的“硬门槛”）
    under_black_ratio: float = 0.18   # 暗部占比过高 => 欠曝
    under_p5_max: int = 35            # p5 太低 => 欠曝（画面整体偏暗）
    under_p50_max: int = 75           # p50 太低 => 偏暗（辅助判据）

    # 过曝判定（硬门槛）
    over_white_ratio: float = 0.08    # 高亮占比过高 => 过曝
    over_p95_min: int = 235           # p95 太高 => 高亮区域过多
    over_p50_min: int = 175           # p50 太高 => 整体偏亮（辅助判据）

    # 高光剪切（更严格：用于标记“不可用”或强烈降分）
    clip_white_ratio: float = 0.03    # 纯白占比（更严格）
    clip_p99_min: int = 252

    # 阴影死黑（更严格）
    crush_black_ratio: float = 0.30
    crush_p1_max: int = 3

    # 动态范围太小（强烈降分/可判不可用，取决于你的策略）
    min_dynamic_range: int = 55


@dataclass(frozen=True)
class SharpnessThresholds:
    """
    清晰度阈值（拉普拉斯方差等指标会对分辨率/镜头/降噪有差异）
    这里给出一个可用的起点：你跑一批图后再微调。
    """
    # 小于该值判定为“明显模糊不可用”
    blurry_var_laplace_max: float = 120.0

    # 用于把清晰度映射到 0~100 分的参考范围（可调）
    score_min_ref: float = 50.0
    score_max_ref: float = 900.0


@dataclass(frozen=True)
class Weights:
    """
    综合技术评分权重（总和不一定必须=1，但建议接近）
    """
    sharpness: float = 0.55
    exposure: float = 0.45


@dataclass(frozen=True)
class UnusablePolicy:
    """
    不可用照片判定策略（硬规则）
    """
    # 是否将“高光剪切/阴影死黑”直接判为不可用
    clip_is_unusable: bool = True
    crush_is_unusable: bool = True

    # 是否将“动态范围过小”判为不可用（夜景可能容易误伤）
    low_dynamic_range_is_unusable: bool = False

    # 综合分低于此阈值也加入删除建议（即使不触发硬规则）
    delete_score_threshold: float = 35.0


@dataclass(frozen=True)
class ProfileConfig:
    name: str
    exposure: ExposureThresholds
    sharpness: SharpnessThresholds
    weights: Weights
    policy: UnusablePolicy


# ---------------------------
# 预设三套 Profile（你可按常拍场景选用）
# ---------------------------

PROFILES: Dict[str, ProfileConfig] = {
    # 1) 常规白天/室外：对过曝更敏感（天空、皮肤高光容易炸）
    "daylight": ProfileConfig(
        name="daylight",
        exposure=ExposureThresholds(
            under_black_ratio=0.16,
            over_white_ratio=0.07,
            clip_white_ratio=0.025,
            crush_black_ratio=0.28,
            min_dynamic_range=60,
        ),
        sharpness=SharpnessThresholds(
            blurry_var_laplace_max=130.0
        ),
        weights=Weights(sharpness=0.55, exposure=0.45),
        policy=UnusablePolicy(
            clip_is_unusable=True,
            crush_is_unusable=True,
            low_dynamic_range_is_unusable=False,
            delete_score_threshold=35.0
        ),
    ),

    # 2) 室内活动/婚礼：允许更多暗部，但不能糊；对欠曝适度放宽
    "event_indoor": ProfileConfig(
        name="event_indoor",
        exposure=ExposureThresholds(
            under_black_ratio=0.22,
            under_p5_max=30,
            under_p50_max=70,
            over_white_ratio=0.08,
            clip_white_ratio=0.03,
            crush_black_ratio=0.35,
            min_dynamic_range=50,
        ),
        sharpness=SharpnessThresholds(
            blurry_var_laplace_max=140.0
        ),
        weights=Weights(sharpness=0.60, exposure=0.40),
        policy=UnusablePolicy(
            clip_is_unusable=True,
            crush_is_unusable=False,  # 室内暗光更容易“黑”，先别一刀切
            low_dynamic_range_is_unusable=False,
            delete_score_threshold=32.0
        ),
    ),

    # 3) 夜景/暗光：尽量不误伤欠曝；重点剔除糊片和严重剪切
    "night": ProfileConfig(
        name="night",
        exposure=ExposureThresholds(
            under_black_ratio=0.30,
            under_p5_max=22,
            under_p50_max=60,
            over_white_ratio=0.10,
            clip_white_ratio=0.035,
            crush_black_ratio=0.45,
            min_dynamic_range=40,
        ),
        sharpness=SharpnessThresholds(
            blurry_var_laplace_max=150.0
        ),
        weights=Weights(sharpness=0.65, exposure=0.35),
        policy=UnusablePolicy(
            clip_is_unusable=True,
            crush_is_unusable=False,
            low_dynamic_range_is_unusable=False,
            delete_score_threshold=30.0
        ),
    ),
}


def get_profile(profile_name: str) -> ProfileConfig:
    """
    获取配置；若输入无效则回退到 daylight。
    """
    return PROFILES.get(profile_name, PROFILES["daylight"])


# ---------------------------
# 兼容性适配层 (Compatibility Layer)
# ---------------------------
# 原有代码依赖 Config 类及其静态成员。
# 这里将 Profile 配置映射回 Config 类，以便 main.py 等模块能正常运行。
class Config:
    _profile = PROFILES["daylight"]  # 默认使用 daylight 配置

    # --- Sharpness ---
    SHARPNESS_THRESHOLD = _profile.sharpness.blurry_var_laplace_max

    # --- Exposure: Pixel Values ---
    HIGHLIGHT_THRESHOLD = _profile.exposure.white_pixel_value
    SHADOW_THRESHOLD = _profile.exposure.black_pixel_value

    # --- Exposure: Ratios ---
    # 对应原有的 MAX_XXX_RATIO
    MAX_HIGHLIGHT_RATIO = _profile.exposure.clip_white_ratio
    MAX_SHADOW_RATIO = _profile.exposure.crush_black_ratio
    MAX_WHITE_RATIO = _profile.exposure.over_white_ratio
    MAX_BLACK_RATIO = _profile.exposure.under_black_ratio

    # --- Exposure: Percentile Thresholds ---
    # 原逻辑：p99 < MIN_P99 => 太暗
    # 新配置没直接对应，这里沿用 MVP 默认值或根据新配置推导
    MIN_P99_VALUE = 150         
    MAX_P1_VALUE = 50           

    # --- Exposure: Triggers ---
    # 沿用 MVP 默认值
    OVEREXPOSED_P95_TRIGGER = 240
    UNDEREXPOSED_P5_TRIGGER = 20

    # --- Weights ---
    WEIGHT_SHARPNESS = _profile.weights.sharpness
    WEIGHT_EXPOSURE = _profile.weights.exposure
    
    # --- File Extensions ---
    SUPPORTED_EXTENSIONS = ('.jpg', '.jpeg', '.JPG', '.JPEG')

    # --- Rating Thresholds (XMP) ---
    RATING_5_MIN = 85.0
    RATING_4_MIN = 70.0
    RATING_3_MIN = 55.0
    
    # --- Labels ---
    LABEL_REJECTED = "Rejected"
    LABEL_PICKED = "Green"  # or "Select" or user defined

