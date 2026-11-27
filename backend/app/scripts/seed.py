"""Deterministic local seed loader using mock-compatible IDs and credentials."""
from datetime import datetime, timezone
from sqlalchemy import delete
from app.core.security import hash_password
from app.db.base import Base
from app.db.session import SessionLocal, engine
from app.models.models import Department, Setting, User
NOW=datetime(2026,9,1,tzinfo=timezone.utc)
ACCOUNTS=[("usr-6","doctor@aplus.edu","Doctor123","Ahmed Mansour","doctor","dept-1","DR2020001",False),("usr-7","doctor2@aplus.edu","Doctor2!","Sara Nabil","doctor","dept-1","DR2020002",False),("usr-1","student@aplus.edu","Student123","Karim Adel","student","dept-1","CS2023001",False),("usr-2","student2@aplus.edu","Student2!","Nour Hassan","student","dept-1","CS2023002",False),("usr-3","student3@aplus.edu","Student3!","Yara Ibrahim","student","dept-1","CS2023003",False),("usr-4","student4@aplus.edu","Student4!","Omar Farouk","student","dept-1","CS2023004",False),("usr-5","student5@aplus.edu","Student5!","Laila Mostafa","student","dept-1","CS2023005",False),("usr-8","dept@aplus.edu","Dept123","Rania Hatem","department_admin","dept-1","ADM2010001",False),("usr-9","dean@aplus.edu","Dean123","Hassan Ali","super_admin",None,"DEAN2000001",False),("usr-10","disabled@aplus.edu","Disabled123","Disabled Student","student","dept-1","CS2023999",True),("usr-11","dept2@aplus.edu","Dept2!","Dina Essam","department_admin","dept-2","ADM2010002",False),("usr-12","doctor3@aplus.edu","Doctor3!","Khaled Omar","doctor","dept-2","DR2020003",False),("usr-13","student6@aplus.edu","Student6!","Hana Youssef","student","dept-2","IS2023001",False),("usr-14","student7@aplus.edu","Student7!","Fady Samy","student","dept-2","IS2023002",False)]
def reset_seed() -> None:
    """Recreates schema and loads the auth-stage mock-compatible seed records."""
    Base.metadata.drop_all(engine); Base.metadata.create_all(engine)
    with SessionLocal() as db:
        db.add_all([Department(id="dept-1",name="Computer Science",code="CS",college="Faculty of Computing & Information Technology",created_at=NOW),Department(id="dept-2",name="Information Systems",code="IS",college="Faculty of Computing & Information Technology",created_at=NOW)])
        db.add_all([User(id=i,email=e,password_hash=hash_password(p),full_name=n,role=r,department_id=d,university_id=u,disabled=x,created_at=NOW) for i,e,p,n,r,d,u,x in ACCOUNTS])
        db.add(Setting(id="settings-1",absence_warning_threshold=2,rating_cooldown_days=7,points_submission_on_time=50,points_quiz_completion=30,points_attendance_present=10,updated_at=NOW,updated_by=None)); db.commit()
if __name__ == "__main__": reset_seed()
