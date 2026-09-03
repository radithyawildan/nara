"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

import {
  createSpeechRecognition,
  isSpeechRecognitionSupported,
  type SpeechRecognitionLike,
} from "@/lib/voice/browser-speech-recognition";

interface UseSpeechRecognitionOptions {
  language?: string;
  onStart?: () => void;
  onFinalTranscript: (transcript: string) => void;
  onEnd?: (hadFinalTranscript: boolean) => void;
  onError?: (message: string) => void;
}

function subscribeToBrowserSupport() {
  return () => {};
}

function getBrowserSupportSnapshot() {
  return isSpeechRecognitionSupported();
}

function getServerSupportSnapshot() {
  return false;
}

export function useSpeechRecognition({
  language = "id-ID",
  onStart,
  onFinalTranscript,
  onEnd,
  onError,
}: UseSpeechRecognitionOptions) {
  const recognitionRef = useRef<SpeechRecognitionLike | null>(null);

  const pendingFinalTranscriptRef = useRef<string | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [interimTranscript, setInterimTranscript] = useState("");

  const supported = useSyncExternalStore(
    subscribeToBrowserSupport,
    getBrowserSupportSnapshot,
    getServerSupportSnapshot,
  );

  const stop = useCallback(() => {
    recognitionRef.current?.stop();
  }, []);

  const abort = useCallback(() => {
    recognitionRef.current?.abort();
    recognitionRef.current = null;

    pendingFinalTranscriptRef.current = null;

    setIsListening(false);
    setInterimTranscript("");
  }, []);

  const start = useCallback(() => {
    if (!supported || isListening) {
      return;
    }

    const recognition = createSpeechRecognition();

    if (!recognition) {
      onError?.("Speech recognition is not supported by this browser.");

      return;
    }

    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = true;

    pendingFinalTranscriptRef.current = null;

    recognition.onstart = () => {
      setIsListening(true);
      setInterimTranscript("");

      onStart?.();
    };

    recognition.onresult = (event) => {
      let interim = "";
      let finalTranscript = "";

      for (
        let index = event.resultIndex;
        index < event.results.length;
        index += 1
      ) {
        const result = event.results[index];
        const transcript = result[0]?.transcript ?? "";

        if (result.isFinal) {
          finalTranscript += transcript;
        } else {
          interim += transcript;
        }
      }

      setInterimTranscript(interim);

      const normalizedFinalTranscript = finalTranscript.trim();

      if (normalizedFinalTranscript && !pendingFinalTranscriptRef.current) {
        pendingFinalTranscriptRef.current = normalizedFinalTranscript;

        setInterimTranscript("");

        // Important:
        // finish the browser speech-recognition session
        // before starting the NARA network request.
        recognition.stop();
      }
    };

    recognition.onerror = (event) => {
      if (event.error === "aborted" || event.error === "no-speech") {
        return;
      }

      onError?.(event.message || `Speech recognition failed: ${event.error}`);
    };

    recognition.onend = () => {
      const finalTranscript = pendingFinalTranscriptRef.current;

      pendingFinalTranscriptRef.current = null;
      recognitionRef.current = null;

      setIsListening(false);
      setInterimTranscript("");

      const hadFinalTranscript = Boolean(finalTranscript);

      onEnd?.(hadFinalTranscript);

      if (finalTranscript) {
        // Defer one browser task so the recognition session
        // is completely released before /api/chat begins.
        window.setTimeout(() => {
          onFinalTranscript(finalTranscript);
        }, 0);
      }
    };

    recognitionRef.current = recognition;

    try {
      recognition.start();
    } catch (error) {
      recognitionRef.current = null;
      pendingFinalTranscriptRef.current = null;

      setIsListening(false);
      setInterimTranscript("");

      onError?.(
        error instanceof Error
          ? error.message
          : "Unable to start speech recognition.",
      );
    }
  }, [
    isListening,
    language,
    onEnd,
    onError,
    onFinalTranscript,
    onStart,
    supported,
  ]);

  useEffect(() => {
    return () => {
      recognitionRef.current?.abort();
    };
  }, []);

  return {
    supported,
    isListening,
    interimTranscript,
    start,
    stop,
    abort,
  };
}
