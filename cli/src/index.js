#!/usr/bin/env node

import { createGame, choose, isComplete, matchAction, normalizeAction } from "./game.js";
import {
  beginGitCoach,
  completeGitCoach,
  createGitSandbox,
  failGitCoach,
  gitCoachQuestion,
  gitTutorContext,
  isGitCoachPrompt,
  runGitCommand,
} from "./git-sandbox.js";
import {
  beginLlmTurn,
  completeLlmTurn,
  createLlmLab,
  failLlmTurn,
  llmConversationInput,
  submitLlmPrompt,
} from "./llm-lab.js";
import { createOpenAiClient } from "./openai-client.js";
import { loadConfig } from "./config.js";
import { renderFrame } from "./ui/render.js";
import { decodeKeys, TerminalSession } from "./ui/terminal.js";

const HELP = `AI 101 — An Interactive Field Guide

Usage:
  npm start             Launch the full-terminal game
  node src/index.js     Launch the full-terminal game
  node src/index.js -h  Show this help

Controls:
  Type an action        Story choices, Git commands, and chat prompts
  Enter                 Submit the prompt
  Left/Right            Move within the prompt
  Backspace/Delete      Edit the prompt
  Esc                   Clear the prompt
  Ctrl-C                Quit

AI tutor:
  Paste an OpenAI API key into the masked startup field, or set OPENAI_API_KEY.
  The pasted key is held in memory for this process only and is never saved.
`;

