class PolicyEngine:
    def __init__(self):
        self.rules = [
            {"intent": "admin_action", "allowed_roles": ["admin"], "action": "allow"},
            {"intent": "data_access", "allowed_roles": ["developer", "admin"], "action": "allow"},
            {"intent": "system_modification", "allowed_roles": ["admin"], "action": "hitl"}, # Requires Human Approval
            {"intent": "external_comm", "risk_threshold": 0.5, "action": "hitl"}, # High risk comm needs approval
        ]

    def evaluate(self, user_role: str, intent: str, risk_score: float):
        # 1. Global Risk Block
        if risk_score > 0.9:
            return {
                "decision": "block",
                "reason": f"CRITICAL: Risk score {risk_score} is unacceptable."
            }

        # 2. Rule Matching
        for rule in self.rules:
            if rule.get("intent") == intent:
                # Check for HITL
                if rule.get("action") == "hitl" or (rule.get("risk_threshold") and risk_score > rule["risk_threshold"]):
                    return {
                        "decision": "pending",
                        "reason": f"Action '{intent}' requires human oversight due to risk/policy.",
                        "requires_hitl": True
                    }
                
                # Check for RBAC
                if "allowed_roles" in rule and user_role not in rule["allowed_roles"]:
                    return {
                        "decision": "block",
                        "reason": f"Restricted: {intent} requires {rule['allowed_roles']} (User is {user_role})."
                    }

        # 3. Dynamic Thresholds
        if risk_score > 0.6:
            return {
                "decision": "pending",
                "reason": "Medium risk detected. Verifying with human admin.",
                "requires_hitl": True
            }

        return {
            "decision": "allow",
            "reason": "Request complies with all security policies"
        }

policy_engine = PolicyEngine()
