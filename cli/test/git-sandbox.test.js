import test from "node:test";
import assert from "node:assert/strict";

import {
  beginGitCoach,
  completeGitCoach,
  createGitSandbox,
  gitTutorContext,
  isGitCoachPrompt,
  isGitComplete,
  runGitCommand,
} from "../src/git-sandbox.js";

test("git sandbox completes a real branch, stage, commit, and merge flow", () => {
  let state = createGitSandbox();
  for (const command of [
    "git status",
    "git switch -c feature",
    "edit welcome.txt",
    "git add welcome.txt",
    "git commit -m \"welcome route\"",
    "git switch main",
    "git merge feature",
    "git log",
  ]) state = runGitCommand(state, command);

  assert.equal(isGitComplete(state), true);
  assert.equal(state.head, "main");
  assert.equal(state.commits.length, 3);
  assert.equal(state.commits.at(-1).parents.length, 2);
  assert.equal(state.branches.main, state.commits.at(-1).id);
  assert.equal(state.branches.feature, "c001");
});

test("git curriculum explains the mental model as state changes", () => {
  let state = createGitSandbox();
  assert.match(state.output.join(" "), /Git begins locally/);
  state = runGitCommand(state, "git status");
  assert.match(state.explanation, /read-only/);
  state = runGitCommand(state, "git switch -c feature");
  assert.match(state.explanation, /same commit as main/);
  state = runGitCommand(state, "edit notes.md");
  state = runGitCommand(state, "git add notes.md");
  assert.match(state.explanation, /staging area/);
});

test("personalized git questions receive only explicit simulated state", () => {
  let state = runGitCommand(createGitSandbox(), "git status");
  assert.equal(isGitCoachPrompt("why is the tree clean?"), true);
  const context = gitTutorContext(state);
  assert.equal(context.simulatedRepository, true);
  assert.equal(context.currentBranch, "main");
  state = beginGitCoach(state, "what is HEAD?");
  assert.equal(state.coach.pending, true);
  state = completeGitCoach(state, "HEAD is your you-are-here marker.");
  assert.equal(state.coach.pending, false);
  assert.match(state.output.join(" "), /you-are-here/);
});

test("git sandbox protects branch switching and reports unsupported commands", () => {
  let state = createGitSandbox();
  state = runGitCommand(state, "edit notes.md");
  state = runGitCommand(state, "git switch nowhere");
  assert.match(state.output.join(" "), /did not match a branch/);
  state = runGitCommand(state, "git push --force");
  assert.match(state.output.join(" "), /not simulated yet/);
});
