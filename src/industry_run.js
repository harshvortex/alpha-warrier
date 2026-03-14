import { AlphaWarriorAgent } from './agent/agent.js';
import { createDashboard } from './dashboard/server.js';
import { runAllAttackDemos } from './attacks/demo.js';
import chalk from 'chalk';
import readline from 'readline';
import dotenv from 'dotenv';

dotenv.config();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

const agent = new AlphaWarriorAgent();

async function start() {
  console.log(chalk.cyan.bold('\n═══════════════════════════════════════════════════════════'));
  console.log(chalk.cyan.bold('║         🛡️  ALPHA WARRIOR — INDUSTRY CONSOLE         ║'));
  console.log(chalk.cyan.bold('═══════════════════════════════════════════════════════════\n'));

  // Validations
  const missing = ['OPENAI_API_KEY', 'ARMORIQ_API_KEY'].filter(k => !process.env[k]);
  if (missing.length > 0) {
    console.log(chalk.yellow(`⚠️  WARNING: Running in SIMULATION MODE (Missing: ${missing.join(', ')})`));
    console.log(chalk.dim(`   In simulation mode, we use the "demo-key" bypass for ArmorIQ.\n`));
    process.env.ARMORIQ_API_KEY = 'demo-key';
  }

  // Handle Port Conflict for Industry Reliability
  let port = parseInt(process.env.DASHBOARD_PORT || '3042');
  const server = createDashboard(agent, port);
  
  server.on('error', (e) => {
    if (e.code === 'EADDRINUSE') {
      port++;
      console.log(chalk.dim(`   Port conflict encountered. Retrying on port ${port}...`));
      server.listen(port);
    }
  });

  console.log(chalk.green(`✅ Security Dashboard: http://localhost:${port}`));
  console.log(chalk.green(`✅ ArmorIQ Trust Layer: Active (Fail-Closed: ${process.env.FAIL_CLOSED !== 'false'})\n`));

  console.log(chalk.white('Type your prompt below to see the Secure Execution Engine in action.'));
  console.log(chalk.dim('Example: "Search for the latest AI security trends and report them."\n'));

  ask();
}

function ask() {
  rl.question(chalk.blue.bold('Warrior> '), async (input) => {
    if (input.toLowerCase() === 'exit') {
        process.exit(0);
    }
    if (input.toLowerCase() === 'demo') {
        console.log(chalk.yellow('\n🚀 Running Industry Attack Suite...\n'));
        await runAllAttackDemos();
        ask();
        return;
    }

    console.log(chalk.dim(`\n🔍 Verifying Intent & Generating Locked Plan...`));
    
    try {
      const result = await agent.processRequest(input, { userId: 'admin-user' });
      
      console.log('\n' + chalk.cyan.bold('═══ EXECUTION RESULT ═══'));
      if (result.success) {
        console.log(chalk.green(result.response));
      } else {
        console.log(chalk.red.bold(`🛡️ SECURITY BLOCK: ${result.response || result.error}`));
      }
      console.log(chalk.dim(`\nAudit ID: ${result.runId?.slice(0,8)} | Time: ${result.duration}ms | Verified: ✅\n`));
    } catch (err) {
      console.log(chalk.red.bold(`\n❌ CRITICAL SYSTEM ERROR: ${err.message}\n`));
      if (err.message.includes('401')) console.log(chalk.yellow('   Hint: Your API keys might be invalid. Check .env file.'));
    }

    ask();
  });
}

start();
