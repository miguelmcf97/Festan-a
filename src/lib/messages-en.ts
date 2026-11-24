// Mensagens de retorno das ações (avisos de sucesso e erros de validação) em inglês.
// As ações gravam a mensagem em português; a tela traduz pela chave exata quando o idioma é inglês.
// Mensagem nova em alguma ação? Acrescente aqui.
import type { Lang } from "./i18n";

const EN: Record<string, string> = {
  // regras de negócio (src/server/services/quotes.ts, src/lib/quote-rules.ts)
  "A validade precisa ser uma data futura": "The expiry date must be in the future",
  "Contratação não encontrada": "Booking not found",
  "Esta contratação já foi avaliada": "This booking has already been reviewed",
  "Esta proposta não está mais disponível": "This proposal is no longer available",
  "Esta solicitação está encerrada": "This request is closed",
  "Evento não encontrado": "Event not found",
  "Informe o valor total da proposta": "Enter the proposal's total amount",
  "Informe um valor válido": "Enter a valid amount",
  "Nota inválida": "Invalid rating",
  "Não há reserva pendente": "There is no pending reservation",
  "Proposta expirada — peça ao fornecedor uma nova": "Proposal expired — ask the vendor for a new one",
  "Proposta não encontrada": "Proposal not found",
  "Solicitação não encontrada": "Request not found",
  "Só é possível avaliar contratações concluídas": "Only completed bookings can be reviewed",
  "Só é possível concluir após a data do evento": "You can only complete it after the event date",
  "Só é possível recusar uma reserva pendente": "Only a pending reservation can be declined",
  // validação
  "A senha precisa ter pelo menos 8 caracteres": "The password must have at least 8 characters",
  "Conte um pouco mais sobre o que você precisa (mín. 10 caracteres)": "Tell us a bit more about what you need (min. 10 characters)",
  "Conte um pouco mais sobre seu trabalho (mín. 30 caracteres)": "Tell us a bit more about your work (min. 30 characters)",
  "Data inválida": "Invalid date",
  "Descreva o problema (mín. 10 caracteres)": "Describe the problem (min. 10 characters)",
  "Descreva o que está incluso na proposta": "Describe what the proposal includes",
  "Descreva rapidamente o que você precisa": "Briefly describe what you need",
  "Descrição muito curta (mín. 30 caracteres)": "Description too short (min. 30 characters)",
  "Dê um nome ao serviço": "Give the service a name",
  "E-mail inválido": "Invalid email",
  "Escolha o bairro base": "Choose your base neighborhood",
  "Escolha o serviço": "Choose the service",
  "Escreva a mensagem": "Write the message",
  "Escreva pelo menos 10 caracteres": "Write at least 10 characters",
  "Escreva sua pergunta": "Write your question",
  "Informe a validade": "Enter the expiry date",
  "Informe o assunto": "Enter the subject",
  "Informe o motivo": "Enter the reason",
  "Informe o nome da empresa": "Enter the business name",
  "Informe o nome do responsável": "Enter the contact person's name",
  "Informe seu nome": "Enter your name",
  "Informe a senha": "Enter your password",
  "Senha com pelo menos 8 caracteres": "Password with at least 8 characters",
  "Telefone com DDD": "Phone number with area code",
  "É preciso aceitar os termos": "You need to accept the terms",
  "É preciso aceitar os termos e a política de privacidade": "You need to accept the terms and the privacy policy",
  "Escolha uma nota de 1 a 5": "Choose a rating from 1 to 5",
  "Documento inválido": "Invalid document number",
  "Dados inválidos": "Invalid data",
  // login e cadastro
  "E-mail ou senha incorretos.": "Incorrect email or password.",
  "Esta conta está suspensa. Fale com o suporte.": "This account is suspended. Contact support.",
  "Já existe uma conta com este e-mail. Entre com sua senha.": "An account with this email already exists. Sign in with your password.",
  "Muitos cadastros a partir desta conexão. Tente mais tarde.": "Too many sign-ups from this connection. Try again later.",
  "Muitas tentativas. Aguarde alguns minutos.": "Too many attempts. Wait a few minutes.",
  // fornecedor
  "Contratação confirmada! A data foi bloqueada na sua agenda.": "Booking confirmed! The date was blocked in your calendar.",
  "Marcada como em análise.": "Marked as under review.",
  "Mensagem enviada.": "Message sent.",
  "Pergunta enviada ao cliente.": "Question sent to the customer.",
  "Proposta enviada ao cliente.": "Proposal sent to the customer.",
  "Reserva liberada. O cliente foi avisado.": "Reservation released. The customer was notified.",
  "Serviço adicionado.": "Service added.",
  "Serviço marcado como concluído. O cliente poderá avaliar.": "Service marked as completed. The customer can now leave a review.",
  "Serviço removido.": "Service removed.",
  "Solicitação recusada. O cliente foi avisado.": "Request declined. The customer was notified.",
  "Data bloqueada na agenda.": "Date blocked in the calendar.",
  "Data liberada.": "Date freed up.",
  "Esta data tem contratação confirmada e não pode ser liberada pela agenda.": "This date has a confirmed booking and cannot be freed from the calendar.",
  "Período inválido: a data final precisa ser igual ou depois da inicial, a partir de hoje.": "Invalid period: the end date must be on or after the start date, from today on.",
  "Bloqueie no máximo 92 dias de uma vez.": "Block at most 92 days at once.",
  // cliente
  "Avaliação enviada. Ela aparece no perfil depois da moderação.": "Review sent. It shows on the profile after moderation.",
  "Proposta aceita. Agora o fornecedor precisa confirmar para a contratação ficar confirmada.": "Proposal accepted. The vendor now needs to confirm for the booking to be confirmed.",
  "Proposta recusada.": "Proposal declined.",
  "Recebemos seu relato. A equipe Planfest vai analisar e responder.": "We received your report. The Planfest team will review it and reply.",
  "Solicitação cancelada.": "Request cancelled.",
  "Entre na sua conta para pedir orçamento.": "Sign in to request a quote.",
  "Fornecedor indisponível.": "Vendor unavailable.",
  "Informe o número de convidados.": "Enter the number of guests.",
  "Informe o tipo de evento.": "Enter the event type.",
  "Limite diário de solicitações atingido.": "Daily request limit reached.",
  "Solicitação enviada! O fornecedor vai responder pelo seu painel. Isto ainda não é uma reserva.": "Request sent! The vendor will reply through your dashboard. This is not a reservation yet.",
  "Use uma conta de cliente para pedir orçamentos.": "Use a customer account to request quotes.",
  "Você já tem uma solicitação aberta com este fornecedor para este evento e serviço.": "You already have an open request with this vendor for this event and service.",
  // admin
  "Avaliação publicada.": "Review published.",
  "Avaliação rejeitada.": "Review rejected.",
  "Categoria ativada.": "Category enabled.",
  "Categoria desativada.": "Category disabled.",
  "Categoria salva.": "Category saved.",
  "Já existe uma categoria com este nome": "A category with this name already exists",
  "Reclamação atualizada.": "Complaint updated.",
  "Status atualizado.": "Status updated.",
  "Usuário atualizado.": "User updated.",
  "Você não pode alterar a própria conta.": "You cannot change your own account.",
};

/** Traduz uma mensagem de retorno; se não houver tradução, devolve o texto original. */
export function msg(text: string | null | undefined, lang: Lang): string {
  if (!text) return "";
  if (lang !== "en") return text;
  if (EN[text]) return EN[text];
  const m = text.match(/^Transição não permitida: (.+)$/);
  if (m) return `Transition not allowed: ${m[1]}`;
  const r = text.match(/^Muitas tentativas\. Tente de novo em (\d+) minutos\.$/);
  if (r) return `Too many attempts. Try again in ${r[1]} minutes.`;
  const b = text.match(/^(\d+) datas? bloqueadas?\.$/);
  if (b) return `${b[1]} date${b[1] === "1" ? "" : "s"} blocked.`;
  return text;
}
