// ============================================================
// Alpha Warrior — Main Entry Point
// ============================================================

import 'dotenv/config';
import { AlphaWarriorAgent } from './agent/agent.js';
import { createSlackBot } from './slack/bot.js';
import { createDashboard } from './dashboard/server.js';
import { runAllAttackDemos } from './attacks/demo.js';

const MODE = process.env.MODE || 'full';

async function main() {
  console.log(`
╔═══════════════════════════════════════════════════════╗
║         🛡️  ALPHA WARRIOR v2.0                       ║
║         Intent-First Trust Layer | ArmorIQ            ║
╚═══════════════════════════════════════════════════════╝
  `);

  const agent = new AlphaWarriorAgent({
    armoriq: { 
      apiKey: process.env.ARMORIQ_API_KEY, 
      iapUrl: process.env.ARMORIQ_IAP_URL || 'http://127.0.0.1:8000', 
      backendUrl: process.env.ARMORIQ_BACKEND_URL, 
      failClosed: process.env.FAIL_CLOSED !== 'false' 
    },
    llmApiKey: process.env.OPENAI_API_KEY,
    model: process.env.LLM_MODEL || 'gpt-4o',
  });

  console.log('✅ ArmorIQ initialized | Fail-closed:', process.env.FAIL_CLOSED !== 'false');
  console.log('✅ Default policies loaded:', agent.listPolicies().length);

  const requiredEnv = ['OPENAI_API_KEY', 'ARMORIQ_API_KEY'];
  const missing = requiredEnv.filter(k => !process.env[k]);
  
  if (missing.length > 0 && MODE !== 'demo') {
    console.warn(`⚠️  Missing required environment variables: ${missing.join(', ')}`);
    console.warn('   The agent will run in limited mode. Please check your .env file.\n');
  }

  const dashPort = parseInt(process.env.DASHBOARD_PORT || '3001');
  createDashboard(agent, dashPort);

  if (process.env.SLACK_BOT_TOKEN && process.env.SLACK_APP_TOKEN) {
    const slackApp = createSlackBot(agent);
    await slackApp.start();
    console.log('✅ Slack bot running | Commands: /agent /attack-demo /policy /audit /stats');
  } else {
    console.log('⚠️  Slack not configured — dashboard only mode');
  }

  console.log(`\n🚀 Alpha Warrior is live! Dashboard: http://localhost:${dashPort}\n`);
}

main().catch(e => { console.error('💥 Fatal:', e.message); process.exit(1); });
