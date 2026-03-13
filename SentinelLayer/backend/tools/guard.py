from backend.intent_engine.analyzer import intent_analyzer
from backend.policy_engine.engine import policy_engine

class ToolExecutionGuard:
    async def validate_execution(self, tool_name: str, arguments: dict, user_intent: str, user_role: str):
        # 1. Check Intent
        intent_result = await intent_analyzer.analyze(user_intent)
        
        # 2. Check Policy (Passing role, intent class, and risk score)
        policy_result = policy_engine.evaluate(
            user_role, 
            intent_result.get("intent", "dangerous_prompt"), 
            intent_result.get("risk_score", 1.0)
        )
        
        # 3. Decision Logic
        is_safe = policy_result["decision"] == "allow"
        reason = policy_result["reason"]
            
        return {
            "is_safe": is_safe,
            "reason": reason,
            "audit_trail": {
                "intent_analysis": intent_result,
                "policy_check": policy_result
            }
        }

tool_guard = ToolExecutionGuard()
