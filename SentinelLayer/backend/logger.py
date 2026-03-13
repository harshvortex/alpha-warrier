import os
from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, DateTime, create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = "sqlite:///./security_logs.db"

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class SecurityLog(Base):
    __tablename__ = "security_logs"

    id = Column(Integer, primary_key=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow)
    user = Column(String)
    intent = Column(String)
    risk_score = Column(Float)
    decision = Column(String)
    tool_requested = Column(String, nullable=True)

# Create tables
Base.metadata.create_all(bind=engine)

def log_security_event_db(user: str, intent: str, risk_score: float, decision: str, tool_requested: str = None):
    db = SessionLocal()
    try:
        log_entry = SecurityLog(
            user=user,
            intent=intent,
            risk_score=risk_score,
            decision=decision,
            tool_requested=tool_requested
        )
        db.add(log_entry)
        db.commit()
    finally:
        db.close()

def get_logs_from_db(limit: int = 50):
    db = SessionLocal()
    try:
        return db.query(SecurityLog).order_by(SecurityLog.timestamp.desc()).limit(limit).all()
    finally:
        db.close()
