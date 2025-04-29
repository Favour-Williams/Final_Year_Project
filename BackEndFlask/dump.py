import sqlite3
import os

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(BASE_DIR, "boneDetection.db")

def dump_db():
    conn = sqlite3.connect(DB_PATH)
    with open('backup.sql', 'w') as f:
        for line in conn.iterdump():
            f.write(f'{line}\n')
    conn.close()
    print("Database dumped to backup.sql")

if __name__ == "__main__":
    dump_db()