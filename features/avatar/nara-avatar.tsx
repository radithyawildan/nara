"use client";

import { motion, useReducedMotion } from "framer-motion";

import type { AvatarState } from "@/types/avatar";

interface NaraAvatarProps {
  state: AvatarState;
}

interface StateVisual {
  label: string;
  description: string;
  accent: string;
  glow: string;
}

const stateVisuals: Record<AvatarState, StateVisual> = {
  idle: {
    label: "Ready",
    description: "Ask me anything.",
    accent: "text-violet-300",
    glow: "bg-violet-500/20",
  },

  listening: {
    label: "Listening",
    description: "I'm listening to you.",
    accent: "text-cyan-300",
    glow: "bg-cyan-400/25",
  },

  transcribing: {
    label: "Understanding",
    description: "Turning your voice into words.",
    accent: "text-sky-300",
    glow: "bg-sky-400/20",
  },

  thinking: {
    label: "Thinking",
    description: "Working on your response.",
    accent: "text-fuchsia-300",
    glow: "bg-fuchsia-500/20",
  },

  speaking: {
    label: "Speaking",
    description: "Here's what I found.",
    accent: "text-emerald-300",
    glow: "bg-emerald-400/20",
  },

  error: {
    label: "Oops",
    description: "Something didn't go as planned.",
    accent: "text-red-300",
    glow: "bg-red-500/20",
  },
};

function getEyeColor(state: AvatarState) {
  if (state === "error") {
    return "bg-red-300 shadow-red-300/40";
  }

  if (state === "speaking") {
    return "bg-emerald-200 shadow-emerald-300/50";
  }

  return "bg-cyan-200 shadow-cyan-300/50";
}

