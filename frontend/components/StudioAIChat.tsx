"use client";

import { FormEvent, KeyboardEvent, useEffect, useMemo, useState } from "react";
import { Bot, MessageCircle, RotateCcw, Send, X } from "lucide-react";
import { apiFetch } from "@/lib/api";

type ChatMessage = {
  id: string;
  role: "assistant" | "user";
  content: string;
};

const greeting =
  "Hi! I'm the Logic Crack Studio assistant. Ask me about our games, services, studio, careers, or contact information.";

export function StudioAIChat() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "welcome", role: "assistant", content: greeting },
  ]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [retryText, setRetryText] = useState("");

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem("lcs_logic_ai_messages");
      if (saved) {
        const parsed = JSON.parse(saved) as ChatMessage[];
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed.slice(-20));
        }
      }
    } catch {
      // Ignore corrupt local chat history.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem("lcs_logic_ai_messages", JSON.stringify(messages.slice(-20)));
  }, [messages]);

  const canSend = useMemo(() => input.trim().length > 0 && !sending, [input, sending]);

  async function sendMessage(event?: FormEvent<HTMLFormElement>, overrideText?: string) {
    event?.preventDefault();
    const text = (overrideText ?? input).trim();
    if (!text || sending) {
      return;
    }

    const userMessage: ChatMessage = { id: crypto.randomUUID(), role: "user", content: text };
    if (!overrideText) {
      setMessages((current) => [...current, userMessage]);
    }
    setInput("");
    setSending(true);
    setError("");
    setRetryText("");

    try {
      const response = await apiFetch<{ success: boolean; data: { message: string } }>("/v1/ai/chat", {
        method: "POST",
        body: JSON.stringify({
          message: text,
          history: messages.slice(-8).map(({ role, content }) => ({ role, content })),
        }),
      });
      setMessages((current) => [
        ...current,
        { id: crypto.randomUUID(), role: "assistant", content: response.data.message },
      ]);
    } catch {
      setError("Logic AI could not respond right now. Please try again.");
      setRetryText(text);
    } finally {
      setSending(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void sendMessage();
    }
  }

  return (
    <div className="logic-ai-shell">
      {open ? (
        <section className="logic-ai-panel" aria-label="Logic AI assistant">
          <header className="logic-ai-header">
            <span className="logic-ai-avatar">
              <Bot size={21} aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <h2 className="theme-heading text-base font-black">Logic AI</h2>
              <p className="theme-muted text-xs font-bold">Studio Assistant</p>
            </div>
            <button
              aria-label="Close Logic AI assistant"
              className="focus-ring rounded-xl border border-violet-300/15 bg-violet-500/10 p-2 text-violet-200"
              onClick={() => setOpen(false)}
              type="button"
            >
              <X size={18} aria-hidden />
            </button>
          </header>

          <div className="logic-ai-messages">
            {messages.map((message) => (
              <div className={`logic-ai-message ${message.role}`} key={message.id}>
                {message.content}
              </div>
            ))}
            {sending ? <div className="logic-ai-message assistant">Logic AI is typing...</div> : null}
            {error ? (
              <div className="logic-ai-error">
                <span>{error}</span>
                <button className="focus-ring" onClick={() => void sendMessage(undefined, retryText)} type="button">
                  <RotateCcw size={15} aria-hidden /> Retry
                </button>
              </div>
            ) : null}
          </div>

          <form className="logic-ai-input-row" onSubmit={sendMessage}>
            <textarea
              aria-label="Message Logic AI"
              className="field focus-ring logic-ai-input"
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask about games, services, careers..."
              rows={1}
              value={input}
            />
            <button
              aria-label="Send message"
              className="btn-primary focus-ring logic-ai-send"
              disabled={!canSend}
              type="submit"
            >
              <Send size={17} aria-hidden />
            </button>
          </form>
        </section>
      ) : null}

      {!open ? <span className="logic-ai-label">Ask Logic AI</span> : null}
      <button
        aria-label="Open Logic AI assistant"
        className="logic-ai-launcher focus-ring"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <span className="logic-ai-pulse" aria-hidden />
        {open ? <X size={25} aria-hidden /> : <MessageCircle size={25} aria-hidden />}
      </button>
    </div>
  );
}
