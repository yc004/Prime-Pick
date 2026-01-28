import sqlite3
import time
from typing import Optional


class EmbeddingCacheSQLite:
    def __init__(self, db_path: str):
        self.db_path = db_path
        self._init_db()

    def _init_db(self) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.cursor()
            cur.execute(
                """
                CREATE TABLE IF NOT EXISTS embeddings (
                    key TEXT PRIMARY KEY,
                    dim INTEGER NOT NULL,
                    vec BLOB NOT NULL,
                    updated_at REAL NOT NULL
                )
                """
            )
            conn.commit()
        finally:
            conn.close()

    def get(self, key: str) -> Optional[bytes]:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.cursor()
            cur.execute("SELECT vec FROM embeddings WHERE key = ?", (key,))
            row = cur.fetchone()
            if not row:
                return None
            return row[0]
        finally:
            conn.close()

    def set(self, key: str, dim: int, vec_bytes: bytes) -> None:
        conn = sqlite3.connect(self.db_path)
        try:
            cur = conn.cursor()
            cur.execute(
                """
                INSERT INTO embeddings (key, dim, vec, updated_at)
                VALUES (?, ?, ?, ?)
                ON CONFLICT(key) DO UPDATE SET
                    dim=excluded.dim,
                    vec=excluded.vec,
                    updated_at=excluded.updated_at
                """,
                (key, dim, sqlite3.Binary(vec_bytes), time.time()),
            )
            conn.commit()
        finally:
            conn.close()

