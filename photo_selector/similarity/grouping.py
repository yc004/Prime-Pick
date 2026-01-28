import json
import os
import sys
from dataclasses import asdict, dataclass
from typing import Callable, Dict, List, Optional, Tuple

import numpy as np

from photo_selector.io.embedding_cache_sqlite import EmbeddingCacheSQLite
from photo_selector.io.image_reader import read_and_resize
from photo_selector.pipeline.models import MetricsResult


def make_embedding_key(
    file_path: str,
    file_size: int,
    mtime: float,
    thumb_long_edge: int,
    embed_model: str,
) -> str:
    return f"{embed_model}|{thumb_long_edge}|{file_path}|{file_size}|{mtime:.6f}"


def _load_torch_model(embed_model: str):
    try:
        import torch
        import torchvision
    except Exception as e:
        raise RuntimeError(
            "缺少相似分组依赖：请安装 torch 与 torchvision（CPU 版即可）。"
        ) from e

    embed_model = (embed_model or "").strip().lower()
    if embed_model in ("mobilenetv3", "mobilenet_v3_small", "mbv3_small"):
        weights = torchvision.models.MobileNet_V3_Small_Weights.DEFAULT

        # Try to find bundled model first
        model_path = None
        if getattr(sys, 'frozen', False):
            # PyInstaller temp dir
            base_path = sys._MEIPASS
            candidate = os.path.join(base_path, 'models', 'mobilenet_v3_small.pth')
            if os.path.exists(candidate):
                model_path = candidate
        else:
            # Dev environment
            base_path = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
            candidate = os.path.join(base_path, 'models', 'mobilenet_v3_small.pth')
            if os.path.exists(candidate):
                model_path = candidate

        if model_path:
            model = torchvision.models.mobilenet_v3_small(weights=None)
            state_dict = torch.load(model_path, map_location="cpu")
            model.load_state_dict(state_dict)
        else:
            model = torchvision.models.mobilenet_v3_small(weights=weights)

        feature_dim = model.classifier[0].in_features

        def forward_features(x):
            x = model.features(x)
            x = model.avgpool(x)
            x = torch.flatten(x, 1)
            return x

        preprocess = weights.transforms()
        model.eval()
        return torch, model, preprocess, forward_features, feature_dim

    if embed_model in ("mobilenet_v3_large", "mbv3_large"):
        weights = torchvision.models.MobileNet_V3_Large_Weights.DEFAULT
        model = torchvision.models.mobilenet_v3_large(weights=weights)
        feature_dim = model.classifier[0].in_features

        def forward_features(x):
            x = model.features(x)
            x = model.avgpool(x)
            x = torch.flatten(x, 1)
            return x

        preprocess = weights.transforms()
        model.eval()
        return torch, model, preprocess, forward_features, feature_dim

    if embed_model in ("resnet50", "resnet_50"):
        weights = torchvision.models.ResNet50_Weights.DEFAULT
        model = torchvision.models.resnet50(weights=weights)
        feature_dim = model.fc.in_features
        model.fc = torch.nn.Identity()
        preprocess = weights.transforms()
        model.eval()

        def forward_features(x):
            return model(x)

        return torch, model, preprocess, forward_features, feature_dim

    raise ValueError(f"不支持的 embedding 模型：{embed_model}")


def _to_pil_rgb(img_bgr) -> "object":
    try:
        from PIL import Image
    except Exception as e:
        raise RuntimeError("缺少依赖：Pillow（PIL）。torchvision 的 transforms 需要它。") from e

    import cv2

    img_rgb = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2RGB)
    return Image.fromarray(img_rgb)


def _l2_normalize(x: np.ndarray, eps: float = 1e-12) -> np.ndarray:
    n = np.linalg.norm(x, axis=1, keepdims=True)
    n = np.maximum(n, eps)
    return x / n


def _cosine_sim(a: np.ndarray, b: np.ndarray) -> float:
    return float(np.dot(a, b))

