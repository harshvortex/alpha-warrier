// ============================================================
// Dashboard — Real-time Audit Log + Stats
// ============================================================

import express from 'express';
import { createServer } from 'http';
import { WebSocketServer } from 'ws';
import fetch from 'node-fetch';

export function createDashboard(agent, port = process.env.PORT || 3001) {
  const app = express();
  const server = createServer(app);
  const wss = new WebSocketServer({ server });

  app.use(express.json());
  app.use('/assets', express.static('src/dashboard/assets'));
  app.get('/', (req, res) => res.send(getDashboardHTML()));
  app.get('/api/stats', (req, res) => res.json(agent.getStats()));
  app.get('/api/audit', (req, res) => res.json(agent.getAuditLog(100)));
  app.get('/api/policies', (req, res) => res.json(agent.listPolicies()));
  app.post('/api/policy', (req, res) => { const id = agent.addPolicy(req.body); res.json({ id, success: true }); });
  app.delete('/api/policy/:id', (req, res) => { agent.removePolicy(req.params.id); res.json({ success: true }); });

  app.get('/hitl/pending', async (req, res) => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/hitl/pending', { headers: { 'X-API-KEY': req.headers['x-api-key'] || 'admin_key' } });
      res.json(await resp.json());
    } catch(err) { res.status(500).json([]); }
  });

  app.post('/hitl/decide/:id', async (req, res) => {
    try {
      const resp = await fetch('http://127.0.0.1:8000/hitl/decide/' + req.params.id, {
        method: 'POST',
        headers: { 'X-API-KEY': req.headers['x-api-key'] || 'admin_key', 'Content-Type': 'application/json' },
        body: JSON.stringify(req.body)
      });
      res.json(await resp.json());
    } catch(err) { res.status(500).json({ status: 'error' }); }
  });

  wss.on('connection', (ws) => {
    ws.send(JSON.stringify({ type: 'init', stats: agent.getStats(), audit: agent.getAuditLog(20) }));
    const originalAudit = agent.armoriq._audit.bind(agent.armoriq);
    agent.armoriq._audit = (entry) => {
      const record = originalAudit(entry);
      if (ws.readyState === 1) ws.send(JSON.stringify({ type: 'audit', entry: record, stats: agent.getStats() }));
      return record;
    };
  });

  // Start listening if not manually handled
  if (process.env.NODE_ENV !== 'test') {
    server.listen(port).on('error', (err) => {
        if (err.code !== 'EADDRINUSE') throw err;
    }).on('listening', () => console.log(`📊 Dashboard: http://localhost:${server.address().port}`));
  }
  
  return server;
}

