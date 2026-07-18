"use client";

import { useEffect, useRef } from "react";
import { renderSpaceField } from "@/lib/space";
import { SPACE_CONFIG, THEME, WEB_SPACE_CONFIG } from "@/lib/space-config";

interface Star {
  x: number;
  y: number;
  char: string;
  alpha: number;
}

function makeStars(columns: number, rows: number): Star[] {
  const glyphs = [".", "·", "*"];
  return Array.from({ length: WEB_SPACE_CONFIG.starCount }, () => ({
    x: Math.floor(Math.random() * columns),
    y: Math.floor(Math.random() * rows),
    char: glyphs[Math.floor(Math.random() * glyphs.length)],
    alpha: 0.15 + Math.random() * 0.35,
  }));
}

export default function SpaceBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let columns = WEB_SPACE_CONFIG.columns;
    let rows = 40;
    let cellWidth = 10;
    let cellHeight = 20;
    let dpr = 1;
    let stars = makeStars(columns, rows);
    let raf = 0;
    let lastFrame = 0;
    const start = performance.now();
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    function resize() {
      if (!canvas) return;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = window.innerWidth;
      const height = window.innerHeight;
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx?.setTransform(dpr, 0, 0, dpr, 0, 0);

      cellWidth = width / WEB_SPACE_CONFIG.columns;
      cellHeight = cellWidth * 2.05;
      columns = WEB_SPACE_CONFIG.columns;
      rows = Math.max(1, Math.ceil(height / cellHeight));
      stars = makeStars(columns, rows);
      ctx!.font = `${Math.ceil(cellHeight * 0.92)}px "Geist Mono", ui-monospace, monospace`;
      ctx!.textBaseline = "middle";
    }

    function draw(time: number) {
      if (!ctx || !canvas) return;
      const width = canvas.width / dpr;
      const height = canvas.height / dpr;
      ctx.fillStyle = THEME.background;
      ctx.fillRect(0, 0, width, height);

      for (const star of stars) {
        ctx.globalAlpha = star.alpha;
        ctx.fillStyle = THEME.muted;
        ctx.fillText(star.char, star.x * cellWidth, star.y * cellHeight + cellHeight / 2);
      }
      ctx.globalAlpha = 1;

      const field = renderSpaceField(columns, rows, time, SPACE_CONFIG);
      for (let row = 0; row < field.length; row += 1) {
        const line = field[row];
        for (let column = 0; column < line.length; column += 1) {
          const cell = line[column];
          if (cell.char === " " || !cell.color) continue;
          ctx.fillStyle = cell.color;
          ctx.fillText(cell.char, column * cellWidth, row * cellHeight + cellHeight / 2);
        }
      }
    }

    function loop(now: number) {
      raf = requestAnimationFrame(loop);
      if (now - lastFrame < 1000 / WEB_SPACE_CONFIG.fps) return;
      lastFrame = now;
      draw((now - start) / 1000);
    }

    resize();
    window.addEventListener("resize", resize);

    if (reduceMotion) {
      draw(0);
    } else {
      raf = requestAnimationFrame(loop);
    }

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="pointer-events-none fixed inset-0 -z-10 h-full w-full"
    />
  );
}
