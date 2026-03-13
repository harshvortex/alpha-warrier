# SentinelLayer

SentinelLayer is a security middleware for AI agents, providing intent analysis, policy enforcement, and tool execution guarding.

## Features

- **Intent Analyzer**: Uses Gemini API to detect malicious intents.
- **RBAC**: Role-based access control for API endpoints.
- **Policy Engine**: Validates actions against predefined rules.
- **Tool Guard**: Combined security check for tool executions.
- **Security Logs**: Audit trail for all security events.

## Getting Started

1. Clone the repository.
2. Install requirements: `pip install -r backend/requirements.txt`
3. Set your `GEMINI_API_KEY` in the `.env` file.
4. Run the server: `python -m backend.main`

## API Documentation

Once running, visit `http://localhost:8000/docs` for the interactive Swagger documentation.
