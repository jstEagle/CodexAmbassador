import test from "node:test";
import assert from "node:assert/strict";

import { choose, createGame, getScene, isComplete, matchAction, normalizeAction, rank, score } from "../src/game.js";

test("the strongest path completes the playable story", () => {
  let state = createGame();
  const visited = [state.sceneId];

  while (!isComplete(state)) {
    state = choose(state, 0);
    visited.push(state.sceneId);
  }

  assert.deepEqual(visited, [
    "arrival",
    "descent",
    "archive",
    "finale",
  ]);
  assert.equal(score(state), 3);
  assert.equal(rank(state).name, "SIGNAL KEEPER");
  assert.equal(state.insights.length, 3);
  assert.equal(state.history.length, 3);
});

test("imperfect choices still produce a complete, replayable adventure", () => {
  let state = createGame();
  while (!isComplete(state)) {
    const scene = getScene(state);
    state = choose(state, scene.choices.length - 1);
  }

  assert.equal(state.sceneId, "finale");
  assert.equal(rank(state).name, "DISTANT WITNESS");
  assert.match(state.feedback, /moon resumes/i);
});

test("invalid choices fail loudly without mutating state", () => {
  const state = createGame();
  assert.throws(() => choose(state, 99), RangeError);
  assert.deepEqual(state, createGame());
});

test("typed actions ignore case, punctuation, and polite filler", () => {
  const state = createGame();
  const match = matchAction(state, "PLEASE, I want to ANSWER the signal!!!");
  assert.equal(match.matched, true);
  assert.equal(match.index, 0);
  assert.equal(match.command, "answer signal");
  assert.equal(normalizeAction("/Answer-Signal"), "answer signal");
});

test("typed actions autocorrect nearby misspellings", () => {
  let state = createGame();
  state = choose(state, 0);
  const match = matchAction(state, "tuch holows");
  assert.equal(match.matched, true);
  assert.equal(match.command, "touch hollows");
  assert.equal(match.corrected, true);
});

test("unrelated input is rejected with useful suggestions", () => {
  const match = matchAction(createGame(), "sing me a sea shanty");
  assert.equal(match.matched, false);
  assert.equal(match.suggestions.length, 2);
});
