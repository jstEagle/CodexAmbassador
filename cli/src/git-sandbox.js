const LESSONS = [
  {
    title: "Meet the repository",
    command: "git status",
    label: "Ask Git what it can see",
    concept: "Git is a local history system. A repository is a folder whose changes Git can remember as snapshots.",
    model: "folder + hidden history = repository",
  },
  {
    title: "Create a branch",
    command: "git switch -c feature",
    label: "Make a separate line of work",
    concept: "A branch is a movable label pointing at a commit. It lets you develop without moving main.",
    model: "branch = bookmark on the commit timeline",
  },
  {
    title: "Change the working tree",
    command: "edit welcome.txt",
    label: "Simulate changing one file",
    concept: "The working tree is the version of the project you can currently see and edit.",
    model: "working tree = files on your desk",
  },
  {
    title: "Choose the next snapshot",
    command: "git add welcome.txt",
    label: "Move the change into staging",
    concept: "Staging is a draft of your next commit. git add selects changes; it does not upload them.",
    model: "staging area = packing list for one snapshot",
  },
  {
    title: "Record a commit",
    command: "git commit -m \"explain welcome\"",
    label: "Save the staged snapshot",
    concept: "A commit permanently records the staged project state, a message, and a link to its parent commit.",
    model: "commit = named snapshot + link to what came before",
  },
  {
    title: "Move between branches",
    command: "git switch main",
    label: "Return to the main line",
    concept: "Switching moves HEAD to another branch and updates the working tree to match it.",
    model: "HEAD = you are here marker",
  },
  {
    title: "Combine histories",
    command: "git merge feature",
    label: "Bring the feature into main",
    concept: "A merge combines another branch's history with the branch you are currently on.",
    model: "merge = join two lines of history",
  },
  {
    title: "Read the timeline",
    command: "git log",
    label: "Inspect the history you made",
    concept: "The log walks backward through commit parents, showing how the repository reached its current state.",
    model: "log = the repository's readable timeline",
  },
];

export function createGitSandbox() {
  return {
    head: "main",
    branches: { main: "c000" },
    commits: [{ id: "c000", parents: [], message: "create repository", lane: 0 }],
    working: [],
    staged: [],
    output: [
      "Git begins locally: it watches this folder and builds a history only when you commit.",
      "Try git status. It is the safest first command because it only reports what Git sees.",
    ],
    explanation: "Nothing has been sent anywhere. Git and GitHub are different: Git is the tool; GitHub is one place that can host a copy.",
    task: 0,
    commandHistory: [],
    nextCommit: 1,
    coach: { pending: false, question: null },
  };
}

export function currentGitTask(state) {
  return LESSONS[Math.min(state.task, LESSONS.length - 1)];
}

export function isGitComplete(state) {
  return state.task >= LESSONS.length;
}

export function isGitCoachPrompt(rawInput) {
  const input = rawInput.trim();
  return /^(?:ask\s+|\?)/i.test(input) || /^(?:what|why|how|when|where|can|should|does|is|are)\b/i.test(input);
}

export function gitCoachQuestion(rawInput) {
  return rawInput.trim().replace(/^(?:ask\s+|\?\s*)/i, "").trim();
}

export function gitTutorContext(state) {
  const lesson = isGitComplete(state) ? null : currentGitTask(state);
  return {
    simulatedRepository: true,
    currentBranch: state.head,
    branches: state.branches,
    workingTreeChanges: state.working,
    stagedChanges: state.staged,
    commits: state.commits.map(({ id, parents, message }) => ({ id, parents, message })),
    currentLesson: lesson ? { title: lesson.title, concept: lesson.concept, suggestedCommand: lesson.command } : "curriculum complete",
    recentCommands: state.commandHistory.slice(-5),
  };
}

export function beginGitCoach(state, question) {
  return {
    ...state,
    output: ["The Git tutor is reading this simulated repository…"],
    coach: { pending: true, question },
  };
}

