import test from "node:test";
import assert from "node:assert/strict";

import { loadConfig } from "../src/config.js";
import { choose, createGame } from "../src/game.js";
import { createGitSandbox, runGitCommand } from "../src/git-sandbox.js";
import { createLlmLab, submitLlmPrompt } from "../src/llm-lab.js";
import { renderFrame, stripAnsi, visibleWidth, wrap } from "../src/ui/render.js";
import { ASCII_RAMP, fitSpheresToViewport, projectSpheres, renderSpaceField } from "../src/ui/space.js";
import { decodeKey, decodeKeys, TerminalSession } from "../src/ui/terminal.js";

test("full frame exactly fits a supported terminal", async () => {
  const config = await loadConfig();
  const width = 100;
  const height = 30;
  const frame = renderFrame({ mode: "home", state: createGame(), prompt: "git", cursor: 3, width, height, config });
  const lines = frame.split("\n");

  assert.equal(lines.length, height);
  for (const line of lines) assert.equal(visibleWidth(line), width);
  assert.match(stripAnsi(frame), /AI 101/);
  assert.match(stripAnsi(frame), /\/story/);
  assert.match(stripAnsi(frame), /git█/);
});

test("prompt surface is thicker than its one-row cursor", async () => {
  const config = await loadConfig();
  const plain = stripAnsi(renderFrame({ state: createGame(), width: 100, height: 30, config }));
  const promptRows = plain.split("\n").filter((line) => line.includes("▏") && line.includes("▕"));
  assert.equal(promptRows.length, 3);
  assert.equal(promptRows.filter((line) => line.includes("█")).length, 1);
  assert.doesNotMatch(promptRows.join("\n"), />/);
  assert.match(promptRows.find((line) => line.includes("█")), /▏  █/);
  assert.match(promptRows.find((line) => line.includes("█")), /  ▕/);
});

test("small terminals receive a resize screen", async () => {
  const config = await loadConfig();
  const frame = stripAnsi(renderFrame({ state: createGame(), width: 55, height: 16, config }));
  assert.match(frame, /needs a little more room/i);
  assert.match(frame, /55 × 16/);
});

test("every available action stays visible at the configured minimum size", async () => {
  const config = await loadConfig();
  const state = choose(createGame(), 0);
  const frame = stripAnsi(
    renderFrame({
      mode: "story",
      state,
      prompt: "",
      width: config.minimumTerminal.columns,
      height: config.minimumTerminal.rows,
      config,
    }),
  );

  for (const choice of [
    "/touch hollows",
    "/cut the ice",
  ]) {
    assert.match(frame, new RegExp(choice.replaceAll("/", "\\/")));
  }
});

test("the landing identity disappears once the journey begins", async () => {
  const config = await loadConfig();
  const landing = stripAnsi(renderFrame({ mode: "home", state: createGame(), width: 100, height: 30, config }));
  const journey = stripAnsi(renderFrame({ mode: "story", state: createGame(), width: 100, height: 30, config }));

  assert.match(landing, /AI 101/);
  assert.doesNotMatch(journey, /AI 101/);
  assert.doesNotMatch(journey, /AVAILABLE ACTIONS/);
  assert.match(journey, /A signal beneath the ice/);
  assert.match(journey, /\/answer signal/);
});

