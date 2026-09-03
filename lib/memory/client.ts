"use client";

import { getSupabaseBrowserClient } from "@/lib/supabase/client";

import type { MemoryCategory, NaraMemory } from "@/types/memory";

interface MemoryRow {
  id: string;
  category: MemoryCategory;
  content: string;
  is_enabled: boolean;
  created_at: string;
  updated_at: string;
}

interface UpdateMemoryInput {
  content?: string;
  category?: MemoryCategory;
  isEnabled?: boolean;
}

function mapMemory(row: MemoryRow): NaraMemory {
  return {
    id: row.id,
    category: row.category,
    content: row.content,
    isEnabled: row.is_enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function getUserId() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const { data, error } = await supabase.auth.getUser();

  if (error) {
    throw error;
  }

  return data.user?.id ?? null;
}

export async function listMemories() {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from("memories")
    .select("id,category,content,is_enabled,created_at,updated_at")
    .order("updated_at", {
      ascending: false,
    });

  if (error) {
    throw error;
  }

  return ((data ?? []) as MemoryRow[]).map(mapMemory);
}

export async function createMemory(
  content: string,
  category: MemoryCategory = "custom",
) {
  const normalizedContent = content.trim();

  if (!normalizedContent) {
    throw new Error("Memory content cannot be empty.");
  }

  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const userId = await getUserId();

  if (!userId) {
    throw new Error("No authenticated NARA user is available.");
  }

  const { data, error } = await supabase
    .from("memories")
    .insert({
      user_id: userId,
      category,
      content: normalizedContent,
    })
    .select("id,category,content,is_enabled,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapMemory(data as MemoryRow);
}

export async function updateMemory(memoryId: string, input: UpdateMemoryInput) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return null;
  }

  const updates: {
    content?: string;
    category?: MemoryCategory;
    is_enabled?: boolean;
    updated_at: string;
  } = {
    updated_at: new Date().toISOString(),
  };

  if (input.content !== undefined) {
    const normalizedContent = input.content.trim();

    if (!normalizedContent) {
      throw new Error("Memory content cannot be empty.");
    }

    updates.content = normalizedContent;
  }

  if (input.category !== undefined) {
    updates.category = input.category;
  }

  if (input.isEnabled !== undefined) {
    updates.is_enabled = input.isEnabled;
  }

  const { data, error } = await supabase
    .from("memories")
    .update(updates)
    .eq("id", memoryId)
    .select("id,category,content,is_enabled,created_at,updated_at")
    .single();

  if (error) {
    throw error;
  }

  return mapMemory(data as MemoryRow);
}

export async function deleteMemory(memoryId: string) {
  const supabase = getSupabaseBrowserClient();

  if (!supabase) {
    return;
  }

  const { error } = await supabase.from("memories").delete().eq("id", memoryId);

  if (error) {
    throw error;
  }
}
