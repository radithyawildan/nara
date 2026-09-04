"use client";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#050714] p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-red-400/10 bg-white/[0.02] p-6 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-red-400/15 bg-red-400/[0.05] text-red-300">
          !
        </div>
        <h1 className="mt-5 text-lg font-semibold">
          NARA hit an unexpected error
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Your saved conversations and cloud data are not deleted. Retry the
          current view, or reload if the problem continues.
        </p>

        {process.env.NODE_ENV === "development" && (
          <p className="mt-4 rounded-xl bg-black/15 px-3 py-2 text-left font-mono text-[9px] leading-4 text-red-300/60">
            {error.message}
          </p>
        )}

        <div className="mt-5 flex justify-center gap-2">
          <button
            type="button"
            onClick={reset}
            className="rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs text-violet-100"
          >
            Try again
          </button>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="rounded-xl border border-white/[0.07] px-4 py-2 text-xs text-slate-400"
          >
            Reload
          </button>
        </div>
      </section>
    </main>
  );
}
