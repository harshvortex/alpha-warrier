class PolicyEngine:
    def evaluate(self, user_role, intent, risk_score):
        # 1. Bounded Delegation Enforcement (Bonus points criteria)
        if user_role == "trainee":
            # Trainees can NEVER access data files, regardless of intent context
            if intent == "data_access":
                return {
                    "decision": "block", 
                    "reason": "DELEGATION_VIOLATION: Trainee role is restricted from direct data access."
                }
            # Risk cap for delegated agents
            if risk_score > 0.5:
                return {
                    "decision": "block", 
                    "reason": "RISK_CAP: Delegated agents cannot perform medium-high risk actions."
                }

        # 2. Global Policy Logic
        if risk_score > 0.8:
            return {"decision": "block", "reason": f"CRITICAL: Risk score {risk_score} is unacceptable."}
        
        if intent == "dangerous_prompt":
            return {"decision": "block", "reason": "SECURITY_BLOCK: Malicious intent detected."}
            
        if intent == "admin_action" and user_role != "admin":
            return {"decision": "pending", "status": "Requires human approval", "reason": "Restricted: admin_action requires admin role."}
            
        if intent == "data_access" and user_role not in ["admin", "security", "developer"]:
             return {"decision": "pending", "status": "Requires human approval", "reason": f"Restricted: data_access requires elevation for role: {user_role}."}

        return {"decision": "allow", "reason": "Policy permits this action."}

policy_engine = PolicyEngine()
