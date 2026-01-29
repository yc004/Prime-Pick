import os
import time
from datetime import datetime
from typing import Optional


def _parse_exif_datetime(value: str) -> Optional[float]:
    if not value:
        return None
    s = str(value).strip()
    try:
        dt = datetime.strptime(s, "%Y:%m:%d %H:%M:%S")
    except Exception:
        return None
    return time.mktime(dt.timetuple())


def get_capture_timestamp(path: str, source: str = "auto") -> float:
    """
    Returns capture timestamp (epoch seconds).
    source:
      - auto: EXIF first, fallback to file mtime
      - exif: EXIF only, fallback to mtime if unavailable
      - mtime: file modified time only
    """
    src = (source or "auto").strip().lower()
    if src not in ("auto", "exif", "mtime"):
        src = "auto"

    if src in ("auto", "exif"):
        try:
            from PIL import Image, ExifTags

            img = Image.open(path)
            exif = getattr(img, "_getexif", lambda: None)()
            img.close()
            if exif:
                by_name = {}
                for k, v in exif.items():
                    name = ExifTags.TAGS.get(k, k)
                    by_name[name] = v
                for key in ("DateTimeOriginal", "DateTimeDigitized", "DateTime"):
                    ts = _parse_exif_datetime(by_name.get(key))
                    if ts is not None:
                        return float(ts)
        except Exception:
            pass

    try:
        return float(os.stat(path).st_mtime)
    except Exception:
        return 0.0

