import test from "node:test";
import assert from "node:assert/strict";

import {
  animatedLlmText,
  beginLlmTurn,
  completeLlmTurn,
  createLlmLab,
  llmConversationInput,
  submitLlmPrompt,
} from "../src/llm-lab.js";

test("offline LLM lab teaches foundations without an API key", () => {
  let state = createLlmLab();
  state = submitLlmPrompt(state, "What is a token?", 1);
  assert.equal(state.connected, false);
  assert.match(state.animation.text, /small chunks of text/);
  state = submitLlmPrompt(state, "Why can models be wrong?", 3);
  assert.match(state.animation.text, /confident while being wrong/);
});

test("live LLM turns preserve conversational context", () => {
  let state = createLlmLab({ connected: true });
  state = beginLlmTurn(state, "What is context?");
  assert.equal(state.pending, true);
  state = completeLlmTurn(state, "Context is the information available now.", 2, { total_tokens: 42 });
  state = beginLlmTurn(state, "Can you give me an example?");
  const input = llmConversationInput(state);
  assert.deepEqual(input.slice(-3), [
    { role: "user", content: "What is context?" },
    { role: "assistant", content: "Context is the information available now." },
    { role: "user", content: "Can you give me an example?" },
  ]);
});

test("LLM responses reveal incrementally as tokens", () => {
  const state = submitLlmPrompt(createLlmLab(), "What changed?", 2);
  const early = animatedLlmText(state, 2.2);
  const late = animatedLlmText(state, 30);
  assert.ok(early.text.length < late.text.length);
  assert.equal(late.complete, true);
});
