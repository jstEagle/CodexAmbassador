const ESC = "\u001b[";

export class TerminalSession {
  constructor({ input = process.stdin, output = process.stdout } = {}) {
    this.input = input;
    this.output = output;
    this.active = false;
    this.wasRaw = false;
    this.previousLines = null;
  }

  enter() {
    if (this.active) return;
    this.active = true;
    this.wasRaw = Boolean(this.input.isRaw);
    if (this.input.setRawMode) this.input.setRawMode(true);
    this.input.resume();
    this.previousLines = null;
    this.output.write(`${ESC}?1049h${ESC}?25l${ESC}?7l${ESC}2J${ESC}H`);
  }

  draw(frame) {
    if (!this.active) return;
    const lines = frame.split("\n");
    if (!this.previousLines || this.previousLines.length !== lines.length) {
      this.output.write(`${ESC}?2026h${ESC}H${frame}${ESC}?2026l`);
      this.previousLines = lines;
      return;
    }
    const changed = [];
    for (let index = 0; index < lines.length; index += 1) {
      if (lines[index] !== this.previousLines[index]) changed.push(index);
    }
    if (changed.length === 0) return;
    let update = `${ESC}?2026h`;
    for (const index of changed) update += `${ESC}${index + 1};1H${lines[index]}`;
    update += `${ESC}?2026l`;
    this.output.write(update);
    this.previousLines = lines;
  }

  leave() {
    if (!this.active) return;
    this.active = false;
    if (this.input.setRawMode) this.input.setRawMode(this.wasRaw);
    this.input.pause();
    this.previousLines = null;
    this.output.write(`${ESC}0m${ESC}?25h${ESC}?7h${ESC}?1049l`);
  }
}

const ESCAPE_KEYS = [
  ["\u001b[3~", "delete"],
  ["\u001b[D", "left"],
  ["\u001b[C", "right"],
  ["\u001b[H", "home"],
  ["\u001b[F", "end"],
];

export function decodeKeys(data) {
  const input = data.toString("utf8");
  const events = [];
  let index = 0;
  while (index < input.length) {
    const remainder = input.slice(index);
    const escape = ESCAPE_KEYS.find(([sequence]) => remainder.startsWith(sequence));
    if (escape) {
      events.push(escape[1]);
      index += escape[0].length;
      continue;
    }

    const character = input[index];
    if (character === "\u0003") events.push("quit");
    else if (character === "\u001b") events.push("clear");
    else if (character === "\r" || character === "\n") events.push("submit");
    else if (character === "\u007f" || character === "\b") events.push("backspace");
    else if (character === "\u0001") events.push("home");
    else if (character === "\u0005") events.push("end");
    else {
      let stop = index;
      while (stop < input.length && !/[\u0000-\u001f\u007f]/.test(input[stop])) stop += 1;
      if (stop > index) {
        events.push({ type: "text", value: input.slice(index, stop) });
        index = stop;
        continue;
      }
      events.push("unknown");
    }
    index += 1;
  }
  return events;
}

export function decodeKey(data) {
  return decodeKeys(data)[0] ?? "unknown";
}
