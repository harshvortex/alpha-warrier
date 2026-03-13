// ============================================================
// ArmorIQ Client — Intent Token + Policy + Audit Engine
// Core security layer for Alpha Warrior
// ============================================================

import crypto from 'crypto';

export class ArmorIQClient {
  constructor(config = {}) {
    this.apiKey = config.apiKey || process.env.ARMORIQ_API_KEY;
    this.iapUrl = config.iapUrl || process.env.ARMORIQ_IAP_URL || 'https://iap.armoriq.ai';
    this.backendUrl = config.backendUrl || process.env.ARMORIQ_BACKEND_URL || 'https://api.armoriq.ai';
    this.agentId = config.agentId || process.env.AGENT_ID || 'alpha-warrior-001';
    this.orgId = config.orgId || process.env.ORG_ID || 'default';
    this.failClosed = config.failClosed ?? (process.env.FAIL_CLOSED !== 'false');
    this.tokenTTL = parseInt(process.env.INTENT_TOKEN_TTL || '60');

    this.auditLog = [];
    this.policies = new Map();
    this.activeTokens = new Map();

    this.stats = {
      tokensIssued: 0,
      stepsVerified: 0,
      stepsBlocked: 0,
      attacksBlocked: 0,
      policyViolations: 0,
    };
  }

  async issueIntentToken(plan, context = {}) {
    const { userId, runId, prompt } = context;
    const tokenId = crypto.randomUUID().replace(/-/g, '');
    const planHash = this._hashPlan(plan);

    const steps = plan.map((step, idx) => ({
      index: idx,
      tool: step.tool,
      args_hash: this._hashArgs(step.args || {}),
      proof: this._generateProof(tokenId, step.tool, step.args || {}, idx),
    }));

    const token = {
      id: tokenId,
      plan_hash: planHash,
      issued_at: Date.now(),
      expires_at: Date.now() + this.tokenTTL * 1000,
      expires: `${this.tokenTTL}s`,
      stepProofs: steps.length,
      steps,
      context: {
        userId: userId || 'anonymous',
        agentId: this.agentId,
        orgId: this.orgId,
        runId: runId || crypto.randomUUID(),
        prompt: prompt || '',
      },
    };

    let verified = false;
    try {
      if (this.apiKey === 'demo-key') {
        verified = true; // Skip network call in demo mode for hackathon recording
      } else {
        verified = await this._callIAP('/tokens/issue', token);
      }
    } catch {
      if (this.failClosed) {
        this._audit({ type: 'TOKEN_ISSUE_FAILED', tokenId, reason: 'IAP unreachable, fail-closed active' });
        throw new Error('❌ ArmorIQ IAP unreachable. Fail-closed: blocking all executions.');
      }
      verified = true;
    }

    if (verified || !this.failClosed) {
      this.activeTokens.set(tokenId, token);
      this.stats.tokensIssued++;
      this._audit({ type: 'TOKEN_ISSUED', tokenId, planHash, stepCount: steps.length, userId, runId: token.context.runId });
    }

    return token;
  }

  async verifyStep(tokenId, tool, args = {}, stepIndex) {
    const token = this.activeTokens.get(tokenId);
    const runId = token?.context?.runId;

    if (!token) return this._blockStep(tool, 'NO_TOKEN', 'No valid intent token found', runId);

    if (Date.now() > token.expires_at) {
      this.activeTokens.delete(tokenId);
      return this._blockStep(tool, 'TOKEN_EXPIRED', 'Intent token has expired (60s TTL)', runId);
    }

    const expectedProof = this._generateProof(tokenId, tool, args, stepIndex);
    const stepProof = token.steps.find(s => s.index === stepIndex && s.tool === tool);

    if (!stepProof || stepProof.proof !== expectedProof) {
      this.stats.attacksBlocked++;
      return this._blockStep(tool, 'PROOF_MISMATCH', `Cryptographic proof mismatch — this tool call was NOT in the original plan. Possible prompt injection!`, runId);
    }

    const policyResult = await this._checkPolicy(tool, args, token.context);
    if (!policyResult.allowed) {
      this.stats.policyViolations++;
      return this._blockStep(tool, 'POLICY_DENIED', policyResult.reason, runId);
    }

    const dataClassResult = this._detectDataClass(args);
    if (dataClassResult.classified) {
      const dataPolicy = await this._checkDataPolicy(tool, dataClassResult.classes, token.context);
      if (!dataPolicy.allowed) {
        this.stats.policyViolations++;
        return this._blockStep(tool, 'DATA_POLICY_DENIED', `Sensitive data detected [${dataClassResult.classes.join(', ')}]: ${dataPolicy.reason}`, runId);
      }
    }

    this.stats.stepsVerified++;
    this._audit({ type: 'STEP_ALLOWED', tokenId, tool, stepIndex, runId, userId: token.context.userId, reason: 'Token valid, proof verified, policy allows' });
    return { allowed: true, reason: 'Token valid, proof verified, policy allows' };
  }

