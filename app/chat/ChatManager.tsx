"use client";

import {
  FormEvent,
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import {
  useRouter,
  useSearchParams,
} from "next/navigation";

type Source = {
  documentId: string;
  documentName: string;
  chunkIndex: number;
  similarity: number;
  preview: string;
};

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources: Source[];
  created_at: string;
};

type Conversation = {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatManagerProps = {
  workspaceId: string;
  workspaceName: string;
  documentId: string;
  documentName: string;
  initialConversationId: string | null;
};

function Icon({
  name,
  size = 16,
}: {
  name:
    | "copy"
    | "check"
    | "retry"
    | "edit"
    | "more"
    | "trash"
    | "pencil"
    | "close"
    | "send"
    | "arrowLeft";
  size?: number;
}) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };

  if (name === "copy") {
    return (
      <svg {...common}>
        <rect
          x="9"
          y="9"
          width="11"
          height="11"
          rx="2"
        />
        <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
      </svg>
    );
  }

  if (name === "check") {
    return (
      <svg {...common}>
        <path d="m5 12 4 4L19 6" />
      </svg>
    );
  }

  if (name === "retry") {
    return (
      <svg {...common}>
        <path d="M20 11a8.1 8.1 0 0 0-15.5-3M4 5v4h4" />
        <path d="M4 13a8.1 8.1 0 0 0 15.5 3M20 19v-4h-4" />
      </svg>
    );
  }

  if (name === "edit") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "more") {
    return (
      <svg {...common}>
        <circle
          cx="5"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="12"
          cy="12"
          r="1"
          fill="currentColor"
        />
        <circle
          cx="19"
          cy="12"
          r="1"
          fill="currentColor"
        />
      </svg>
    );
  }

  if (name === "trash") {
    return (
      <svg {...common}>
        <path d="M3 6h18" />
        <path d="M8 6V4h8v2" />
        <path d="M19 6l-1 15H6L5 6" />
        <path d="M10 11v6M14 11v6" />
      </svg>
    );
  }

  if (name === "pencil") {
    return (
      <svg {...common}>
        <path d="M12 20h9" />
        <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" />
      </svg>
    );
  }

  if (name === "close") {
    return (
      <svg {...common}>
        <path d="m6 6 12 12M18 6 6 18" />
      </svg>
    );
  }

  if (name === "arrowLeft") {
    return (
      <svg {...common}>
        <path d="m15 18-6-6 6-6" />
        <path d="M9 12h12" />
      </svg>
    );
  }

  return (
    <svg {...common}>
      <path d="m4 12 16-8-4 16-4-6-8-2Z" />
      <path d="m12 14 4-4" />
    </svg>
  );
}

function formatDate(value: string) {
  try {
    return new Intl.DateTimeFormat(
      "en-IN",
      {
        day: "2-digit",
        month: "short",
      },
    ).format(new Date(value));
  } catch {
    return "";
  }
}

function renderAssistantText(
  content: string,
) {
  const lines = content.split("\n");

  return lines.map(
    (line, index) => {
      const parts =
        line.split(
          /(\*\*.*?\*\*)/g,
        );

      return (
        <div
          key={index}
          className={
            line.trim() === ""
              ? "h-3"
              : undefined
          }
        >
          {parts.map(
            (part, partIndex) => {
              if (
                part.startsWith(
                  "**",
                ) &&
                part.endsWith(
                  "**",
                )
              ) {
                return (
                  <strong
                    key={partIndex}
                    className="font-semibold text-white"
                  >
                    {part.slice(
                      2,
                      -2,
                    )}
                  </strong>
                );
              }

              return (
                <span
                  key={partIndex}
                >
                  {part}
                </span>
              );
            },
          )}
        </div>
      );
    },
  );
}

