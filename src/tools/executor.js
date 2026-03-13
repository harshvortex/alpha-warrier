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
    // Real implementation: Could be SQL, MongoDB, etc.
    // For now, indicating it's waiting for connection string
    throw new Error('Database connection string (DATABASE_URL) not configured');
  }

  async sendEmail({ to, subject, body }) {
    // Real implementation: Nodemailer, SendGrid, Resend
    throw new Error('Email service (RESEND_API_KEY) not configured');
  }

  async executeCode({ code, language }) {
    // Real implementation: Restricted sandbox like 'vm2' or an external runner
    throw new Error('Code execution sandbox not initialized for production');
  }
}
