# Multi-Workspace Document Assistant

A production-style multi-tenant document assistant built for the Abstrabit Software Engineer assessment.

## Stack

- Next.js App Router + TypeScript
- Supabase Auth and Storage
- PostgreSQL + pgvector
- Local ONNX embeddings: `onnx-community/all-MiniLM-L6-v2-ONNX` (384 dimensions)
- Groq: `openai/gpt-oss-120b`
- React + Tailwind CSS

## What it does

The application supports multiple workspaces per authenticated user. Documents, retrieval, chats, tasks, and tool-call logs are scoped to the active workspace.

All document chunks live in one shared `document_chunks` vector table. Workspace filtering is applied inside the vector-search RPC, rather than filtering results after retrieval.

### Chat scopes

- **Document AI:** retrieves only the selected document.
- **Workspace AI:** retrieves across all documents in the active workspace.

Both modes preserve chat history, citations, tool execution, and workspace isolation.

## Implemented features

- Email/password and Google authentication
- Protected application routes
- Multiple workspaces with switching
- Private workspace-scoped PDF storage
- PDF extraction and chunking
- 384-dimensional embeddings and shared pgvector storage
- Workspace-scoped and document-scoped RAG
- Source/chunk citations
- Honest `I don't know` behavior
- Prompt-injection resistance
- `save_task` and `list_tasks` tools
- Server-side tool argument validation
- Server-controlled user/workspace identity
- Persistent chat history
- New chat, rename, delete, edit/resend, retry, and copy
- Tool-call audit log with arguments, results, success/failure, and workspace
- Idempotent PDF ingestion using SHA-256 file hashes
- Graceful LLM failure handling

## Security and reliability

### Workspace isolation

Every retrieval query includes the active workspace filter inside the vector query. A document from another workspace cannot be retrieved or cited through normal RAG.

### Prompt injection

Retrieved document text is treated as untrusted data, never as instructions. Malicious document tests attempting to reveal system prompts, API keys, and database credentials were rejected.

### Safe tools

Only known tools can execute. Arguments are validated. Unknown tools and invalid required arguments are rejected. The model never supplies the authenticated `user_id` or `workspace_id`; those come from the server-side authenticated context.

### LLM failure handling

The user's question is persisted before the external Groq operation so a failed LLM request does not silently lose the question. This was tested with an intentionally invalid Groq API key.

### Idempotent ingestion

Uploaded PDFs are hashed with SHA-256. A workspace/file-hash uniqueness constraint prevents the same document from creating a second document/chunk set in the same workspace.

### Secrets

Real secrets belong only in `.env.local` or deployment-provider secret configuration. `.env.example` contains placeholders only.

## Local setup

Requirements:

- Node.js 20+
- npm
- Supabase project
- Groq API key

Install:

```bash
npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Apply the SQL files in `supabase/` to the Supabase project according to the repository's schema/migration order.

Run:

```bash
npm run dev
```

Open `http://localhost:3000`.

Verify before deployment:

```bash
npm run lint
npm run build
```

## Assessment test flow

1. Sign in.
2. Create or switch between two workspaces.
3. Upload a different PDF into each workspace.
4. Ask Workspace AI a question whose answer exists only in Workspace A.
5. Switch to Workspace B and ask the same question. Workspace A content must not appear.
6. Open a document and use Document AI. It must stay document-scoped.
7. Ask a question unsupported by the active corpus. The assistant should say it does not have enough information.
8. Ask the assistant to save a task.
9. Ask it to list saved tasks.
10. Inspect the dashboard tool-call log.
11. Re-upload the exact same PDF into the same workspace. It must not create duplicate document/chunk data.
12. Test chat history, rename/delete, retry, edit, and copy.
13. Refresh and verify authentication/history persist.

### Suggested isolation test

Put this distinctive sentence in a Workspace A PDF:

```text
The Acme migration deadline is 17 November 2042.
```

Ask in Workspace A:

```text
What is the Acme migration deadline?
```

Then switch to Workspace B and ask the same question. Workspace B must not retrieve or cite the Workspace A document.

## Database

Important tables include:

- `workspaces`
- `documents`
- `document_chunks`
- `chat_conversations`
- `chat_messages`
- `tasks`
- `tool_call_logs`

The vector store is shared across workspaces.

## Deployment

The application is intended for a free-tier public deployment such as Vercel with Supabase.

Production environment variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
GROQ_MODEL
```

Before submission, verify the deployed URL for authentication, workspace switching, upload/ingestion, document AI, workspace AI, citations, tool execution, tool logs, isolation, and chat persistence.

## Documentation

- `README.md` — project overview, setup, architecture, testing, deployment
- `AI_NOTES.md` — AI-assisted development notes and engineering decisions
- `AGENTS.md` — project AI coding/context instructions
- `CLAUDE.md` — references `AGENTS.md`
- `.env.example` — environment variable template with no real secrets

## License

Created as part of a software engineering assessment.
