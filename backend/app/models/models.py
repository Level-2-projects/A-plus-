"""Portable SQLAlchemy 2 typed models for every documented A Plus entity."""
from datetime import date, datetime
from typing import Optional
from sqlalchemy import Boolean, Date, DateTime, ForeignKey, Integer, String, Text, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column
from app.db.base import Base

class IdModel(Base):
    """Provides the string identifiers shared by mock-compatible entities."""
    __abstract__ = True
    id: Mapped[str] = mapped_column(String(36), primary_key=True)
class Department(IdModel):
    """Academic department."""; __tablename__="departments"
    name: Mapped[str]=mapped_column(String(120), unique=True); code: Mapped[str]=mapped_column(String(10),unique=True); college: Mapped[str]=mapped_column(String(160)); created_at: Mapped[datetime]=mapped_column(DateTime)
class User(IdModel):
    """Authenticated account across all roles."""; __tablename__="users"
    email: Mapped[str]=mapped_column(String(120),unique=True,index=True); password_hash: Mapped[str]=mapped_column(String(255)); full_name: Mapped[str]=mapped_column(String(120)); role: Mapped[str]=mapped_column(String(30),index=True); department_id: Mapped[Optional[str]]=mapped_column(ForeignKey("departments.id")); university_id: Mapped[Optional[str]]=mapped_column(String(50),unique=True); disabled: Mapped[bool]=mapped_column(Boolean,default=False); created_at: Mapped[datetime]=mapped_column(DateTime)
class Course(IdModel):
    """Department curriculum course."""; __tablename__="courses"
    code: Mapped[str]=mapped_column(String(20),unique=True); title: Mapped[str]=mapped_column(String(150)); department_id: Mapped[str]=mapped_column(ForeignKey("departments.id"),index=True); doctor_id: Mapped[str]=mapped_column(ForeignKey("users.id")); credit_hours: Mapped[int]=mapped_column(Integer); schedule: Mapped[Optional[str]]=mapped_column(String(100)); room: Mapped[Optional[str]]=mapped_column(String(50)); total_lectures: Mapped[int]=mapped_column(Integer)
class Enrollment(IdModel):
    """Unique student-course registration."""; __tablename__="enrollments"; __table_args__=(UniqueConstraint("student_id","course_id"),)
    student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); course_id: Mapped[str]=mapped_column(ForeignKey("courses.id")); enrolled_at: Mapped[datetime]=mapped_column(DateTime)
class Lecture(IdModel):
    """Course lecture material."""; __tablename__="lectures"
    course_id: Mapped[str]=mapped_column(ForeignKey("courses.id")); number: Mapped[int]=mapped_column(Integer); title: Mapped[str]=mapped_column(String(200)); date: Mapped[date]=mapped_column(Date); material_url: Mapped[Optional[str]]=mapped_column(String(500))
class Assignment(IdModel):
    """Doctor-published course assignment."""; __tablename__="assignments"
    course_id: Mapped[str]=mapped_column(ForeignKey("courses.id")); title: Mapped[str]=mapped_column(String(200)); description: Mapped[str]=mapped_column(Text); due_date: Mapped[datetime]=mapped_column(DateTime); max_grade: Mapped[int]=mapped_column(Integer); created_at: Mapped[datetime]=mapped_column(DateTime)
class Submission(IdModel):
    """One student assignment submission with private AI metadata."""; __tablename__="submissions"; __table_args__=(UniqueConstraint("assignment_id","student_id"),)
    assignment_id: Mapped[str]=mapped_column(ForeignKey("assignments.id")); student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); content: Mapped[str]=mapped_column(Text); submitted_at: Mapped[datetime]=mapped_column(DateTime); is_late: Mapped[bool]=mapped_column(Boolean); ai_score_out_of_10: Mapped[Optional[str]]=mapped_column(String(8)); ai_feedback: Mapped[Optional[str]]=mapped_column(Text); ai_confidence: Mapped[Optional[str]]=mapped_column(String(8)); doctor_final_grade: Mapped[Optional[int]]=mapped_column(Integer); doctor_feedback: Mapped[Optional[str]]=mapped_column(Text); graded_at: Mapped[Optional[datetime]]=mapped_column(DateTime)
class Quiz(IdModel):
    """Automated course quiz."""; __tablename__="quizzes"
    course_id: Mapped[str]=mapped_column(ForeignKey("courses.id")); title: Mapped[str]=mapped_column(String(200)); duration_minutes: Mapped[int]=mapped_column(Integer); available_from: Mapped[datetime]=mapped_column(DateTime); available_to: Mapped[datetime]=mapped_column(DateTime); questions_json: Mapped[str]=mapped_column(Text)
