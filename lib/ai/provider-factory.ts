import type { AIProvider } from "@/lib/ai/provider";
import { GeminiProvider } from "@/lib/ai/providers/gemini-provider";
import { MockProvider } from "@/lib/ai/providers/mock-provider";
import { OpenAIProvider } from "@/lib/ai/providers/openai-provider";

export function getAIProvider(): AIProvider {
  const provider = process.env.NARA_AI_PROVIDER?.trim().toLowerCase() ?? "mock";

  switch (provider) {
    case "mock":
      return new MockProvider();

    case "gemini": {
      const apiKey = process.env.GEMINI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "GEMINI_API_KEY is required when NARA_AI_PROVIDER=gemini.",
        );
      }

      return new GeminiProvider({
        apiKey,
        model: process.env.GEMINI_MODEL ?? "gemini-3.7-flash",
      });
    }

    case "openai": {
      const apiKey = process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error(
          "OPENAI_API_KEY is required when NARA_AI_PROVIDER=openai.",
        );
      }

      return new OpenAIProvider({
        apiKey,
        model: process.env.OPENAI_MODEL ?? "gpt-5.6-luna",
      });
    }

    default:
      throw new Error(`Unsupported NARA AI provider: ${provider}`);
  }
}