def _cv2_hist_embedding(img_bgr) -> np.ndarray:
    import cv2

    hsv = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2HSV)
    hist = cv2.calcHist([hsv], [0, 1, 2], None, [8, 8, 8], [0, 180, 0, 256, 0, 256])
    hist = hist.astype(np.float32).reshape(1, -1)
    hist = hist / (float(hist.sum()) + 1e-6)
    hist = _l2_normalize(hist)[0]
    return hist.astype(np.float32)


def compute_embeddings(
    file_paths: List[str],
    embed_model: str,
    thumb_long_edge: int,
    cache: EmbeddingCacheSQLite,
    batch_size: int = 32,
    device: str = "cpu",
    progress_callback: Optional[Callable[[int, int, int], None]] = None,
) -> Tuple[np.ndarray, int]:
    embed_model_norm = (embed_model or "").strip().lower()
    if embed_model_norm in ("cv2_hist", "opencv_hist"):
        feature_dim = 512
        total = len(file_paths)
        out = np.zeros((total, feature_dim), dtype=np.float32)
        cache_hits = 0
        for i, fp in enumerate(file_paths):
            st = os.stat(fp)
            k = make_embedding_key(fp, st.st_size, st.st_mtime, thumb_long_edge, embed_model_norm)
            cached = cache.get(k)
            if cached is not None:
                vec = np.frombuffer(cached, dtype=np.float32)
                if vec.shape[0] == feature_dim:
                    out[i] = vec
                    cache_hits += 1
                    if progress_callback:
                        progress_callback(i + 1, total, cache_hits)
                    continue

            img = read_and_resize(fp, target_long_edge=thumb_long_edge)
            if img is None:
                out[i] = np.zeros((feature_dim,), dtype=np.float32)
                if progress_callback:
                    progress_callback(i + 1, total, cache_hits)
                continue

            vec = _cv2_hist_embedding(img)
            out[i] = vec
            cache.set(k, feature_dim, vec.astype(np.float32).tobytes())
            if progress_callback:
                progress_callback(i + 1, total, cache_hits)
        return out, cache_hits

    torch, model, preprocess, forward_features, feature_dim = _load_torch_model(embed_model_norm)
    model.to(device)

    total = len(file_paths)
    out = np.zeros((total, feature_dim), dtype=np.float32)
    cache_hits = 0

    batch_images: List[object] = []
    batch_indices: List[int] = []

    def flush_batch():
        nonlocal batch_images, batch_indices
        if not batch_images:
            return
        with torch.inference_mode():
            batch_tensor = torch.stack([preprocess(img) for img in batch_images], dim=0).to(device)
            feats = forward_features(batch_tensor).detach().to("cpu").float().numpy()
        feats = _l2_normalize(feats.astype(np.float32))
        for bi, idx in enumerate(batch_indices):
            out[idx] = feats[bi]
            file_path = file_paths[idx]
            st = os.stat(file_path)
            k = make_embedding_key(file_path, st.st_size, st.st_mtime, thumb_long_edge, embed_model)
            cache.set(k, feats.shape[1], feats[bi].astype(np.float32).tobytes())
        batch_images = []
        batch_indices = []

    for i, fp in enumerate(file_paths):
        st = os.stat(fp)
        k = make_embedding_key(fp, st.st_size, st.st_mtime, thumb_long_edge, embed_model)
        cached = cache.get(k)
        if cached is not None:
            vec = np.frombuffer(cached, dtype=np.float32)
            if vec.shape[0] == feature_dim:
                out[i] = vec
                cache_hits += 1
                if progress_callback:
                    progress_callback(i + 1, total, cache_hits)
                continue

        img = read_and_resize(fp, target_long_edge=thumb_long_edge)
        if img is None:
            out[i] = np.zeros((feature_dim,), dtype=np.float32)
            if progress_callback:
                progress_callback(i + 1, total, cache_hits)
            continue

        pil_img = _to_pil_rgb(img)
        batch_images.append(pil_img)
        batch_indices.append(i)
        if len(batch_images) >= batch_size:
            flush_batch()
        if progress_callback:
            progress_callback(i + 1, total, cache_hits)

    flush_batch()
    return out, cache_hits


