export default function Loading() {
  return (
    <main className="grid min-h-dvh place-items-center bg-[#050714] text-white">
      <div className="text-center">
        <div className="mx-auto grid h-14 w-14 place-items-center rounded-[1.25rem] border border-violet-400/20 bg-violet-500/10 text-lg font-semibold text-violet-200">
          N
        </div>
        <p className="mt-4 text-xs font-medium tracking-[0.2em] text-slate-500 uppercase">
          NARA
        </p>
        <p className="mt-2 text-[10px] text-slate-700">
          Preparing your workspace...
        </p>
      </div>
    </main>
  );
}