function getDashboardHTML() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Alpha Warrior | Cyber-Security Command Center</title>
    <link rel="icon" type="image/png" href="/assets/logo.png">
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #3b82f6;
            --primary-glow: rgba(59, 130, 246, 0.4);
            --accent: #8b5cf6;
            --danger: #ef4444;
            --success: #10b981;
            --warning: #f59e0b;
            --dark-bg: #030712;
            --card-bg: rgba(17, 24, 39, 0.7);
            --glass-border: rgba(255, 255, 255, 0.08);
            --text-main: #f3f4f6;
            --text-dim: #9ca3af;
        }

        @keyframes bg-glow {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
        }

        @keyframes slide-in {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
        }

        @keyframes pulse-soft {
            0% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4); }
            70% { box-shadow: 0 0 0 10px rgba(16, 185, 129, 0); }
            100% { box-shadow: 0 0 0 0 rgba(16, 185, 129, 0); }
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--dark-bg);
            color: var(--text-main);
            overflow-x: hidden;
            min-height: 100vh;
            background: radial-gradient(circle at top right, rgba(59, 130, 246, 0.1), transparent),
                        radial-gradient(circle at bottom left, rgba(139, 92, 246, 0.1), transparent),
                        var(--dark-bg);
            background-size: 200% 200%;
            animation: bg-glow 15s ease infinite;
        }

        /* --- Layout --- */
        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 2rem;
            animation: slide-in 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }

        header {
            background: rgba(3, 7, 18, 0.8);
            backdrop-filter: blur(20px);
            border-bottom: 1px solid var(--glass-border);
            padding: 1.25rem 3rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        header .brand {
            display: flex;
            align-items: center;
            gap: 1.25rem;
        }

        header .brand img {
            width: 40px;
            height: 40px;
            border-radius: 8px;
            box-shadow: 0 0 20px rgba(59, 130, 246, 0.3);
        }

        header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(to right, #60a5fa, #a78bfa);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.01em;
        }

        .status-pill {
            display: flex;
            align-items: center;
            gap: 0.6rem;
            padding: 0.5rem 1rem;
            background: rgba(16, 185, 129, 0.08);
            border: 1px solid rgba(16, 185, 129, 0.2);
            border-radius: 30px;
            font-size: 0.8rem;
            font-weight: 600;
            color: var(--success);
            transition: all 0.3s;
        }

        .status-dot {
            width: 8px;
            height: 8px;
            border-radius: 50%;
            background: var(--success);
            animation: pulse-soft 2s infinite;
        }

        /* --- Dashboard Grid --- */
        .dashboard-grid {
            display: grid;
            grid-template-columns: repeat(12, 1fr);
            gap: 1.5rem;
            margin-top: 1rem;
        }

        /* --- Stats Cards --- */
        .stats-strip {
            grid-column: span 12;
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 1.5rem;
        }

        .stat-card {
            background: var(--card-bg);
            backdrop-filter: blur(16px);
            border: 1px solid var(--glass-border);
            padding: 1.5rem;
            border-radius: 16px;
            position: relative;
            overflow: hidden;
            transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1);
        }

        .stat-card:hover {
            transform: translateY(-5px);
            border-color: rgba(59, 130, 246, 0.3);
            background: rgba(31, 41, 55, 0.7);
        }

        .stat-card .label { color: var(--text-dim); font-size: 0.75rem; font-weight: 600; text-transform: uppercase; margin-bottom: 0.5rem; letter-spacing: 0.05em; }
        .stat-card .value { font-size: 2.25rem; font-weight: 700; color: #fff; }
        .stat-card .trend { font-size: 0.75rem; margin-top: 0.5rem; display: flex; align-items: center; gap: 0.3rem; }

        /* --- Main Content Areas --- */
        .main-column {
            grid-column: span 8;
        }

        .side-column {
            grid-column: span 4;
        }

        .glass-panel {
            background: var(--card-bg);
            backdrop-filter: blur(20px);
            border: 1px solid var(--glass-border);
            border-radius: 20px;
            padding: 1.75rem;
            margin-bottom: 1.5rem;
            height: 100%;
        }

        .panel-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            border-bottom: 1px solid rgba(255, 255, 255, 0.05);
            padding-bottom: 1rem;
        }

        .panel-header h2 {
            font-size: 1rem;
            font-weight: 700;
            color: #fff;
            letter-spacing: 0.02em;
        }

        /* --- Audit Log --- */
        .audit-log {
            height: 500px;
            overflow-y: auto;
            padding-right: 0.5rem;
        }

        .audit-entry {
            background: rgba(255, 255, 255, 0.02);
            border-left: 3px solid #334155;
            padding: 1.25rem;
            margin-bottom: 0.75rem;
            border-radius: 0 12px 12px 0;
            display: grid;
            grid-template-columns: 80px 140px 1fr;
            gap: 1rem;
            align-items: center;
            animation: slide-in 0.4s ease-out backwards;
            transition: all 0.3s;
        }

        .audit-entry:hover {
            background: rgba(255, 255, 255, 0.05);
            transform: translateX(4px);
        }

        .audit-entry .time { font-family: 'JetBrains Mono'; font-size: 0.75rem; color: var(--text-dim); }
        .audit-entry .type { font-weight: 700; font-size: 0.7rem; text-transform: uppercase; padding: 4px 8px; border-radius: 4px; text-align: center; }
        .audit-entry .msg { font-size: 0.9rem; color: #d1d5db; line-height: 1.5; }

        /* Types */
        .type.allow { background: rgba(16, 185, 129, 0.1); color: var(--success); border: 1px solid rgba(16, 185, 129, 0.2); }
        .type.block { background: rgba(239, 68, 68, 0.1); color: var(--danger); border: 1px solid rgba(239, 68, 68, 0.2); }
        .type.info { background: rgba(59, 130, 246, 0.1); color: var(--primary); border: 1px solid rgba(59, 130, 246, 0.2); }

        /* --- HITL Cards --- */
        .hitl-card {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1), rgba(0, 0, 0, 0));
            border: 1px solid rgba(245, 158, 11, 0.2);
            border-radius: 16px;
            padding: 1.5rem;
            margin-bottom: 1rem;
            transition: all 0.3s;
        }

        .hitl-card:hover { border-color: var(--warning); scale: 1.02; }
        .hitl-card .meta { font-size: 0.7rem; color: var(--warning); font-weight: 700; margin-bottom: 0.5rem; text-transform: uppercase; }
        .hitl-card .intent { font-size: 1.1rem; font-weight: 600; margin-bottom: 1.25rem; color: #fff; }
        .hitl-actions { display: flex; gap: 0.75rem; }

        button {
            flex: 1;
            padding: 0.75rem;
            border-radius: 10px;
            font-weight: 700;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
            letter-spacing: 0.02em;
        }

        button.approve { background: var(--success); color: white; }
        button.approve:hover { filter: brightness(1.2); box-shadow: 0 0 20px rgba(16, 185, 129, 0.4); }
        button.reject { background: var(--danger); color: white; }
        button.reject:hover { filter: brightness(1.2); box-shadow: 0 0 20px rgba(239, 68, 68, 0.4); }

        /* Scrollbar */
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: var(--primary); }

        @media (max-width: 1100px) {
            .main-column, .side-column { grid-column: span 12; }
        }
    </style>
