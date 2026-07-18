"use client";

import { useState } from "react";
import SpaceBackground from "@/components/SpaceBackground";

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
    <main className="relative flex min-h-screen items-center justify-center px-6 py-16 text-foreground">
      <SpaceBackground />

      <div className="relative w-full max-w-2xl">
        <div className="flex items-center justify-end pb-3">
          <button
            type="button"
            onClick={handleCopy}
            className="text-[11px] font-medium tracking-[0.1em] text-accent uppercase transition-colors [text-shadow:0_1px_8px_#000] hover:text-secondary"
          >
            {copied ? "[ copied ]" : "[ copy ]"}
          </button>
        </div>
        <pre className="max-h-[70vh] overflow-auto px-1 py-2 font-mono text-xs leading-6 whitespace-pre-wrap break-words text-foreground/90 [text-shadow:0_1px_10px_#000,0_1px_2px_#000]">
          {PROMPT}
        </pre>
      </div>
    </main>
  );
}
