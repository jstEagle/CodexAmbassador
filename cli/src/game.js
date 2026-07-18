import { story } from "./story.js";

export function createGame() {
  return {
    sceneId: "arrival",
    git: 0,
    llm: 0,
    signal: 0,
    turns: 0,
    insights: [],
    history: [],
    feedback: "",
  };
}

export function getScene(state) {
  const scene = story[state.sceneId];
  if (!scene) throw new Error(`Unknown scene: ${state.sceneId}`);
  return scene;
}

export function choose(state, choiceIndex) {
  const scene = getScene(state);
  const choice = scene.choices[choiceIndex];
  if (!choice) throw new RangeError(`Choice ${choiceIndex} does not exist in scene ${state.sceneId}.`);

  const effect = choice.effect ?? {};
  return {
    ...state,
    sceneId: choice.next,
    git: state.git + (effect.git ?? 0),
    llm: state.llm + (effect.llm ?? 0),
    signal: state.signal + (effect.signal ?? 0),
    turns: state.turns + 1,
    insights: effect.insight
      ? [...new Set([...state.insights, effect.insight])]
      : [...state.insights],
    history: [...state.history, { sceneId: state.sceneId, choice: choice.label }],
    feedback: choice.feedback,
  };
}

export function isComplete(state) {
  return state.sceneId === "finale";
}

export function score(state) {
  return Math.max(0, state.git) + Math.max(0, state.llm) + Math.max(0, state.signal);
}

export function rank(state) {
  const value = score(state);
  if (value >= 3) return { name: "SIGNAL KEEPER", tone: "success" };
  if (value >= 1) return { name: "QUIET EXPLORER", tone: "secondary" };
  return { name: "DISTANT WITNESS", tone: "danger" };
}

const FILLER_WORDS = new Set([
  "a",
  "an",
  "can",
  "could",
  "do",
  "i",
  "just",
  "like",
  "please",
  "the",
  "to",
  "want",
  "would",
  "you",
]);

export function normalizeAction(value) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/^\s*\/+/, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((word) => word && !FILLER_WORDS.has(word))
    .join(" ");
}

export function editDistance(left, right) {
  const a = [...left];
  const b = [...right];
  const matrix = Array.from({ length: a.length + 1 }, (_, row) =>
    Array.from({ length: b.length + 1 }, (_, column) => (row === 0 ? column : column === 0 ? row : 0)),
  );

  for (let row = 1; row <= a.length; row += 1) {
    for (let column = 1; column <= b.length; column += 1) {
      const cost = a[row - 1] === b[column - 1] ? 0 : 1;
      matrix[row][column] = Math.min(
        matrix[row - 1][column] + 1,
        matrix[row][column - 1] + 1,
        matrix[row - 1][column - 1] + cost,
      );
      if (
        row > 1 &&
        column > 1 &&
        a[row - 1] === b[column - 2] &&
        a[row - 2] === b[column - 1]
      ) {
        matrix[row][column] = Math.min(matrix[row][column], matrix[row - 2][column - 2] + cost);
      }
    }
  }
  return matrix[a.length][b.length];
}

function candidateScore(input, candidate) {
  if (input === candidate) return 0;
  if (input.includes(candidate) || candidate.includes(input)) {
    const difference = Math.abs(input.length - candidate.length);
    if (Math.min(input.length, candidate.length) >= 5) return difference * 0.35;
  }
  const distance = editDistance(input, candidate);
  const inputWords = new Set(input.split(" "));
  const candidateWords = candidate.split(" ");
  const sharedWords = candidateWords.filter((word) => inputWords.has(word)).length;
  return distance - sharedWords * 0.75;
}

export function matchAction(state, input) {
  const normalized = normalizeAction(input);
  if (!normalized) return { matched: false, suggestions: [] };
  const scene = getScene(state);
  const ranked = scene.choices
    .map((choice, index) => {
      const variants = [choice.command, choice.label, ...(choice.aliases ?? [])]
        .map(normalizeAction)
        .filter(Boolean);
      const best = variants
        .map((candidate) => ({ candidate, score: candidateScore(normalized, candidate) }))
        .sort((left, right) => left.score - right.score)[0];
      return { index, command: choice.command, candidate: best.candidate, score: best.score };
    })
    .sort((left, right) => left.score - right.score);

  const best = ranked[0];
  const allowed = Math.max(2, Math.ceil(Math.max(normalized.length, best.candidate.length) * 0.3));
  if (best.score > allowed) {
    return {
      matched: false,
      suggestions: ranked.slice(0, 2).map((entry) => entry.command),
    };
  }
  return {
    matched: true,
    index: best.index,
    command: best.command,
    corrected: normalized !== normalizeAction(best.command),
    input: normalized,
  };
}