</head>
<body>

<header>
    <div class="brand">
        <img src="/assets/logo.png" alt="Alpha Warrior Logo">
        <div>
            <h1>ALPHA WARRIOR</h1>
            <div style="font-size: 0.7rem; color: var(--text-dim); font-family: 'JetBrains Mono'; margin-top: 2px;">SECURE AUTONOMOUS CORE // V2.5</div>
        </div>
    </div>
    <div class="status-pill">
        <div class="status-dot"></div>
        <span id="ws-text">SECURE LINK ESTABLISHED</span>
    </div>
</header>

<div class="container">
    <div class="dashboard-grid">
        <!-- Stats Strip -->
        <div class="stats-strip">
            <div class="stat-card">
                <div class="label">Total Intent Pulse</div>
                <div class="value" id="s-total">0</div>
                <div class="trend" style="color:var(--primary)">⚡ SYSTEM ACTIVE</div>
            </div>
            <div class="stat-card">
                <div class="label">Verified Intent</div>
                <div class="value" id="s-verified" style="color:var(--success)">0</div>
                <div class="trend" style="color:var(--success)">✅ INTEGRITY PASS</div>
            </div>
            <div class="stat-card">
                <div class="label">Blocks Triggered</div>
                <div class="value" id="s-blocked" style="color:var(--danger)">0</div>
                <div class="trend" style="color:var(--danger)">🛡️ THREATS NEUTRALIZED</div>
            </div>
            <div class="stat-card">
                <div class="label">Active Constraints</div>
                <div class="value" id="s-policies" style="color:var(--accent)">0</div>
                <div class="trend" style="color:var(--accent)">🔒 POLICIES LIVE</div>
            </div>
        </div>

        <!-- Left: Audit Log -->
        <div class="main-column">
            <div class="glass-panel">
                <div class="panel-header">
                    <h2>SECURE TRANSACTION LEDGER</h2>
                    <div style="font-size:0.65rem; color:var(--text-dim); background:rgba(255,255,255,0.05); padding:4px 10px; border-radius:20px;">REAL-TIME ARMORIQ AUDIT</div>
                </div>
                <div class="audit-log" id="audit-feed">
                    <!-- Dynamic entries -->
                </div>
            </div>
        </div>

        <!-- Right: HITL & System Info -->
        <div class="side-column">
            <div class="glass-panel" style="background: linear-gradient(to bottom, rgba(34, 197, 94, 0.03), var(--card-bg));">
                <div class="panel-header">
                    <h2 style="color:var(--warning)">🛡️ HUMAN-IN-THE-LOOP</h2>
                    <div style="font-size:0.65rem; color:var(--warning); border:1px solid rgba(245,158,11,0.2); padding:2px 8px; border-radius:4px;">PENDING</div>
                </div>
                <div id="hitl-empty" style="text-align:center; padding:3rem 1rem; color:var(--text-dim); font-size:0.85rem;">
                    <div style="font-size:2rem; margin-bottom:1rem; opacity:0.3;">🔒</div>
                    No requests currently pending administrative classification.
                </div>
                <div id="hitl-list"></div>
            </div>

            <div class="glass-panel" style="margin-top:1.5rem; padding:1.25rem;">
                <div class="panel-header" style="margin-bottom:1rem; border:none; padding:0;">
                    <h2 style="font-size:0.8rem; opacity:0.6;">SYSTEM NODES</h2>
                </div>
                <div style="display:flex; flex-direction:column; gap:0.75rem;">
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                        <span style="color:var(--text-dim)">Execution Plane:</span>
                        <span style="color:var(--success)">ACTIVE (NODE.JS)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                        <span style="color:var(--text-dim)">Policy Sentinel:</span>
                        <span style="color:var(--success)">ACTIVE (FASTAPI)</span>
                    </div>
                    <div style="display:flex; justify-content:space-between; font-size:0.8rem;">
                        <span style="color:var(--text-dim)">Intent Engine:</span>
                        <span style="color:var(--primary)">LOCAL HYBRID</span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
    const protocol = window.location.protocol === 'https:' ? 'wss://' : 'ws://';
    const ws = new WebSocket(protocol + location.host);
    const feed = document.getElementById('audit-feed');
    const wsText = document.getElementById('ws-text');
    
    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.stats) updateStats(data.stats);
        if (data.type === 'init') {
            feed.innerHTML = '';
            data.audit.reverse().forEach(addEntry);
        }
        if (data.type === 'audit') addEntry(data.entry);
    };

    function updateStats(s) {
        document.getElementById('s-total').innerText = s.tokensIssued || 0;
        document.getElementById('s-verified').innerText = s.stepsVerified || 0;
        document.getElementById('s-blocked').innerText = (s.stepsBlocked || 0) + (s.attacksBlocked || 0);
        document.getElementById('s-policies').innerText = s.activePolicies || 0;
    }

    function addEntry(e) {
        const isError = e.type.includes('BLOCKED') || e.type.includes('FAIL');
        const isSuccess = e.type.includes('ALLOW') || e.type.includes('ISSUED');
        const typeCls = isError ? 'block' : isSuccess ? 'allow' : 'info';
        
        const entry = document.createElement('div');
        entry.className = 'audit-entry';
        entry.innerHTML = \`<div class="time">\${new Date(e.timestamp).toLocaleTimeString([], {hour:'2-digit', minute:'2-digit', second:'2-digit'})}</div>
            <div class="type \${typeCls}">\${e.type}</div>
            <div class="msg"><strong>\${e.tool || "SENTINEL"}</strong> — \${e.reason || (isError ? "Access Denied by Policy" : "Operation Validated")}</div>\`;
        
        feed.prepend(entry);
        if (feed.childNodes.length > 30) feed.lastChild.remove();
    }

    async function fetchHITL() {
        try {
            const res = await fetch('/hitl/pending', { headers: { 'X-API-KEY': 'admin_key' } });
            const list = await res.json();
            const hitlList = document.getElementById('hitl-list');
            const hitlEmpty = document.getElementById('hitl-empty');
            
            hitlList.innerHTML = '';
            hitlEmpty.style.display = list.length ? 'none' : 'block';
            
            list.forEach(req => {
                const div = document.createElement('div');
                div.className = 'hitl-card';
                div.innerHTML = \`<div class="meta">Risk Score: \${req.risk_score} // Intent: \${req.intent}</div>
                    <div class="intent">Elevated \${req.intent} Request from \${req.role}</div>
                    <div class="hitl-actions">
                        <button class="approve" onclick="decide('\${req.id}', 'allow')">PERMIT</button>
                        <button class="reject" onclick="decide('\${req.id}', 'block')">BLOCK</button>
                    </div>\`;
                hitlList.appendChild(div);
            });
        } catch {}
    }

    async function decide(id, decision) {
        await fetch('/hitl/decide/' + id, {
            method: 'POST',
            headers: { 'X-API-KEY': 'admin_key', 'Content-Type': 'application/json' },
            body: JSON.stringify({ decision })
        });
        fetchHITL();
    }

    setInterval(fetchHITL, 3000);
    fetchHITL();
</script>

</body>
</html>`;
}