export function completeGitCoach(state, answer) {
  return {
    ...state,
    output: answer.split("\n").filter(Boolean),
    explanation: "The tutor received the sandbox state above. It did not inspect or change your real files.",
    coach: { pending: false, question: null },
  };
}

export function failGitCoach(state, message) {
  return {
    ...state,
    output: [message, "Your sandbox is unchanged. You can keep practising commands offline."],
    coach: { pending: false, question: null },
  };
}

function respond(state, command, output, explanation, patch = {}) {
  return {
    ...state,
    ...patch,
    output: Array.isArray(output) ? output : [output],
    explanation,
    commandHistory: [...state.commandHistory, command].slice(-12),
  };
}

function taskAfter(state, completedTask) {
  return state.task === completedTask ? state.task + 1 : state.task;
}

function statusLines(state) {
  const lines = [`On branch ${state.head}`];
  if (!state.working.length && !state.staged.length) return [...lines, "nothing to commit, working tree clean"];
  if (state.staged.length) lines.push(`staged for next commit: ${state.staged.join(", ")}`);
  if (state.working.length) lines.push(`changed but not staged: ${state.working.join(", ")}`);
  return lines;
}

function branchLabels(state, commitId) {
  return Object.entries(state.branches)
    .filter(([, target]) => target === commitId)
    .map(([name]) => name === state.head ? `${name} ← HEAD` : name)
    .join(", ");
}

export function gitLogLines(state) {
  return [...state.commits]
    .reverse()
    .map((commit) => `${commit.id} ${commit.message}${branchLabels(state, commit.id) ? `  (${branchLabels(state, commit.id)})` : ""}`);
}

