/* Geração de PDF para atestados e declarações, com dados da clínica. */

function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatCpf(cpf) {
  if (!cpf) return "";
  const digits = String(cpf).replace(/\D/g, "");
  if (digits.length === 11) return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  return cpf;
}

function formatTelefone(tel) {
  if (!tel) return "";
  const d = String(tel).replace(/\D/g, "");
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
  if (d.length === 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
  return tel;
}

function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}

function enderecoClinica(c) {
  const linha1 = [c.rua, c.numero && `nº ${c.numero}`, c.complemento].filter(Boolean).join(", ");
  const linha2 = [c.bairro, c.cidade, c.estado].filter(Boolean).join(" - ");
  const linha3 = c.cep ? `CEP: ${c.cep}` : "";
  return [linha1, linha2, linha3].filter(Boolean).join(" • ");
}

export default async function gerarPdfAtestado({
  paciente, profissional, tipoAtestado, data, dias, cid, horaInicial, horaFinal,
  apiUrl, token,
}) {
  // Abrir a janela antes da requisição para evitar bloqueio de pop-up pelo navegador.
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) {
    alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");
    return;
  }

  try {
    const resposta = await fetch(`${apiUrl}/clinica`, {
      headers: { Authorization: token || "" },
    });
    if (!resposta.ok) throw new Error("Não foi possível carregar os dados da clínica.");
    const retorno = await resposta.json();
    const clinica = retorno.clinica || {};
    const nomeClinica = clinica.nome_fantasia || clinica.nome || clinica.razao_social || "";
    const endereco = enderecoClinica(clinica);
    const contato = [clinica.telefone, clinica.email_contato, clinica.site].filter(Boolean).join(" • ");
    const logo = clinica.logo_url
      ? `<img class="logo" src="${esc(clinica.logo_url)}" alt="Logo da clínica">`
      : "";
    const nomePac = paciente?.nome || "Paciente";
    const cpfPac = formatCpf(paciente?.cpf || "");
    const dataFormatada = formatarDataBR(data);

    let titulo = "";
    let corpo = "";
    if (tipoAtestado === "dias") {
      titulo = "ATESTADO";
      corpo = `Atesto, para os devidos fins, que <strong>${esc(nomePac)}</strong>${cpfPac ? `, portador(a) do CPF <strong>${esc(cpfPac)}</strong>` : ""} esteve sob meus cuidados profissionais no dia <strong>${esc(dataFormatada)}</strong>, devendo permanecer em repouso por <strong>${esc(dias || "___")}</strong> dias.`;
    } else {
      titulo = "DECLARAÇÃO DE COMPARECIMENTO";
      corpo = `Declaro, para os devidos fins, que <strong>${esc(nomePac)}</strong>${cpfPac ? `, portador(a) do CPF <strong>${esc(cpfPac)}</strong>` : ""} esteve sob meus cuidados profissionais no dia <strong>${esc(dataFormatada)}</strong>, das <strong>${esc(horaInicial || "__:__")}</strong> às <strong>${esc(horaFinal || "__:__")}</strong> horas.`;
    }
    if (cid) corpo += `<p class="cid">CID: ${esc(cid)}</p>`;

    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
@page{size:A4;margin:18mm 22mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;font-size:12pt;color:#111;line-height:1.65;margin:0}
.cabecalho{display:flex;align-items:center;gap:18px;border-bottom:2px solid #1e40af;padding-bottom:16px;margin-bottom:34px}
.logo{max-width:110px;max-height:85px;object-fit:contain}.identidade{flex:1}.nome-clinica{font-size:16pt;font-weight:700;margin-bottom:5px}.dados-clinica{font-size:9pt;color:#444;line-height:1.5}.data{text-align:right;font-size:10pt;margin-bottom:34px}
h1{text-align:center;font-size:17pt;margin:0 0 35px;text-decoration:underline;text-underline-offset:5px}
.corpo{text-align:justify;line-height:2;text-indent:2em;white-space:normal}.cid{margin-top:18px;text-indent:0}.assinatura{text-align:center;margin-top:95px;line-height:1.5}.linha{width:280px;border-top:1px solid #333;margin:0 auto 8px}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<header class="cabecalho">${logo}<div class="identidade">${nomeClinica ? `<div class="nome-clinica">${esc(nomeClinica)}</div>` : ""}<div class="dados-clinica">${endereco ? esc(endereco) + "<br>" : ""}${contato ? esc(contato) + "<br>" : ""}${clinica.cnpj ? "CNPJ: " + esc(clinica.cnpj) : ""}</div></div></header>
<div class="data">${esc(dataFormatada)}</div><h1>${esc(titulo)}</h1><div class="corpo">${corpo}</div>
<div class="assinatura"><div class="linha"></div><strong>${esc(profissional || "")}</strong><br>${esc(paciente?.cro || clinica.cro || "")}</div>
<script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
  } catch (erro) {
    w.close();
    alert(erro.message || "Não foi possível gerar o documento. Verifique os dados da clínica e tente novamente.");
  }
}
