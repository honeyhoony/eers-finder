# database.py — 순서가 중요!

from __future__ import annotations
import os, sys, shutil
from contextlib import contextmanager
from datetime import datetime

from sqlalchemy import (
    create_engine, Column, Integer, String, Boolean, UniqueConstraint, DateTime, text
)
from sqlalchemy.exc import OperationalError
from sqlalchemy.orm import declarative_base, sessionmaker
try:
    import config
    SUPABASE_DB_URL = getattr(config, "SUPABASE_DB_URL", "")
except ImportError:
    SUPABASE_DB_URL = ""

# ─────────────────────────────────────────
# 0) 실행/경로 유틸 → DB_PATH 결정 (제일 먼저!)
# ─────────────────────────────────────────
APP_DIR_NAME = "EERSTracker"

def _is_frozen() -> bool:
    return getattr(sys, "frozen", False)

def _bundle_dir() -> str:
    if _is_frozen():
        return getattr(sys, "_MEIPASS", os.path.dirname(sys.executable))
    return os.path.abspath(os.path.dirname(__file__))

def _user_data_dir() -> str:
    if os.name == "nt":
        base = os.getenv("LOCALAPPDATA") or os.path.expanduser("~")
        return os.path.join(base, APP_DIR_NAME)
    return os.path.join(os.path.expanduser("~/.local/share"), APP_DIR_NAME)

def _resolve_db_path() -> str:
    if _is_frozen():
        portable_db_path = os.path.join(os.path.dirname(sys.executable), "eers_data.db")
        if os.path.exists(portable_db_path):
            return portable_db_path
    env = os.getenv("EERS_DB_PATH")
    if env:
        return os.path.abspath(env)
    base = _user_data_dir() if _is_frozen() else os.path.join(_bundle_dir(), "data")
    os.makedirs(base, exist_ok=True)
    return os.path.join(base, "eers_data.db")

DB_PATH = _resolve_db_path()

def _maybe_seed(dst_path: str):
    if os.path.exists(dst_path):
        return
    candidates = []
    side_dir = os.path.dirname(sys.executable) if _is_frozen() else _bundle_dir()
    candidates.append(os.path.join(side_dir, "eers_data.db"))
    candidates.append(os.path.join(_bundle_dir(), "eers_data_seed.db"))
    for src in candidates:
        if os.path.exists(src):
            try:
                shutil.copyfile(src, dst_path)
                print(f"[seed] copied {src} -> {dst_path}")
                return
            except Exception as e:
                print(f"[seed] copy failed: {e}")

_maybe_seed(DB_PATH)
print("[DB] using:", DB_PATH)

# ─────────────────────────────────────────
# 1) Base → (모든) 모델 정의
# ─────────────────────────────────────────
Base = declarative_base()

class Notice(Base):
    __tablename__ = "notices"
    id              = Column(Integer, primary_key=True, autoincrement=True)
    is_favorite     = Column(Boolean, default=False, index=True, nullable=False)
    stage           = Column(String)
    biz_type        = Column(String)
    project_name    = Column(String)
    client          = Column(String)
    address         = Column(String)
    phone_number    = Column(String)
    model_name      = Column(String, nullable=False, default="N/A")
    quantity        = Column(Integer)
    amount          = Column(String)
    is_certified    = Column(String)
    notice_date     = Column(String, index=True)
    detail_link     = Column(String, nullable=False)
    assigned_office = Column(String, nullable=False, index=True, default="관할지사확인요망")
    assigned_hq     = Column(String, default="본부확인요망", index=True)
    status          = Column(String, default="")
    memo            = Column(String, default="")
    # 출처 구분(G2B/K-APT)
    source_system   = Column(String, default='G2B', index=True, nullable=False)
    kapt_code       = Column(String, index=True, nullable=True)

    # AI Analysis Fields
    ai_suitability_score  = Column(Integer, default=0)       # 적합도 점수 (0~100)
    ai_suitability_reason = Column(String, default="")       # 적합도 이유
    ai_call_tips          = Column(String, default="")       # 담당자 안내 멘트/팁
    ai_keywords           = Column(String, default="")       # 추출 키워드 (쉼표 구분)
    manager_name          = Column(String, nullable=True)
    manager_email         = Column(String, nullable=True)
    manager_phone         = Column(String, nullable=True)
    followup_at           = Column(DateTime, nullable=True)
    client_fax            = Column(String, nullable=True)
    client_url            = Column(String, nullable=True)
    raw_data              = Column(String, default="{}")     # 원본 API 응답 데이터 (JSON 문자열)

    __table_args__ = (
        UniqueConstraint("source_system", "detail_link", "model_name", "assigned_office",
                         name="_source_detail_model_office_uc"),
    )

