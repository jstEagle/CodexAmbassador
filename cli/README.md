# AI 101

AI 101 is a full-terminal experience built for Codex community events. Its home screen opens three independent modes: an atmospheric interactive story, a beginner-first Git course in a safe repository sandbox, and an LLM course with optional live, personalized tutoring.

## Run locally

Requirements: Node.js 20 or newer and a terminal with at least 76 columns by 24 rows.

```bash
cd /Users/justus/Documents/Programming/CodexAmbassador/cli
npm start
```

The startup screen first offers an optional AI tutor. Either:

- Paste an OpenAI API key into the masked field. The key is held in memory for this process only and is never saved.
- Set the secret before launching with `OPENAI_API_KEY=... npm start`.
- Type `skip` to use every local lesson without an API call.

Then choose `/story`, `/git`, or `/llm` on the home screen:

- Story uses fuzzy natural-language choices inside the original dark, animated space environment.
- Git starts with what a repository is and teaches the working tree, staging area, commits, branches, HEAD, merges, and history in sequence. Every command explains what changed and why. With a key, `ask <question>` gives the tutor the exact simulated state so it can answer in context; it never reads or changes your real repository.
- LLM starts with prediction, tokens, context, tools, agents, evidence, and hallucinations. Without a key it follows a built-in course. With a key it becomes a real conversation that adapts explanations and examples to the learner.

Use the arrow keys to edit the prompt, `Esc` to clear it, `/home` to return to the launcher, `/key` to add or replace the session key, `/restart` to reset the current mode, and `/quit` or `Ctrl-C` to exit.

No install step is required: the package deliberately has zero runtime dependencies. To verify it:

```bash
npm run verify
```

## Configuration

All non-secret runtime and visual settings—OpenAI endpoint and model, response limits, terminal requirements, theme colors, animation rate, light speed, and sphere geometry—live in the checked-in [`cli.config.json`](./cli.config.json). Its shape is documented by [`cli.config.schema.json`](./cli.config.schema.json).

The OpenAI API key is the only secret. A pasted key exists only in process memory. `OPENAI_API_KEY` is supported for people who prefer their shell or secret manager; it is never copied into configuration. API requests use the Responses API with `store: false`.

## Why this terminal approach

OpenCode's current TUI uses [`@opentui/core` and `@opentui/solid`](https://github.com/anomalyco/opencode/blob/dev/packages/tui/package.json). Its bootstrap creates a [`createCliRenderer`](https://github.com/anomalyco/opencode/blob/dev/packages/tui/src/app.tsx), renders a Solid component tree into it, and destroys the renderer through a scoped cleanup path. OpenTUI itself is a native Zig core with TypeScript bindings and provides alternate-screen ownership, raw keyboard input, layout, rendering, and terminal restoration; its official repository states that it powers OpenCode in production: [anomalyco/opentui](https://github.com/anomalyco/opentui).

AI 101 follows the same terminal-lifecycle model—alternate screen, raw input, cursor/wrapping control, redraw on resize, and guaranteed restoration—but implements the surface directly with ANSI control sequences and Node.js. Its launcher and prompts echo OpenCode's home-screen composition. Story uses a tiny real-time 3D renderer that casts orthographic rays against moving, cratered spheres, shades displaced surface normals with an orbiting point light, then applies ordered ASCII dithering. Git and LLM use separate light palettes and renderers with no shared story state.

## Package map

- `src/story.js` — standalone lunar-signal adventure
- `src/game.js` — story transitions and fuzzy action matching
- `src/git-sandbox.js` — beginner curriculum plus simulated worktree, staging, branches, commits, merges, and contextual tutor state
- `src/llm-lab.js` — offline foundations, live conversation state, and token-style response animation
- `src/openai-client.js` — dependency-free Responses API client and focused Git/LLM teaching prompts
- `src/ui/render.js` — launcher plus independent Story, Git, and LLM layouts
- `src/ui/space.js` — animated cratered ray/sphere surfaces, moving light, and ordered ASCII dithering
- `src/ui/terminal.js` — alternate-screen/raw-input lifecycle and key decoding
- `src/index.js` — CLI controller and safe cleanup
- `test/` — engine, renderer, layout, and input tests
