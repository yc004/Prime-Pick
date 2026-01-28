
import sqlite3
import os
import json
import logging
from typing import Optional, Dict, Any
from photo_selector.config import CACHE_SCHEMA_VERSION

logger = logging.getLogger(__name__)

class CacheSQLite:
    def __init__(self, db_path: str = "cache.db"):
        self.db_path = db_path
        self._conn = None
        self._init_db()

    def _init_db(self):
        self._conn = sqlite3.connect(self.db_path, check_same_thread=False)
        self._conn.row_factory = sqlite3.Row
        with self._conn:
            self._conn.execute("""
                CREATE TABLE IF NOT EXISTS metrics_cache (
                    signature TEXT PRIMARY KEY,
                    schema_version TEXT,
                    data TEXT,
                    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            """)
            
    def close(self):
        if self._conn:
            self._conn.close()

    def get(self, signature: str) -> Optional[Dict[str, Any]]:
        try:
            cursor = self._conn.execute(
                "SELECT data FROM metrics_cache WHERE signature = ? AND schema_version = ?",
                (signature, CACHE_SCHEMA_VERSION)
            )
            row = cursor.fetchone()
            if row:
                return json.loads(row['data'])
        except Exception as e:
            logger.error(f"Cache read error: {e}")
        return None

    def put(self, signature: str, data: Dict[str, Any]):
        try:
            json_data = json.dumps(data)
            with self._conn:
                self._conn.execute(
                    """
                    INSERT OR REPLACE INTO metrics_cache (signature, schema_version, data)
                    VALUES (?, ?, ?)
                    """,
                    (signature, CACHE_SCHEMA_VERSION, json_data)
                )
        except Exception as e:
            logger.error(f"Cache write error: {e}")

    @staticmethod
    def generate_signature(file_path: str, long_edge: int) -> str:
        try:
            stat = os.stat(file_path)
            # Signature includes file path, size, mtime, and processing parameters (long_edge)
            return f"{file_path}|{stat.st_size}|{stat.st_mtime}|{long_edge}"
        except OSError:
            return ""

