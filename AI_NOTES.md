# AI_NOTES.md

## Project

Multi-Workspace Document Assistant — Abstrabit Software Engineer assessment.

## AI tools and models

AI assistance was used throughout implementation for architecture discussion, code generation, debugging, security review, test planning, and documentation.

The application LLM is Groq using:

```text
openai/gpt-oss-120b
```

Embeddings use the local ONNX model:

```text
onnx-community/all-MiniLM-L6-v2-ONNX
```

The embedding size is 384 dimensions and vectors are stored in PostgreSQL/pgvector.

AI was used as an engineering copilot. Product decisions, architecture decisions, testing, and final validation remained human-reviewed.

## Key decisions

### Workspace filtering inside vector retrieval

The most important tenancy decision was to enforce the active workspace in the vector-search RPC itself.

The shared `document_chunks` table contains chunks from multiple workspaces, but retrieval requires the authenticated workspace and applies that filter before similarity results are returned.

Document chat adds an optional document filter.

### Shared vector store

I deliberately used one shared vector table rather than separate vector stores per workspace. Each chunk is linked to a document, and each document belongs to a workspace.

### Idempotent ingestion

The initial ingestion approach only avoided duplicates for the same document record. Re-uploading the same physical PDF created a new document row.

The final solution computes a SHA-256 hash for the uploaded file and stores it in `documents.file_hash`. A unique `(workspace_id, file_hash)` constraint prevents duplicate ingestion within the same workspace.

## Hardest bug / wrong turn

The hardest issue was the workspace-level chat routing bug.

Document chat and workspace chat share the same chat component, but workspace chat has no `document_id`.

The first implementation built URLs unconditionally with:

```text
document=null
```

The server then interpreted `"null"` as a document ID. The document lookup failed and redirected the user to the document list.

The fix was to make URL construction scope-aware:

- workspace chat: `workspace`
- document chat: `workspace` + `document`
- either mode may also include `conversation`

The server chat page and history API were updated to treat `document_id IS NULL` as the valid workspace-chat scope.

The fix was followed by lint/build and manual testing of workspace chat, refresh, history, new chat, and document chat.

## Other debugging

A React effect in `ChatManager` triggered the project's lint rule because it synchronously updated state after reading URL parameters. The final version performs the synchronization through an async function inside the effect and keeps dependencies explicit.

The `/search-test` page also required a Suspense boundary around `useSearchParams` for the production build.

## Safety testing

The application was tested for:

- workspace isolation
- prompt injection resistance
- honest unsupported-question behavior
- malformed tool arguments
- unknown tools
- server-controlled workspace/user IDs
- tool-call logging
- LLM failure handling
- ingestion idempotency
- authentication/session isolation

For prompt injection, malicious document content attempted to make the assistant reveal system instructions, API keys, and database credentials. The assistant refused.

For LLM failure handling, an intentionally invalid Groq API key was used. The user's question remained saved.

## What I would improve with more time

- Streaming assistant responses
- Retrieval-debug UI showing exact workspace/chunks used
- Hybrid keyword + vector retrieval or reranking
- Request-level latency/token observability
- More automated integration tests
- Multi-step tool workflows
- Explicit opt-in cross-workspace document sharing

These were kept as stretch improvements so the mandatory security and isolation behavior remained stable.

## Engineering principle

The model can propose answers and tool actions, but application code remains responsible for authorization, workspace scope, validation, and execution.
