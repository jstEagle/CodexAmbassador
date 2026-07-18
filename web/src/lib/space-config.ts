import type { SpaceConfig } from "./space";

export const WEB_SPACE_CONFIG = {
  columns: 130,
  fps: 10,
  starCount: 90,
} as const;

// Mirrors the "space" and "theme" blocks in cli/cli.config.json so the web
// background is the same scene as the CLI's home screen.
export const SPACE_CONFIG: SpaceConfig = {
  ambient: 0.09,
  lightSpeed: 0.16,
  spheres: [
    {
      position: [1.16, 0.36, 0.0],
      radius: 0.625,
      orbit: [0.06, 0.03, 0.06],
      speed: 0.13,
      phase: 0.0,
      rotation: 0.22,
      color: "#737B86",
      craters: [
        { direction: [-0.3, 0.28, 0.91], radius: 0.28, depth: 0.11 },
        { direction: [0.26, -0.22, 0.94], radius: 0.2, depth: 0.08 },
        { direction: [-0.48, -0.32, 0.82], radius: 0.13, depth: 0.055 },
      ],
    },
    {
      position: [-1.12, 0.42, -0.08],
      radius: 0.31,
      orbit: [0.08, 0.09, 0.05],
      speed: 0.1,
      phase: 2.2,
      rotation: -0.17,
      color: "#687A84",
      craters: [
        { direction: [0.34, 0.18, 0.92], radius: 0.27, depth: 0.1 },
        { direction: [-0.28, -0.3, 0.91], radius: 0.17, depth: 0.065 },
      ],
    },
    {
      position: [1.16, -0.74, 0.08],
      radius: 0.115,
      orbit: [0.14, 0.07, 0.04],
      speed: 0.17,
      phase: 4.1,
      rotation: 0.3,
      color: "#606974",
      craters: [{ direction: [-0.18, 0.12, 0.98], radius: 0.3, depth: 0.1 }],
    },
  ],
};

export const THEME = {
  background: "#0A0A0B",
  muted: "#5E626C",
} as const;
