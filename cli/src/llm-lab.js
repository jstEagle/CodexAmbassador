const OFFLINE_LESSONS = [
  "An LLM is a program trained to predict useful continuations of text. It does not store a little person or a database of guaranteed facts inside it.",
  "Your message is split into tokens—small chunks of text. The model processes the tokens in its context, then predicts a probability distribution for what should come next.",
  "The context is the information available for this response: instructions, conversation turns, and any tool results. Missing context cannot be inspected by wishful thinking.",
  "A tool lets an agent gather evidence or take an action outside text prediction. Good agents separate what the model inferred from what a tool actually observed.",
  "LLMs can sound confident while being wrong. Ask for evidence, give relevant context, and verify important outputs. A fluent answer is not the same as a proven answer.",
];

export function createLlmLab({ connected = false } = {}) {
  return {
    messages: [{
      role: "assistant",
      text: connected
        ? "I’m your live AI tutor. Start anywhere: ask what an LLM is, how tokens work, why models make mistakes, or how agents use tools."
        : "Offline lesson 1: an LLM predicts text from patterns learned during training. Ask a question or type next to continue; add an API key for personalized answers.",
    }],
    animation: null,
    pending: false,
    connected,
    lesson: 0,
    usage: null,
    error: null,
  };
}

function settleAnimation(state) {
  if (!state.animation) return state;
  return {
    ...state,
    messages: [...state.messages, { role: "assistant", text: state.animation.text }],
    animation: null,
  };
}

export function beginLlmTurn(state, input) {
  const settled = settleAnimation(state);
  return {
    ...settled,
    messages: [...settled.messages, { role: "user", text: input.trim() }],
    pending: true,
    error: null,
  };
}

export function completeLlmTurn(state, text, time, usage = null) {
  return {
    ...state,
    pending: false,
    animation: { startedAt: time, text },
    usage,
    error: null,
  };
}

export function failLlmTurn(state, message) {
  return {
    ...state,
    pending: false,
    error: message,
    messages: [...state.messages, { role: "assistant", text: `${message} Your conversation is still here; check the key or try again.` }],
  };
}

export function submitLlmPrompt(state, rawInput, time) {
  const input = rawInput.trim();
  const nextLesson = /^(?:next|continue|teach me)$/i.test(input)
    ? Math.min(state.lesson + 1, OFFLINE_LESSONS.length - 1)
    : state.lesson;
  const question = input.toLowerCase();
  let answer = OFFLINE_LESSONS[nextLesson];
  if (/token/.test(question)) answer = OFFLINE_LESSONS[1];
  else if (/context|remember/.test(question)) answer = OFFLINE_LESSONS[2];
  else if (/agent|tool/.test(question)) answer = OFFLINE_LESSONS[3];
  else if (/wrong|hallucin|trust|mistake/.test(question)) answer = OFFLINE_LESSONS[4];
  return completeLlmTurn({ ...beginLlmTurn(state, input), lesson: nextLesson }, answer, time);
}

export function llmConversationInput(state) {
  const settled = settleAnimation(state);
  return settled.messages
    .filter((message) => message.role === "user" || message.role === "assistant")
    .slice(-10)
    .map(({ role, text }) => ({ role, content: text }));
}

export function animatedLlmText(state, time, rate = 18) {
  if (!state.animation) return { text: "", complete: true, tokens: [] };
  const tokens = state.animation.text.split(/(\s+)/);
  const visibleCount = Math.max(1, Math.floor((time - state.animation.startedAt) * rate));
  return {
    text: tokens.slice(0, visibleCount).join(""),
    complete: visibleCount >= tokens.length,
    tokens: state.animation.text.split(/\s+/),
  };
}
