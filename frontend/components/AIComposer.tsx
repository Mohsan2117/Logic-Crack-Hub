"use client";

import { ArrowUp, Loader2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import type { FormEvent, KeyboardEvent } from "react";
import { apiFetch } from "@/lib/api";

const placeholder =
  "Ask an agent to create a new page, build a dashboard, update an article, etc. Review, iterate and share.";

export function AIComposer() {
  const [prompt, setPrompt] = useState("");
  const [response, setResponse] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const canSubmit = prompt.trim().length > 0 && !isLoading;

  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) {
      return;
    }
    textarea.style.height = "auto";
    textarea.style.height = `${textarea.scrollHeight}px`;
  }, [prompt]);

  async function submitPrompt(event?: FormEvent<HTMLFormElement>) {
    event?.preventDefault();
    if (!canSubmit) {
      return;
    }

    setIsLoading(true);
    setError("");
    setResponse("");
    try {
      const result = await apiFetch<{ response: string }>("/ai/compose", {
        method: "POST",
        body: JSON.stringify({ prompt: prompt.trim() }),
      });
      setResponse(result.response);
      setPrompt("");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Gemini could not complete the request.");
    } finally {
      setIsLoading(false);
    }
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== "Enter" || event.shiftKey) {
      return;
    }
    event.preventDefault();
    void submitPrompt();
  }

  return (
    <section className="w-full" aria-label="AI composer">
      <form
        className="rounded-[30px] border border-white/10 bg-[#100d0f]/92 p-3 shadow-[0_24px_70px_rgba(0,0,0,0.34)] backdrop-blur-xl sm:p-4"
        onSubmit={(event) => void submitPrompt(event)}
      >
        <div className="flex min-h-[150px] flex-col rounded-[24px] bg-black/[0.12] px-4 pb-3 pt-4 sm:min-h-[170px] sm:px-6 sm:pb-4 sm:pt-5">
          <p className="mb-3 text-xs font-black uppercase text-[#ff5252]">Talk with AI</p>
          <textarea
            aria-label="Ask the Logic Crack Hub AI agent"
            className="focus-ring min-h-[64px] max-h-[360px] w-full flex-1 resize-none overflow-y-auto border-0 bg-transparent p-0 text-base font-semibold leading-7 text-white outline-none placeholder:text-[#8b8588] sm:text-xl sm:leading-8"
            disabled={isLoading}
            onChange={(event) => setPrompt(event.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            ref={textareaRef}
            rows={3}
            value={prompt}
          />

          <div className="mt-4 flex justify-end">
            <button
              aria-label="Send prompt"
              className={`focus-ring inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition ${
                canSubmit
                  ? "bg-white text-[#100d0f] shadow-[0_12px_28px_rgba(255,255,255,0.18)] hover:bg-[#f0eeee]"
                  : "cursor-not-allowed border border-white/10 bg-white/[0.06] text-[#777174]"
              }`}
              disabled={!canSubmit}
              type="submit"
            >
              {isLoading ? <Loader2 className="animate-spin" size={19} aria-hidden /> : <ArrowUp size={20} aria-hidden />}
            </button>
          </div>
        </div>
      </form>

      {error ? (
        <p className="mt-3 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm font-semibold text-red-100">{error}</p>
      ) : null}
      {response ? (
        <article className="mt-3 whitespace-pre-wrap rounded-2xl border border-white/10 bg-white/[0.045] px-4 py-4 text-sm leading-7 text-[#ededed]">
          {response}
        </article>
      ) : null}
    </section>
  );
}
