import Link from "next/link";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#050714] p-6 text-white">
      <section className="w-full max-w-md rounded-[2rem] border border-white/[0.07] bg-white/[0.02] p-7 text-center">
        <div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl border border-violet-400/15 bg-violet-500/[0.07] font-mono text-xs text-violet-200">
          404
        </div>
        <h1 className="mt-5 text-lg font-semibold">
          This NARA route does not exist
        </h1>
        <p className="mt-2 text-xs leading-5 text-slate-600">
          Return to the conversation workspace and continue from there.
        </p>
        <Link
          href="/"
          className="mt-5 inline-flex rounded-xl border border-violet-400/20 bg-violet-500/10 px-4 py-2 text-xs font-medium text-violet-100 transition hover:bg-violet-500/20"
        >
          Back to NARA
        </Link>
      </section>
    </main>
  );
}
