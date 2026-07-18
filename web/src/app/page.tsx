export default function Home() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-6 py-16 text-foreground">
      <section className="w-full max-w-2xl rounded-3xl border border-black/10 bg-white p-8 shadow-sm sm:p-12 dark:border-white/10 dark:bg-zinc-950">
        <p className="font-mono text-xs font-medium tracking-[0.18em] text-zinc-500 uppercase dark:text-zinc-400">
          Codex Ambassador
        </p>
        <h1 className="mt-6 max-w-xl text-4xl font-semibold tracking-tight text-balance sm:text-5xl">
          The web workspace is ready.
        </h1>
        <p className="mt-5 max-w-lg text-base leading-7 text-zinc-600 sm:text-lg dark:text-zinc-400">
          A clean foundation for the Codex Ambassador experience, built with
          Next.js and ready for its next product direction.
        </p>
        <div className="mt-10 flex items-center gap-3 border-t border-black/10 pt-6 font-mono text-xs text-zinc-500 dark:border-white/10 dark:text-zinc-400">
          <span
            className="size-2 rounded-full bg-emerald-500"
            aria-hidden="true"
          />
          Next.js 16 · TypeScript · Vercel-ready
        </div>
      </section>
    </main>
  );
}
