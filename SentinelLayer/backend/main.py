import os
from fastapi import FastAPI, Depends, Body, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import Dict, Any, Optional

from backend.auth.rbac import RoleChecker, get_current_user
from backend.intent_engine.analyzer import intent_analyzer
from backend.policy_engine.engine import policy_engine
from backend.tools.guard import tool_guard
from backend.logger import log_security_event_db, get_logs_from_db

app = FastAPI(title="SentinelLayer Security API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Models
class IntentRequest(BaseModel):
    user_prompt: str

class PolicyRequest(BaseModel):
    user_role: str
    intent: str
    risk_score: float

class ToolRequest(BaseModel):
    tool_name: str
    arguments: Dict[str, Any]
    user_intent: str

# Endpoints

@app.post("/analyze-intent", dependencies=[Depends(RoleChecker(["admin", "user", "security"]))])
async def analyze_intent(request: IntentRequest, current_user: dict = Depends(get_current_user)):
    result = await intent_analyzer.analyze(request.user_prompt)
    intent = result.get("intent", "dangerous_prompt")
    score = result.get("risk_score", 1.0)
    
    # Log the analysis
    log_security_event_db(
        user=current_user["username"],
        intent=intent,
        risk_score=score,
        decision="N/A (Analysis Only)"
    )
    
    return {
        "intent": intent,
        "risk_score": score
    }

@app.post("/evaluate-policy", dependencies=[Depends(RoleChecker(["admin", "security"]))])
async def evaluate_policy(request: PolicyRequest, current_user: dict = Depends(get_current_user)):
    result = policy_engine.evaluate(request.user_role, request.intent, request.risk_score)
    
    # Log the policy check
    log_security_event_db(
        user=current_user["username"],
        intent=request.intent,
        risk_score=request.risk_score,
        decision=result["decision"]
    )
    
    return result

@app.post("/execute-tool", dependencies=[Depends(RoleChecker(["admin", "security"]))])
async def execute_tool(request: ToolRequest, current_user: dict = Depends(get_current_user)):
    guard_result = await tool_guard.validate_execution(
        request.tool_name, 
        request.arguments, 
        request.user_intent,
        current_user["role"]
    )
    
    # Log the guarded execution attempt
    log_security_event_db(
        user=current_user["username"],
        intent=guard_result["audit_trail"]["intent_analysis"].get("intent", "unknown"),
        risk_score=guard_result["audit_trail"]["intent_analysis"].get("risk_score", 0.0),
        decision="allow" if guard_result["is_safe"] else "block",
        tool_requested=request.tool_name
    )
    
    if not guard_result["is_safe"]:
        raise HTTPException(status_code=403, detail=guard_result["reason"])
    
    return {
        "status": "approved",
        "guard_details": guard_result
    }

@app.get("/security-logs", dependencies=[Depends(RoleChecker(["admin"]))])
async def security_logs(limit: int = 50, current_user: dict = Depends(get_current_user)):
    logs = get_logs_from_db(limit)
    return {"status": "success", "logs": logs}

@app.get("/")
async def health_check():
    return {"status": "SentinelLayer is operational", "version": "1.0.0"}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