function Face({
  state,
  reduceMotion,
}: {
  state: AvatarState;
  reduceMotion: boolean | null;
}) {
  const thinking = state === "thinking";

  return (
    <div className="relative flex h-full w-full flex-col items-center justify-center">
      <motion.div
        className="flex gap-8"
        animate={{
          x: thinking ? 5 : 0,
          y: state === "error" ? 5 : thinking ? -3 : 0,
          scale: state === "listening" ? 1.08 : state === "error" ? 0.9 : 1,
        }}
        transition={{
          type: "spring",
          stiffness: 180,
          damping: 18,
        }}
      >
        {[0, 1].map((eye) => (
          <motion.div
            key={eye}
            className={`w-4 rounded-full shadow-lg ${getEyeColor(state)}`}
            animate={
              reduceMotion
                ? {
                    height: 42,
                  }
                : state === "error"
                  ? {
                      height: 22,
                    }
                  : {
                      height: [42, 42, 4, 42, 42],
                    }
            }
            transition={{
              duration: 0.2,
              repeat: state === "error" ? 0 : Infinity,
              repeatDelay: eye === 0 ? 3.2 : 3.23,
              times: [0, 0.35, 0.5, 0.65, 1],
            }}
          />
        ))}
      </motion.div>

      <div className="mt-8 flex h-6 items-center justify-center">
        {state === "speaking" ? (
          <motion.div
            className="rounded-full bg-emerald-200 shadow-lg shadow-emerald-300/30"
            animate={{
              width: [22, 38, 26, 44, 30, 22],
              height: [7, 17, 10, 19, 12, 7],
            }}
            transition={{
              duration: 0.72,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          />
        ) : state === "error" ? (
          <motion.div
            className="h-5 w-9 rounded-t-full border-t-2 border-red-300"
            animate={{
              y: 4,
            }}
          />
        ) : (
          <motion.div
            className="h-2 rounded-full bg-cyan-200/80"
            animate={{
              width:
                state === "thinking"
                  ? [25, 31, 25]
                  : state === "listening"
                    ? [27, 34, 27]
                    : 28,
            }}
            transition={{
              duration: 1.5,
              repeat:
                state === "thinking" || state === "listening" ? Infinity : 0,
              ease: "easeInOut",
            }}
          />
        )}
      </div>
    </div>
  );
}

export function NaraAvatar({ state }: NaraAvatarProps) {
  const reduceMotion = useReducedMotion();

  const visual = stateVisuals[state];

  const active = state !== "idle" && state !== "error";

  return (
    <div
      className="flex flex-col items-center gap-5"
      aria-label={`NARA is ${visual.label.toLowerCase()}`}
    >
      <div className="relative flex h-[22rem] w-[22rem] items-center justify-center sm:h-[24rem] sm:w-[24rem]">
        {/* Main ambient glow */}
        <motion.div
          aria-hidden="true"
          className={`absolute h-60 w-60 rounded-full blur-3xl ${visual.glow}`}
          animate={
            reduceMotion
              ? undefined
              : {
                  scale: active ? [1, 1.22, 1] : [1, 1.08, 1],

                  opacity: active ? [0.3, 0.68, 0.3] : [0.18, 0.38, 0.18],
                }
          }
          transition={{
            duration: active ? 1.4 : 3.8,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        {/* Outer orbit */}
        <motion.div
          aria-hidden="true"
          className="absolute h-72 w-72 rounded-full border border-violet-300/10"
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: 360,
                }
          }
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: "linear",
          }}
        >
          <div className="absolute left-1/2 top-[-4px] h-2 w-2 -translate-x-1/2 rounded-full bg-violet-300/70 shadow-lg shadow-violet-300/70" />

          <div className="absolute bottom-9 right-4 h-1.5 w-1.5 rounded-full bg-cyan-300/70 shadow-lg shadow-cyan-300/60" />
        </motion.div>

        {/* Inner orbit */}
        <motion.div
          aria-hidden="true"
          className="absolute h-60 w-60 rounded-full border border-cyan-300/[0.08]"
          animate={
            reduceMotion
              ? undefined
              : {
                  rotate: -360,
                }
          }
          transition={{
            duration: 14,
            repeat: Infinity,
            ease: "linear",
          }}
        />

        {/* Listening waveform */}
        {state === "listening" && (
          <div
            aria-hidden="true"
            className="absolute left-4 top-16 flex h-12 items-center gap-1"
          >
            {[14, 28, 20, 34, 16].map((height, index) => (
              <motion.span
                key={`${height}-${index}`}
                className="w-1 rounded-full bg-cyan-300"
                animate={{
                  height: [height * 0.4, height, height * 0.5],
                }}
                transition={{
                  duration: 0.65,
                  repeat: Infinity,
                  delay: index * 0.08,
                }}
              />
            ))}
          </div>
        )}

        {/* Thinking bubble */}
        {state === "thinking" && (
          <motion.div
            aria-hidden="true"
            className="absolute right-5 top-12 flex gap-1.5 rounded-full border border-white/10 bg-[#090b18]/80 px-3 py-2 backdrop-blur"
            initial={{
              opacity: 0,
              scale: 0.8,
            }}
            animate={{
              opacity: 1,
              scale: 1,
            }}
          >
            {[0, 1, 2].map((index) => (
              <motion.span
                key={index}
                className="h-1.5 w-1.5 rounded-full bg-fuchsia-300"
                animate={{
                  y: [0, -5, 0],
                  opacity: [0.4, 1, 0.4],
                }}
                transition={{
                  duration: 0.9,
                  repeat: Infinity,
                  delay: index * 0.15,
                }}
              />
            ))}
          </motion.div>
        )}

        {/* Whole mascot */}
        <motion.div
          className="relative flex flex-col items-center"
          animate={
            reduceMotion
              ? undefined
              : {
                  y:
                    state === "idle"
                      ? [0, -7, 0]
                      : state === "listening"
                        ? [0, -3, 0]
                        : [0, -2, 0],

                  rotate: state === "thinking" ? [0, -1.2, 1.2, 0] : 0,
                }
          }
          transition={{
            duration: state === "thinking" ? 2.4 : 4,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        >
          {/* Antenna */}
          <div className="relative z-10 mb-[-5px] flex flex-col items-center">
            <motion.div
              className="h-3 w-3 rounded-full bg-violet-300 shadow-lg shadow-violet-300/60"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      opacity: [0.45, 1, 0.45],
                      scale: [0.9, 1.15, 0.9],
                    }
              }
              transition={{
                duration: state === "thinking" ? 0.8 : 2,
                repeat: Infinity,
              }}
            />

            <div className="h-4 w-[2px] bg-gradient-to-b from-violet-300/80 to-violet-300/10" />
          </div>

          {/* Head wrapper */}
          <div className="relative">
            {/* Left side pod */}
            <motion.div
              aria-hidden="true"
              className="absolute left-[-19px] top-14 h-16 w-8 rounded-l-3xl border border-cyan-300/10 bg-[#101426] shadow-lg shadow-cyan-500/10"
              animate={{
                x: state === "listening" ? [-2, -5, -2] : 0,
              }}
              transition={{
                duration: 1,
                repeat: state === "listening" ? Infinity : 0,
              }}
            >
              <div className="absolute right-1 top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-full bg-cyan-300/30" />
            </motion.div>

            {/* Right side pod */}
            <motion.div
              aria-hidden="true"
              className="absolute right-[-19px] top-14 h-16 w-8 rounded-r-3xl border border-cyan-300/10 bg-[#101426] shadow-lg shadow-cyan-500/10"
              animate={{
                x: state === "listening" ? [2, 5, 2] : 0,
              }}
              transition={{
                duration: 1,
                repeat: state === "listening" ? Infinity : 0,
              }}
            >
              <div className="absolute left-1 top-1/2 h-7 w-[2px] -translate-y-1/2 rounded-full bg-cyan-300/30" />
            </motion.div>

            {/* Head */}
            <motion.div
              className="relative flex h-44 w-48 items-center justify-center overflow-hidden rounded-[3.5rem] border border-white/10 bg-gradient-to-b from-[#151a2f] via-[#0b1020] to-[#080b15] shadow-2xl shadow-violet-500/20"
              animate={{
                scale: state === "speaking" ? [1, 1.012, 1] : 1,
              }}
              transition={{
                duration: 0.75,
                repeat: state === "speaking" ? Infinity : 0,
              }}
            >
              {/* Face glass */}
              <div className="absolute inset-2 rounded-[3rem] border border-cyan-300/[0.07] bg-black/15" />

              <div className="absolute left-7 top-4 h-14 w-24 rotate-[-10deg] rounded-full bg-white/[0.035] blur-md" />

              <Face state={state} reduceMotion={reduceMotion} />

              {/* chin glow */}
              <motion.div
                aria-hidden="true"
                className={`absolute bottom-[-20px] h-14 w-32 rounded-full blur-2xl ${visual.glow}`}
                animate={
                  reduceMotion
                    ? undefined
                    : {
                        opacity: [0.2, 0.65, 0.2],
                      }
                }
                transition={{
                  duration: state === "speaking" ? 0.8 : 2.5,
                  repeat: Infinity,
                }}
              />
            </motion.div>
          </div>

          {/* Neck */}
          <div className="z-10 mt-[-5px] h-5 w-12 rounded-b-xl border-x border-b border-white/10 bg-[#101426]" />

          {/* Body */}
          <motion.div
            className="relative mt-[-2px] flex h-28 w-32 items-center justify-center rounded-[2.5rem] rounded-t-[2rem] border border-white/10 bg-gradient-to-b from-[#171c35] to-[#0c1020] shadow-xl shadow-violet-500/10"
            animate={{
              scaleY: state === "idle" ? [1, 0.985, 1] : 1,
            }}
            transition={{
              duration: 3,
              repeat: Infinity,
              ease: "easeInOut",
            }}
          >
            {/* left arm */}
            <motion.div
              className="absolute left-[-21px] top-5 h-16 w-8 origin-top rounded-full border border-white/10 bg-gradient-to-b from-[#171c35] to-[#0d1122]"
              animate={{
                rotate:
                  state === "speaking"
                    ? [10, 2, 12, 4, 10]
                    : state === "listening"
                      ? 8
                      : 5,
              }}
              transition={{
                duration: 1.6,
                repeat: state === "speaking" ? Infinity : 0,
              }}
            />

            {/* right arm */}
            <motion.div
              className="absolute right-[-21px] top-5 h-16 w-8 origin-top rounded-full border border-white/10 bg-gradient-to-b from-[#171c35] to-[#0d1122]"
              animate={{
                rotate:
                  state === "speaking"
                    ? [-10, -2, -12, -4, -10]
                    : state === "listening"
                      ? -8
                      : -5,
              }}
              transition={{
                duration: 1.6,
                repeat: state === "speaking" ? Infinity : 0,
              }}
            />

            {/* chest core */}
            <motion.div
              className="grid h-14 w-14 place-items-center rounded-2xl border border-violet-300/20 bg-violet-400/[0.08] text-xl font-semibold text-violet-200 shadow-lg shadow-violet-500/20"
              animate={
                reduceMotion
                  ? undefined
                  : {
                      boxShadow: [
                        "0 0 18px rgba(139,92,246,0.15)",
                        "0 0 32px rgba(139,92,246,0.4)",
                        "0 0 18px rgba(139,92,246,0.15)",
                      ],
                    }
              }
              transition={{
                duration: state === "thinking" ? 1 : 2.5,
                repeat: Infinity,
              }}
            >
              N
            </motion.div>

            {/* bottom body highlight */}
            <div className="absolute bottom-2 h-1 w-12 rounded-full bg-cyan-300/10" />
          </motion.div>

          {/* tiny feet */}
          <div className="mt-[-3px] flex gap-7">
            <div className="h-5 w-8 rounded-b-2xl border border-white/10 bg-[#0d1122]" />
            <div className="h-5 w-8 rounded-b-2xl border border-white/10 bg-[#0d1122]" />
          </div>
        </motion.div>

        {/* Ground platform */}
        <motion.div
          aria-hidden="true"
          className="absolute bottom-1 h-5 w-44 rounded-full border border-violet-400/10 bg-violet-500/[0.06] blur-[1px]"
          animate={
            reduceMotion
              ? undefined
              : {
                  scaleX: [0.82, 1.06, 0.82],
                  opacity: [0.25, 0.5, 0.25],
                }
          }
          transition={{
            duration: 3.6,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />

        <div
          aria-hidden="true"
          className="absolute bottom-2 h-6 w-36 rounded-full bg-violet-500/10 blur-xl"
        />
      </div>

      {/* Status */}
      <motion.div
        key={state}
        initial={{
          opacity: 0,
          y: 6,
        }}
        animate={{
          opacity: 1,
          y: 0,
        }}
        className="text-center"
      >
        <div className="flex items-center justify-center gap-2">
          <motion.span
            className={`h-1.5 w-1.5 rounded-full ${
              state === "error"
                ? "bg-red-300"
                : state === "speaking"
                  ? "bg-emerald-300"
                  : state === "listening"
                    ? "bg-cyan-300"
                    : "bg-violet-300"
            }`}
            animate={
              reduceMotion
                ? undefined
                : {
                    opacity: [0.4, 1, 0.4],
                  }
            }
            transition={{
              duration: 1.2,
              repeat: Infinity,
            }}
          />

          <p
            className={`text-xs font-medium tracking-[0.2em] uppercase ${visual.accent}`}
          >
            {state}
          </p>
        </div>

        <p className="mt-2 text-lg font-medium text-white">{visual.label}</p>

        <p className="mt-1 text-sm text-slate-500">{visual.description}</p>
      </motion.div>
    </div>
  );
}