async function main() {
  if (process.argv.includes("--help") || process.argv.includes("-h")) {
    process.stdout.write(HELP);
    return;
  }
  if (!process.stdin.isTTY || !process.stdout.isTTY) {
    process.stderr.write("AI 101 requires an interactive terminal. Run `npm start` from a terminal window.\n");
    process.exitCode = 1;
    return;
  }

  const config = await loadConfig();
  const terminal = new TerminalSession();
  let apiKey = process.env.OPENAI_API_KEY?.trim() || null;
  let keySource = apiKey ? "environment" : null;
  let mode = "setup";
  let state = createGame();
  let gitState = createGitSandbox();
  let llmState = createLlmLab({ connected: Boolean(apiKey) });
  let prompt = "";
  let cursor = 0;
  let notice = null;
  let exiting = false;
  let busy = false;
  let animation = null;
  const animationStartedAt = performance.now();

  const draw = () => {
    terminal.draw(
      renderFrame({
        state,
        mode,
        gitState,
        llmState,
        prompt,
        cursor,
        notice,
        keyStatus: { connected: Boolean(apiKey), source: keySource },
        time: (performance.now() - animationStartedAt) / 1000,
        width: process.stdout.columns ?? 80,
        height: process.stdout.rows ?? 24,
        config,
      }),
    );
  };

  const cleanup = (message = "") => {
    if (exiting) return;
    exiting = true;
    if (animation) clearInterval(animation);
    process.stdin.off("data", onInput);
    process.stdout.off("resize", draw);
    terminal.leave();
    if (message) process.stdout.write(`${message}\n`);
  };

  const restart = () => {
    if (mode === "story") state = createGame();
    if (mode === "git") gitState = createGitSandbox();
    if (mode === "llm") llmState = createLlmLab({ connected: Boolean(apiKey) });
    if (mode === "home") {
      state = createGame();
      gitState = createGitSandbox();
      llmState = createLlmLab({ connected: Boolean(apiKey) });
    }
    prompt = "";
    cursor = 0;
    notice = { type: "success", message: `NEW SESSION / ${mode} reset` };
    draw();
  };

  const openMode = (nextMode) => {
    mode = nextMode;
    clearPrompt();
    notice = null;
  };

  const clearPrompt = () => {
    prompt = "";
    cursor = 0;
  };

  const client = () => createOpenAiClient({ apiKey, config: config.openai });

  const askGitTutor = async (question) => {
    busy = true;
    gitState = beginGitCoach(gitState, question);
    draw();
    try {
      const result = await client().teachGit(question, gitTutorContext(gitState));
      gitState = completeGitCoach(gitState, result.text);
    } catch (error) {
      gitState = failGitCoach(gitState, error.message);
    } finally {
      busy = false;
      draw();
    }
  };

  const askLlmTutor = async (input) => {
    busy = true;
    llmState = beginLlmTurn(llmState, input);
    draw();
    try {
      const result = await client().chat(llmConversationInput(llmState));
      llmState = completeLlmTurn(llmState, result.text, (performance.now() - animationStartedAt) / 1000, result.usage);
    } catch (error) {
      llmState = failLlmTurn(llmState, error.message);
    } finally {
      busy = false;
      draw();
    }
  };

  const submit = () => {
    const raw = prompt.trim();
    if (!raw) return;
    clearPrompt();

    if (mode === "setup") {
      const choice = raw.toLowerCase();
      if (["quit", "exit", "close"].includes(choice)) {
        cleanup("AI 101 / session complete. Keep experimenting.");
        return;
      }
      if (choice === "skip") {
        apiKey = null;
        keySource = null;
        llmState = createLlmLab({ connected: false });
        openMode("home");
        notice = { type: "success", message: "OFFLINE MODE / add a key later with /key" };
        return;
      }
      if (choice === "continue" && apiKey) {
        openMode("home");
        notice = { type: "success", message: `AI TUTOR READY / key from ${keySource}` };
        return;
      }
      if (raw.length < 20 || /\s/.test(raw)) {
        notice = { type: "error", message: "KEY NOT RECOGNIZED / paste a full API key or type skip" };
        return;
      }
      apiKey = raw;
      keySource = "this session";
      llmState = createLlmLab({ connected: true });
      openMode("home");
      notice = { type: "success", message: "AI TUTOR READY / key held in memory only" };
      return;
    }

    const command = normalizeAction(raw);

    if (["quit", "exit", "close"].includes(command)) {
      cleanup("AI 101 / session complete. Keep experimenting.");
      return;
    }
    if (["home", "menu", "back", "back home"].includes(command)) {
      openMode("home");
      return;
    }
    if (["restart", "reset", "restart story", "restart lab"].includes(command)) {
      restart();
      return;
    }
    if (["key", "api key", "change key"].includes(command)) {
      openMode("setup");
      notice = null;
      return;
    }
    if (mode === "home") {
      if (["story", "journey", "begin story"].includes(command)) openMode("story");
      else if (["git", "git sandbox", "sandbox", "repo"].includes(command)) openMode("git");
      else if (["llm", "llm lab", "chat", "model"].includes(command)) openMode("llm");
      else notice = { type: "error", message: "CHOOSE / story, git, or llm" };
      return;
    }

    if (mode === "git") {
      if (isGitCoachPrompt(raw)) {
        if (!apiKey) {
          gitState = failGitCoach(gitState, "The personalized Git tutor needs an OpenAI API key. Type /key to add one.");
          return;
        }
        const question = gitCoachQuestion(raw);
        if (!question) {
          gitState = failGitCoach(gitState, "Ask a complete question after `ask`, for example: ask what is HEAD?");
          return;
        }
        void askGitTutor(question);
        return;
      }
      gitState = runGitCommand(gitState, raw);
      notice = null;
      return;
    }

    if (mode === "llm") {
      if (apiKey) void askLlmTutor(raw);
      else llmState = submitLlmPrompt(llmState, raw, (performance.now() - animationStartedAt) / 1000);
      notice = null;
      return;
    }

    if (isComplete(state) && ["replay", "play again", "again"].includes(command)) {
      restart();
      return;
    }
    if (isComplete(state)) {
      notice = { type: "error", message: "TRY / replay  or  / quit" };
      return;
    }

    const match = matchAction(state, raw);
    if (!match.matched) {
      notice = {
        type: "error",
        message: `NO MATCH / try ${match.suggestions.map((suggestion) => `/${suggestion}`).join(" or ")}`,
      };
      return;
    }
    state = choose(state, match.index);
    notice = match.corrected
      ? { type: "success", message: `AUTOCORRECT / “${raw}” → /${match.command}` }
      : { type: "success", message: `ACTION / /${match.command}` };
  };

  const handleKey = (key) => {
    if (key === "quit") {
      cleanup("AI 101 / session complete. Keep experimenting.");
      return;
    }
    if (key === "submit") {
      if (busy) notice = { type: "error", message: "AI TUTOR / wait for the current answer" };
      else submit();
    }
    if (key === "clear") {
      clearPrompt();
      notice = null;
    }
    if (key === "left") cursor = Math.max(0, cursor - 1);
    if (key === "right") cursor = Math.min([...prompt].length, cursor + 1);
    if (key === "home") cursor = 0;
    if (key === "end") cursor = [...prompt].length;
    if (key === "backspace" && cursor > 0) {
      const chars = [...prompt];
      chars.splice(cursor - 1, 1);
      prompt = chars.join("");
      cursor -= 1;
      notice = null;
    }
    if (key === "delete" && cursor < [...prompt].length) {
      const chars = [...prompt];
      chars.splice(cursor, 1);
      prompt = chars.join("");
      notice = null;
    }
    if (typeof key === "object" && key.type === "text") {
      const chars = [...prompt];
      const inserted = [...key.value];
      chars.splice(cursor, 0, ...inserted);
      prompt = chars.join("");
      cursor += inserted.length;
      notice = null;
    }
  };

  const onInput = (data) => {
    for (const key of decodeKeys(data)) {
      handleKey(key);
      if (exiting) return;
    }
    draw();
  };

  terminal.enter();
  process.stdin.on("data", onInput);
  process.stdout.on("resize", draw);
  process.once("SIGTERM", () => cleanup());
  process.once("SIGHUP", () => cleanup());
  process.once("uncaughtException", (error) => {
    cleanup();
    process.stderr.write(`${error.stack ?? error.message}\n`);
    process.exitCode = 1;
  });
  animation = setInterval(draw, 1000 / config.space.fps);
  draw();
}

main().catch((error) => {
  process.stderr.write(`AI 101 failed to start: ${error.message}\n`);
  process.exitCode = 1;
});
