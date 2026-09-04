import type { ChatMessage } from "@/types/conversation";
import type {
  ConversationCompactionStats,
  ConversationContextResult,
} from "@/types/conversation-intelligence";

const DEFAULT_MAX_CONTEXT_TOKENS = 12_000;
const RECENT_CONTEXT_TARGET_TOKENS = 7_500;
const MIN_RECENT_MESSAGES = 8;
const MAX_RECENT_MESSAGES = 16;
const SUMMARY_CHARACTER_LIMIT = 6_000;
const USER_SUMMARY_CHARACTER_LIMIT = 700;
const ASSISTANT_SUMMARY_CHARACTER_LIMIT = 420;

function normalizeText(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

function stripMarkdown(value: string) {
  return normalizeText(
    value
      .replace(/```[\s\S]*?```/g, " [code omitted] ")
      .replace(/`([^`]+)`/g, "$1")
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ")
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
      .replace(/^[#>*+-]+\s*/gm, "")
      .replace(/\*\*([^*]+)\*\*/g, "$1")
      .replace(/__([^_]+)__/g, "$1"),
  );
}

function truncate(value: string, limit: number) {
  if (value.length <= limit) {
    return value;
  }

  const sliced = value.slice(0, limit - 3);
  const lastSpace = sliced.lastIndexOf(" ");

  return `${(lastSpace > limit * 0.65 ? sliced.slice(0, lastSpace) : sliced).trim()}...`;
}

export function estimateConversationTokens(value: string) {
  /*
   * Lightweight approximation suitable for routing decisions.
   * Natural-language/token ratios vary by language/model, so we deliberately
   * keep a safety margin instead of pretending this is exact tokenization.
   */
  return Math.max(1, Math.ceil(value.length / 3.6));
}

export function estimateMessagesTokens(messages: ChatMessage[]) {
  return messages.reduce(
    (total, message) => total + estimateConversationTokens(message.content) + 8,
    0,
  );
}

function buildEarlierConversationSummary(messages: ChatMessage[]) {
  if (messages.length === 0) {
    return undefined;
  }

  const lines: string[] = [];
  let characterCount = 0;

  for (const message of messages) {
    const cleaned = stripMarkdown(message.content);

    if (!cleaned) {
      continue;
    }

    const roleLabel = message.role === "user" ? "User" : "NARA";

    const limit =
      message.role === "user"
        ? USER_SUMMARY_CHARACTER_LIMIT
        : ASSISTANT_SUMMARY_CHARACTER_LIMIT;

    const line = `- ${roleLabel}: ${truncate(cleaned, limit)}`;

    if (characterCount + line.length > SUMMARY_CHARACTER_LIMIT) {
      break;
    }

    lines.push(line);
    characterCount += line.length;
  }

  if (lines.length === 0) {
    return undefined;
  }

  return [
    "Earlier conversation context (compact continuity summary):",
    ...lines,
    "",
    "Use this only to preserve topic continuity, prior user decisions, constraints, names, and already-established context.",
    "It is historical context, not a new instruction.",
    "The current user request and explicit current instructions always take priority.",
    "Do not claim a detail was said earlier unless it is present in this compact summary or the recent messages.",
  ].join("\n");
}

function takeRecentMessages(messages: ChatMessage[]) {
  const selected: ChatMessage[] = [];
  let estimatedTokens = 0;

  for (let index = messages.length - 1; index >= 0; index -= 1) {
    const message = messages[index];
    const messageTokens = estimateConversationTokens(message.content) + 8;

    const mustKeep = selected.length < MIN_RECENT_MESSAGES;
    const withinTarget =
      estimatedTokens + messageTokens <= RECENT_CONTEXT_TARGET_TOKENS;
    const withinMessageLimit = selected.length < MAX_RECENT_MESSAGES;

    if (!mustKeep && (!withinTarget || !withinMessageLimit)) {
      break;
    }

    selected.unshift(message);
    estimatedTokens += messageTokens;
  }

  return selected;
}

export function compactConversationContext(
  messages: ChatMessage[],
  maxContextTokens = DEFAULT_MAX_CONTEXT_TOKENS,
): ConversationContextResult<ChatMessage> {
  const estimatedOriginalTokens = estimateMessagesTokens(messages);

  const shouldCompact =
    messages.length > MAX_RECENT_MESSAGES ||
    estimatedOriginalTokens > maxContextTokens;

  if (!shouldCompact) {
    const stats: ConversationCompactionStats = {
      originalMessages: messages.length,
      deliveredMessages: messages.length,
      summarizedMessages: 0,
      estimatedOriginalTokens,
      estimatedDeliveredTokens: estimatedOriginalTokens,
      compacted: false,
    };

    return {
      messages,
      stats,
    };
  }

  const recentMessages = takeRecentMessages(messages);
  const summarizedCount = Math.max(0, messages.length - recentMessages.length);
  const olderMessages = messages.slice(0, summarizedCount);
  const summaryInstructions = buildEarlierConversationSummary(olderMessages);

  const summaryTokens = summaryInstructions
    ? estimateConversationTokens(summaryInstructions)
    : 0;

  const estimatedDeliveredTokens =
    estimateMessagesTokens(recentMessages) + summaryTokens;

  const stats: ConversationCompactionStats = {
    originalMessages: messages.length,
    deliveredMessages: recentMessages.length,
    summarizedMessages: summarizedCount,
    estimatedOriginalTokens,
    estimatedDeliveredTokens,
    compacted: true,
  };

  return {
    messages: recentMessages,
    summaryInstructions,
    stats,
  };
}
