import type { Metadata } from "next";
import { loadConversation } from "@/server/ai/agent";
import { getAnonKey, getCurrentUser } from "@/server/auth";
import { PlannerChat } from "./planner-chat";

export const metadata: Metadata = { title: "Planejar com IA" };

export default async function PlanejarPage({ searchParams }: { searchParams: Promise<{ q?: string; c?: string }> }) {
  const { q, c } = await searchParams;
  const user = await getCurrentUser();
  const anon = user ? null : await getAnonKey(false);
  const existing = c ? await loadConversation(c, user?.id ?? null, anon) : null;
  const engineLabel = process.env.ANTHROPIC_API_KEY && process.env.AI_PROVIDER !== "demo-rules" ? null : "Modo demonstração: respostas geradas por regras, sem modelo de linguagem.";

  return (
    <PlannerChat
      initialQuery={existing ? null : (q ?? null)}
      initial={existing}
      user={user ? { name: user.name, role: user.role } : null}
      engineNotice={engineLabel}
    />
  );
}
