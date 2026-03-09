import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker

import sys
sys.path.insert(0, os.path.join(os.getcwd(), "collector"))
from config import SUPABASE_DB_URL
engine = create_engine(SUPABASE_DB_URL)
Session = sessionmaker(bind=engine)
session = Session()

try:
    # 1. 경북본부로 할당된 전체 건수 확인
    res = session.execute(text("SELECT count(*) FROM notices WHERE assigned_hq = '경북본부'")).fetchone()
    print(f"경북본부 할당 건수: {res[0]}")

    # 2. 최근 공고 5건 확인 (본부 무관)
    print("\n최근 수집된 공고 (전체):")
    res = session.execute(text("SELECT id, source_system, project_name, assigned_hq, assigned_office, address FROM notices ORDER BY notice_date DESC, id DESC LIMIT 5")).fetchall()
    for row in res:
        print(f"- [{row[3]} / {row[4]}] {row[2]} (Source: {row[1]}, Addr: {row[5]})")

    # 3. 주소에 '경북'이나 '경상북도'가 포함되어 있지만 본부가 다른 건 확인
    print("\n주소에 '경북' 포함되나 본부가 '경북본부'가 아닌 건:")
    res = session.execute(text("SELECT id, project_name, assigned_hq, assigned_office, address FROM notices WHERE (address LIKE '%경북%' OR address LIKE '%경상북도%') AND (assigned_hq != '경북본부' OR assigned_hq IS NULL) LIMIT 10")).fetchall()
    for row in res:
        print(f"- [{row[2]} / {row[3]}] {row[1]} (Addr: {row[4]})")

    # 5. 누리장터 데이터의 raw_data 키 확인
    print("\n누리장터(NURI) raw_data 키 확인:")
    res = session.execute(text("SELECT source_system, raw_data FROM notices WHERE source_system = 'NURI' LIMIT 3")).fetchall()
    for row in res:
        import json
        try:
            raw = json.loads(row[1])
            print(f"- Keys: {list(raw.keys())}")
        except:
            print("- JSON 파싱 실패")

finally:
    session.close()
