/* Geração do atestado no padrão visual fornecido, usando os dados da clínica. */
function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = String(iso).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : iso;
}
function formatCpf(cpf) {
  const d = String(cpf || "").replace(/\\D/g, "");
  return d.length === 11 ? `${d.slice(0,3)}.${d.slice(3,6)}.${d.slice(6,9)}-${d.slice(9)}` : (cpf || "");
}
function esc(v) {
  return String(v ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;"
  }[c]));
}
function enderecoClinica(c) {
  const l1 = [c.rua, c.numero && ` ${c.numero}`, c.complemento].filter(Boolean).join(", ");
  const l2 = [c.bairro, c.cidade, c.estado].filter(Boolean).join(" - ");
  return [l1, l2, c.cep].filter(Boolean).join(" • ");
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
    const endereco = enderecoClinica(c);
    const contatos = [c.telefone, c.email_contato, c.site].filter(Boolean).join(" • ");
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
@page{size:A4;margin:15mm 14mm}
*{box-sizing:border-box}
body{font-family:Arial,Helvetica,sans-serif;color:#111;margin:0;font-size:12pt}
.cabecalho{display:grid;grid-template-columns:170px 1fr auto;gap:18px;align-items:start;min-height:145px}
.logo{width:160px;max-height:130px;object-fit:contain;object-position:left top}
.identidade{padding-top:2px;line-height:1.35}
.nome-clinica{font-size:16pt;font-weight:700;margin-bottom:8px}
.dados-clinica{font-size:11pt;line-height:1.35}
.data{font-size:12pt;white-space:nowrap;text-align:right;padding-top:2px}
.conteudo{margin-top:155px}
h1{text-align:center;font-size:18pt;margin:0 auto 32px;padding-bottom:8px;border-bottom:1px solid #bbb;width:max-content;min-width:185px}
.corpo{font-size:15pt;line-height:1.35;text-align:justify;margin:0 0 12px}
.cid{font-size:13pt;margin-top:14px}
.assinatura{text-align:center;font-size:15pt;line-height:1.35;margin-top:165px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<header class="cabecalho">
  <div>${logo}</div>
  <div class="identidade">
    ${nomeClinica ? `<div class="nome-clinica">${esc(nomeClinica)}</div>` : ""}
    <div class="dados-clinica">${endereco ? esc(endereco) + "<br>" : ""}${contatos ? esc(contatos) + "<br>" : ""}${c.cnpj ? "CNPJ: " + esc(c.cnpj) : ""}</div>
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
