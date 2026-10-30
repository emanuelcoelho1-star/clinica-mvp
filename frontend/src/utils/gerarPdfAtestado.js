/* Geração do atestado no padrão visual fornecido, usando os dados da clínica. */
function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function formatCpf(cpf) {
  const d = String(cpf || "").replace(/\D/g, "");
  return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : (cpf || "");
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function linhasEnderecoClinica(c) {
  const rua = [c.rua, c.numero].filter(Boolean).join(", ");
  const cidade = [c.cidade, c.estado].filter(Boolean).join(" - ");
  return [rua, c.complemento, cidade, c.cep, c.telefone]
    .filter(Boolean)
    .map((linha) => esc(linha));
}

export default async function gerarPdfAtestado({
  paciente, profissional, tipoAtestado, data, dias, cid, horaInicial, horaFinal,
  apiUrl, token, janela,
}) {
  const w = janela || window.open("", "_blank", "width=900,height=1100");
  if (!w) {
    alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");
    return false;
  }
  try {
    const resposta = await fetch(`${apiUrl}/clinica`, { headers: { Authorization: token || "" } });
    if (!resposta.ok) throw new Error("Não foi possível carregar os dados da clínica.");
    const retorno = await resposta.json();
    const c = retorno.clinica || {};
    const nomeClinica = c.nome_fantasia || c.nome || c.razao_social || "";
    const linhasEndereco = linhasEnderecoClinica(c);
    const logo = c.logo_url ? `<img class="logo" src="${esc(c.logo_url)}" alt="Logo da clínica">` : "";
    const nomePaciente = paciente?.nome || "Paciente";
    const cpf = formatCpf(paciente?.cpf);
    const dataBR = formatarDataBR(data);
    const titulo = tipoAtestado === "presenca" ? "DECLARAÇÃO DE COMPARECIMENTO" : "ATESTADO";
    const corpo = tipoAtestado === "presenca"
      ? `Atesto, com o fim específico de comprovação de comparecimento, que ${esc(nomePaciente)}, portador(a) do CPF ${esc(cpf)}, esteve sob meus cuidados profissionais no dia ${esc(dataBR)}, das ${esc(horaInicial)} às ${esc(horaFinal)}.`
      : `Atesto, com o fim específico de dispensa de atividades trabalhistas (ou escolares, ou judiciárias), que ${esc(nomePaciente)}, portador(a) do CPF ${esc(cpf)} esteve sob meus cuidados profissionais no dia ${esc(dataBR)} devendo permanecer em repouso por ${esc(dias)} dias.`;
    const linhaCid = cid ? `<p class="cid">CID: ${esc(cid)}</p>` : "";

    w.document.open();
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
@page{size:A4;margin:0 30pt 30pt}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12pt}
.cabecalho{display:grid;grid-template-columns:94pt minmax(0,1fr) auto;column-gap:17pt;align-items:start;height:94pt;margin:18pt 0 0}
.logo{display:block;width:94pt;height:94pt;object-fit:contain;object-position:left top}
.identidade{padding:0;line-height:1.2}
.nome-clinica{font-size:14pt;font-weight:700;margin:0 0 5pt}
.dados-clinica{font-size:11pt;line-height:1.2}
.data{font-size:11pt;white-space:nowrap;text-align:right;padding:0;margin:0}
.conteudo{margin-top:95pt}
h1{text-align:center;font-size:18pt;line-height:1.2;margin:0 auto 25pt;padding-bottom:6pt;border-bottom:1px solid #bbb;width:max-content;min-width:110pt}
.corpo{font-size:14pt;line-height:1.2;text-align:justify;margin:0 0 12pt}
.cid{font-size:12pt;margin-top:12pt}
.assinatura{text-align:center;font-size:14pt;line-height:1.25;margin-top:98pt}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<header class="cabecalho">
  <div>${logo}</div>
  <div class="identidade">
    ${nomeClinica ? `<div class="nome-clinica">${esc(nomeClinica)}</div>` : ""}
    <div class="dados-clinica">${linhasEndereco.map((linha) => `<div>${linha}</div>`).join("")}</div>
  </div>
  <div class="data">${esc(dataBR)}</div>
</header>
<main class="conteudo">
  <h1>${esc(titulo)}</h1>
  <p class="corpo">${corpo}</p>${linhaCid}
  <div class="assinatura">Atenciosamente,<br>${esc(profissional || "")}<br>${esc(c.cro ? `CRO/PI ${c.cro}` : "")}</div>
</main>
<script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
    return true;
  } catch (erro) {
    w.close();
    alert(erro.message || "Não foi possível gerar o atestado.");
    return false;
  }
}
