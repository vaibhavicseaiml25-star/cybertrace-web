import os
import shutil
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

DB_FILENAME = "cybertrace.db"

if os.environ.get("VERCEL"):
    tmp_db_path = f"/tmp/{DB_FILENAME}"
    if not os.path.exists(tmp_db_path) and os.path.exists(DB_FILENAME):
        shutil.copy2(DB_FILENAME, tmp_db_path)
    SQLALCHEMY_DATABASE_URL = f"sqlite:///{tmp_db_path}"
else:
    SQLALCHEMY_DATABASE_URL = f"sqlite:///./{DB_FILENAME}"

engine = create_engine(
    SQLALCHEMY_DATABASE_URL, connect_args={"check_same_thread": False}
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()