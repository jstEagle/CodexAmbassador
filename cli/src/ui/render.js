import { getScene, isComplete } from "../game.js";
import { currentGitTask, isGitComplete } from "../git-sandbox.js";
import { animatedLlmText } from "../llm-lab.js";
import { renderSpaceField } from "./space.js";

const RESET = "\u001b[0m";
const NORMAL = "\u001b[22m";

const LOGO = [
  " █████╗  ██╗       ██╗  ██████╗  ██╗",
  "██╔══██╗ ██║      ███║ ██╔═████╗███║",
  "███████║ ██║      ╚██║ ██║██╔██║╚██║",
  "██╔══██║ ██║       ██║ ████╔╝██║ ██║",
  "██║  ██║ ██║       ██║ ╚██████╔╝ ██║",
  "╚═╝  ╚═╝ ╚═╝       ╚═╝  ╚═════╝  ╚═╝",
];

function rgb(hex, background = false) {
  const value = hex.slice(1);
  const channels = [0, 2, 4].map((offset) => Number.parseInt(value.slice(offset, offset + 2), 16));
  return `\u001b[${background ? 48 : 38};2;${channels.join(";")}m`;
}

function base(theme) {
  return `${NORMAL}${rgb(theme.background, true)}${rgb(theme.text)}`;
}

function paint(theme, color, value, { bold = false, dim = false, background = "background" } = {}) {
  const intensity = bold ? "\u001b[1m" : dim ? "\u001b[2m" : NORMAL;
  return `${intensity}${rgb(theme[background], true)}${rgb(theme[color])}${value}${base(theme)}`;
}

function segment(theme, color, value, { bold = false, dim = false, background = "background" } = {}) {
  const intensity = bold ? "\u001b[1m" : dim ? "\u001b[2m" : NORMAL;
  const restore = `${NORMAL}${rgb(theme[background], true)}${rgb(theme.text)}`;
  return `${intensity}${rgb(theme[background], true)}${rgb(theme[color])}${value}${restore}`;
}

