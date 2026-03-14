# ❓ Judge Q&A: Alpha Warrior

Prepare for your presentation with these 20 probable questions and high-impact answers.

### 🛡️ Category 1: Mechanism & Security
1. **Q: How exactly does the "Intent Token" prevent prompt injection?**
   * **A**: It binds the tool and the *arguments* together. If an attacker injects a prompt like "read /etc/passwd", that argument wasn't in the signed plan, so the cryptographic proof fails.

2. **Q: What happens if the LLM itself is compromised?**
   * **A**: Even a compromised LLM cannot forge a signature. It can *request* a bad plan, but our **Organization Policies** (e.g., `deny_bash`) will reject the plan during the "Bonding Phase."

3. **Q: Can an attacker intercept the token and use it?**
   * **A**: No. Tokens have a **60-second TTL** and are tied to a specific `runId`. Replay attacks are blocked by the expiration logic.

4. **Q: Is this just a wrapper around the OpenAI API?**
   * **A**: No. It's a **Security Middleware**. We treat the LLM as an "Untrusted CPU" and the Trust Layer as the "Secure OS" that verifies its behavior.

5. **Q: How do you handle sensitive data (PII) recognition?**
   * **A**: We use a multi-stage scanner, including **Luhn algorithms** for credit cards and pattern matching for secrets, *before* tools execute.

### ⚙️ Category 2: Technical & Performance
6. **Q: What is the latency impact of verifying every tool call?**
   * **A**: Per-step verification is a local cryptographic check taking **<1ms**. The initial plan signing takes ~100ms. It's invisible to the user.

7. **Q: Why use Node.js instead of Python for this?**
   * **A**: Node.js allows for high-concurrency via **WebSockets** for our real-time dashboard and fits better into enterprise middleware stacks.

8. **Q: Your architecture says "Fail-Closed." What if ArmorIQ is down?**
   * **A**: The agent stops. In high-stakes AI security, it is better to **halt execution** than to run without protection.

9. **Q: How do you prevent "Man-in-the-Middle" (MITM) attacks on the plan?**
   * **A**: The plan is hashed and signed. If even one character of the plan is changed in transit, the `plan_hash` check fails.

10. **Q: Can your tool handle multi-agent workflows?**
    * **A**: Yes, the architecture supports passing tokens between agents to maintain a continuous "Chain of Trust."

### 📈 Category 3: Product & Future
11. **Q: Who is your target customer?**
    * **A**: Enterprises deploying AI agents for sensitive tasks (HR, Finance, DevSecOps) where a single leaked secret could be catastrophic.

12. **Q: How do you monetize this?**
    * **A**: As a **Security-as-a-Service** model, charging per Intent Token issued.

13. **Q: What is the biggest weakness of Alpha Warrior today?**
    * **A**: We currently rely on a central verification server (ArmorIQ). Our roadmap moves this to a **decentralized TEE** for zero-trust.

14. **Q: How do policies stay updated?**
    * **A**: Admins can update policies live via the Dashboard, which are instantly pushed to all active agents via the ArmorIQ client.

15. **Q: Does this work with any LLM?**
    * **A**: Yes. We demonstrate it with GPT-4o, but it is **LLM-agnostic**—it only cares about the *output* plan.

### 🏆 Category 4: The "Hackathon" Context
16. **Q: What was the hardest technical challenge during this hackathon?**
    * **A**: Creating a cryptographic proof that bonds arguments to tools without breaking the natural flow of the agent.

17. **Q: What did you build vs. what did you use off-the-shelf?**
    * **A**: We used OpenAI for the brain, but **every line of the Trust Layer, Tool Executor, and Dashboard** was built from scratch.

18. **Q: If a judge asks to see it fail, can you?**
    * **A**: Yes! Our **Attack Demo Suite** proactively attempts 5 attacks to show exactly how they are blocked.

19. **Q: What is your unique "Secret Sauce"?**
    * **A**: **Cryptographic Intent Bonding.** Other tools use text-filters; we use math to prove intent.

20. **Q: What is one thing you would add if you had 24 more hours?**
    * **A**: **Automated Policy Generation**—using a "Security LLM" to analyze a user's prompt and generate a restrictive policy on-the-fly.
