import os
import sys
import numpy as np

PROJECT_ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

from photo_selector.similarity.grouping import dbscan_windowed_cosine


def test_time_window_splits_clusters():
    embs = np.array(
        [
            [1.0, 0.0],
            [1.0, 0.0],
            [1.0, 0.0],
            [1.0, 0.0],
        ],
        dtype=np.float32,
    )
    eps = 0.01
    min_samples = 1
    neighbor_window = 10

    labels_no_time = dbscan_windowed_cosine(
        embs=embs,
        eps=eps,
        min_samples=min_samples,
        neighbor_window=neighbor_window,
        time_secs=None,
        timestamps=None,
    )
    assert len(set(labels_no_time)) == 1

    ts = np.array([0.0, 1.0, 100.0, 101.0], dtype=np.float64)
    labels_time = dbscan_windowed_cosine(
        embs=embs,
        eps=eps,
        min_samples=min_samples,
        neighbor_window=neighbor_window,
        time_secs=2.0,
        timestamps=ts,
    )
    assert labels_time[0] == labels_time[1]
    assert labels_time[2] == labels_time[3]
    assert labels_time[0] != labels_time[2]


if __name__ == "__main__":
    test_time_window_splits_clusters()
    print("ok")