export function stripAnsi(value) {
  return value.replace(/\u001b\[[0-?]*[ -/]*[@-~]/g, "");
}

export function visibleWidth(value) {
  return [...stripAnsi(value)].length;
}

function truncate(value, width) {
  const plain = stripAnsi(value);
  if ([...plain].length <= width) return plain;
  if (width <= 0) return "";
  if (width === 1) return "…";
  return [...plain].slice(0, width - 1).join("") + "…";
}

function fit(value, width, align = "left") {
  const content = visibleWidth(value) > width ? truncate(value, width) : value;
  const gap = Math.max(0, width - visibleWidth(content));
  if (align === "center") {
    const left = Math.floor(gap / 2);
    return `${" ".repeat(left)}${content}${" ".repeat(gap - left)}`;
  }
  if (align === "right") return `${" ".repeat(gap)}${content}`;
  return `${content}${" ".repeat(gap)}`;
}

function frameLine(theme, content, width, align = "left") {
  return `${base(theme)}${fit(content, width, align)}${RESET}`;
}

function split(left, right, width) {
  const gap = width - visibleWidth(left) - visibleWidth(right);
  return gap > 0 ? `${left}${" ".repeat(gap)}${right}` : fit(left, width);
}

export function wrap(text, width) {
  if (width < 1) return [""];
  const lines = [];
  for (const paragraph of text.split("\n")) {
    if (!paragraph) {
      lines.push("");
      continue;
    }
    let line = "";
    for (const word of paragraph.split(/\s+/)) {
      if (!line) line = word;
      else if (visibleWidth(`${line} ${word}`) <= width) line += ` ${word}`;
      else {
        lines.push(truncate(line, width));
        line = word;
      }
    }
    if (line) lines.push(truncate(line, width));
  }
  return lines;
}

function actionRows(state, width, theme) {
  if (isComplete(state)) {
    return [
      `${paint(theme, "accent", "/replay", { bold: true })}${" ".repeat(19)}play the adventure again`,
      `${paint(theme, "accent", "/quit", { bold: true })}${" ".repeat(21)}return to your terminal`,
    ].map((line) => fit(line, width));
  }
  const scene = getScene(state);
  const commandWidth = 25;
  return scene.choices.map((choice) => {
    const command = paint(theme, "accent", `/${choice.command}`, { bold: true });
    const descriptionWidth = width - commandWidth;
    return fit(`${fit(command, commandWidth)}${paint(theme, "text", truncate(choice.label, descriptionWidth))}`, width);
  });
}

function promptView(prompt, cursor, width, theme, placeholderText = "type an action…", mask = false) {
  const horizontalPadding = 2;
  const innerWidth = Math.max(1, width - horizontalPadding * 2);
  const rawChars = [...prompt];
  const chars = mask ? rawChars.map(() => "•") : rawChars;
  const position = Math.max(0, Math.min(cursor, rawChars.length));
  const available = Math.max(4, innerWidth);
  let start = Math.max(0, position - available + 2);
  if (chars.length - start < available - 1) start = Math.max(0, chars.length - available + 1);
  const visible = chars.slice(start, start + available - 1);
  const localCursor = position - start;
  const before = visible.slice(0, localCursor).join("");
  const after = visible.slice(localCursor).join("");
  const leading = start > 0 ? "…" : "";
  const typed = `${leading}${before}${segment(theme, "accent", "█", { background: "panelRaised" })}${after}`;
  const placeholder = prompt.length === 0 ? segment(theme, "muted", `  ${placeholderText}`, { dim: true, background: "panelRaised" }) : "";
  const content = `${typed}${placeholder}`;
  return paint(
    theme,
    "text",
    `${" ".repeat(horizontalPadding)}${fit(content, innerWidth)}${" ".repeat(horizontalPadding)}`,
    { background: "panelRaised" },
  );
}

function promptPadding(width, theme) {
  return `${paint(theme, "accent", "▏")}${paint(theme, "text", " ".repeat(width - 2), { background: "panelRaised" })}${paint(theme, "accent", "▕")}`;
}

function placePrompt(stage, { prompt, cursor, notice, theme, width, placeholder, leftHint, rightHint, mask = false }) {
  const promptTop = stage.length - 5;
  if (notice) {
    const tone = notice.type === "error" ? "danger" : "success";
    stage[promptTop - 2] = frameLine(theme, paint(theme, tone, truncate(notice.message, width - 4)), width, "center");
  }
  stage[promptTop] = frameLine(theme, promptPadding(width, theme), width);
  stage[promptTop + 1] = frameLine(
    theme,
    `${paint(theme, "accent", "▏")}${promptView(prompt, cursor, width - 2, theme, placeholder, mask)}${paint(theme, "accent", "▕")}`,
    width,
  );
  stage[promptTop + 2] = frameLine(theme, promptPadding(width, theme), width);
  stage[promptTop + 3] = frameLine(
    theme,
    split(paint(theme, "muted", leftHint, { dim: true }), paint(theme, "muted", rightHint, { dim: true }), width - 2),
    width,
    "center",
  );
  return promptTop;
}

function buildHomeStage({ prompt, cursor, notice, width, height, theme, config, keyStatus }) {
  const compact = height < 31 || width < 82;
  const stage = Array.from({ length: height }, () => frameLine(theme, "", width));
  let row = compact ? 1 : 2;
  if (compact) {
    stage[row++] = frameLine(theme, paint(theme, "muted", config.title), width, "center");
    stage[row++] = frameLine(theme, paint(theme, "muted", config.subtitle, { dim: true }), width, "center");
  } else {
    for (const line of LOGO) stage[row++] = frameLine(theme, paint(theme, "muted", line), width, "center");
    stage[row++] = frameLine(theme, paint(theme, "muted", config.subtitle, { dim: true }), width, "center");
  }
  row += compact ? 1 : 2;
  stage[row++] = frameLine(theme, paint(theme, "text", "Choose an experience", { bold: true }), width, "center");
  row += 1;
  const choices = [
    ["/story", "A short journey beneath a silent moon", "muted"],
    ["/git", "Learn Git from zero in a safe repository", "secondary"],
    ["/llm", "Learn how LLMs work with a personal tutor", "text"],
  ];
  for (const [command, label, color] of choices) {
    const content = `${fit(paint(theme, color, command, { bold: true }), 16)}${paint(theme, "text", label)}`;
    stage[row++] = frameLine(theme, fit(content, Math.min(64, width)), width, "center");
  }
  placePrompt(stage, {
    prompt,
    cursor,
    notice,
    theme,
    width,
    placeholder: "story, git, or llm…",
    leftHint: "enter  open     esc  clear",
    rightHint: keyStatus?.connected ? `AI tutor connected · ${keyStatus.source}` : "offline · /key to connect AI",
  });
  return stage;
}

function buildSetupStage({ prompt, cursor, notice, width, height, theme, config, keyStatus }) {
  const stage = Array.from({ length: height }, () => frameLine(theme, "", width));
  let row = Math.max(1, Math.floor((height - 24) / 2));
  stage[row++] = frameLine(theme, paint(theme, "accent", "OPTIONAL AI TUTOR", { bold: true }), width, "center");
  stage[row++] = frameLine(theme, paint(theme, "muted", "personalized Git guidance + a real LLM conversation", { dim: true }), width, "center");
  row += 2;
  const cardWidth = Math.min(70, width - 8);
  const lines = keyStatus?.connected ? [
    `An OpenAI API key is already available from ${keyStatus.source}.`,
    "Type continue to use it, paste a different key, or type skip for offline lessons.",
  ] : [
    "Paste an OpenAI API key below, or type skip to use the offline lessons.",
    "Your pasted key stays in memory for this process. It is never displayed or saved.",
  ];
  for (const line of lines) {
    for (const wrapped of wrap(line, cardWidth)) stage[row++] = frameLine(theme, paint(theme, "text", wrapped), width, "center");
  }
  row += 2;
  stage[row++] = frameLine(theme, paint(theme, "secondary", "What the key enables", { bold: true }), width, "center");
  stage[row++] = frameLine(theme, paint(theme, "muted", "• ask questions about the exact Git sandbox state", { dim: true }), width, "center");
  stage[row++] = frameLine(theme, paint(theme, "muted", "• have a live tutor adapt LLM explanations to you", { dim: true }), width, "center");
  stage[row++] = frameLine(theme, paint(theme, "muted", `• responses use ${config.openai.model}`, { dim: true }), width, "center");
  placePrompt(stage, {
    prompt,
    cursor,
    notice,
    theme,
    width,
    placeholder: keyStatus?.connected ? "continue, paste a key, or skip…" : "paste key or type skip…",
    leftHint: "enter  continue     esc  clear",
    rightHint: "secret · never saved",
    mask: prompt.length > 0 && !["skip", "continue"].includes(prompt.toLowerCase()),
  });
  return stage;
}

function gitBranchLabels(state, commitId) {
  return Object.entries(state.branches)
    .filter(([, target]) => target === commitId)
    .map(([name]) => name === state.head ? `${name} ← HEAD` : name)
    .join("  ");
}

function gitGraphRows(state, width, theme) {
  const rows = [];
  const commits = [...state.commits].reverse();
  for (const commit of commits.slice(0, 7)) {
    const label = gitBranchLabels(state, commit.id);
    const isFeature = commit.lane === 1;
    const isMerge = commit.parents.length > 1;
    const route = isMerge ? "●━━╮" : isFeature ? "┃  ●" : "●  ┃";
    const routeColor = isFeature ? "secondary" : "accent";
    const message = truncate(`${commit.id}  ${commit.message}`, Math.max(12, width - 34));
    const line = `${paint(theme, routeColor, route, { bold: true })}  ${paint(theme, "text", message, { bold: Boolean(label) })}${label ? `  ${paint(theme, routeColor, label, { bold: true })}` : ""}`;
    rows.push(fit(line, width));
    if (isMerge) rows.push(fit(`${paint(theme, "accent", "┃  ╰━━━━ joins feature", { bold: true })}`, width));
    else if (isFeature) rows.push(fit(`${paint(theme, "secondary", "┃ ╱", { bold: true })}`, width));
    else if (commits.length > 1) rows.push(fit(`${paint(theme, "accent", "┃", { bold: true })}`, width));
  }
  return rows.slice(0, 10);
}

function buildGitFrame({ state, prompt, cursor, notice, width, height, theme }) {
  const stage = Array.from({ length: height }, () => frameLine(theme, "", width));
  const contentWidth = Math.min(104, width - 8);
  const left = Math.floor((width - contentWidth) / 2);
  const centered = (content, align = "left") => frameLine(theme, `${" ".repeat(left)}${fit(content, contentWidth, align)}${" ".repeat(width - left - contentWidth)}`, width);
  let row = Math.max(1, Math.floor((height - 31) / 2));
  stage[row++] = centered(split(
    paint(theme, "accent", "GIT SANDBOX", { bold: true }),
    paint(theme, "muted", "beginner course · simulated repository · /home", { dim: true }),
    contentWidth,
  ));
  row += 1;
  const lesson = currentGitTask(state);
  const task = isGitComplete(state)
    ? `${paint(theme, "success", "FOUNDATIONS COMPLETE", { bold: true })}  You built and read a Git history.`
    : `${paint(theme, "secondary", `LESSON ${String(state.task + 1).padStart(2, "0")}`, { bold: true })}  ${paint(theme, "text", lesson.title, { bold: true })}`;
  stage[row++] = centered(task);
  if (!isGitComplete(state)) {
    for (const line of wrap(lesson.concept, contentWidth - 2).slice(0, 2)) stage[row++] = centered(paint(theme, "muted", line));
    stage[row++] = centered(`${paint(theme, "secondary", "TRY", { bold: true })}  ${paint(theme, "text", lesson.command, { bold: true })}  ${paint(theme, "muted", `— ${lesson.label}`, { dim: true })}`);
  }
  row += 1;
  const worktree = state.working.length ? state.working.join(", ") : "clean";
  const staged = state.staged.length ? state.staged.join(", ") : "empty";
  stage[row++] = centered(
    `${paint(theme, "accent", `● ${state.head}`, { bold: true })}${paint(theme, "muted", "      WORKTREE ")}${paint(theme, "text", worktree)}${paint(theme, "muted", "      STAGED ")}${paint(theme, "text", staged)}`,
  );
  row += 1;
  const promptTop = height - 5;
  const output = [...state.output, state.explanation]
    .filter(Boolean)
    .flatMap((line) => wrap(line, contentWidth - 3))
    .slice(0, 4);
  const outputStart = Math.max(row + 3, promptTop - output.length - 1);
  stage[row++] = centered(paint(theme, "muted", "REPOSITORY MAP", { dim: true }), "center");
  for (const graphRow of gitGraphRows(state, contentWidth, theme)) {
    if (row >= outputStart - 1) break;
    stage[row++] = centered(graphRow);
  }
  stage[outputStart - 1] = centered(paint(theme, "muted", state.coach.pending ? "AI GIT TUTOR" : "WHAT JUST HAPPENED", { dim: true }));
  output.forEach((line, index) => {
    stage[outputStart + index] = centered(`${paint(theme, "accent", index === 0 ? "›" : " ")} ${paint(theme, "text", truncate(line, contentWidth - 3))}`);
  });
  placePrompt(stage, {
    prompt,
    cursor,
    notice,
    theme,
    width,
    placeholder: "git status…",
    leftHint: "enter  run     concept  explain     ask <question>",
    rightHint: state.coach.pending ? "AI tutor thinking…" : `${Object.keys(state.branches).length} branches · ${state.commits.length} commits`,
  });
  return stage.join("\n");
}

function llmRoleLabel(role) {
  if (role === "assistant") return "MODEL";
  if (role === "tool") return "TOOL RESULT";
  return "YOU";
}

function buildLlmFrame({ state, prompt, cursor, notice, time, width, height, theme }) {
  const stage = Array.from({ length: height }, () => frameLine(theme, "", width));
  const contentWidth = Math.min(88, width - 8);
  const left = Math.floor((width - contentWidth) / 2);
  const centered = (content, align = "left") => frameLine(theme, `${" ".repeat(left)}${fit(content, contentWidth, align)}${" ".repeat(width - left - contentWidth)}`, width);
  let row = Math.max(1, Math.floor((height - 32) / 2));
  stage[row++] = centered(split(
    paint(theme, "text", "LLM LAB", { bold: true }),
    paint(theme, state.connected ? "success" : "muted", state.connected ? "LIVE AI TUTOR · /home" : "OFFLINE FOUNDATIONS · /key", { dim: true }),
    contentWidth,
  ));
  stage[row++] = centered(paint(theme, "muted", "tokens → context → prediction → response · tools turn a model into an agent", { dim: true }));
  row += 1;

  const promptTop = height - 5;
  const messages = state.pending || state.animation ? state.messages.slice(-1) : state.messages.slice(-3);
  for (const message of messages) {
    if (row >= promptTop - 4) break;
    stage[row++] = centered(paint(theme, message.role === "user" ? "secondary" : "text", llmRoleLabel(message.role), { bold: true }));
    for (const paragraph of message.text.split("\n")) {
      for (const line of wrap(paragraph, contentWidth - 4).slice(0, 3)) {
        if (row >= promptTop - 3) break;
        stage[row++] = centered(`${paint(theme, "muted", "│ ")}${paint(theme, "text", line)}`);
      }
    }
    row += 1;
  }

  const animated = animatedLlmText(state, time);
  if (state.pending && row < promptTop - 2) {
    stage[row++] = centered(paint(theme, "text", "MODEL", { bold: true }));
    stage[row++] = centered(`${paint(theme, "muted", "│ reading your context and composing an answer…", { dim: true })}`);
  } else if (state.animation && row < promptTop - 2) {
    stage[row++] = centered(paint(theme, "text", "MODEL", { bold: true }));
    const availableLines = Math.max(1, promptTop - row - 1);
    for (const line of wrap(animated.text, contentWidth - 4).slice(0, availableLines)) {
      if (row >= promptTop - 1) break;
      stage[row++] = centered(`${paint(theme, "muted", "│ ")}${paint(theme, "text", line)}${animated.complete ? "" : paint(theme, "text", " ▋")}`);
    }
  }

  placePrompt(stage, {
    prompt,
    cursor,
    notice,
    theme,
    width,
    placeholder: state.connected ? "ask anything about LLMs or agents…" : "ask about tokens, context, tools, or mistakes…",
    leftHint: "enter  send     esc  clear",
    rightHint: state.pending
      ? "waiting for OpenAI…"
      : state.connected
        ? state.usage?.total_tokens ? `${state.usage.total_tokens} tokens in last answer` : "personalized · live"
        : `offline lesson ${state.lesson + 1} · /key for live chat`,
  });
  return stage.join("\n");
}

function buildStage({ state, prompt, cursor, notice, width, height, theme, config, showIdentity = false }) {
  const compact = height < 31 || width < 82;
  const started = state.turns > 0 || !showIdentity;
  const stage = Array.from({ length: height }, () => frameLine(theme, "", width));
  let row = compact ? 0 : 1;

  if (!started) {
    if (compact) {
      stage[row++] = frameLine(theme, paint(theme, "accent", config.title, { bold: true }), width, "center");
      stage[row++] = frameLine(theme, paint(theme, "muted", config.subtitle, { dim: true }), width, "center");
    } else {
      LOGO.forEach((line) => {
        stage[row++] = frameLine(theme, paint(theme, "muted", line), width, "center");
      });
      stage[row++] = frameLine(
        theme,
        `${paint(theme, "muted", config.subtitle, { dim: true })}  ${paint(theme, "secondary", "v0.1", { dim: true })}`,
        width,
        "center",
      );
    }
    row += 1;
  }

  const scene = getScene(state);
  if (started) {
    stage[row++] = frameLine(theme, paint(theme, "muted", scene.chapter, { dim: true }), width, "center");
    row += compact ? 0 : 1;
  }
  stage[row++] = frameLine(theme, paint(theme, "text", scene.title, { bold: true }), width, "center");
  if (compact) {
    const summary = wrap(scene.body, width - 4)[0];
    stage[row++] = frameLine(theme, paint(theme, "muted", summary, { dim: true }), width, "center");
  } else {
    for (const line of wrap(scene.body, Math.min(width - 4, 78)).slice(0, 3)) {
      stage[row++] = frameLine(theme, paint(theme, "muted", line), width, "center");
    }
  }

  row += 1;
  const actions = actionRows(state, Math.min(width, 72), theme);
  for (const action of actions) stage[row++] = frameLine(theme, action, width, "center");

  const promptTop = height - 5;
  if (notice) {
    const tone = notice.type === "error" ? "danger" : "success";
    stage[promptTop - 2] = frameLine(theme, paint(theme, tone, truncate(notice.message, width - 2), { dim: notice.type !== "error" }), width, "center");
  } else if (state.feedback) {
    stage[promptTop - 2] = frameLine(theme, paint(theme, "success", truncate(state.feedback, width - 4), { dim: true }), width, "center");
  }

  stage[promptTop] = frameLine(theme, promptPadding(width, theme), width);
  stage[promptTop + 1] = frameLine(theme, `${paint(theme, "accent", "▏")}${promptView(prompt, cursor, width - 2, theme)}${paint(theme, "accent", "▕")}`, width);
  stage[promptTop + 2] = frameLine(theme, promptPadding(width, theme), width);
  const leftHint = paint(theme, "muted", "enter  send     esc  clear", { dim: true });
  const rightHint = paint(theme, "muted", started ? `${scene.chapter}     offline` : "local / offline", { dim: true });
  stage[promptTop + 3] = frameLine(theme, split(leftHint, rightHint, width - 2), width, "center");
  return stage;
}

function ansiCells(line) {
  const cells = [];
  let style = "";
  for (let index = 0; index < line.length;) {
    if (line[index] === "\u001b") {
      const match = line.slice(index).match(/^\u001b\[[0-?]*[ -/]*[@-~]/);
      if (match) {
        style = match[0] === RESET ? RESET : `${style}${match[0]}`;
        index += match[0].length;
        continue;
      }
    }
    const character = String.fromCodePoint(line.codePointAt(index));
    cells.push({ char: character, style });
    index += character.length;
  }
  return cells;
}

function renderMergedRow(cells, theme) {
  let output = "";
  let activeStyle = null;
  for (const cell of cells) {
    const style = cell.style ?? (
      cell.tone?.startsWith("sphere-")
        ? `${NORMAL}${rgb(theme.background, true)}${rgb(cell.color)}`
        : base(theme)
    );
    if (style !== activeStyle) {
      output += style;
      activeStyle = style;
    }
    output += cell.char;
  }
  return `${output}${RESET}`;
}

function compose(stage, width, height, theme, time, spaceConfig) {
  const stageWidth = stage.length ? visibleWidth(stage[0]) : 0;
  const space = renderSpaceField(width, height, time, spaceConfig);
  const left = Math.max(0, Math.floor((width - stageWidth) / 2));
  const top = Math.max(0, Math.floor((height - stage.length) / 2));
  const raisedBackground = rgb(theme.panelRaised, true);
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const stageIndex = y - top;
    if (stageIndex >= 0 && stageIndex < stage.length) {
      const merged = space[y].map((cell) => ({ ...cell }));
      const overlay = ansiCells(stage[stageIndex]);
      const occupied = overlay
        .map((cell, index) => (cell.char !== " " || cell.style.includes(raisedBackground) ? index : -1))
        .filter((index) => index >= 0);
      if (occupied.length) {
        const first = occupied[0];
        const last = occupied.at(-1);
        for (let index = first; index <= last; index += 1) merged[left + index] = overlay[index];
      }
      rows.push(renderMergedRow(merged, theme));
    } else {
      rows.push(renderMergedRow(space[y], theme));
    }
  }
  return rows.join("\n");
}

function smallTerminal(width, height, config, mode) {
  const theme = mode === "git" ? config.modes.git.theme : mode === "llm" ? config.modes.llm.theme : config.theme;
  const message = [
    frameLine(theme, ["home", "setup"].includes(mode) ? paint(theme, "accent", config.title, { bold: true }) : "", Math.max(1, width), "center"),
    frameLine(theme, "", Math.max(1, width)),
    frameLine(theme, paint(theme, "text", "This experience needs a little more room."), Math.max(1, width), "center"),
    frameLine(theme, paint(theme, "muted", `${width} × ${height} available`), Math.max(1, width), "center"),
  ].slice(0, height);
  while (message.length < height) message.push(frameLine(theme, "", width));
  return message.join("\n");
}

export function renderFrame({
  mode = "home",
  state,
  gitState,
  llmState,
  prompt = "",
  cursor = prompt.length,
  notice = null,
  keyStatus = { connected: false, source: null },
  time = 0,
  width,
  height,
  config,
}) {
  width = Math.max(1, width);
  height = Math.max(1, height);
  if (width < config.minimumTerminal.columns || height < config.minimumTerminal.rows) {
    return smallTerminal(width, height, config, mode);
  }
  if (mode === "git") {
    return buildGitFrame({ state: gitState, prompt, cursor, notice, width, height, theme: config.modes.git.theme });
  }
  if (mode === "llm") {
    return buildLlmFrame({ state: llmState, prompt, cursor, notice, time, width, height, theme: config.modes.llm.theme });
  }
  const stageWidth = Math.min(96, width - 4);
  const stageHeight = Math.min(40, height - 2);
  const stage = mode === "setup"
    ? buildSetupStage({ prompt, cursor, notice, width: stageWidth, height: stageHeight, theme: config.theme, config, keyStatus })
    : mode === "home"
      ? buildHomeStage({ prompt, cursor, notice, width: stageWidth, height: stageHeight, theme: config.theme, config, keyStatus })
      : buildStage({ state, prompt, cursor, notice, width: stageWidth, height: stageHeight, theme: config.theme, config });
  return compose(stage, width, height, config.theme, time, config.space);
}