class QuizAttempt(IdModel):
    """Unique student quiz attempt."""; __tablename__="quiz_attempts"; __table_args__=(UniqueConstraint("quiz_id","student_id"),)
    quiz_id: Mapped[str]=mapped_column(ForeignKey("quizzes.id")); student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); answers_json: Mapped[str]=mapped_column(Text); score: Mapped[int]=mapped_column(Integer); total: Mapped[int]=mapped_column(Integer); submitted_at: Mapped[datetime]=mapped_column(DateTime)
class AttendanceSession(IdModel):
    """One course attendance event."""; __tablename__="attendance_sessions"
    course_id: Mapped[str]=mapped_column(ForeignKey("courses.id")); lecture_id: Mapped[Optional[str]]=mapped_column(ForeignKey("lectures.id")); date: Mapped[date]=mapped_column(Date); method: Mapped[str]=mapped_column(String(20))
class AttendanceRecord(IdModel):
    """Unique attendance state for a student/session."""; __tablename__="attendance_records"; __table_args__=(UniqueConstraint("session_id","student_id"),)
    session_id: Mapped[str]=mapped_column(ForeignKey("attendance_sessions.id")); student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); status: Mapped[str]=mapped_column(String(20))
class Message(IdModel):
    """Delivered inbox message."""; __tablename__="messages"
    sender_id: Mapped[Optional[str]]=mapped_column(ForeignKey("users.id")); sender_type: Mapped[str]=mapped_column(String(20)); sender_name: Mapped[str]=mapped_column(String(100)); recipient_id: Mapped[str]=mapped_column(ForeignKey("users.id"),index=True); course_id: Mapped[Optional[str]]=mapped_column(ForeignKey("courses.id")); type: Mapped[str]=mapped_column(String(20)); subject: Mapped[str]=mapped_column(String(200)); body: Mapped[str]=mapped_column(Text); is_read: Mapped[bool]=mapped_column(Boolean); created_at: Mapped[datetime]=mapped_column(DateTime)
class Broadcast(IdModel):
    """Administrative broadcast audit record."""; __tablename__="broadcasts"
    sender_id: Mapped[str]=mapped_column(ForeignKey("users.id")); scope: Mapped[str]=mapped_column(String(30)); audience: Mapped[str]=mapped_column(String(50)); department_id: Mapped[Optional[str]]=mapped_column(ForeignKey("departments.id")); subject: Mapped[str]=mapped_column(String(200)); body: Mapped[str]=mapped_column(Text); recipient_count: Mapped[int]=mapped_column(Integer); created_at: Mapped[datetime]=mapped_column(DateTime)
class PointsLedger(IdModel):
    """Immutable monthly student points entry."""; __tablename__="points_ledger"
    student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); month: Mapped[str]=mapped_column(String(7)); source: Mapped[str]=mapped_column(String(30)); points: Mapped[int]=mapped_column(Integer); reference_id: Mapped[Optional[str]]=mapped_column(String(36)); description: Mapped[str]=mapped_column(String(200)); created_at: Mapped[datetime]=mapped_column(DateTime)
class Rating(IdModel):
    """Anonymous student rating stored with private ownership."""; __tablename__="ratings"
    student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); target_type: Mapped[str]=mapped_column(String(20)); target_id: Mapped[str]=mapped_column(String(36)); course_id: Mapped[Optional[str]]=mapped_column(ForeignKey("courses.id")); score: Mapped[int]=mapped_column(Integer); comment: Mapped[Optional[str]]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime)
class Todo(IdModel):
    """Private student to-do item."""; __tablename__="todos"
    student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); title: Mapped[str]=mapped_column(String(200)); course_code: Mapped[Optional[str]]=mapped_column(String(20)); due_date: Mapped[Optional[date]]=mapped_column(Date); priority: Mapped[str]=mapped_column(String(10)); completed: Mapped[bool]=mapped_column(Boolean); created_at: Mapped[datetime]=mapped_column(DateTime)
class Setting(IdModel):
    """Institutional policy values."""; __tablename__="settings"
    absence_warning_threshold: Mapped[int]=mapped_column(Integer); rating_cooldown_days: Mapped[int]=mapped_column(Integer); points_submission_on_time: Mapped[int]=mapped_column(Integer); points_quiz_completion: Mapped[int]=mapped_column(Integer); points_attendance_present: Mapped[int]=mapped_column(Integer); updated_at: Mapped[datetime]=mapped_column(DateTime); updated_by: Mapped[Optional[str]]=mapped_column(ForeignKey("users.id"))
class Roadmap(IdModel):
    """Provisional student roadmap record."""; __tablename__="roadmaps"
    student_id: Mapped[str]=mapped_column(ForeignKey("users.id")); title: Mapped[str]=mapped_column(String(200)); steps_json: Mapped[str]=mapped_column(Text); created_at: Mapped[datetime]=mapped_column(DateTime)
