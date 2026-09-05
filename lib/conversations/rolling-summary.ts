import { GoogleGenAI } from "@google/genai";

import type { ChatMessage } from "@/types/conversation";
import type { ConversationTopicState } from "@/types/conversation-context";

export interface RollingConversationState {
  summary: string;
  topicState: ConversationTopicState;
  source: "gemini" | "fallback";
}

const MAX_SUMMARY_LENGTH = 4_500;
const MAX_STATE_ITEM_LENGTH = 260;
const MAX_STATE_ITEMS = 6;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function truncate(value: string, limit: number) {
  const normalized = normalizeText(value);

  if (normalized.length <= limit) {
    return normalized;
  }

  const sliced = normalized.slice(0, limit - 3);
  const boundary = sliced.lastIndexOf(" ");

  return `${(boundary >= Math.floor(limit * 0.6)
    ? sliced.slice(0, boundary)
    : sliced
  ).trim()}...`;
}

function uniqueItems(values: string[]) {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const value of values) {
    const normalized = truncate(value, MAX_STATE_ITEM_LENGTH);

    if (!normalized) {
      continue;
    }

    const key = normalized.toLowerCase();

    if (seen.has(key)) {
      continue;
    }

    seen.add(key);
    result.push(normalized);

    if (result.length >= MAX_STATE_ITEMS) {
      break;
    }
  }

  return result;
}

function extractJsonObject(value: string) {
  const cleaned = value
    .replace(/^```(?:json)?/i, "")
    .replace(/```$/i, "")
    .trim();

  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");

  if (start === -1 || end === -1 || end <= start) {
    throw new Error("Conversation summary response did not contain JSON.");
  }

  return cleaned.slice(start, end + 1);
}

function sanitizeTopicState(value: unknown): ConversationTopicState {
  const candidate =
    value && typeof value === "object"
      ? (value as Record<string, unknown>)
      : {};

  const asStrings = (item: unknown) =>
    Array.isArray(item)
      ? uniqueItems(
          item.filter((entry): entry is string => typeof entry === "string"),
        )
      : [];

  return {
    currentTopic:
      typeof candidate.currentTopic === "string"
        ? truncate(candidate.currentTopic, 180) || null
        : null,
    lockedDecisions: asStrings(candidate.lockedDecisions),
    openLoops: asStrings(candidate.openLoops),
    userGoals: asStrings(candidate.userGoals),
  };
}

function looksLikeDecision(value: string) {
  return /\b(keputusan|kunci|gunakan|pakai|tetap|pilih|decided|decision|use|keep|choose|selected)\b/i.test(
    value,
  );
}

function looksLikeOpenLoop(value: string) {
  return (
    /\?$/.test(value.trim()) ||
    /\b(lanjut|nanti|belum|todo|next|later|pending|follow up|follow-up)\b/i.test(
      value,
    )
  );
}

function looksLikeGoal(value: string) {
  return /\b(ingin|mau|target|tujuan|goal|want|aim|need to|perlu)\b/i.test(
    value,
  );
}

export function buildFallbackConversationState(
  messages: ChatMessage[],
): RollingConversationState {
  const recent = messages.slice(-18);

  const summaryLines = recent.map((message) => {
    const role = message.role === "user" ? "User" : "NARA";
    const limit = message.role === "user" ? 360 : 240;

    return `- ${role}: ${truncate(message.content, limit)}`;
  });

  const latestUserMessage = [...messages]
    .reverse()
    .find((message) => message.role === "user");

  const userMessages = messages
    .filter((message) => message.role === "user")
    .map((message) => normalizeText(message.content))
    .filter(Boolean);

  const summary = truncate(
    [
      "Rolling conversation summary:",
      ...summaryLines,
      "",
      "This summary preserves continuity only. Current explicit user instructions override earlier context.",
    ].join("\n"),
    MAX_SUMMARY_LENGTH,
  );

  return {
    summary,
    topicState: {
      currentTopic: latestUserMessage
        ? truncate(latestUserMessage.content, 180)
        : null,
      lockedDecisions: uniqueItems(
        userMessages.filter(looksLikeDecision).reverse(),
      ),
      openLoops: uniqueItems(userMessages.filter(looksLikeOpenLoop).reverse()),
      userGoals: uniqueItems(userMessages.filter(looksLikeGoal).reverse()),
    },
    source: "fallback",
  };
}

function getSummaryModel() {
  return (
    process.env.NARA_CONVERSATION_SUMMARY_MODEL ??
    process.env.GEMINI_MODEL ??
    "gemini-3.5-flash-lite"
  );
}

function getSummaryClient() {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    return null;
  }

  return new GoogleGenAI({
    apiKey,
  });
}

function buildSummaryPrompt(
  messages: ChatMessage[],
  previousSummary?: string | null,
) {
  const transcript = messages
    .slice(-80)
    .map(
      (message) =>
        `${message.role === "user" ? "USER" : "NARA"}: ${truncate(
          message.content,
          1_800,
        )}`,
    )
    .join("\n\n");

  return `
You maintain compact conversation continuity state for NARA.

Return valid JSON only with this exact shape:
{
  "summary": "compact durable conversation summary",
  "topicState": {
    "currentTopic": "current topic or null",
    "lockedDecisions": ["explicitly established decisions only"],
    "openLoops": ["unfinished tasks/questions/follow-ups only"],
    "userGoals": ["durable goals stated by the user only"]
  }
}

Rules:
- Preserve user decisions, requirements, names, project facts, constraints, and unresolved work.
- Do not invent facts.
- Do not turn NARA suggestions into user decisions.
- Current explicit user instructions always outrank older context.
- Keep summary under ${MAX_SUMMARY_LENGTH} characters.
- Keep each topic-state list short and deduplicated.
- This is continuity state, not a response to the user.

Previous rolling summary:
${previousSummary?.trim() || "(none)"}

Recent conversation:
${transcript}
`.trim();
}

export async function buildRollingConversationState(
  messages: ChatMessage[],
  previousSummary?: string | null,
): Promise<RollingConversationState> {
  const fallback = buildFallbackConversationState(messages);
  const client = getSummaryClient();

  if (!client || messages.length < 4) {
    return fallback;
  }

  try {
    const response = await client.models.generateContent({
      model: getSummaryModel(),
      contents: buildSummaryPrompt(messages, previousSummary),
      config: {
        temperature: 0.15,
        responseMimeType: "application/json",
      },
    });

    const text = response.text?.trim();

    if (!text) {
      return fallback;
    }

    const parsed = JSON.parse(extractJsonObject(text)) as {
      summary?: unknown;
      topicState?: unknown;
    };

    const summary =
      typeof parsed.summary === "string"
        ? truncate(parsed.summary, MAX_SUMMARY_LENGTH)
        : "";

    if (!summary) {
      return fallback;
    }

    return {
      summary,
      topicState: sanitizeTopicState(parsed.topicState),
      source: "gemini",
    };
  } catch (error) {
    console.warn(
      "[NARA] Gemini rolling summary unavailable; using deterministic fallback:",
      error,
    );

    return fallback;
  }
}