class MailRecipient(Base):
    __tablename__ = "mail_recipients"
    id        = Column(Integer, primary_key=True, autoincrement=True)
    office    = Column(String, index=True, nullable=False)   # 지사
    email     = Column(String, nullable=False)               # 수신 이메일
    is_active = Column(Boolean, default=True, nullable=False)
    name = Column(String, nullable=True)  # <-- 나라장터 복구 후 데이터 받을수 있을때, eers_data.db 삭제 후 문구 추가
    __table_args__ = (UniqueConstraint("office", "email", name="uq_office_email"),)

class MailHistory(Base):
    __tablename__ = "mail_history"
    id           = Column(Integer, primary_key=True, autoincrement=True)
    sent_at      = Column(DateTime, default=datetime.utcnow, index=True)
    office       = Column(String, index=True, nullable=False)
    subject      = Column(String, nullable=False)
    period_start = Column(String, nullable=False)   # YYYY-MM-DD
    period_end   = Column(String, nullable=False)   # YYYY-MM-DD
    to_list      = Column(String, nullable=False)   # 세미콜론 구분
    cc_list      = Column(String, default="")
    total_count  = Column(Integer, default=0)
    attach_name  = Column(String, default="")
    preview_html = Column(String, default="")

# ─────────────────────────────────────────
# 2) Engine / Session → create_all
# ─────────────────────────────────────────
# ─────────────────────────────────────────
# 2) Engine / Session → create_all
# ─────────────────────────────────────────
if SUPABASE_DB_URL:
    # Postgres (Supabase)
    # pool_pre_ping=True handles disconnects
    engine = create_engine(SUPABASE_DB_URL, pool_pre_ping=True)
    print(f"[DB] Using Supabase PostgreSQL")
else:
    # SQLite (Local)
    engine = create_engine(f"sqlite:///{DB_PATH}", connect_args={"timeout": 15})
    print(f"[DB] Using Local SQLite: {DB_PATH}")

SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
Base.metadata.create_all(engine)

