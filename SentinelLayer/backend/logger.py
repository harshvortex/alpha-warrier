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

class PendingApproval(Base):
    __tablename__ = "pending_approvals"

    id = Column(String, primary_key=True)
    user = Column(String)
    role = Column(String)
    intent = Column(String)
    risk_score = Column(Float)
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)

# Create tables
Base.metadata.create_all(bind=engine)

import json

def log_security_event_db(user: str, intent: str, risk_score: float, decision: str, tool_requested: str = None):
    timestamp = datetime.utcnow()
    # 1. DB Log
    db = SessionLocal()
    try:
        log_entry = SecurityLog(
            timestamp=timestamp,
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

    # 2. SIEM Export (JSONL format for Splunk/ELK)
    siem_log = {
        "timestamp": timestamp.isoformat(),
        "event_type": "security_audit",
        "actor": user,
        "intent_detected": intent,
        "risk_level": "high" if risk_score > 0.7 else "medium" if risk_score > 0.4 else "low",
        "score": risk_score,
        "action_taken": decision,
        "resource": tool_requested or "general_api"
    }
    
    log_dir = os.path.join(os.path.dirname(__file__), "logs")
    os.makedirs(log_dir, exist_ok=True)
    with open(os.path.join(log_dir, "siem_audit.jsonl"), "a") as f:
        f.write(json.dumps(siem_log) + "\n")

def get_logs_from_db(limit: int = 50):
    db = SessionLocal()
    try:
        return db.query(SecurityLog).order_by(SecurityLog.timestamp.desc()).limit(limit).all()
    finally:
        db.close()

def save_pending_approval(request_id: str, user: str, role: str, intent: str, risk_score: float):
    db = SessionLocal()
    try:
        new_req = PendingApproval(id=request_id, user=user, role=role, intent=intent, risk_score=risk_score)
        db.add(new_req)
        db.commit()
    finally:
        db.close()

def get_hitl_requests():
    db = SessionLocal()
    try:
        return db.query(PendingApproval).filter(PendingApproval.status == "pending").all()
    finally:
        db.close()

def update_hitl_status(request_id: str, status: str):
    db = SessionLocal()
    try:
        req = db.query(PendingApproval).filter(PendingApproval.id == request_id).first()
        if req:
            req.status = status
            db.commit()
    finally:
        db.close()
