import { readFile } from "node:fs/promises";

const CONFIG_URL = new URL("../cli.config.json", import.meta.url);
const REQUIRED_COLORS = [
  "background",
  "panel",
  "panelRaised",
  "text",
  "muted",
  "accent",
  "secondary",
  "danger",
  "success",
];

export async function loadConfig(url = CONFIG_URL) {
  const config = JSON.parse(await readFile(url, "utf8"));
  validateConfig(config);
  return config;
}

export function validateConfig(config) {
  if (!config || typeof config !== "object") throw new Error("Configuration must be an object.");
  for (const key of ["title", "subtitle"]) {
    if (typeof config[key] !== "string" || config[key].trim() === "") {
      throw new Error(`Configuration field ${key} must be a non-empty string.`);
    }
  }
  if (!config.minimumTerminal || config.minimumTerminal.columns < 60 || config.minimumTerminal.rows < 18) {
    throw new Error("minimumTerminal must be at least 60 columns by 18 rows.");
  }
  if (!config.openai || !/^https:\/\//.test(config.openai.endpoint ?? "")) {
    throw new Error("openai.endpoint must be an HTTPS URL.");
  }
  if (typeof config.openai.model !== "string" || !config.openai.model.trim()) {
    throw new Error("openai.model must be a non-empty string.");
  }
  if (!["none", "low", "medium", "high", "xhigh", "max"].includes(config.openai.reasoningEffort)) {
    throw new Error("openai.reasoningEffort is invalid.");
  }
  if (!["low", "medium", "high"].includes(config.openai.verbosity)) {
    throw new Error("openai.verbosity is invalid.");
  }
  if (!Number.isInteger(config.openai.maxOutputTokens) || config.openai.maxOutputTokens < 1) {
    throw new Error("openai.maxOutputTokens must be a positive integer.");
  }
  if (!Number.isInteger(config.openai.timeoutMs) || config.openai.timeoutMs < 1000) {
    throw new Error("openai.timeoutMs must be at least 1000.");
  }
  if (!config.space || config.space.fps < 1 || config.space.fps > 30) {
    throw new Error("space.fps must be between 1 and 30.");
  }
  if (config.space.ambient < 0 || config.space.ambient > 1) {
    throw new Error("space.ambient must be between 0 and 1.");
  }
  if (!Array.isArray(config.space.spheres) || config.space.spheres.length === 0) {
    throw new Error("space.spheres must contain at least one sphere.");
  }
  for (const [index, sphere] of config.space.spheres.entries()) {
    if (!Array.isArray(sphere.position) || sphere.position.length !== 3) {
      throw new Error(`space.spheres[${index}].position must be a three-number vector.`);
    }
    if (!Array.isArray(sphere.orbit) || sphere.orbit.length !== 3) {
      throw new Error(`space.spheres[${index}].orbit must be a three-number vector.`);
    }
    if (!(sphere.radius > 0) || !/^#[0-9a-f]{6}$/i.test(sphere.color ?? "")) {
      throw new Error(`space.spheres[${index}] must have a positive radius and #RRGGBB color.`);
    }
    if (!Array.isArray(sphere.craters)) {
      throw new Error(`space.spheres[${index}].craters must be an array.`);
    }
    for (const [craterIndex, crater] of sphere.craters.entries()) {
      if (!Array.isArray(crater.direction) || crater.direction.length !== 3) {
        throw new Error(`space.spheres[${index}].craters[${craterIndex}].direction must be a three-number vector.`);
      }
      if (!(crater.radius > 0 && crater.radius <= 1) || !(crater.depth > 0 && crater.depth <= 0.25)) {
        throw new Error(`space.spheres[${index}].craters[${craterIndex}] has an invalid radius or depth.`);
      }
    }
  }
  for (const [name, theme] of [
    ["theme", config.theme],
    ["modes.git.theme", config.modes?.git?.theme],
    ["modes.llm.theme", config.modes?.llm?.theme],
  ]) {
    for (const key of REQUIRED_COLORS) {
      if (!/^#[0-9a-f]{6}$/i.test(theme?.[key] ?? "")) {
        throw new Error(`${name}.${key} must use #RRGGBB format.`);
      }
    }
  }
  return config;
}