def dbscan_windowed_cosine(
    embs: np.ndarray,
    eps: float,
    min_samples: int,
    neighbor_window: int,
    progress_callback: Optional[Callable[[str, int, int], None]] = None,
) -> List[int]:
    n = int(embs.shape[0])
    if n == 0:
        return []

    sim_threshold = 1.0 - float(eps)
    neighbor_window = max(1, int(neighbor_window))
    min_samples = max(1, int(min_samples))

    neighbors: List[List[int]] = [[] for _ in range(n)]
    for i in range(n):
        start = max(0, i - neighbor_window)
        end = min(n, i + neighbor_window + 1)
        vi = embs[i]
        for j in range(start, end):
            if j == i:
                continue
            if _cosine_sim(vi, embs[j]) >= sim_threshold:
                neighbors[i].append(j)
        if progress_callback and (i % 50 == 0 or i == n - 1):
            progress_callback("neighbors", i + 1, n)

    is_core = [False] * n
    for i in range(n):
        if 1 + len(neighbors[i]) >= min_samples:
            is_core[i] = True

    labels = [-1] * n
    visited = [False] * n
    cluster_id = 0

    for i in range(n):
        if visited[i]:
            continue
        visited[i] = True
        if not is_core[i]:
            continue
        queue = [i]
        labels[i] = cluster_id
        qh = 0
        while qh < len(queue):
            p = queue[qh]
            qh += 1
            if not is_core[p]:
                continue
            for q in neighbors[p]:
                if not visited[q]:
                    visited[q] = True
                    if is_core[q]:
                        queue.append(q)
                if labels[q] == -1:
                    labels[q] = cluster_id
        cluster_id += 1
        if progress_callback and (cluster_id % 10 == 0):
            progress_callback("clusters", cluster_id, n)

    return labels


@dataclass
class GroupItem:
    filename: str
    technical_score: float
    rank_in_group: int
    is_group_best: bool


@dataclass
class GroupInfo:
    group_id: int
    group_size: int
    best: List[str]
    items: List[GroupItem]


def apply_grouping_to_results(
    results: List[MetricsResult],
    labels_by_filename: Dict[str, int],
    topk: int,
) -> Tuple[List[MetricsResult], List[GroupInfo], List[GroupItem]]:
    by_gid: Dict[int, List[MetricsResult]] = {}
    for r in results:
        gid = int(labels_by_filename.get(r.filename, -1))
        r.group_id = gid
        by_gid.setdefault(gid, []).append(r)

    groups: List[GroupInfo] = []
    noise_items: List[GroupItem] = []

    for gid, items in by_gid.items():
        items_sorted = sorted(items, key=lambda x: (-float(x.technical_score), str(x.filename)))
        group_size = len(items_sorted)
        for idx, r in enumerate(items_sorted, start=1):
            r.group_size = group_size
            r.rank_in_group = idx
            r.is_group_best = idx <= int(topk)

        if gid == -1:
            for r in items_sorted:
                noise_items.append(
                    GroupItem(
                        filename=r.filename,
                        technical_score=float(r.technical_score),
                        rank_in_group=int(r.rank_in_group),
                        is_group_best=bool(r.is_group_best),
                    )
                )
            continue

        best_files = [r.filename for r in items_sorted[: int(topk)]]
        group_items = [
            GroupItem(
                filename=r.filename,
                technical_score=float(r.technical_score),
                rank_in_group=int(r.rank_in_group),
                is_group_best=bool(r.is_group_best),
            )
            for r in items_sorted
        ]
        groups.append(
            GroupInfo(group_id=int(gid), group_size=group_size, best=best_files, items=group_items)
        )

    groups.sort(key=lambda g: (-g.group_size, g.group_id))
    noise_items.sort(key=lambda x: (-x.technical_score, x.filename))
    return results, groups, noise_items


