"use server";
import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { audit, requireUser } from "@/server/auth";
import { db } from "@/server/db";
import { complaints, quoteRequests } from "@/server/db/schema";
import { acceptProposal, BusinessRuleError, cancelQuote, consumerMessage, createReview, rejectProposal } from "@/server/services/quotes";

async function run(back: string, fn: () => Promise<void>, okMsg: string) {
  try {
    await fn();
  } catch (e) {
    if (e instanceof BusinessRuleError || e instanceof z.ZodError) redirect(`${back}?erro=${encodeURIComponent(e instanceof z.ZodError ? e.issues[0].message : e.message)}`);
    throw e;
  }
  revalidatePath(back);
  redirect(`${back}?ok=${encodeURIComponent(okMsg)}`);
}

const id = z.string().min(1);

export async function acceptProposalAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  await run(`/painel/solicitacoes/${quoteId}`, async () => {
    await acceptProposal(id.parse(fd.get("proposalId")), u.id);
    await audit(u.id, "proposal.accept", "quote_request", quoteId);
  }, "Proposta aceita. Agora o fornecedor precisa confirmar para a contratação ficar confirmada.");
}

export async function rejectProposalAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  await run(`/painel/solicitacoes/${quoteId}`, () => rejectProposal(id.parse(fd.get("proposalId")), u.id), "Proposta recusada.");
}

export async function cancelQuoteAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  const reason = z.string().trim().max(300).parse(fd.get("reason") ?? "");
  await run(`/painel/solicitacoes/${quoteId}`, async () => {
    await cancelQuote(quoteId, u.id, reason);
    await audit(u.id, "quote.cancel", "quote_request", quoteId, { reason });
  }, "Solicitação cancelada.");
}

export async function consumerMessageAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  const body = z.string().trim().min(1, "Escreva a mensagem").max(2000).safeParse(fd.get("body"));
  if (!body.success) redirect(`/painel/solicitacoes/${quoteId}?erro=${encodeURIComponent(body.error.issues[0].message)}`);
  await run(`/painel/solicitacoes/${quoteId}`, () => consumerMessage(quoteId, u.id, body.data), "Mensagem enviada.");
}

export async function reviewAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  const rating = z.coerce.number().int().min(1).max(5).safeParse(fd.get("rating"));
  const comment = z.string().trim().min(10, "Escreva pelo menos 10 caracteres").max(1500).safeParse(fd.get("comment"));
  if (!rating.success || !comment.success) redirect(`/painel/solicitacoes/${quoteId}?erro=${encodeURIComponent(!rating.success ? "Escolha uma nota de 1 a 5" : comment.error!.issues[0].message)}`);
  await run(`/painel/solicitacoes/${quoteId}`, () => createReview(id.parse(fd.get("bookingId")), u.id, rating.data, comment.data), "Avaliação enviada. Ela aparece no perfil depois da moderação.");
}

export async function complaintAction(fd: FormData) {
  const u = await requireUser(["CONSUMER"]);
  const quoteId = id.parse(fd.get("quoteId"));
  const subject = z.string().trim().min(3, "Informe o assunto").max(120).safeParse(fd.get("subject"));
  const body = z.string().trim().min(10, "Descreva o problema (mín. 10 caracteres)").max(2000).safeParse(fd.get("body"));
  if (!subject.success || !body.success) redirect(`/painel/solicitacoes/${quoteId}?erro=${encodeURIComponent((!subject.success ? subject.error : body.error!).issues[0].message)}`);
  const q = await db.query.quoteRequests.findFirst({ where: and(eq(quoteRequests.id, quoteId), eq(quoteRequests.consumerId, u.id)) });
  if (!q) redirect("/painel");
  await db.insert(complaints).values({ reporterId: u.id, providerId: q.providerId, subject: subject.data, body: body.data });
  await audit(u.id, "complaint.create", "quote_request", quoteId);
  redirect(`/painel/solicitacoes/${quoteId}?ok=${encodeURIComponent("Recebemos seu relato. A equipe Planfest vai analisar e responder.")}`);
}