@contextmanager
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ─────────────────────────────────────────
# 3) 마이그레이션: unique index 정합성 보장
# ─────────────────────────────────────────
with engine.begin() as conn:
    try:
        conn.exec_driver_sql("DROP INDEX IF EXISTS ux_notices_detail_link")
        print("[migrate] dropped index ux_notices_detail_link")
    except Exception as e:
        print("[migrate] drop legacy index warn:", e)

    try:
        conn.exec_driver_sql("DROP INDEX IF EXISTS _detail_model_office_uc")
        print("[migrate] dropped legacy index _detail_model_office_uc")
    except Exception as e:
        print("[migrate] drop legacy 3-col index warn:", e)

    if engine.dialect.name == "sqlite":
        idx_rows = conn.exec_driver_sql("PRAGMA index_list('notices')").all()
        existing = {row[1] for row in idx_rows}
        target_idx_name = "_source_detail_model_office_uc"
        if target_idx_name not in existing:
            conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS _source_detail_model_office_uc "
                "ON notices(source_system, detail_link, model_name, assigned_office)"
            )
            print(f"[migrate] created unique index {target_idx_name}")
        else:
            cols = conn.exec_driver_sql(f"PRAGMA index_info('{target_idx_name}')").all()
            col_list = [c[2] for c in cols]
            if col_list != ["source_system", "detail_link", "model_name", "assigned_office"]:
                conn.exec_driver_sql(f"DROP INDEX {target_idx_name}")
                conn.exec_driver_sql(
                    "CREATE UNIQUE INDEX _source_detail_model_office_uc "
                    "ON notices(source_system, detail_link, model_name, assigned_office)"
                )
                print(f"[migrate] recreated unique index {target_idx_name}")
    else:
        # Postgres or other: CREATE UNIQUE INDEX IF NOT EXISTS is standard enough in PG
        try:
            conn.exec_driver_sql(
                "CREATE UNIQUE INDEX IF NOT EXISTS _source_detail_model_office_uc "
                "ON notices(source_system, detail_link, model_name, assigned_office)"
            )
            print("[migrate] (postgres) ensured unique index _source_detail_model_office_uc")
        except Exception as e:
            print("[migrate] (postgres) failed to create unique index:", e)

    # ---------------------------------------------------------
    # 3-1) AI 컬럼 추가 마이그레이션 (없는 경우 추가)
    # ---------------------------------------------------------
    def _add_column_if_not_exists(conn, table_name, col_name, col_type_sql):
        if engine.dialect.name == "sqlite":
            # sqlite pragma table_info
            cols = conn.exec_driver_sql(f"PRAGMA table_info('{table_name}')").all()
            # col[1] is name
            existing_names = [c[1] for c in cols]
            if col_name not in existing_names:
                try:
                    conn.exec_driver_sql(f"ALTER TABLE {table_name} ADD COLUMN {col_name} {col_type_sql}")
                    print(f"[migrate] added column {table_name}.{col_name}")
                except Exception as e:
                    print(f"[migrate] failed to add column {col_name}: {e}")
        else:
            # Postgres: check information_schema with more robust logic
            # Using DO block to avoid multiple ALTER TABLE attempts if columns exist
            conn.exec_driver_sql(f"""
                DO $$ 
                BEGIN 
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'ai_suitability_score') THEN 
                        ALTER TABLE {table_name} ADD COLUMN ai_suitability_score INTEGER DEFAULT 0; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'ai_suitability_reason') THEN 
                        ALTER TABLE {table_name} ADD COLUMN ai_suitability_reason TEXT DEFAULT ''; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'ai_call_tips') THEN 
                        ALTER TABLE {table_name} ADD COLUMN ai_call_tips TEXT DEFAULT ''; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'ai_keywords') THEN 
                        ALTER TABLE {table_name} ADD COLUMN ai_keywords TEXT DEFAULT ''; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'assigned_hq') THEN 
                        ALTER TABLE {table_name} ADD COLUMN assigned_hq VARCHAR(255) DEFAULT '본부확인요망'; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'raw_data') THEN 
                        ALTER TABLE {table_name} ADD COLUMN raw_data TEXT DEFAULT '{{}}'; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'manager_name') THEN 
                        ALTER TABLE {table_name} ADD COLUMN manager_name TEXT; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'manager_email') THEN 
                        ALTER TABLE {table_name} ADD COLUMN manager_email TEXT; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'manager_phone') THEN 
                        ALTER TABLE {table_name} ADD COLUMN manager_phone TEXT; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'followup_at') THEN 
                        ALTER TABLE {table_name} ADD COLUMN followup_at TIMESTAMP; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'client_fax') THEN 
                        ALTER TABLE {table_name} ADD COLUMN client_fax TEXT; 
                    END IF;
                    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = '{table_name}' AND column_name = 'client_url') THEN 
                        ALTER TABLE {table_name} ADD COLUMN client_url TEXT; 
                    END IF;
                END $$;
            """)

    # Note: For Postgres, any one call will add all columns if missing.
    # For SQLite, each call is needed.
    _add_column_if_not_exists(conn, "notices", "ai_suitability_score", "INTEGER DEFAULT 0")
    _add_column_if_not_exists(conn, "notices", "ai_suitability_reason", "TEXT DEFAULT ''")
    _add_column_if_not_exists(conn, "notices", "ai_call_tips", "TEXT DEFAULT ''")
    _add_column_if_not_exists(conn, "notices", "ai_keywords", "TEXT DEFAULT ''")
    _add_column_if_not_exists(conn, "notices", "assigned_hq", "VARCHAR(255) DEFAULT '본부확인요망'")
    _add_column_if_not_exists(conn, "notices", "raw_data", "TEXT DEFAULT '{}'")
    _add_column_if_not_exists(conn, "notices", "manager_name", "TEXT")
    _add_column_if_not_exists(conn, "notices", "manager_email", "TEXT")
    _add_column_if_not_exists(conn, "notices", "manager_phone", "TEXT")
    _add_column_if_not_exists(conn, "notices", "followup_at", "TIMESTAMP")
    _add_column_if_not_exists(conn, "notices", "client_fax", "TEXT")
    _add_column_if_not_exists(conn, "notices", "client_url", "TEXT")

# ─────────────────────────────────────────
# 4) (선택) KEA 모델 캐시 유틸 — 중복 제거 버전
# ─────────────────────────────────────────
def _ensure_kea_cache_table(session):
    try:
        session.execute(text("SELECT 1 FROM kea_model_cache LIMIT 1"))
    except OperationalError:
        session.execute(text("""
            CREATE TABLE IF NOT EXISTS kea_model_cache (
                model_name  TEXT PRIMARY KEY,
                exists_flag INTEGER NOT NULL,
                checked_at  TEXT NOT NULL
            )
        """))

def _kea_cache_get(session, model: str) -> int | None:
    if not model:
        return None
    _ensure_kea_cache_table(session)
    row = session.execute(
        text("SELECT exists_flag, checked_at FROM kea_model_cache WHERE model_name = :m"),
        {"m": model},
    ).fetchone()
    if not row:
        return None
    try:
        return int(row[0])
    except Exception:
        return None

def _kea_cache_set(session, model: str, exists_flag: int) -> None:
    _ensure_kea_cache_table(session)
    session.execute(
        text("""
        INSERT INTO kea_model_cache(model_name, exists_flag, checked_at)
        VALUES (:m, :f, :ts)
        ON CONFLICT(model_name) DO UPDATE SET
            exists_flag = excluded.exists_flag,
            checked_at  = excluded.checked_at
        """),
        {"m": model, "f": int(bool(exists_flag)), "ts": datetime.utcnow().isoformat(timespec="seconds")}
    )
