/* ═══════════════════════════════════════════════════════════
   WhatsApp — helpers e modelos de mensagem
   ═══════════════════════════════════════════════════════════ */

const DIAS_SEMANA = ["no domingo", "na segunda-feira", "na terça-feira", "na quarta-feira", "na quinta-feira", "na sexta-feira", "no sábado"];

/* Número no formato do wa.me (DDI 55 + DDD + número) ou "" se inválido */
export function telefoneWhatsApp(telefone) {
  let d = String(telefone || "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) d = `55${d}`;
  return d.length >= 12 ? d : "";
}

export function abrirConversaWhatsApp(telefone, mensagem) {
  const numero = telefoneWhatsApp(telefone);
  if (!numero) return false;
  window.open(`https://wa.me/${numero}?text=${encodeURIComponent(mensagem)}`, "_blank", "noopener");
  return true;
}

function primeiroNome(nome) {
  return String(nome || "").trim().split(" ")[0] || "";
}

function apresentacao(clinica) {
  return clinica ? ` Aqui é da ${clinica}.` : "";
}

function dataCurta(iso) {
  const [, m, d] = String(iso).split("-");
  return `${d}/${m}`;
}

export function mensagemConfirmacao({ paciente, data, horario, procedimento, profissional, clinica }) {
  const [a, m, d] = data.split("-").map(Number);
  const dia = DIAS_SEMANA[new Date(a, m - 1, d).getDay()];
  const proc = procedimento && procedimento !== "Consulta" ? ` (${procedimento})` : "";
  const prof = profissional ? ` com ${profissional}` : "";
  return `Olá, ${primeiroNome(paciente)}!${apresentacao(clinica)} Passando para lembrar da sua consulta${proc} ${dia}, ` +
    `${dataCurta(data)}, às ${horario}${prof}.\n\n` +
    "Você confirma sua presença? Responda SIM para confirmar ou nos avise se precisar remarcar.";
}

export function mensagemRetorno({ paciente, motivo, dataPrevista, profissional, clinica }) {
  const atrasado = dataPrevista && new Date(`${dataPrevista}T23:59:59`) < new Date();
  const sobre = motivo ? ` de ${motivo.toLowerCase()}` : "";
  const prof = profissional ? ` com ${profissional}` : "";
  return `Olá, ${primeiroNome(paciente)}! Tudo bem?${apresentacao(clinica)}\n\n` +
    (atrasado
      ? `Notamos que já passou a data do seu retorno${sobre}${prof}. `
      : `Está chegando a hora do seu retorno${sobre}${prof}${dataPrevista ? ` (previsto para ${dataCurta(dataPrevista)})` : ""}. `) +
    "Manter as consultas em dia é importante para a sua saúde bucal.\n\n" +
    "Qual o melhor dia e horário para você? Responda aqui que a gente agenda.";
}

export function mensagemReativacao({ paciente, mesesSemVir, clinica }) {
  const tempo = !mesesSemVir ? null : mesesSemVir >= 12
    ? `mais de ${Math.floor(mesesSemVir / 12)} ano${mesesSemVir >= 24 ? "s" : ""}`
    : `${mesesSemVir} ${mesesSemVir === 1 ? "mês" : "meses"}`;
  return `Olá, ${primeiroNome(paciente)}! Tudo bem?${apresentacao(clinica)}\n\n` +
    (tempo ? `Sentimos sua falta! Já faz ${tempo} desde a sua última visita. ` : "Faz um tempo que não nos falamos! ") +
    "Recomendamos uma avaliação periódica para manter seu sorriso saudável.\n\n" +
    "Quer que a gente reserve um horário para você? É só responder esta mensagem.";
}

export function mensagemAniversario({ paciente, clinica }) {
  return `Olá, ${primeiroNome(paciente)}! 🎉\n\n` +
    `Toda a equipe ${clinica ? `da ${clinica}` : "da clínica"} deseja um feliz aniversário! Que seu novo ciclo seja cheio de saúde e muitos sorrisos.\n\n` +
    "Um grande abraço!";
}

export function mensagemOrcamento({ paciente, procedimentos, clinica }) {
  const sobre = procedimentos ? ` de ${procedimentos.toLowerCase()}` : "";
  return `Olá, ${primeiroNome(paciente)}! Tudo bem?${apresentacao(clinica)}\n\n` +
    `Passando para saber se ficou alguma dúvida sobre o orçamento${sobre} que preparamos para você. ` +
    "Podemos ver juntos a melhor forma de pagamento ou já reservar um horário para começar.\n\n" +
    "É só responder esta mensagem.";
}
