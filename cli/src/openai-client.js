const LLM_TUTOR_INSTRUCTIONS = `Role: You are a patient tutor teaching a complete beginner how large language models and AI agents work.

Goal: Answer the learner's actual question, then help them build an accurate mental model from first principles.

Success criteria:
- define unfamiliar terms in plain language
- use one concrete example or analogy when useful
- distinguish prediction, context, training, tools, and evidence accurately
- mention uncertainty or verification when relevant
- end with one small experiment or follow-up question

Keep each response under 120 words. Do not pretend to inspect files, systems, or facts that were not provided.`;

const GIT_TUTOR_INSTRUCTIONS = `Role: You are a patient Git tutor inside a simulated repository for a complete beginner.

Goal: Answer the learner's question using the supplied sandbox state and teach the underlying Git mental model.

Success criteria:
- start with a direct answer
- define each Git term before relying on it
- explain what is local and what would involve a remote host such as GitHub
- connect the answer to the supplied repository state
- suggest one safe simulated command to try next

The repository state is evidence from a simulation, not the learner's real computer. Never claim you ran a command or changed a real file. Use at most 70 words in four short lines.`;

function extractText(response) {
  return (response.output ?? [])
    .filter((item) => item.type === "message")
    .flatMap((item) => item.content ?? [])
    .filter((item) => item.type === "output_text")
    .map((item) => item.text)
    .join("\n")
    .trim();
}

function apiErrorMessage(status, payload) {
  const detail = payload?.error?.message;
  if (status === 401) return "OpenAI rejected the API key. Enter a valid key with /key.";
  if (status === 429) return "OpenAI is rate-limiting this key or its quota is exhausted.";
  return detail ? `OpenAI API error: ${detail}` : `OpenAI API request failed with status ${status}.`;
}

export function createOpenAiClient({ apiKey, config, fetchImpl = fetch }) {
  if (!apiKey) throw new Error("An OpenAI API key is required.");

  const request = async ({ instructions, input }) => {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetchImpl(config.endpoint, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: config.model,
          instructions,
          input,
          reasoning: { effort: config.reasoningEffort },
          text: { verbosity: config.verbosity },
          max_output_tokens: config.maxOutputTokens,
          store: false,
        }),
        signal: controller.signal,
      });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(apiErrorMessage(response.status, payload));
      const text = extractText(payload);
      if (!text) throw new Error("OpenAI returned no text for this response.");
      return { text, usage: payload.usage ?? null, model: payload.model ?? config.model };
    } catch (error) {
      if (error.name === "AbortError") throw new Error(`OpenAI did not respond within ${Math.round(config.timeoutMs / 1000)} seconds.`);
      throw error;
    } finally {
      clearTimeout(timeout);
    }
  };

  return {
    chat(messages) {
      return request({ instructions: LLM_TUTOR_INSTRUCTIONS, input: messages });
    },
    teachGit(question, repositoryState) {
      return request({
        instructions: GIT_TUTOR_INSTRUCTIONS,
        input: `Learner question: ${question}\n\nCurrent simulated repository state:\n${JSON.stringify(repositoryState, null, 2)}`,
      });
    },
  };
}