  addPolicy(policy) {
    const id = policy.id || `policy_${Date.now()}`;
    this.policies.set(id, { ...policy, id, createdAt: Date.now() });
    this._audit({ type: 'POLICY_CREATED', policyId: id, policy });
    return id;
  }

  removePolicy(id) {
    this.policies.delete(id);
    this._audit({ type: 'POLICY_DELETED', policyId: id });
  }

  listPolicies() { return Array.from(this.policies.values()); }

  async _checkPolicy(tool, args, context) {
    for (const [, policy] of this.policies) {
      const toolMatch = policy.tool === '*' || policy.tool === tool;
      if (!toolMatch) continue;
      if (policy.action === 'deny') return { allowed: false, reason: `Policy [${policy.id}]: ${policy.reason || 'Tool blocked by policy'}` };
      if (policy.action === 'allow') return { allowed: true, reason: `Policy [${policy.id}]: explicitly allowed` };
    }
    return { allowed: true, reason: 'No matching policy — default allow' };
  }

  async _checkDataPolicy(tool, dataClasses, context) {
    for (const [, policy] of this.policies) {
      const toolMatch = policy.tool === '*' || policy.tool === tool;
      const classMatch = dataClasses.includes(policy.dataClass);
      if (toolMatch && classMatch && policy.action === 'deny') {
        return { allowed: false, reason: `Policy [${policy.id}]: ${policy.dataClass} data blocked for ${tool}` };
      }
    }
    return { allowed: true, reason: 'No data policy violation' };
  }

  _detectDataClass(args) {
    const content = JSON.stringify(args).toLowerCase();
    const classes = [];
    const cardPattern = /\b\d{13,19}\b/g;
    const cardNumbers = JSON.stringify(args).match(cardPattern) || [];
    if (cardNumbers.some(n => this._luhnCheck(n)) || /credit|cvv|cvc|card_number/.test(content)) classes.push('PCI');
    if (/payment|bank|iban|swift|routing|stripe|billing|transfer|ach/.test(content)) classes.push('PAYMENT');
    if (/patient|diagnosis|medical|prescription|dob|ssn|health/.test(content)) classes.push('PHI');
    if (/password|secret|api_key|private_key|token|credential/.test(content)) classes.push('PII');
    return { classified: classes.length > 0, classes };
  }

  _luhnCheck(num) {
    let sum = 0, alternate = false;
    for (let i = num.length - 1; i >= 0; i--) {
      let n = parseInt(num[i], 10);
      if (alternate) { n *= 2; if (n > 9) n -= 9; }
      sum += n;
      alternate = !alternate;
    }
    return sum % 10 === 0;
  }

  _hashPlan(plan) { return crypto.createHash('sha256').update(JSON.stringify(plan)).digest('hex'); }
  _hashArgs(args) { return crypto.createHash('sha256').update(JSON.stringify(args)).digest('hex'); }

  _generateProof(tokenId, tool, args, stepIndex) {
    return crypto.createHmac('sha256', this.apiKey || 'local-dev-secret')
      .update(`${tokenId}:${tool}:${JSON.stringify(args)}:${stepIndex}`)
      .digest('hex');
  }

  _blockStep(tool, code, reason, runId) {
    this.stats.stepsBlocked++;
    this._audit({ type: 'STEP_BLOCKED', tool, code, reason, runId });
    return { allowed: false, code, reason };
  }

  _audit(entry) {
    const record = { timestamp: new Date().toISOString(), agentId: this.agentId, ...entry };
    this.auditLog.push(record);
    if (this.auditLog.length > 1000) this.auditLog.shift();
    return record;
  }

  async _callIAP(path, data) {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(`${this.iapUrl}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${this.apiKey}`, 'X-Agent-ID': this.agentId },
      body: JSON.stringify(data),
      signal: AbortSignal.timeout(5000),
    });
    if (!res.ok) throw new Error(`IAP error: ${res.status}`);
    return true;
  }

  getAuditLog(limit = 50) { return this.auditLog.slice(-limit).reverse(); }
  getStats() { return { ...this.stats, activePolicies: this.policies.size, activeTokens: this.activeTokens.size }; }
}
