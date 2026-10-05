# Multi-Workspace Document Assistant

A production-style multi-tenant document AI application built with Next.js, Supabase, pgvector, local ONNX embeddings, and Groq. It demonstrates workspace-isolated RAG, persistent chat, safe tool calling, document ingestion, citations, and audit logging.

## Why this project

The application was built as an engineering assessment project with an emphasis on **correctness, isolation, reliability, and observable AI behavior**, rather than simply wiring an LLM to a document search box.

The core design requirement is that documents, retrieval, conversations, tasks, and tool activity remain scoped to the authenticated user's active workspace.

## Architecture

```text
                         ┌──────────────────────┐
                         │      Next.js 16      │
                         │   App Router + UI    │
                         └──────────┬───────────┘
                                    │
                         Authenticated request
                                    │
                  ┌─────────────────▼─────────────────┐
                  │          Supabase Auth            │
                  └─────────────────┬─────────────────┘
                                    │
                 ┌──────────────────▼──────────────────┐
                 │       Workspace-scoped backend     │
                 └───────┬───────────────┬────────────┘
                         │               │
              ┌──────────▼──────┐  ┌────▼────────────┐
              │ Supabase Storage │  │ PostgreSQL +    │
              │ Private PDFs     │  │ pgvector        │
              └─────────────────┘  └────┬────────────┘
                                        │
                              Vector retrieval / RAG
                                        │
                              ┌─────────▼─────────┐
                              │   Groq LLM        │
                              │ Tool calling      │
                              └───────────────────┘
```

### Retrieval model

All document chunks are stored in a shared `document_chunks` vector table. The active workspace is supplied to the vector-search RPC so workspace filtering happens **inside retrieval**, not after unrelated results have already been returned.

Two retrieval scopes are supported:

- **Document AI** — searches only the selected document.
- **Workspace AI** — searches all documents belonging to the active workspace.

Both modes retain citations and chat history.

## Features

### Authentication and workspaces

- Email/password authentication
- Google authentication
- Persistent sessions
- Protected application routes
- Multiple workspaces per user
- Workspace switching
- Server-controlled user and workspace identity

### Document pipeline

- Private PDF storage
- Workspace-scoped upload/download/delete
- PDF text extraction with `unpdf`
- Chunking
- 384-dimensional ONNX embeddings
- Shared pgvector storage
- SHA-256 based ingestion idempotency

### AI / RAG

- Workspace-scoped RAG
- Document-scoped RAG
- Source/chunk citations
- Persistent conversations and messages
- Explicit unsupported-question handling
- Prompt-injection resistance
- Groq-powered generation
- Graceful external LLM failure handling

### Tool calling

The assistant exposes controlled task-management tools:

- `save_task`
- `list_tasks`

Tool arguments are validated server-side. The model does not provide authenticated `user_id` or `workspace_id`; those values are derived from the authenticated server context.

### Chat experience

- New conversations
- Rename conversations
- Delete conversations
- Edit/resend messages
- Retry responses
- Copy responses
- Persistent chat history

### Observability

Tool execution is persisted in `tool_call_logs`, including arguments, results, success/failure state, and workspace context.

## Security and reliability

### Workspace isolation

Every vector retrieval operation receives the active workspace context. A document from another workspace therefore cannot be returned or cited through normal RAG.

### Untrusted document content

Retrieved PDF text is treated as **data**, not instructions. Prompt-injection attempts contained inside documents are not allowed to override system behavior or expose secrets.

### Controlled tool execution

Only explicitly supported tools can execute. Required arguments are validated before execution, and identity fields are controlled by the server.

### Failure-safe chat persistence

The user's message is persisted before the external Groq request. If the LLM call fails, the question is not silently lost.

### Idempotent ingestion

Uploaded PDFs are hashed with SHA-256. A workspace/file-hash uniqueness constraint prevents duplicate ingestion of the same document into the same workspace.

### Secrets

Secrets belong in `.env.local` or deployment-provider secret configuration. `.env.example` contains placeholders only.

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 App Router |
| Language | TypeScript |
| UI | React 19, Tailwind CSS |
| Authentication | Supabase Auth |
| Storage | Supabase Storage |
| Database | Supabase PostgreSQL |
| Vector search | pgvector |
| PDF extraction | unpdf |
| Embeddings | Hugging Face Transformers + ONNX |
| LLM | Groq |
| Runtime | Node.js 20+ |

## Data Model

Core tables include:

- `workspaces`
- `documents`
- `document_chunks`
- `chat_conversations`
- `chat_messages`
- `tasks`
- `tool_call_logs`

The vector store is shared, while application-level workspace scoping determines which records and chunks are available to a request.

## Repository Documentation

- `README.md` — architecture, features, setup, testing and deployment
- `AI_NOTES.md` — AI-assisted development notes and engineering decisions
- `AGENTS.md` — repository coding/context instructions
- `CLAUDE.md` — references the agent instructions
- `.env.example` — safe environment-variable template

## Local Development

### Requirements

- Node.js 20+
- npm
- Supabase project
- Groq API key

### Install

```bash
git clone https://github.com/Neha9826/Multi-Workspace-Document-Assistant.git
cd Multi-Workspace-Document-Assistant

npm install
```

Create `.env.local`:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
GROQ_API_KEY=your_groq_api_key
GROQ_MODEL=openai/gpt-oss-120b
```

Apply the SQL files in `supabase/` in the repository's documented schema/migration order.

Start the application:

```bash
npm run dev
```

Open `http://localhost:3000`.

### Verification

```bash
npm run lint
npm run build
```

## Assessment / Verification Flow

1. Sign in.
2. Create two workspaces.
3. Upload different PDFs into each workspace.
4. Ask Workspace AI a question answered only by Workspace A.
5. Switch to Workspace B and repeat the question.
6. Verify Workspace A content is not retrieved or cited.
7. Open a document and verify Document AI remains document-scoped.
8. Ask a question unsupported by the active corpus and verify the assistant does not invent an answer.
9. Save and list a task through tool calling.
10. Inspect the tool-call audit log.
11. Upload the same PDF twice into one workspace and verify ingestion remains idempotent.
12. Exercise chat rename, delete, retry, edit/resend and copy flows.
13. Refresh the application and verify authentication and chat history persist.

### Example isolation test

Place this sentence in a Workspace A document:

```text
The Acme migration deadline is 17 November 2042.
```

Ask Workspace A:

```text
What is the Acme migration deadline?
```

Then switch to Workspace B and ask the same question. Workspace B must not retrieve or cite the Workspace A document.

## Deployment

The application is suitable for a public deployment using a Next.js host such as Vercel with Supabase.

Required production variables:

```text
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
GROQ_API_KEY
GROQ_MODEL
```

Before deployment, verify authentication, workspace switching, PDF ingestion, document/workspace RAG, citations, tool execution, audit logs, isolation, and chat persistence.

## Engineering Highlights

This project demonstrates several patterns relevant to production AI applications:

- Multi-tenant/workspace-aware retrieval
- Vector search with database-level filtering
- Local embedding generation to reduce dependency on hosted embedding APIs
- Server-controlled AI tool execution
- Persistent AI conversations
- Idempotent document ingestion
- Prompt-injection-aware RAG design
- Explicit failure handling around external LLM calls
- Auditable tool execution
- Full-stack TypeScript architecture

## Project Status

Assessment project with the core RAG, workspace isolation, tool-calling, chat, storage, and observability workflows implemented.

## Author

**Neha Pattnayak**  
Senior Full Stack Engineer

## License

Created as part of a software engineering assessment.