test("Git and LLM modes use independent light palettes and exact terminal dimensions", async () => {
  const config = await loadConfig();
  const width = 100;
  const height = 30;
  const git = renderFrame({ mode: "git", state: createGame(), gitState: createGitSandbox(), width, height, config });
  const llm = renderFrame({ mode: "llm", state: createGame(), llmState: createLlmLab(), width, height, config });

  for (const frame of [git, llm]) {
    const lines = frame.split("\n");
    assert.equal(lines.length, height);
    for (const line of lines) assert.equal(visibleWidth(line), width);
  }
  assert.match(git, /\u001b\[48;2;255;253;248m/);
  assert.match(llm, /\u001b\[48;2;243;237;224m/);
  assert.match(stripAnsi(git), /REPOSITORY MAP/);
  assert.match(stripAnsi(llm), /tokens → context → prediction → response/);
});

test("Git graph and live LLM tutor update in real time", async () => {
  const config = await loadConfig();
  let gitState = createGitSandbox();
  for (const command of ["git status", "git switch -c feature", "edit welcome.txt", "git add .", "git commit -m route"]) {
    gitState = runGitCommand(gitState, command);
  }
  const git = stripAnsi(renderFrame({ mode: "git", state: createGame(), gitState, width: 110, height: 36, config }));
  assert.match(git, /feature ← HEAD/);
  assert.match(git, /c001  route/);

  const llmState = { ...createLlmLab({ connected: true }), pending: true };
  const llm = stripAnsi(renderFrame({ mode: "llm", state: createGame(), llmState, time: 30, width: 110, height: 36, config }));
  assert.match(llm, /LIVE AI TUTOR/);
  assert.match(llm, /reading your context and composing an answer/);
  assert.match(llm, /waiting for OpenAI/);
});

test("API key setup masks secrets and explains storage", async () => {
  const config = await loadConfig();
  const frame = stripAnsi(renderFrame({
    mode: "setup",
    state: createGame(),
    prompt: "this-is-a-fake-key-used-only-for-masking",
    cursor: 35,
    keyStatus: { connected: false, source: null },
    width: 100,
    height: 30,
    config,
  }));
  assert.doesNotMatch(frame, /fake-key/);
  assert.match(frame, /••••••/);
  assert.match(frame, /secret · never saved/);
});

test("wrapping and key decoding support the interaction model", () => {
  assert.deepEqual(wrap("one two three", 7), ["one two", "three"]);
  assert.deepEqual(decodeKey(Buffer.from("Hello")), { type: "text", value: "Hello" });
  assert.equal(decodeKey(Buffer.from("\u001b[D")), "left");
  assert.equal(decodeKey(Buffer.from("\u007f")), "backspace");
  assert.equal(decodeKey(Buffer.from("\r")), "submit");
  assert.deepEqual(decodeKeys(Buffer.from("crate brnch\r")), [
    { type: "text", value: "crate brnch" },
    "submit",
  ]);
});

test("wide terminals render animated ray-cast, dithered spheres", async () => {
  const config = await loadConfig();
  const first = stripAnsi(renderFrame({ state: createGame(), time: 0, width: 150, height: 48, config }));
  const later = stripAnsi(renderFrame({ state: createGame(), time: 8, width: 150, height: 48, config }));
  assert.notEqual(first, later);
  assert.match(first, /[.:=+*#%@]{2}/);
});

test("sphere projection preserves a round silhouette at terminal cell aspect ratio", async () => {
  const config = await loadConfig();
  const centeredSpace = {
    ...config.space,
    spheres: [{
      ...config.space.spheres[0],
      position: [0, 0, 0],
      orbit: [0, 0, 0],
    }],
  };
  const field = renderSpaceField(160, 60, 0, centeredSpace);
  const points = [];
  const shades = new Set();
  field.forEach((row, y) => row.forEach((cell, x) => {
    if (cell.tone === "sphere-0") {
      points.push([x, y]);
      shades.add(cell.char);
    }
  }));
  assert.ok(points.length > 40);
  const xs = points.map(([x]) => x);
  const ys = points.map(([, y]) => y);
  const cellWidth = Math.max(...xs) - Math.min(...xs) + 1;
  const cellHeight = Math.max(...ys) - Math.min(...ys) + 1;
  assert.ok(cellWidth / (cellHeight * 2) > 0.75 && cellWidth / (cellHeight * 2) < 1.25);
  assert.ok(shades.size >= 4);
  for (const shade of shades) assert.ok(ASCII_RAMP.includes(shade));
});

test("terminal animation only writes rows that changed", () => {
  const writes = [];
  const input = {
    isRaw: false,
    setRawMode() {},
    resume() {},
    pause() {},
  };
  const output = { write(value) { writes.push(value); } };
  const terminal = new TerminalSession({ input, output });
  terminal.enter();
  terminal.draw("first\nsecond\nthird");
  const afterFirstFrame = writes.length;
  terminal.draw("first\nsecond\nthird");
  assert.equal(writes.length, afterFirstFrame);
  terminal.draw("first\nchanged\nthird");
  assert.equal(writes.length, afterFirstFrame + 1);
  assert.match(writes.at(-1), /\u001b\[2;1Hchanged/);
  assert.doesNotMatch(writes.at(-1), /\u001b\[1;1Hfirst/);
  terminal.leave();
});

test("sphere motion and point-light motion independently change the projection", async () => {
  const config = await loadConfig();
  const startCenter = projectSpheres(config.space, 0)[0].center;
  const laterCenter = projectSpheres(config.space, 6)[0].center;
  assert.notDeepEqual(startCenter, laterCenter);

  const stationary = {
    ...config.space,
    spheres: [{
      ...config.space.spheres[0],
      position: [0, 0, 0],
      orbit: [0, 0, 0],
      rotation: 0,
    }],
  };
  const serializeSphere = (field) => field
    .flat()
    .filter((cell) => cell.tone === "sphere-0")
    .map((cell) => cell.char)
    .join("");
  const firstLighting = serializeSphere(renderSpaceField(120, 44, 0, stationary));
  const laterLighting = serializeSphere(renderSpaceField(120, 44, 6, stationary));
  assert.notEqual(firstLighting, laterLighting);
});

test("space field has no stars, keeps vertical bounds, and allows side clipping", async () => {
  const config = await loadConfig();
  const width = 180;
  const height = 60;
  const aspect = width / (height * 2);
  const fitted = fitSpheresToViewport(projectSpheres(config.space, 4), width, height);

  for (const sphere of fitted.filter((item) => !item.hidden)) {
    assert.ok(sphere.center[1] - sphere.radius > -1);
    assert.ok(sphere.center[1] + sphere.radius < 1);
  }
  assert.ok(fitted[0].center[0] + fitted[0].radius > aspect);

  const field = renderSpaceField(width, height, 4, config.space);
  const tones = new Set(field.flat().map((cell) => cell.tone));
  assert.deepEqual([...tones].filter((tone) => !tone.startsWith("sphere-") && tone !== "empty"), []);
});

test("sphere scale has one restrained dominant body, one medium body, and one small moon", async () => {
  const config = await loadConfig();
  const radii = config.space.spheres.map((sphere) => sphere.radius);
  assert.equal(radii[0], 0.625);
  assert.equal(radii[1], 0.31);
  assert.equal(radii[2], 0.115);
  assert.ok(radii[0] > radii[1] * 2);
  assert.ok(config.space.spheres[0].position[0] > 0);
});

test("crater geometry changes the sphere's lit surface", async () => {
  const config = await loadConfig();
  const serialize = (field) => field.flat().map((cell) => cell.char).join("");
  const cratered = serialize(renderSpaceField(150, 52, 2, config.space));
  const smooth = serialize(renderSpaceField(150, 52, 2, {
    ...config.space,
    spheres: config.space.spheres.map((sphere) => ({ ...sphere, craters: [] })),
  }));

  assert.ok(config.space.spheres.every((sphere) => sphere.craters.length > 0));
  assert.notEqual(cratered, smooth);
});
