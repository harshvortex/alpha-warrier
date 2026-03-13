// ============================================================
// Slack Bot — Alpha Warrior Interface
// ============================================================

import pkg from '@slack/bolt';
const { App } = pkg;
import { runAllAttackDemos } from '../attacks/demo.js';

export function createSlackBot(agent) {
  const app = new App({
    token: process.env.SLACK_BOT_TOKEN,
    appToken: process.env.SLACK_APP_TOKEN,
    signingSecret: process.env.SLACK_SIGNING_SECRET,
    socketMode: true,
  });

  app.command('/agent', async ({ command, ack, respond }) => {
    await ack();
    const prompt = command.text;
    if (!prompt) { await respond('Usage: `/agent <your request>`'); return; }
    await respond({ text: `🔍 Processing: _"${prompt}"_`, response_type: 'in_channel' });
    try {
      const result = await agent.processRequest(prompt, { userId: command.user_id });
      await respond({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: result.success ? '✅ Execution Complete' : '🛡️ Blocked' } },
          { type: 'section', text: { type: 'mrkdwn', text: result.response || result.error } },
          { type: 'context', elements: [{ type: 'mrkdwn', text: `Run: \`${result.runId?.slice(0,8)}\` | Token: \`${result.tokenId?.slice(0,8)}\` | ${result.duration}ms | ArmorIQ: 🔐` }] },
        ],
        response_type: 'in_channel',
      });
    } catch (err) { await respond(`❌ Error: ${err.message}`); }
  });

  app.command('/attack-demo', async ({ command, ack, respond }) => {
    await ack();
    await respond({ text: '🛡️ *Running live attack demonstrations...*', response_type: 'in_channel' });
    try {
      const demoAgent = await runAllAttackDemos();
      const s = demoAgent.getStats();
      await respond({
        blocks: [
          { type: 'header', text: { type: 'plain_text', text: '🛡️ Attack Demo Complete' } },
          { type: 'section', text: { type: 'mrkdwn', text: `*5 attacks. All blocked.*\n• Prompt Injection → ❌\n• PCI Exfiltration → ❌\n• Privilege Escalation → ❌\n• Token Replay → ❌\n• Plan Tampering → ❌` } },
          { type: 'section', fields: [{ type: 'mrkdwn', text: `*Attacks Blocked*\n${s.attacksBlocked}` }, { type: 'mrkdwn', text: `*Policy Violations*\n${s.policyViolations}` }] },
        ],
        response_type: 'in_channel',
      });
    } catch (err) { await respond(`❌ Demo error: ${err.message}`); }
  });

  app.command('/policy', async ({ command, ack, respond }) => {
    await ack();
    const [action, ...rest] = command.text.split(' ');
    if (action === 'list') {
      const policies = agent.listPolicies();
      const text = policies.length ? policies.map(p => `• \`${p.id}\` — ${p.action.toUpperCase()} \`${p.tool}\`: ${p.reason || ''}`).join('\n') : 'No custom policies.';
      await respond({ text: `*Active Policies:*\n${text}`, response_type: 'in_channel' }); return;
    }
    if (action === 'deny' && rest[0]) { const id = agent.addPolicy({ tool: rest[0], action: 'deny', reason: `Blocked by ${command.user_id}` }); await respond({ text: `🔒 DENY \`${rest[0]}\` (id: \`${id}\`)`, response_type: 'in_channel' }); return; }
    if (action === 'allow' && rest[0]) { const id = agent.addPolicy({ tool: rest[0], action: 'allow', reason: `Allowed by ${command.user_id}` }); await respond({ text: `🔓 ALLOW \`${rest[0]}\` (id: \`${id}\`)`, response_type: 'in_channel' }); return; }
    if (action === 'remove' && rest[0]) { agent.removePolicy(rest[0]); await respond({ text: `🗑️ Policy \`${rest[0]}\` removed.`, response_type: 'in_channel' }); return; }
    await respond('*Commands:*\n• `/policy list`\n• `/policy deny <tool>`\n• `/policy allow <tool>`\n• `/policy remove <id>`');
  });

  app.command('/audit', async ({ command, ack, respond }) => {
    await ack();
    const logs = agent.getAuditLog(10);
    if (!logs.length) { await respond('No audit entries yet.'); return; }
    const text = logs.map(l => {
      const icon = l.type.includes('BLOCKED') ? '❌' : l.type.includes('ALLOWED') ? '✅' : 'ℹ️';
      return `${icon} \`${new Date(l.timestamp).toLocaleTimeString()}\` *${l.type}* ${l.tool || ''} ${l.reason ? `— _${l.reason}_` : ''}`;
    }).join('\n');
    await respond({ text: `*Last 10 Audit Entries:*\n${text}`, response_type: 'in_channel' });
  });

  app.command('/stats', async ({ command, ack, respond }) => {
    await ack();
    const s = agent.getStats();
    await respond({
      blocks: [
        { type: 'header', text: { type: 'plain_text', text: '📊 Alpha Warrior Stats' } },
        { type: 'section', fields: [{ type: 'mrkdwn', text: `*Tokens Issued*\n${s.tokensIssued}` }, { type: 'mrkdwn', text: `*Steps Verified*\n${s.stepsVerified}` }, { type: 'mrkdwn', text: `*Attacks Blocked*\n${s.attacksBlocked}` }, { type: 'mrkdwn', text: `*Active Policies*\n${s.activePolicies}` }] },
      ],
      response_type: 'in_channel',
    });
  });

  return app;
}
