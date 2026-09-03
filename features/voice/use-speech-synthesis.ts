"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import {
  findPreferredVoice,
  isSpeechSynthesisSupported,
  normalizeTextForSpeech,
} from "@/lib/voice/browser-speech-synthesis";

interface SpeakCallbacks {
  onStart?: () => void;
}

interface UseSpeechSynthesisOptions {
  language?: string;
  rate?: number;
  pitch?: number;
  volume?: number;
}

export function useSpeechSynthesis({
  language = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const speechIdRef = useRef(0);

  const activeResolveRef = useRef<(() => void) | null>(null);

  const cancel = useCallback(() => {
    speechIdRef.current += 1;

    if (isSpeechSynthesisSupported()) {
      window.speechSynthesis.cancel();
    }

    const resolve = activeResolveRef.current;

    activeResolveRef.current = null;

    resolve?.();

    setIsSpeaking(false);
  }, []);

  const speak = useCallback(
    (input: string, callbacks?: SpeakCallbacks) => {
      return new Promise<void>((resolve, reject) => {
        if (!isSpeechSynthesisSupported()) {
          reject(
            new Error("Speech synthesis is not supported by this browser."),
          );

          return;
        }

        const text = normalizeTextForSpeech(input);

        if (!text) {
          resolve();
          return;
        }

        // Stop a previous utterance before starting a new one.
        speechIdRef.current += 1;

        window.speechSynthesis.cancel();

        activeResolveRef.current?.();
        activeResolveRef.current = null;

        const speechId = speechIdRef.current;

        const utterance = new SpeechSynthesisUtterance(text);

        utterance.lang = language;
        utterance.rate = rate;
        utterance.pitch = pitch;
        utterance.volume = volume;

        const preferredVoice = findPreferredVoice(language);

        if (preferredVoice) {
          utterance.voice = preferredVoice;
        }

        activeResolveRef.current = resolve;

        utterance.onstart = () => {
          if (speechId !== speechIdRef.current) {
            return;
          }

          setIsSpeaking(true);
          callbacks?.onStart?.();
        };

        utterance.onend = () => {
          if (speechId !== speechIdRef.current) {
            return;
          }

          activeResolveRef.current = null;

          setIsSpeaking(false);

          resolve();
        };

        utterance.onerror = (event) => {
          if (speechId !== speechIdRef.current) {
            return;
          }

          activeResolveRef.current = null;

          setIsSpeaking(false);

          if (event.error === "canceled" || event.error === "interrupted") {
            resolve();
            return;
          }

          reject(new Error(`Speech synthesis failed: ${event.error}`));
        };

        window.speechSynthesis.speak(utterance);
      });
    },
    [language, pitch, rate, volume],
  );

  useEffect(() => {
    return () => {
      speechIdRef.current += 1;

      if (isSpeechSynthesisSupported()) {
        window.speechSynthesis.cancel();
      }

      activeResolveRef.current?.();
      activeResolveRef.current = null;
    };
  }, []);

  return {
    isSpeaking,
    speak,
    cancel,
  };
}
