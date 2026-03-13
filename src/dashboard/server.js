// ============================================================
// Dashboard — Real-time Audit Log + Stats
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';

export function createDashboard(agent, port = 3001) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());
  app.get('/', (req, res) => res.send(getDashboardHTML()));
  app.get('/api/stats', (req, res) => res.json(agent.getStats()));
  app.get('/api/audit', (req, res) => res.json(agent.getAuditLog(100)));
  app.get('/api/policies', (req, res) => res.json(agent.listPolicies()));
  app.post('/api/policy', (req, res) => { const id = agent.addPolicy(req.body); res.json({ id, success: true }); });
  app.delete('/api/policy/:id', (req, res) => { agent.removePolicy(req.params.id); res.json({ success: true }); });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', stats: agent.getStats(), audit: agent.getAuditLog(20) }));
    const originalAudit = agent.armoriq._audit.bind(agent.armoriq);
    agent.armoriq._audit = (entry) => {
      const record = originalAudit(entry);
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'audit', entry: record, stats: agent.getStats() }));
      return record;
    };
  });

  server.listen(port, () => console.log(`📊 Dashboard: http://localhost:${port}`));
  return server;
}

function getDashboardHTML() {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"><title>Alpha Warrior Dashboard</title>
<style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:'Segoe UI',monospace;background:#0a0e1a;color:#e2e8f0;min-height:100vh}
header{background:linear-gradient(135deg,#1e293b,#0f172a);border-bottom:1px solid #334155;padding:1rem 2rem}
header h1{font-size:1.4rem;background:linear-gradient(90deg,#38bdf8,#818cf8);-webkit-background-clip:text;-webkit-text-fill-color:transparent}
.badge{background:#22c55e;color:#fff;padding:2px 10px;border-radius:999px;font-size:.7rem;font-weight:700}
.grid{display:grid;grid-template-columns:repeat(3,1fr);gap:1rem;padding:1.5rem 2rem}
.card{background:#1e293b;border:1px solid #334155;border-radius:12px;padding:1.2rem}
.card .label{font-size:.75rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.05em}
.card .value{font-size:2.5rem;font-weight:700;margin-top:.25rem}
.card.blocked .value{color:#f87171}.card.verified .value{color:#4ade80}.card.tokens .value{color:#60a5fa}
.card.attacks .value{color:#fb923c}.card.policy .value{color:#a78bfa}.card.active .value{color:#34d399}
main{padding:0 2rem 2rem}h2{font-size:.9rem;color:#94a3b8;text-transform:uppercase;letter-spacing:.1em;margin-bottom:.75rem}
.log{background:#0f172a;border:1px solid #1e293b;border-radius:12px;overflow:hidden;max-height:500px;overflow-y:auto}
.entry{display:grid;grid-template-columns:130px 140px 1fr;gap:1rem;padding:.7rem 1rem;border-bottom:1px solid #1e293b;font-size:.78rem}
.entry.allowed{border-left:3px solid #22c55e}.entry.blocked{border-left:3px solid #ef4444}.entry.info{border-left:3px solid #3b82f6}
.entry .t{color:#64748b}.entry .type.allowed{color:#4ade80}.entry .type.blocked{color:#f87171}.entry .type.info{color:#60a5fa}
.ws{font-size:.7rem;color:#64748b;margin-top:4px}.ws.on{color:#4ade80}</style></head>
<body>
<header><h1>🛡️ Alpha Warrior — ArmorIQ Dashboard</h1><div style="display:flex;gap:.5rem"><span class="badge">LIVE</span><span class="ws" id="ws">Connecting...</span></div></header>
<div class="grid">
<div class="card tokens"><div class="label">Tokens Issued</div><div class="value" id="s0">0</div></div>
<div class="card verified"><div class="label">Steps Verified</div><div class="value" id="s1">0</div></div>
<div class="card blocked"><div class="label">Steps Blocked</div><div class="value" id="s2">0</div></div>
<div class="card attacks"><div class="label">Attacks Blocked</div><div class="value" id="s3">0</div></div>
<div class="card policy"><div class="label">Policy Violations</div><div class="value" id="s4">0</div></div>
<div class="card active"><div class="label">Active Policies</div><div class="value" id="s5">0</div></div>
</div>
<main><h2>Live Audit Log</h2><div class="log" id="log"></div></main>
<script>
const ws=new WebSocket('ws://'+location.host),log=document.getElementById('log'),status=document.getElementById('ws');
ws.onopen=()=>{status.textContent='● Connected';status.className='ws on'};
ws.onclose=()=>{status.textContent='● Disconnected';status.className='ws'};
ws.onmessage=e=>{const m=JSON.parse(e.data);if(m.stats)upd(m.stats);if(m.type==='init'&&m.audit)m.audit.reverse().forEach(add);if(m.type==='audit'&&m.entry)add(m.entry)};
function upd(s){['tokensIssued','stepsVerified','stepsBlocked','attacksBlocked','policyViolations','activePolicies'].forEach((k,i)=>document.getElementById('s'+i).textContent=s[k]||0)}
function add(e){
  const b=e.type.includes('BLOCKED')||e.type.includes('FAILED'),a=e.type.includes('ALLOWED')||e.type.includes('ISSUED'),cls=b?'blocked':a?'allowed':'info';
  const d=document.createElement('div');
  d.className='entry '+cls;
  d.innerHTML='<span class="t">'+new Date(e.timestamp).toLocaleTimeString()+'</span><span class="type '+cls+'">'+e.type+'</span><span>'+(e.tool||e.policyId||'')+(e.reason?' — '+e.reason:'')+'</span>';
  log.prepend(d);
  if(log.children.length>100)log.lastChild.remove();
}
</script></body></html>`;
}
