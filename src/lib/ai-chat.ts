import type { UIMessage } from "ai";

import { supabase } from "@/integrations/supabase/client";

export type AiThread = {
  id: string;
  title: string;
  updated_at: string;
};

export async function listThreads(): Promise<AiThread[]> {
  const { data, error } = await supabase
    .from("ai_threads")
    .select("id, title, updated_at")
    .order("updated_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

export async function createThread(title = "Nova conversa"): Promise<AiThread> {
  const { data: userData } = await supabase.auth.getUser();
  const userId = userData.user?.id;
  if (!userId) throw new Error("Sessão expirada. Faça login novamente.");
  const { data, error } = await supabase
    .from("ai_threads")
    .insert({ user_id: userId, title })
    .select("id, title, updated_at")
    .single();
  if (error) throw error;
  return data;
}

export async function renameThread(id: string, title: string) {
  const { error } = await supabase.from("ai_threads").update({ title }).eq("id", id);
  if (error) throw error;
}

export async function deleteThread(id: string) {
  const { error } = await supabase.from("ai_threads").delete().eq("id", id);
  if (error) throw error;
}

export async function listMessages(threadId: string): Promise<UIMessage[]> {
  const { data, error } = await supabase
    .from("ai_messages")
    .select("id, role, content")
    .eq("thread_id", threadId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? [])
    .filter((row) => row.role === "user" || row.role === "assistant")
    .map((row) => ({
      id: row.id,
      role: row.role as "user" | "assistant",
      parts: Array.isArray(row.content)
        ? (row.content as UIMessage["parts"])
        : ([{ type: "text", text: String(row.content ?? "") }] as UIMessage["parts"]),
    }));
}

export function messageText(message: UIMessage) {
  return message.parts
    .map((part) => (part.type === "text" ? part.text : ""))
    .join("")
    .trim();
}

export function threadTitleFromText(text: string) {
  const clean = text.replace(/\s+/g, " ").trim();
  if (!clean) return "Nova conversa";
  return clean.length > 60 ? `${clean.slice(0, 57)}…` : clean;
}

export const LUMI_BUCKET = "lumi-arquivos";

/** Link temporário para visualizar/baixar um arquivo gerado pela Lumi. */
export async function lumiFileUrl(path: string) {
  const { data, error } = await supabase.storage.from(LUMI_BUCKET).createSignedUrl(path, 60 * 60);
  if (error) throw error;
  return data.signedUrl;
}

export async function accessToken() {
  const { data } = await supabase.auth.getSession();
  return data.session?.access_token ?? "";
}
