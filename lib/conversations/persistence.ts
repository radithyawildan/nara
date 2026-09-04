"use client";

import {
  getSupabaseBrowserClient,
  isSupabaseConfigured,
} from "@/lib/supabase/client";

import type {
  ConversationMessage,
  ConversationSummary,
} from "@/types/conversation";

interface ConversationRow {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface MessageRow {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
}

function toConversationSummary(row: ConversationRow): ConversationSummary {
  return {
    id: row.id,
    title: row.title,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizeConversationTitle(content: string) {
  return content
    .replace(/[`*_#>]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function createConversationTitle(content: string) {
  let normalized = normalizeConversationTitle(content);

  normalized = normalized
    .replace(/^(?:halo|hai|hi|hey|bro|nara)[,!:\s-]+/i, "")
    .replace(/^(?:tolong|please)\s+/i, "")
    .trim();

  if (!normalized) {
    return "New conversation";
  }

  const firstSentence =
    normalized.split(/(?<=[.!?])\s+/)[0]?.trim() || normalized;

  if (firstSentence.length <= 58) {
    return firstSentence;
  }

  const shortened = firstSentence.slice(0, 55);

  const lastSpace = shortened.lastIndexOf(" ");

  const title = lastSpace >= 36 ? shortened.slice(0, lastSpace) : shortened;

  return `${title.trim()}...`;
}

async function ensureAnonymousUserId() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data: sessionData, error: sessionError } =
    await supabase.auth.getSession();

  if (sessionError) {
    throw sessionError;
  }

  const existingUserId = sessionData.session?.user.id;

  if (existingUserId) {
    return existingUserId;
  }

  const { data, error } = await supabase.auth.signInAnonymously();

  if (error) {
    throw error;
  }

  const userId = data.user?.id ?? data.session?.user.id;

  if (!userId) {
    throw new Error("Supabase anonymous authentication did not return a user.");
  }

  return userId;
}

export async function initializeConversationPersistence() {
  if (!isSupabaseConfigured()) {
    return false;
  }

  await ensureAnonymousUserId();

  return true;
}

export async function listConversations() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  await ensureAnonymousUserId();

  const { data, error } = await supabase
    .from("conversations")
    .select("id,title,created_at,updated_at")
    .order("updated_at", {
      ascending: false,
    })
    .limit(50);

  if (error) {
    throw error;
  }

  return ((data ?? []) as ConversationRow[]).map(toConversationSummary);
}

export async function createConversation(firstMessage: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const userId = await ensureAnonymousUserId();

  if (!userId) {
    return null;
  }

  const { data, error } = await supabase
    .from("conversations")
    .insert({
      user_id: userId,
      title: createConversationTitle(firstMessage),
    })
    .select("id,title,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return toConversationSummary(data as ConversationRow);
}

export async function renameConversation(
  conversationId: string,
  title: string,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  await ensureAnonymousUserId();

  const normalizedTitle = normalizeConversationTitle(title);

  if (!normalizedTitle) {
    throw new Error("Conversation title cannot be empty.");
  }

  const nextTitle =
    normalizedTitle.length <= 80
      ? normalizedTitle
      : normalizedTitle.slice(0, 80).trim();

  const { data, error } = await supabase
    .from("conversations")
    .update({
      title: nextTitle,
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId)
    .select("id,title,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return toConversationSummary(data as ConversationRow);
}

export async function deleteConversation(conversationId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  await ensureAnonymousUserId();

  const { error: messageError } = await supabase
    .from("messages")
    .delete()
    .eq("conversation_id", conversationId);

  if (messageError) {
    throw messageError;
  }

  const { error: conversationError } = await supabase
    .from("conversations")
    .delete()
    .eq("id", conversationId);

  if (conversationError) {
    throw conversationError;
  }
}

export async function loadConversationMessages(conversationId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  await ensureAnonymousUserId();

  const { data, error } = await supabase
    .from("messages")
    .select("id,role,content,created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", {
      ascending: true,
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MessageRow[]).map((row): ConversationMessage => ({
    id: row.id,
    role: row.role,
    content: row.content,
    createdAt: row.created_at,
  }));
}

export async function saveConversationMessage(
  conversationId: string,
  message: ConversationMessage,
) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const userId = await ensureAnonymousUserId();

  if (!userId) {
    return;
  }

  const { error: messageError } = await supabase.from("messages").upsert({
    id: message.id,
    conversation_id: conversationId,
    user_id: userId,
    role: message.role,
    content: message.content,
    created_at: message.createdAt,
  });

  if (messageError) {
    throw messageError;
  }

  const { error: updateError } = await supabase
    .from("conversations")
    .update({
      updated_at: new Date().toISOString(),
    })
    .eq("id", conversationId);

  if (updateError) {
    throw updateError;
  }
}
