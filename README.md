# n8n-nodes-commune

n8n community node for [Commune](https://commune.email) — email infrastructure for AI agents.

Give your n8n workflows a real email address: send and receive email, manage inboxes, search conversations, and extract structured data — no code required.

## Installation

In your n8n instance, go to **Settings → Community Nodes** and install:

```
n8n-nodes-commune
```

Or install manually:

```bash
npm install n8n-nodes-commune
```

## Credentials

1. Sign in to the [Commune Dashboard](https://commune.email/dashboard)
2. Go to **API Keys** and click **Create API Key**
3. In n8n, add a new **Commune API** credential and paste your key (`comm_...`)

The credential includes a test button that pings `GET /v1/inboxes` to verify your key.

## Nodes

### Commune (Action Node)

Perform operations against the Commune API:

| Resource | Operations |
|----------|-----------|
| **Message** | Send, List |
| **Inbox** | Create, List, Get, Update, Delete, Set Webhook, Set Extraction Schema |
| **Thread** | List, Get Messages, Update Status |
| **Search** | Search Threads |
| **Delivery** | Get Metrics |

### Commune Trigger

Starts a workflow automatically when an email arrives in an inbox. Registers a webhook on the inbox when the workflow is activated, and removes it when deactivated.

**Output fields (Message mode):**

| Field | Description |
|-------|-------------|
| `message_id` | Unique message ID |
| `thread_id` | Conversation thread ID |
| `inbox_id` | Inbox the email arrived at |
| `inbox_address` | Full inbox email address |
| `subject` | Email subject |
| `body_text` | Plain text body |
| `body_html` | HTML body |
| `from` | Sender email address |
| `extracted_data` | Structured data extracted by your schema |
| `spam_flagged` | Whether the email was flagged as spam |
| `prompt_injection` | Whether prompt injection was detected |
| `received_at` | ISO timestamp |
| `has_attachments` | Whether the email has attachments |
| `attachment_ids` | Array of attachment IDs |

## Example Workflows

### Customer Support Auto-Triage

```
Commune Trigger (inbound email)
  → OpenAI (classify intent from extracted_data)
  → If (urgent?)
     → Slack (alert support team)
  → Commune: Message → Send (auto-acknowledge reply)
  → Commune: Thread → Update Status (open)
```

### Sales Lead Qualification

```
Commune Trigger (inbound email)
  → Commune: Thread → Get Messages (full context)
  → OpenAI (score lead quality)
  → HubSpot (Create/Update Contact)
  → Commune: Message → Send (personalised follow-up)
```

### Inbox Health Monitor

```
Schedule Trigger (daily 9am)
  → Commune: Delivery → Get Metrics (last 24h)
  → If (bounce_rate > 5%?)
     → Slack (alert deliverability degradation)
```

## Links

- [Commune Documentation](https://docs.commune.email)
- [Authentication](https://docs.commune.email/authentication)
- [Webhooks](https://docs.commune.email/features/webhooks)
- [Structured Extraction](https://docs.commune.email/features/structured-extraction)
- [GitHub](https://github.com/commune-email/n8n-nodes-commune)
