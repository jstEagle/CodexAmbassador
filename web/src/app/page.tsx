"use client";

import { useState } from "react";

const REPO_URL = "https://github.com/jstEagle/CodexAmbassador.git";

const PROMPT = `Clone ${REPO_URL} and set up the Codex Ambassador CLI for me end-to-end.

Read cli/README.md first and follow the repository's instructions. Ensure Node.js 20 or newer is available, work from the cli directory, run npm run verify, and confirm node src/index.js --help works. Then tell me the exact path and npm start command I can use to launch it.

Do not put secrets in configuration files. OPENAI_API_KEY is optional, so leave it unset and explain that I can type skip at startup unless I want to add a key for the live tutor.`;

async function copyToClipboard(text: string) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

export default function Home() {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await copyToClipboard(PROMPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can fail (permissions, insecure context); the
      // prompt text is still visible and selectable manually.
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-8 shadow-sm sm:p-12 dark:border-white/10 dark:bg-zinc-950">
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
          Codex Ambassador
        </p>
        <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          Get started with one prompt.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
          Copy the prompt below and paste it into Codex. It will clone the
          repository and set up the CLI for you.
        </p>

        <div className="mt-10">
          <div className="relative">
            <pre className="max-h-72 overflow-auto rounded-2xl border border-black/10 bg-zinc-50 p-5 pr-16 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-zinc-700 dark:border-white/10 dark:bg-zinc-900 dark:text-zinc-300">
              {PROMPT}
            </pre>
            <button
              type="button"
              onClick={handleCopy}
              className="absolute top-3 right-3 rounded-full bg-zinc-900 px-3 py-1.5 font-mono text-xs font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
        </div>

        <div className="mt-10 flex items-center gap-3 border-t border-black/10 pt-6 font-mono text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span
            className="size-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          {REPO_URL.replace("https://github.com/", "").replace(".git", "")}
        </div>
      </section>
    </main>
  );
}
