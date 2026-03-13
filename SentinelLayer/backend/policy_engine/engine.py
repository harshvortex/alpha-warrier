class PolicyEngine:
    def evaluate(self, user_role: str, intent: str, risk_score: float):
        # Rule 1: risk_score > 0.8 = block
        if risk_score > 0.8:
            return {
                "decision": "block",
                "reason": f"Risk score {risk_score} exceeds safety threshold of 0.8"
            }

        # Rule 2: admin_action allowed only for admin
        if intent == "admin_action" and user_role != "admin":
            return {
                "decision": "block",
                "reason": f"Intent 'admin_action' is restricted to 'admin' role (user role: {user_role})"
            }

        # Rule 3: data_access allowed only for developer or admin
        if intent == "data_access" and user_role not in ["developer", "admin"]:
            return {
                "decision": "block",
                "reason": f"Intent 'data_access' is restricted to 'developer' or 'admin' roles (user role: {user_role})"
            }

        # Default: Allow if no rules are violated
        return {
            "decision": "allow",
            "reason": "Request complies with all security policies"
        }

policy_engine = PolicyEngine()
