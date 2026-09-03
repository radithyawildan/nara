"use client";

import { motion } from "framer-motion";

import type { AvatarState } from "@/types/avatar";

interface NaraAvatarProps {
  state: AvatarState;
}

const stateLabel: Record<AvatarState, string> = {
  idle: "Ready",
  listening: "Listening...",
  transcribing: "Understanding...",
  thinking: "Thinking...",
  speaking: "Speaking...",
  error: "Something went wrong",
};

export function NaraAvatar({ state }: NaraAvatarProps) {
  const isActive = state !== "idle" && state !== "error";

  return (
    <div className="flex flex-col items-center gap-6">
      <div className="relative flex h-72 w-72 items-center justify-center">
        <motion.div
          aria-hidden
          className="absolute h-56 w-56 rounded-full bg-violet-500/20 blur-3xl"
          animate={{
            scale: isActive ? [1, 1.16, 1] : [1, 1.05, 1],
            opacity: isActive ? [0.35, 0.7, 0.35] : [0.2, 0.35, 0.2],
          }}
          transition={{
            duration: isActive ? 1.4 : 3.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <motion.div
          className="relative flex h-44 w-44 items-center justify-center rounded-[3rem] border border-white/10 bg-slate-950 shadow-2xl shadow-violet-500/20"
          animate={{
            y: state === "idle" ? [0, -6, 0] : 0,
            scale: state === "speaking" ? [1, 1.025, 1] : 1,
          }}
          transition={{
            duration: state === "speaking" ? 0.7 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          <div className="flex gap-8">
            <motion.div
              className="h-12 w-4 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/50"
              animate={{
                scaleY: state === "listening" ? [1, 0.7, 1] : 1,
              }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <motion.div
              className="h-12 w-4 rounded-full bg-cyan-300 shadow-lg shadow-cyan-300/50"
              animate={{
                scaleY: state === "listening" ? [1, 0.7, 1] : 1,
              }}
              transition={{
                duration: 0.8,
                delay: 0.12,
                repeat: Infinity,
              }}
            />
          </div>

          <motion.div
            className="absolute bottom-10 h-2 rounded-full bg-cyan-300"
            animate={{
              width: state === "speaking" ? [20, 42, 26, 48, 20] : 28,
              height: state === "speaking" ? [8, 16, 10, 18, 8] : 8,
            }}
            transition={{
              duration: 0.8,
              repeat: state === "speaking" ? Infinity : 0,
            }}
          />
        </motion.div>
      </div>

      <div className="text-center">
        <p className="text-sm font-medium tracking-[0.18em] text-violet-300 uppercase">
          {state}
        </p>
        <p className="mt-2 text-lg text-white">{stateLabel[state]}</p>
      </div>
    </div>
  );
}