def write_groups_json(
    output_path: str,
    input_dir: str,
    embed_model: str,
    thumb_long_edge: int,
    eps: float,
    min_samples: int,
    neighbor_window: int,
    topk: int,
    groups: List[GroupInfo],
    noise: List[GroupItem],
) -> None:
    payload = {
        "input_dir": input_dir,
        "embed_model": embed_model,
        "thumb_long_edge": int(thumb_long_edge),
        "eps": float(eps),
        "min_samples": int(min_samples),
        "neighbor_window": int(neighbor_window),
        "topk": int(topk),
        "groups": [
            {
                "group_id": g.group_id,
                "group_size": g.group_size,
                "best": g.best,
                "items": [asdict(it) for it in g.items],
            }
            for g in groups
        ],
        "noise_group_id": -1,
        "noise": [asdict(it) for it in noise],
    }
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, ensure_ascii=False, indent=2)


def run_grouping(
    input_dir: str,
    output_dir: str,
    results: List[MetricsResult],
    embed_model: str,
    thumb_long_edge: int,
    eps: float,
    min_samples: int,
    neighbor_window: int,
    topk: int,
    workers: int,
    batch_size: int,
    progress_callback: Optional[Callable[[Dict], None]] = None,
) -> Tuple[List[MetricsResult], str]:
    os.makedirs(output_dir, exist_ok=True)
    cache_path = os.path.join(output_dir, "embedding_cache.db")
    cache = EmbeddingCacheSQLite(cache_path)

    photo_paths: List[Tuple[str, str]] = []
    for r in results:
        fp = str(r.filename)
        candidate = os.path.normpath(fp)
        if os.path.exists(candidate):
            photo_paths.append((fp, candidate))
            continue
        abs_path = os.path.normpath(os.path.join(input_dir, fp))
        if os.path.exists(abs_path):
            photo_paths.append((fp, abs_path))

    photo_paths.sort(key=lambda x: x[0])
    filenames = [x[0] for x in photo_paths]
    abs_paths = [x[1] for x in photo_paths]

    def on_embed_progress(done: int, total: int, cache_hits: int):
        if progress_callback:
            progress_callback(
                {
                    "type": "group",
                    "stage": "embedding",
                    "done": int(done),
                    "total": int(total),
                    "cache_hit": int(cache_hits),
                }
            )

    embs, cache_hits = compute_embeddings(
        abs_paths,
        embed_model=embed_model,
        thumb_long_edge=thumb_long_edge,
        cache=cache,
        batch_size=batch_size,
        device="cpu",
        progress_callback=on_embed_progress,
    )

    def on_cluster_progress(phase: str, done: int, total: int):
        if progress_callback:
            progress_callback(
                {
                    "type": "group",
                    "stage": "clustering",
                    "phase": phase,
                    "done": int(done),
                    "total": int(total),
                }
            )

    labels = dbscan_windowed_cosine(
        embs=embs,
        eps=eps,
        min_samples=min_samples,
        neighbor_window=neighbor_window,
        progress_callback=on_cluster_progress,
    )
    labels_by_filename = {fn: int(labels[i]) for i, fn in enumerate(filenames)}

    _, groups, noise = apply_grouping_to_results(results, labels_by_filename, topk=topk)

    groups_path = os.path.join(output_dir, "groups.json")
    write_groups_json(
        output_path=groups_path,
        input_dir=input_dir,
        embed_model=embed_model,
        thumb_long_edge=thumb_long_edge,
        eps=eps,
        min_samples=min_samples,
        neighbor_window=neighbor_window,
        topk=topk,
        groups=groups,
        noise=noise,
    )

    if progress_callback:
        progress_callback(
            {
                "type": "group",
                "stage": "write",
                "done": 1,
                "total": 1,
                "groups_file": groups_path,
            }
        )

    return results, groups_path
