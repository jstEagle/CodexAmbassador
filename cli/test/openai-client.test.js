import test from "node:test";
import assert from "node:assert/strict";

import { createOpenAiClient } from "../src/openai-client.js";

const config = {
  endpoint: "https://api.openai.com/v1/responses",
  model: "gpt-5.6-sol",
  reasoningEffort: "medium",
  verbosity: "low",
  maxOutputTokens: 700,
  timeoutMs: 5000,
};

test("OpenAI client sends a private Responses API request and extracts text", async () => {
  let request;
  const fetchImpl = async (url, options) => {
    request = { url, options, body: JSON.parse(options.body) };
    return {
      ok: true,
      async json() {
        return {
          model: "gpt-5.6-sol",
          output: [{ type: "message", content: [{ type: "output_text", text: "A branch is a movable label." }] }],
          usage: { total_tokens: 25 },
        };
      },
    };
  };
  const client = createOpenAiClient({ apiKey: "test-secret", config, fetchImpl });
  const result = await client.teachGit("What is a branch?", { currentBranch: "main" });

  assert.equal(result.text, "A branch is a movable label.");
  assert.equal(request.url, config.endpoint);
  assert.equal(request.options.headers.Authorization, "Bearer test-secret");
  assert.equal(request.body.model, "gpt-5.6-sol");
  assert.equal(request.body.store, false);
  assert.match(request.body.input, /simulated repository state/);
  assert.doesNotMatch(request.options.body, /test-secret/);
});

test("OpenAI client turns authentication failures into a useful key prompt", async () => {
  const fetchImpl = async () => ({
    ok: false,
    status: 401,
    async json() { return { error: { message: "bad key" } }; },
  });
  const client = createOpenAiClient({ apiKey: "bad", config, fetchImpl });
  await assert.rejects(() => client.chat([{ role: "user", content: "hello" }]), /valid key with \/key/);
});
