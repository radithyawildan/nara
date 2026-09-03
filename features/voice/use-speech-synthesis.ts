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
  voiceURI?: string | null;
}

export function useSpeechSynthesis({
  language = "id-ID",
  rate = 1,
  pitch = 1,
  volume = 1,
  voiceURI = null,
}: UseSpeechSynthesisOptions = {}) {
  const [isSpeaking, setIsSpeaking] = useState(false);

  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);

  const speechIdRef = useRef(0);

  const activeResolveRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    if (!isSpeechSynthesisSupported()) {
      return;
    }

    const speechSynthesis = window.speechSynthesis;

    function updateVoices() {
      setVoices(speechSynthesis.getVoices());
    }

    speechSynthesis.addEventListener("voiceschanged", updateVoices);

    // Run asynchronously so React's
    // set-state-in-effect rule remains happy.
    const initialLoad = window.setTimeout(updateVoices, 0);

    return () => {
      window.clearTimeout(initialLoad);

      speechSynthesis.removeEventListener("voiceschanged", updateVoices);
    };
  }, []);

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

        // Invalidate previous speech.
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

        const selectedVoice =
          voices.find((voice) => voice.voiceURI === voiceURI) ??
          findPreferredVoice(language);

        if (selectedVoice) {
          utterance.voice = selectedVoice;
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
    [language, pitch, rate, voiceURI, voices, volume],
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
    voices,
    speak,
    cancel,
  };
}
