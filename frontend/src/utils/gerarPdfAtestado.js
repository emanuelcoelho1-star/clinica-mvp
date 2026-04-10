/* ═══════════════════════════════════════════════════════════
   Geração de PDF — Atestado / Declaração de Comparecimento
   ═══════════════════════════════════════════════════════════ */

function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatCpf(cpf) {
  if (!cpf) return "";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function formatTelefone(tel) {
  if (!tel) return "";
  const d = String(tel).replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

/**
 * Gera e abre janela de impressão com o Atestado / Declaração de Comparecimento.
 *
 * @param {Object} opts
 * @param {Object} opts.paciente         — { nome, cpf, telefone, cro }
 * @param {string} opts.profissional     — nome do profissional
 * @param {string} opts.tipoAtestado     — "dias" | "presenca"
 * @param {string} opts.data             — ISO (YYYY-MM-DD)
 * @param {string} opts.dias             — quantidade de dias
 * @param {string} opts.cid              — código CID (opcional)
 * @param {string} opts.horaInicial      — HH:MM
 * @param {string} opts.horaFinal        — HH:MM
 */
export default function gerarPdfAtestado({
  paciente,
  profissional,
  tipoAtestado,
  data,
  dias,
  cid,
  horaInicial,
  horaFinal,
}) {
  const nomePac = paciente?.nome || "Paciente";
  const cpfPac = formatCpf(paciente?.cpf || "");
  const telPac = formatTelefone(paciente?.telefone || "");
  const dataFormatada = formatarDataBR(data);

  let titulo = "";
  let corpo = "";

  if (tipoAtestado === "dias") {
    titulo = "ATESTADO";
    corpo =
      `Atesto, com o fim específico de dispensa de atividades trabalhistas (ou ` +
      `escolares, ou judiciárias), que <strong>${nomePac}</strong>, portador(a) do CPF ` +
      `<strong>${cpfPac}</strong> esteve sob meus cuidados profissionais no dia ` +
      `<strong>${dataFormatada}</strong> devendo permanecer em repouso por ` +
      `<strong>${dias || "___"}</strong> dias.`;
    if (cid) corpo += `\n\nCID: ${cid}`;
  } else {
    titulo = "DECLARAÇÃO DE COMPARECIMENTO";
    corpo =
      `Atesto, com o fim específico de dispensa de atividades trabalhistas (ou ` +
      `escolares, ou judiciárias), que <strong>${nomePac}</strong>, portador(a) do CPF ` +
      `<strong>${cpfPac}</strong> esteve sob meus cuidados profissionais no dia ` +
      `<strong>${dataFormatada}</strong> das <strong>${horaInicial || "__:__"}</strong> ` +
      `às <strong>${horaFinal || "__:__"}</strong> horas.`;
    if (cid) corpo += `\n\nCID: ${cid}`;
  }

  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) {
    alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");
    return;
  }

  w.document.write(`<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${titulo}</title>
  <style>
    @page { size: A4; margin: 20mm 25mm 20mm 25mm; }
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: 'Times New Roman', Times, serif;
      font-size: 14px;
      color: #000;
      line-height: 1.6;
      padding: 40px;
    }
    .header {
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
      margin-bottom: 40px;
    }
    .header-prof { font-weight: bold; font-size: 15px; }
    .header-date { font-size: 14px; }
    .header-tel  { font-size: 14px; margin-top: 20px; }
    .title {
      text-align: center;
      margin-top: 60px;
      margin-bottom: 30px;
    }
    .title h1 {
      font-size: 22px;
      font-weight: bold;
      text-decoration: underline;
      text-underline-offset: 6px;
    }
    .body-text {
      text-align: justify;
      text-indent: 2em;
      font-size: 14px;
      line-height: 1.8;
      margin-bottom: 20px;
      white-space: pre-wrap;
    }
    .signature {
      text-align: center;
      margin-top: 100px;
      line-height: 1.6;
      font-size: 14px;
    }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="header-prof">${profissional || ""}</div>
    <div class="header-date">${dataFormatada}</div>
  </div>
  ${telPac ? `<div class="header-tel">${telPac}</div>` : ""}

  <div class="title"><h1>${titulo}</h1></div>

  <div class="body-text">${corpo}</div>

  <div class="signature">
    Atenciosamente,<br>
    ${profissional || ""}<br>
    ${paciente?.cro || ""}
  </div>
</body>
</html>`);

  w.document.close();
  setTimeout(() => w.print(), 400);
}