import type { AIProvider, AIStreamOptions } from "@/lib/ai/provider";
import type { ChatMessage } from "@/types/conversation";

function ensureNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Request aborted", "AbortError");
  }
}

export class MockProvider implements AIProvider {
  readonly id = "mock";

  async *stream(
    messages: ChatMessage[],
    options?: AIStreamOptions,
  ): AsyncIterable<string> {
    const latestUserMessage =
      [...messages].reverse().find((message) => message.role === "user")
        ?.content ?? "Hello";

    const response =
      `Halo! Aku NARA. Untuk sementara aku sedang berjalan menggunakan ` +
      `development provider. Pesan terakhirmu adalah: "${latestUserMessage}". ` +
      `Kalau teks ini muncul secara bertahap, berarti streaming pipeline NARA sudah bekerja.`;

    const chunks = response.split(/(\s+)/);

    for (const chunk of chunks) {
      ensureNotAborted(options?.signal);

      await new Promise((resolve) => {
        setTimeout(resolve, 35);
      });

      yield chunk;
    }
  }
}
