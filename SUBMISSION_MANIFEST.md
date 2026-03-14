# 🛡️ Alpha Warrior: Submission Manifest
**Project Name**: Alpha Warrior (OpenClaw x ArmorIQ Edition)
**Team**: Harsh Vortex & Co.

## 3a. Intent Model (Structured)
Alpha Warrior utilizes a **Hierarchical Intent Matrix**. Instead of flat strings, we decompose LLM requests into:
- **Action Type**: (READ, WRITE, EXEC, COMM, ADMIN)
- **Resource Scope**: (Local Files, System Config, API Egress, External Memory)
- **Risk Weight**: A 0.0-1.0 float calculated by our Python-based **Intent-Decomposition Engine**.

## 3b. Policy Model (Constraints)
Our policy model uses a **Fail-Closed RBAC (Role-Based Access Control)** system:
1. **Directory Scoping**: Tools like `read_file` are restricted to the `./workspace` directory unless explicitly allowed.
2. **Data-Class Shielding**: Policies detect "PCI", "PII", and "PHI" data within tool arguments at runtime.
3. **Risk Thresholds**: Any intent with a `risk_score > 0.8` is automatically sent to the **Sentinel HITL Gateway** for human approval.

## 3c. Enforcement Mechanism
1. **Primal Phase (Reasoning)**: The OpenClaw-based agent generates a plan.
2. **Bonding Phase (ArmorIQ)**: The plan is hashed and HMAC-signed by the Python Sentinel.
3. **Execution Phase (Enforcement)**: The `Executor.js` verifies the pulse before every micro-action. If the pulse (Intent Token) doesn't match the requested action, the process is killed.

---

## 🚀 Delegation Scenario (Bonus Implementation)
We demonstrate **Bounded Delegation** where a `Lead-Admin` agent can spawn a `Trainee-Bot`. The `Trainee-Bot` inherits all parent constraints but is further restricted:
- **Lead Agent**: Can read logs.
- **Trainee Agent**: Can only search for logs; restricted from reading `security_logs.db`.