export default function ChatManager({
  workspaceId,
  workspaceName,
  documentId,
  documentName,
  initialConversationId,
}: ChatManagerProps) {
  const router = useRouter();
  const searchParams =
    useSearchParams();

  const [
    conversationId,
    setConversationId,
  ] = useState<string | null>(
    initialConversationId,
  );

  const [
    conversations,
    setConversations,
  ] = useState<Conversation[]>(
    [],
  );

  const [
    messages,
    setMessages,
  ] = useState<Message[]>([]);

  const [
    question,
    setQuestion,
  ] = useState("");

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    historyLoading,
    setHistoryLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState<string | null>(
    null,
  );

  const [
    copiedMessageId,
    setCopiedMessageId,
  ] = useState<string | null>(
    null,
  );

  const [
    openMenuId,
    setOpenMenuId,
  ] = useState<string | null>(
    null,
  );

  const [
    renamingId,
    setRenamingId,
  ] = useState<string | null>(
    null,
  );

  const [
    renameValue,
    setRenameValue,
  ] = useState("");

  const [
    editingMessageId,
    setEditingMessageId,
  ] = useState<string | null>(
    null,
  );

  const inputRef =
    useRef<HTMLInputElement>(null);

  const messagesEndRef =
    useRef<HTMLDivElement>(null);

  const loadHistory = useCallback(
    async (
      selectedConversationId:
        | string
        | null,
    ) => {
      setHistoryLoading(true);

      try {
        const params =
          new URLSearchParams();

        params.set(
          "workspace",
          workspaceId,
        );

        params.set(
          "document",
          documentId,
        );

        if (
          selectedConversationId
        ) {
          params.set(
            "conversation",
            selectedConversationId,
          );
        }

        const response =
          await fetch(
            `/api/chat/history?${params.toString()}`,
            {
              cache: "no-store",
            },
          );

        const data =
          await response.json();

        if (!response.ok) {
          throw new Error(
            data.error ||
              "Failed to load chat history.",
          );
        }

        setConversations(
          Array.isArray(
            data.conversations,
          )
            ? data.conversations
            : [],
        );

        setMessages(
          Array.isArray(
            data.messages,
          )
            ? data.messages
            : [],
        );
      } catch (err) {
        setError(
          err instanceof Error
            ? err.message
            : "Failed to load chat history.",
        );
      } finally {
        setHistoryLoading(false);
      }
    },
    [workspaceId, documentId],
  );

  useEffect(() => {
    const urlConversation =
      searchParams.get(
        "conversation",
      );

    const selected =
      urlConversation ||
      initialConversationId ||
      null;

    setConversationId(selected);

    void loadHistory(selected);
  }, [
    searchParams,
    initialConversationId,
    loadHistory,
  ]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView(
      {
        behavior: "smooth",
      },
    );
  }, [messages, loading]);

  function goToDocuments() {
    router.push(
      `/documents?workspace=${workspaceId}`,
    );
  }

  function startNewChat() {
    setConversationId(null);
    setMessages([]);
    setQuestion("");
    setError(null);
    setEditingMessageId(null);
    setOpenMenuId(null);

    router.push(
      `/chat?workspace=${workspaceId}&document=${documentId}`,
    );
  }

  function openConversation(
    id: string,
  ) {
    setConversationId(id);
    setError(null);
    setOpenMenuId(null);
    setEditingMessageId(null);

    router.push(
      `/chat?workspace=${workspaceId}&document=${documentId}&conversation=${id}`,
    );
  }

  async function copyMessage(
    message: Message,
  ) {
    try {
      await navigator.clipboard.writeText(
        message.content,
      );

      setCopiedMessageId(
        message.id,
      );

      window.setTimeout(() => {
        setCopiedMessageId(
          null,
        );
      }, 1600);
    } catch {
      setError(
        "Unable to copy the message.",
      );
    }
  }

  function editMessage(
    message: Message,
  ) {
    setQuestion(
      message.content,
    );

    setEditingMessageId(
      message.id,
    );

    window.setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }

  function cancelEdit() {
    setQuestion("");
    setEditingMessageId(null);
    inputRef.current?.focus();
  }

  async function retryMessage(
    message: Message,
  ) {
    if (loading) {
      return;
    }

    const messageIndex =
      messages.findIndex(
        (item) =>
          item.id === message.id,
      );

    if (messageIndex === -1) {
      return;
    }

    const precedingUser =
      [...messages]
        .slice(0, messageIndex)
        .reverse()
        .find(
          (item) =>
            item.role === "user",
        );

    if (!precedingUser) {
      return;
    }

    setQuestion("");
    setError(null);
    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              question:
                precedingUser.content,
              workspaceId,
              documentId,
              conversationId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Retry failed.",
        );
      }

      setConversationId(
        data.conversationId,
      );

      await loadHistory(
        data.conversationId,
      );

      router.replace(
        `/chat?workspace=${workspaceId}&document=${documentId}&conversation=${data.conversationId}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Retry failed.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const trimmed =
      question.trim();

    if (!trimmed || loading) {
      return;
    }

    setQuestion("");
    setError(null);
    setEditingMessageId(null);

    const temporaryMessage: Message =
      {
        id: `temporary-user-${Date.now()}`,
        role: "user",
        content: trimmed,
        sources: [],
        created_at:
          new Date().toISOString(),
      };

    setMessages(
      (current) => [
        ...current,
        temporaryMessage,
      ],
    );

    setLoading(true);

    try {
      const response =
        await fetch(
          "/api/chat",
          {
            method: "POST",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              question: trimmed,
              workspaceId,
              documentId,
              conversationId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to generate an answer.",
        );
      }

      setConversationId(
        data.conversationId,
      );

      await loadHistory(
        data.conversationId,
      );

      router.replace(
        `/chat?workspace=${workspaceId}&document=${documentId}&conversation=${data.conversationId}`,
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function renameConversation(
    conversation: Conversation,
  ) {
    const title =
      renameValue.trim();

    if (!title) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/chat/conversations/${conversation.id}`,
          {
            method: "PATCH",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              title,
              workspaceId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to rename chat.",
        );
      }

      setConversations(
        (current) =>
          current.map(
            (item) =>
              item.id ===
              conversation.id
                ? {
                    ...item,
                    title,
                  }
                : item,
          ),
      );

      setRenamingId(null);
      setRenameValue("");
      setOpenMenuId(null);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to rename chat.",
      );
    }
  }

  async function deleteConversation(
    conversation: Conversation,
  ) {
    const confirmed =
      window.confirm(
        `Delete "${conversation.title}"? This will permanently delete this chat and its messages.`,
      );

    if (!confirmed) {
      return;
    }

    try {
      const response =
        await fetch(
          `/api/chat/conversations/${conversation.id}`,
          {
            method: "DELETE",
            headers: {
              "Content-Type":
                "application/json",
            },
            body: JSON.stringify({
              workspaceId,
            }),
          },
        );

      const data =
        await response.json();

      if (!response.ok) {
        throw new Error(
          data.error ||
            "Failed to delete chat.",
        );
      }

      setConversations(
        (current) =>
          current.filter(
            (item) =>
              item.id !==
              conversation.id,
          ),
      );

      setOpenMenuId(null);

      if (
        conversation.id ===
        conversationId
      ) {
        setConversationId(null);
        setMessages([]);
        setQuestion("");

        router.push(
          `/chat?workspace=${workspaceId}&document=${documentId}`,
        );
      }
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Failed to delete chat.",
      );
    }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-[#020618] text-white">
      {/* SIDEBAR */}

      <aside className="flex w-[285px] shrink-0 flex-col border-r border-[#182337] bg-[#020618]">
        <div className="border-b border-[#182337] px-5 py-5">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#6f82a6]">
            Workspace
          </div>

          <div className="mt-1 text-[15px] font-semibold text-white">
            {workspaceName}
          </div>

          <div className="mt-1 truncate text-xs text-[#7183a5]">
            {documentName}
          </div>
        </div>

        <div className="px-4 py-4">
          <button
            type="button"
            onClick={
              startNewChat
            }
            className="flex h-10 w-full items-center justify-center rounded-lg border border-[#253657] bg-[#0a1024] text-sm font-medium text-[#dbe7ff] transition hover:border-[#31518a] hover:bg-[#0f1830]"
          >
            + New chat
          </button>
        </div>

        <div className="px-5 pb-2">
          <div className="text-[11px] font-medium uppercase tracking-[0.14em] text-[#60759d]">
            Chat history
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 pb-4">
          {historyLoading ? (
            <div className="px-3 py-3 text-xs text-[#60759d]">
              Loading...
            </div>
          ) : conversations.length ===
            0 ? (
            <div className="px-3 py-3 text-xs text-[#60759d]">
              No chat history yet.
            </div>
          ) : (
            <div className="space-y-1">
              {conversations.map(
                (conversation) => {
                  const active =
                    conversation.id ===
                    conversationId;

                  const renaming =
                    renamingId ===
                    conversation.id;

                  return (
                    <div
                      key={
                        conversation.id
                      }
                      className={`group relative rounded-lg ${
                        active
                          ? "border border-[#1c3e80] bg-[#0a1633]"
                          : "border border-transparent hover:bg-[#071027]"
                      }`}
                    >
                      {renaming ? (
                        <div className="p-2">
                          <input
                            autoFocus
                            value={
                              renameValue
                            }
                            onChange={(
                              event,
                            ) =>
                              setRenameValue(
                                event
                                  .target
                                  .value,
                              )
                            }
                            onKeyDown={(
                              event,
                            ) => {
                              if (
                                event.key ===
                                "Enter"
                              ) {
                                void renameConversation(
                                  conversation,
                                );
                              }

                              if (
                                event.key ===
                                "Escape"
                              ) {
                                setRenamingId(
                                  null,
                                );
                                setRenameValue(
                                  "",
                                );
                              }
                            }}
                            className="h-8 w-full rounded-md border border-[#29416c] bg-[#020618] px-2 text-xs text-white outline-none focus:border-[#155dfc]"
                          />

                          <div className="mt-2 flex gap-1">
                            <button
                              type="button"
                              onClick={() =>
                                void renameConversation(
                                  conversation,
                                )
                              }
                              className="rounded px-2 py-1 text-[11px] text-[#72a5ff] hover:bg-[#101c36]"
                            >
                              Save
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setRenamingId(
                                  null,
                                );
                                setRenameValue(
                                  "",
                                );
                              }}
                              className="rounded px-2 py-1 text-[11px] text-[#60759d] hover:bg-[#101c36] hover:text-white"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() =>
                              openConversation(
                                conversation.id,
                              )
                            }
                            className="block w-full px-3 py-2.5 pr-11 text-left"
                          >
                            <div
                              className={`truncate text-[13px] ${
                                active
                                  ? "text-white"
                                  : "text-[#a6b4ce] group-hover:text-white"
                              }`}
                            >
                              {
                                conversation.title
                              }
                            </div>

                            <div className="mt-0.5 text-[10px] text-[#526887]">
                              {formatDate(
                                conversation.updated_at,
                              )}
                            </div>
                          </button>

                          {/* CHAT OPTIONS */}

                          <button
                            type="button"
                            aria-label="Chat options"
                            onClick={(
                              event,
                            ) => {
                              event.stopPropagation();

                              setOpenMenuId(
                                (
                                  current,
                                ) =>
                                  current ===
                                  conversation.id
                                    ? null
                                    : conversation.id,
                              );
                            }}
                            className={`absolute right-2 top-2.5 rounded-md p-1.5 text-[#60759d] transition hover:bg-[#14213c] hover:text-white ${
                              openMenuId ===
                              conversation.id
                                ? "opacity-100"
                                : "opacity-0 group-hover:opacity-100"
                            }`}
                          >
                            <Icon name="more" />
                          </button>

                          {openMenuId ===
                            conversation.id && (
                            <div className="absolute right-2 top-10 z-50 w-32 overflow-hidden rounded-lg border border-[#263b60] bg-[#0a1024] py-1 shadow-2xl shadow-black/50">
                              <button
                                type="button"
                                onClick={() => {
                                  setRenamingId(
                                    conversation.id,
                                  );
                                  setRenameValue(
                                    conversation.title,
                                  );
                                  setOpenMenuId(
                                    null,
                                  );
                                }}
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-[#b8c6df] hover:bg-[#111d36] hover:text-white"
                              >
                                <Icon
                                  name="pencil"
                                  size={13}
                                />
                                Rename
                              </button>

                              <button
                                type="button"
                                onClick={() =>
                                  void deleteConversation(
                                    conversation,
                                  )
                                }
                                className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs text-red-400 hover:bg-[#111d36]"
                              >
                                <Icon
                                  name="trash"
                                  size={13}
                                />
                                Delete
                              </button>
                            </div>
                          )}
                        </>
                      )}
                    </div>
                  );
                },
              )}
            </div>
          )}
        </div>
      </aside>

      {/* MAIN */}

      <main className="flex min-w-0 flex-1 flex-col bg-[#020618]">
        {/* HEADER */}

        <header className="shrink-0 border-b border-[#182337] bg-[#020618] px-8 py-4">
          <div className="flex items-center justify-between gap-4">
            <div className="min-w-0">
              <button
                type="button"
                onClick={
                  goToDocuments
                }
                className="mb-3 flex items-center gap-1.5 text-xs font-medium text-[#5f9bff] transition hover:text-[#8db8ff]"
              >
                <Icon
                  name="arrowLeft"
                  size={15}
                />
                Back to documents
              </button>

              <div className="text-[18px] font-semibold tracking-tight text-white">
                Document Assistant
              </div>

              <div className="mt-1 truncate text-xs text-[#7183a5]">
                {documentName}
              </div>
            </div>

            <button
              type="button"
              onClick={
                goToDocuments
              }
              className="hidden rounded-lg border border-[#253657] bg-[#0a1024] px-3 py-2 text-xs font-medium text-[#9cb8e8] transition hover:border-[#31518a] hover:bg-[#0f1830] hover:text-white sm:block"
            >
              Documents
            </button>
          </div>
        </header>

        {/* MESSAGES */}

        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-4xl px-8 py-8">
            {messages.length ===
              0 &&
              !loading && (
                <div className="flex min-h-[420px] items-center justify-center">
                  <div className="text-center">
                    <div className="mx-auto mb-4 flex h-11 w-11 items-center justify-center rounded-xl border border-[#20427e] bg-[#0a1735] text-[#72a5ff]">
                      ✦
                    </div>

                    <div className="text-[20px] font-medium text-white">
                      Ask about your
                      document
                    </div>

                    <div className="mx-auto mt-2 max-w-md text-sm leading-6 text-[#687c9f]">
                      Ask a question and
                      the assistant will
                      answer using the
                      uploaded document.
                    </div>
                  </div>
                </div>
              )}

            <div className="space-y-8">
              {messages.map(
                (message) => {
                  if (
                    message.role ===
                    "user"
                  ) {
                    return (
                      <div
                        key={
                          message.id
                        }
                        className="flex justify-end"
                      >
                        <div className="group flex max-w-[78%] items-end gap-2">
                          <div className="invisible flex shrink-0 items-center gap-1 opacity-0 transition group-hover:visible group-hover:opacity-100">
                            <button
                              type="button"
                              onClick={() =>
                                editMessage(
                                  message,
                                )
                              }
                              className="rounded-md p-1.5 text-[#526887] hover:bg-[#101a30] hover:text-[#a9c7ff]"
                              title="Edit and resend"
                            >
                              <Icon name="edit" />
                            </button>
                          </div>

                          <div className="rounded-2xl rounded-br-md border border-[#18345f] bg-[#0b1b3b] px-4 py-3 text-sm leading-6 text-[#e8f0ff]">
                            {
                              message.content
                            }
                          </div>
                        </div>
                      </div>
                    );
                  }

                  return (
                    <div
                      key={
                        message.id
                      }
                      className="group"
                    >
                      <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5f7397]">
                        Assistant
                      </div>

                      <div className="max-w-3xl text-[14px] leading-7 text-[#c2cee2]">
                        {renderAssistantText(
                          message.content,
                        )}
                      </div>

                      {/* ACTIONS */}

                      <div className="mt-3 flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                        <button
                          type="button"
                          onClick={() =>
                            void copyMessage(
                              message,
                            )
                          }
                          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-[#526887] transition hover:bg-[#0a1024] hover:text-[#9cb8e8]"
                        >
                          <Icon
                            name={
                              copiedMessageId ===
                              message.id
                                ? "check"
                                : "copy"
                            }
                            size={14}
                          />

                          {copiedMessageId ===
                          message.id
                            ? "Copied"
                            : "Copy"}
                        </button>

                        <button
                          type="button"
                          onClick={() =>
                            void retryMessage(
                              message,
                            )
                          }
                          className="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-[11px] text-[#526887] transition hover:bg-[#0a1024] hover:text-[#9cb8e8]"
                        >
                          <Icon
                            name="retry"
                            size={14}
                          />
                          Retry
                        </button>
                      </div>

                      {/* SOURCES */}

                      {message.sources
                        .length >
                        0 && (
                        <details className="mt-4 max-w-3xl">
                          <summary className="cursor-pointer select-none text-[11px] font-medium uppercase tracking-[0.12em] text-[#526887] hover:text-[#8ba7d4]">
                            {message.sources.length ===
                            1
                              ? "1 source"
                              : `${message.sources.length} sources`}
                          </summary>

                          <div className="mt-2 space-y-1.5">
                            {message.sources.map(
                              (
                                source,
                                index,
                              ) => (
                                <div
                                  key={`${source.documentId}-${source.chunkIndex}-${index}`}
                                  className="rounded-lg border border-[#172844] bg-[#071027] px-3 py-2"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <span className="text-[11px] text-[#7183a5]">
                                      Chunk{" "}
                                      {source.chunkIndex +
                                        1}
                                    </span>

                                    <span className="text-[10px] text-[#4f6589]">
                                      {(
                                        source.similarity *
                                        100
                                      ).toFixed(
                                        1,
                                      )}
                                      %
                                    </span>
                                  </div>

                                  <div className="mt-1 line-clamp-2 text-[11px] leading-5 text-[#536886]">
                                    {
                                      source.preview
                                    }
                                  </div>
                                </div>
                              ),
                            )}
                          </div>
                        </details>
                      )}
                    </div>
                  );
                },
              )}

              {loading && (
                <div>
                  <div className="mb-2 text-[11px] font-medium uppercase tracking-[0.12em] text-[#5f7397]">
                    Assistant
                  </div>

                  <div className="flex items-center gap-2 text-sm text-[#536886]">
                    <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3975df]" />
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3975df]"
                      style={{
                        animationDelay:
                          "150ms",
                      }}
                    />
                    <span
                      className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#3975df]"
                      style={{
                        animationDelay:
                          "300ms",
                      }}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          </div>
        </div>

        {/* ERROR */}

        {error && (
          <div className="shrink-0 border-t border-red-900/30 bg-red-950/20 px-8 py-2.5">
            <div className="mx-auto max-w-4xl text-xs text-red-400">
              {error}
            </div>
          </div>
        )}

        {/* COMPOSER */}

        <div className="shrink-0 border-t border-[#182337] bg-[#020618] px-6 py-4">
          <div className="mx-auto max-w-4xl">
            {editingMessageId && (
              <div className="mb-2 flex items-center justify-between rounded-lg border border-[#1d3357] bg-[#071027] px-3 py-2">
                <div className="flex items-center gap-2 text-xs text-[#6d83a7]">
                  <Icon
                    name="edit"
                    size={13}
                  />
                  Editing message
                </div>

                <button
                  type="button"
                  onClick={
                    cancelEdit
                  }
                  className="text-[#60759d] hover:text-white"
                >
                  <Icon
                    name="close"
                    size={14}
                  />
                </button>
              </div>
            )}

            <form
              onSubmit={
                handleSubmit
              }
              className="flex items-center gap-3"
            >
              <input
                ref={inputRef}
                value={question}
                onChange={(event) =>
                  setQuestion(
                    event.target
                      .value,
                  )
                }
                disabled={loading}
                placeholder="Ask something about this document..."
                className="h-12 min-w-0 flex-1 rounded-xl border border-[#1b2c49] bg-[#0a1024] px-4 text-sm text-white outline-none placeholder:text-[#506486] transition focus:border-[#315fae] focus:bg-[#0c142c]"
              />

              <button
                type="submit"
                disabled={
                  loading ||
                  !question.trim()
                }
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-[#155dfc] text-white transition hover:bg-[#2468ff] disabled:cursor-not-allowed disabled:opacity-30"
                title="Send"
              >
                <Icon
                  name="send"
                  size={17}
                />
              </button>
            </form>
          </div>
        </div>
      </main>
    </div>
  );
}