import sqlite3
from pathlib import Path


DB_PATH = Path(__file__).resolve().parent / "ecollm.db"


def get_connection():
    return sqlite3.connect(DB_PATH)


def init_db():
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS analysis_runs (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                prompt TEXT NOT NULL,
                prompt_type TEXT NOT NULL,
                model_id TEXT NOT NULL,
                answer TEXT NOT NULL,
                latency REAL NOT NULL,
                energy REAL NOT NULL,
                tokens INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
            """
        )
        connection.commit()
