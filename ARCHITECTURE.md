# 🏗️ Alpha Warrior: Architecture Diagram

This diagram illustrates the **Control Plane vs Execution Plane** separation, which is the core of our "Intent-First" security model.

```mermaid
graph TD
    subgraph "Execution Plane (Node.js)"
        User[User Prompt] --> Agent[Alpha Warrior Agent]
        Agent --> Plan[Execution Plan / Tools]
        Plan --> Executor[Tool Executor]
        Executor --> Actions[Real Actions: Files, Slack, Search]
    end

    subgraph "Control Plane (Python Sentinel)"
        Agent -- "JSON Intent Contract" --> Sentinel[Security Sentinel API]
        Sentinel --> IA[Intent Analyzer / Gemini]
        Sentinel --> PE[Policy Engine / RBAC]
        PE -- "HMAC-Signed Token" --> Agent
        Sentinel --> DB[(Audit DB / SIEM Logs)]
    end

    subgraph "Verification Loop"
        Executor -- "Check Token" --> Sentinel
        Sentinel -- "Verify Proof" --> Executor
    end

    Admin[Admin / CISO] --> Dashboard[Live Security Console]
    Dashboard -- "Approve/Reject" --> Sentinel
```

## Key Architectural Principles:
1. **Isolated Reasoning**: The LLM never sees the security keys or the policy database.
2. **Cryptographic Bonding**: Any change to the agent's plan mid-run invalidates the HAMC signature.
3. **Fail-Closed**: If the Sentinel backend is offline, the Agent enters a hard-lock state.