export function runGitCommand(state, rawInput) {
  const raw = rawInput.trim();
  const command = raw.replace(/\s+/g, " ");
  const lower = command.toLowerCase();

  if (lower === "help" || lower === "git help") {
    return respond(state, command, [
      "LEARN: concept · why · hint · ask <question>",
      "TRY: git status · git switch -c <name> · edit <file> · git add <file|.>",
      "SAVE: git commit -m <message> · git merge <branch> · git log",
    ], "Commands manipulate the simulation. `ask` uses the optional AI tutor; everything else works offline.");
  }

  if (["concept", "explain", "why", "hint", "next"].includes(lower)) {
    const lesson = currentGitTask(state);
    return respond(state, command, [lesson.concept, `Mental model: ${lesson.model}`, `Try: ${lesson.command}`], "The curriculum advances only after you perform the suggested idea, so experimentation is safe.");
  }

  if (lower === "git status" || lower === "git status --short") {
    return respond(state, command, statusLines(state), "git status is read-only. It compares the working tree and staging area with the current commit.", { task: taskAfter(state, 0) });
  }

  if (lower === "git branch") {
    const branches = Object.keys(state.branches).map((name) => `${name === state.head ? "*" : " "} ${name}`);
    return respond(state, command, branches, "The star marks the current branch. HEAD points to that branch, and the branch points to a commit.");
  }

  const createBranch = command.match(/^git (?:switch -c|checkout -b|branch) ([a-z0-9._/-]+)$/i);
  if (createBranch) {
    const name = createBranch[1];
    if (state.branches[name]) return respond(state, command, `fatal: a branch named '${name}' already exists`, "Branch names must be unique inside a repository.");
    const branches = { ...state.branches, [name]: state.branches[state.head] };
    const switches = /^git (?:switch -c|checkout -b)/i.test(command);
    return respond(state, command, switches ? `Switched to a new branch '${name}'` : `Created branch '${name}'`, switches
      ? "The new branch initially points to the same commit as main. New commits will move only this branch label."
      : "git branch creates a label but does not switch HEAD to it.", {
      branches,
      head: switches ? name : state.head,
      task: switches ? taskAfter(state, 1) : state.task,
    });
  }

  const switchBranch = command.match(/^git (?:switch|checkout) ([a-z0-9._/-]+)$/i);
  if (switchBranch) {
    const name = switchBranch[1];
    if (!state.branches[name]) return respond(state, command, `error: pathspec '${name}' did not match a branch`, "Git cannot move HEAD to a branch that does not exist.");
    if (state.working.length || state.staged.length) {
      return respond(state, command, "error: commit or clear your changes before switching branches", "This guard keeps uncommitted work from being overwritten by another snapshot.");
    }
    return respond(state, command, `Switched to branch '${name}'`, "HEAD moved, and the working tree now represents the commit targeted by this branch.", {
      head: name,
      task: name === "main" ? taskAfter(state, 5) : state.task,
    });
  }

  const edit = command.match(/^edit ([a-z0-9._/-]+)$/i);
  if (edit) {
    const file = edit[1];
    const working = [...new Set([...state.working, file])];
    return respond(state, command, `modified: ${file}`, "You changed the working tree only. Git has not staged or committed the change yet.", {
      working,
      task: taskAfter(state, 2),
    });
  }

  const add = command.match(/^git add (.+)$/i);
  if (add) {
    const target = add[1].trim();
    const selected = target === "." ? state.working : state.working.filter((file) => file === target);
    if (!selected.length) return respond(state, command, `nothing matched '${target}'`, "git add can stage only changes that exist in the working tree.");
    return respond(state, command, `staged: ${selected.join(", ")}`, "The selected changes moved into the staging area—the exact draft for the next commit.", {
      working: state.working.filter((file) => !selected.includes(file)),
      staged: [...new Set([...state.staged, ...selected])],
      task: taskAfter(state, 3),
    });
  }

  const commit = command.match(/^git commit -m\s+["']?(.+?)["']?$/i);
  if (commit) {
    if (!state.staged.length) return respond(state, command, "nothing to commit; stage a change first", "A commit records the staging area, not every changed file automatically.");
    const id = `c${String(state.nextCommit).padStart(3, "0")}`;
    const parent = state.branches[state.head];
    const message = commit[1].replace(/["']$/, "");
    const commits = [...state.commits, { id, parents: [parent], message, lane: state.head === "main" ? 0 : 1 }];
    return respond(state, command, `[${state.head} ${id}] ${message}`, "Git created a snapshot linked to its parent, then moved the current branch label to the new commit.", {
      commits,
      branches: { ...state.branches, [state.head]: id },
      staged: [],
      nextCommit: state.nextCommit + 1,
      task: taskAfter(state, 4),
    });
  }

  const merge = command.match(/^git merge ([a-z0-9._/-]+)$/i);
  if (merge) {
    const source = merge[1];
    if (!state.branches[source]) return respond(state, command, `merge: ${source} - not something we can merge`, "The source must name an existing branch.");
    if (source === state.head) return respond(state, command, "Already up to date.", "A branch already contains its own history, so merging it into itself changes nothing.");
    const id = `c${String(state.nextCommit).padStart(3, "0")}`;
    const commits = [...state.commits, { id, parents: [state.branches[state.head], state.branches[source]], message: `merge ${source}`, lane: 0 }];
    return respond(state, command, `Merge made by the simulation: ${source} → ${state.head}`, "The merge commit has two parents. That is how Git records where two lines of history joined.", {
      commits,
      branches: { ...state.branches, [state.head]: id },
      nextCommit: state.nextCommit + 1,
      task: taskAfter(state, 6),
    });
  }

  if (lower === "git log" || lower === "git log --oneline" || lower === "git log --graph") {
    return respond(state, command, gitLogLines(state), "The newest commit appears first. Each commit points backward to its parent or parents.", { task: taskAfter(state, 7) });
  }

  return respond(state, command, [`git: '${command}' is not simulated yet`, "Type help to see the safe commands available here."], "This sandbox never runs commands against your real repository.");
}
