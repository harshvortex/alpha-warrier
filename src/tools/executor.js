// ============================================================
// Tool Executor — All available tools
// ============================================================

export class ToolExecutor {
  constructor() {
    this.tools = {
      web_search: this.webSearch.bind(this),
      web_fetch: this.webFetch.bind(this),
      read_file: this.readFile.bind(this),
      write_file: this.writeFile.bind(this),
      send_slack_message: this.sendSlackMessage.bind(this),
      query_database: this.queryDatabase.bind(this),
      send_email: this.sendEmail.bind(this),
      execute_code: this.executeCode.bind(this),
    };
  }

  async execute(toolName, args) {
    const tool = this.tools[toolName];
    if (!tool) throw new Error(`Unknown tool: ${toolName}`);
    return await tool(args);
  }

  async webSearch({ query }) {
    // Real implementation: Tavily AI or Google Search API
    const API_KEY = process.env.TAVILY_API_KEY;
    if (!API_KEY) {
      throw new Error('TAVILY_API_KEY is not configured for web_search');
    }
    
    const { default: fetch } = await import('node-fetch');
    const res = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ api_key: API_KEY, query, search_depth: 'basic' }),
    });
    
    if (!res.ok) throw new Error(`Search API failed: ${res.statusText}`);
    const data = await res.json();
    return { results: data.results, query, timestamp: new Date().toISOString() };
  }

  async webFetch({ url, headers }) {
    const { default: fetch } = await import('node-fetch');
    const res = await fetch(url, { headers, signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Fetch failed: ${res.status} ${res.statusText}`);
    const text = await res.text();
    return { url, status: res.status, content: text.slice(0, 2000), success: true };
  }

  async readFile({ path }) {
    const { readFile } = await import('fs/promises');
    const content = await readFile(path, 'utf-8'); 
    return { path, content, size: content.length };
  }

  async writeFile({ path, content }) {
    const { writeFile, mkdir } = await import('fs/promises');
    const { dirname } = await import('path');
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, content || '', 'utf-8');
    return { path, success: true, bytes: (content || '').length };
  }

  async sendSlackMessage({ channel, message }) {
    const { default: fetch } = await import('node-fetch');
    const token = process.env.SLACK_BOT_TOKEN;
    if (!token) throw new Error('SLACK_BOT_TOKEN not configured');

    const res = await fetch('https://slack.com/api/chat.postMessage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
      body: JSON.stringify({ channel, text: message }),
    });
    
    const data = await res.json();
    if (!data.ok) throw new Error(`Slack API error: ${data.error}`);
    return { channel, sent: true, ts: data.ts };
  }

  async queryDatabase({ query }) {
    // Production Simulation: Using 'database_simulation.json' as our locked storage
    const { readFile, writeFile } = await import('fs/promises');
    const dbPath = './database_simulation.json';
    
    // Auto-init if missing
    try { await readFile(dbPath); } catch { await writeFile(dbPath, JSON.stringify({ users: [{id: 1, name: "Harsh", role: "admin", balance: 5000}], transactions: [] })); }

    if (query.toLowerCase().includes('drop') || query.toLowerCase().includes('delete')) {
        throw new Error('UNAUTHORIZED: Destructive database operations require manual SQL-Level approval.');
    }

    const data = JSON.parse(await readFile(dbPath, 'utf-8'));
    return { query, result: data, notice: "Read-Only Database Mirror" };
  }

  async sendEmail({ to, subject, body }) {
    // Real implementation: Would use Resend or Nodemailer
    // Simulation: Audited Email Pipeline
    const { appendFile } = await import('fs/promises');
    const logEntry = `[${new Date().toISOString()}] To: ${to} | Sub: ${subject} | Body: ${body}\n`;
    await appendFile('./outbox.log', logEntry);

    return { to, subject, status: "queued", outbox_id: Math.random().toString(36).slice(2) };
  }

  async executeCode({ code, language }) {
    // In Production: This would run in a Firecracker microVM or restricted Wasm sandbox
    if (code.includes('process.env') || code.includes('fs.')) {
        throw new Error('SANDBOX VIOLATION: Access to host environment or filesystem is explicitly denied.');
    }
    
    // Mocking execution for safety in the hackathon environment
    return { 
        code, 
        language, 
        output: "Code execution result [Simulated Sandbox]", 
        safety_status: "Verified by Alpha Warrior Sandbox" 
    };
  }
}
