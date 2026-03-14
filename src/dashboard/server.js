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
    <title>Alpha Warrior | Cyber-Security Console</title>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
    <style>
        :root {
            --primary: #3b82f6;
            --primary-glow: rgba(59, 130, 246, 0.5);
            --danger: #ef4444;
            --success: #22c55e;
            --warning: #f59e0b;
            --dark-bg: #05070a;
            --card-bg: rgba(15, 23, 42, 0.8);
            --border: rgba(51, 65, 85, 0.5);
        }

        * { margin: 0; padding: 0; box-sizing: border-box; }
        body {
            font-family: 'Outfit', sans-serif;
            background: var(--dark-bg);
            color: #f8fafc;
            overflow-x: hidden;
            background-image: 
                radial-gradient(circle at 20% 20%, rgba(59, 130, 246, 0.05) 0%, transparent 40%),
                radial-gradient(circle at 80% 80%, rgba(139, 92, 246, 0.05) 0%, transparent 40%);
        }

        /* --- Header --- */
        header {
            background: rgba(2, 6, 23, 0.7);
            backdrop-filter: blur(12px);
            border-bottom: 1px solid var(--border);
            padding: 1rem 3rem;
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: sticky;
            top: 0;
            z-index: 100;
        }

        header h1 {
            font-size: 1.5rem;
            font-weight: 700;
            background: linear-gradient(135deg, #60a5fa 0%, #a78bfa 100%);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            letter-spacing: -0.02em;
        }

        .status-pill {
            display: flex;
            align-items: center;
            gap: 0.5rem;
            background: rgba(34, 197, 94, 0.1);
            color: var(--success);
            padding: 0.4rem 1rem;
            border-radius: 999px;
            font-size: 0.75rem;
            font-weight: 600;
            border: 1px solid rgba(34, 197, 94, 0.2);
        }

        /* --- Layout --- */
        .container {
            max-width: 1600px;
            margin: 0 auto;
            padding: 2rem 3rem;
            display: grid;
            grid-template-columns: 2fr 1fr;
            gap: 2rem;
        }

        /* --- Stats Grid --- */
        .stats-grid {
            grid-column: span 2;
            display: grid;
            grid-template-columns: repeat(6, 1fr);
            gap: 1.25rem;
            margin-bottom: 2rem;
        }

        .stat-card {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 1.5rem;
            transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
            position: relative;
            overflow: hidden;
        }

        .stat-card:hover {
            transform: translateY(-4px);
            border-color: rgba(59, 130, 246, 0.4);
            box-shadow: 0 10px 30px -10px rgba(0,0,0,0.5);
        }

        .stat-card::before {
            content: '';
            position: absolute;
            top: 0; left: 0; width: 4px; height: 100%;
            background: var(--primary);
            opacity: 0.5;
        }

        .stat-card.alert::before { background: var(--danger); }
        .stat-card.warn::before { background: var(--warning); }

        .stat-card .label {
            font-size: 0.75rem;
            color: #94a3b8;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.05em;
        }

        .stat-card .value {
            font-size: 2.2rem;
            font-weight: 700;
            margin-top: 0.5rem;
            font-family: 'JetBrains Mono', monospace;
        }

        /* --- Sections --- */
        .section {
            background: var(--card-bg);
            border: 1px solid var(--border);
            border-radius: 20px;
            padding: 1.5rem;
            height: fit-content;
        }

        .section-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 1.5rem;
            padding-bottom: 1rem;
            border-bottom: 1px solid var(--border);
        }

        .section-header h2 {
            font-size: 1.1rem;
            color: #cbd5e1;
            font-weight: 600;
        }

        /* --- Audit Log --- */
        .audit-log {
            max-height: 600px;
            overflow-y: auto;
            display: flex;
            flex-direction: column;
            gap: 0.75rem;
            padding-right: 0.5rem;
        }

        .audit-entry {
            background: rgba(30, 41, 59, 0.4);
            border: 1px solid var(--border);
            border-radius: 10px;
            padding: 1rem;
            display: grid;
            grid-template-columns: 100px 140px 1fr;
            align-items: center;
            gap: 1rem;
            font-size: 0.85rem;
            animation: slideIn 0.3s ease-out;
        }

        @keyframes slideIn {
            from { opacity: 0; transform: translateX(-10px); }
            to { opacity: 1; transform: translateX(0); }
        }

        .audit-entry .time { font-family: 'JetBrains Mono', monospace; color: #64748b; font-size: 0.75rem; }
        .audit-entry .type { 
            font-weight: 600; 
            padding: 0.25rem 0.6rem; 
            border-radius: 6px; 
            text-align: center;
            font-size: 0.7rem;
            text-transform: uppercase;
        }

        .type.block { background: rgba(239, 68, 68, 0.15); color: #f87171; border: 1px solid rgba(239, 68, 68, 0.2); }
        .type.allow { background: rgba(34, 197, 94, 0.15); color: #4ade80; border: 1px solid rgba(34, 197, 94, 0.2); }
        .type.info { background: rgba(59, 130, 246, 0.15); color: #60a5fa; border: 1px solid rgba(59, 130, 246, 0.2); }

        .audit-entry .msg { color: #cbd5e1; line-height: 1.4; }

        /* --- HITL Gateway --- */
        .hitl-card {
            background: linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, rgba(245, 158, 11, 0.02) 100%);
            border: 1px solid rgba(245, 158, 11, 0.3);
            border-radius: 12px;
            padding: 1.25rem;
            margin-bottom: 1rem;
        }

        .hitl-card .meta { font-size: 0.75rem; color: var(--warning); font-weight: 700; text-transform: uppercase; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.4rem; }
        .hitl-card .intent { font-size: 1rem; font-weight: 600; margin-bottom: 1rem; }
        .hitl-actions { display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; }
        
        button {
            padding: 0.6rem 1rem;
            border-radius: 8px;
            font-weight: 600;
            font-size: 0.8rem;
            cursor: pointer;
            transition: all 0.2s;
            border: none;
        }

        button.approve { background: var(--success); color: white; }
        button.approve:hover { background: #16a34a; box-shadow: 0 0 15px rgba(34, 197, 94, 0.3); }
        button.reject { background: var(--danger); color: white; }
        button.reject:hover { background: #dc2626; box-shadow: 0 0 15px rgba(239, 68, 68, 0.3); }

        /* Custom Scrollbar */
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: #334155; border-radius: 10px; }
        ::-webkit-scrollbar-thumb:hover { background: #475569; }
    </style>
</head>
<body>

<header>
    <div style="display:flex; align-items:center; gap:1rem;">
        <h1>🛡️ ALPHA WARRIOR</h1>
        <div class="status-pill"><span id="ws-indicator" style="width:8px; height:8px; border-radius:50%; background:currentColor;"></span> <span id="ws-text">SECURE LINK ESTABLISHED</span></div>
    </div>
    <div style="font-size: 0.8rem; color: #64748b; font-family: 'JetBrains Mono';">SYSTEM V2.0 // INDUSTRY-READY</div>
</header>

<div class="container">
    <div class="stats-grid">
        <div class="stat-card">
            <div class="label">Total Intercepts</div>
            <div class="value" id="s-total">0</div>
        </div>
        <div class="stat-card">
            <div class="label">Verified Intent</div>
            <div class="value" style="color:var(--success)" id="s-verified">0</div>
        </div>
        <div class="stat-card alert">
            <div class="label">Blocks Triggered</div>
            <div class="value" style="color:var(--danger)" id="s-blocked">0</div>
        </div>
        <div class="stat-card alert">
            <div class="label">Injection Defenses</div>
            <div class="value" style="color:var(--danger)" id="s-attacks">0</div>
        </div>
        <div class="stat-card">
            <div class="label">Active Policies</div>
            <div class="value" style="color:var(--primary)" id="s-policies">0</div>
        </div>
        <div class="stat-card warn">
            <div class="label">Pending Review</div>
            <div class="value" style="color:var(--warning)" id="s-hitl">0</div>
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <h2>REAL-TIME SECURITY AUDIT</h2>
            <div style="font-size:0.75rem; color:#64748b;">LIVE FEED</div>
        </div>
        <div class="audit-log" id="audit-feed">
            <!-- Entries will appear here -->
        </div>
    </div>

    <div class="section">
        <div class="section-header">
            <h2 style="color:var(--warning)">🛡️ HITL GATEWAY</h2>
            <div style="font-size:0.75rem; background:rgba(245,158,11,0.1); color:var(--warning); padding:2px 8px; border-radius:4px;">ADMIN ONLY</div>
        </div>
        <div id="hitl-empty" style="text-align:center; padding:2rem; color:#475569; font-size:0.9rem;">
            No requests pending human approval.
        </div>
        <div id="hitl-list">
            <!-- Pending approvals -->
        </div>
    </div>
</div>

<script>
    const ws = new WebSocket('ws://' + location.host);
    const feed = document.getElementById('audit-feed');
    const wsText = document.getElementById('ws-text');
    const wsInd = document.getElementById('ws-indicator');

    ws.onopen = () => {
        wsText.textContent = 'SECURE LINK ESTABLISHED';
        wsInd.style.color = 'var(--success)';
    };

    ws.onclose = () => {
        wsText.textContent = 'LINK SEVERED';
        wsInd.style.color = 'var(--danger)';
    };

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        if (data.stats) updateStats(data.stats);
        if (data.type === 'init' && data.audit) {
            data.audit.reverse().forEach(addEntry);
        }
        if (data.type === 'audit' && data.entry) {
            addEntry(data.entry);
        }
    };

    function updateStats(s) {
        document.getElementById('s-total').textContent = (s.tokensIssued || 0);
        document.getElementById('s-verified').textContent = (s.stepsVerified || 0);
        document.getElementById('s-blocked').textContent = (s.stepsBlocked || 0);
        document.getElementById('s-attacks').textContent = (s.attacksBlocked || 0);
        document.getElementById('s-policies').textContent = (s.activePolicies || 0);
        document.getElementById('s-hitl').textContent = (s.pendingApprovals || 0);
    }

    function addEntry(e) {
        const isBlocked = e.type.includes('BLOCKED') || e.type.includes('FAILED');
        const isAllowed = e.type.includes('ALLOWED') || e.type.includes('ISSUED');
        const typeCls = isBlocked ? 'block' : isAllowed ? 'allow' : 'info';
        
        const entry = document.createElement('div');
        entry.className = 'audit-entry';
        entry.innerHTML = '<div class="time">' + new Date(e.timestamp).toLocaleTimeString([], {hour12: false, hour: "2-digit", minute:"2-digit", second:"2-digit"}) + '</div>' + 
            '<div class="type ' + typeCls + '">' + e.type + '</div>' + 
            '<div class="msg"><strong>' + (e.tool || e.policyId || "CORE") + '</strong>' + 
            '<span style="color:#64748b; margin: 0 0.5rem;">—</span>' + 
            (e.reason || "Operation validated by ArmorIQ Trust Layer") + '</div>';
        feed.prepend(entry);
        if (feed.children.length > 50) feed.lastChild.remove();
    }

    // --- HITL LIVE GATEWAY ---
    const hitlList = document.getElementById('hitl-list');
    const hitlEmpty = document.getElementById('hitl-empty');

    async function fetchPendingHitl() {
        try {
            const res = await fetch('http://localhost:8000/hitl/pending', {
                headers: { 'X-API-KEY': 'admin_key' }
            });
            if (!res.ok) throw new Error('Sentinel Backend Unreachable');
            const requests = await res.json();
            
            hitlList.innerHTML = '';
            if (requests.length === 0) {
                hitlEmpty.style.display = 'block';
                return;
            }
            hitlEmpty.style.display = 'none';

            requests.forEach(req => {
                const card = document.createElement('div');
                card.className = 'hitl-card';
                card.innerHTML = '<div class="meta">⚠️ HIGH RISK ' + req.role + ' ACTION</div>' +
                    '<div class="intent">' + req.intent + ' (Risk: ' + req.risk_score + ')</div>' +
                    '<div class="hitl-actions">' +
                        '<button class="approve" onclick="decideHitl(\'' + req.id + '\', \'allow\')">APPROVE</button>' +
                        '<button class="reject" onclick="decideHitl(\'' + req.id + '\', \'block\')">REJECT</button>' +
                    '</div>';
                hitlList.appendChild(card);
            });
        } catch (err) {
            hitlEmpty.textContent = "Unable to connect to Sentinel HITL Pipeline.";
        }
    }

    async function decideHitl(id, decision) {
        try {
            const res = await fetch('http://localhost:8000/hitl/decide/' + id, {
                method: 'POST',
                headers: { 'X-API-KEY': 'admin_key', 'Content-Type': 'application/json' },
                body: JSON.stringify({ decision: decision })
            });
            if (res.ok) fetchPendingHitl();
        } catch (err) {
            alert("Approval sync failed: " + err.message);
        }
    }

    // Refresh HITL every 3 seconds
    setInterval(fetchPendingHitl, 3000);
    fetchPendingHitl();
</script>

</body>
</html>`;
}
