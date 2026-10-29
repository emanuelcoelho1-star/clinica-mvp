/* Gera PDF de documentos do prontuário com identidade visual da clínica. */
function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  }[c]));
}
function dataBR(data) {
  if (!data) return "—";
  const p = String(data).split("-");
  return p.length === 3 ? `${p[2]}/${p[1]}/${p[0]}` : data;
}
function enderecoClinica(c) {
  const a = [c.rua, c.numero && `nº ${c.numero}`, c.complemento].filter(Boolean).join(", ");
  const b = [c.bairro, c.cidade, c.estado].filter(Boolean).join(" - ");
  return [a, b, c.cep && `CEP: ${c.cep}`].filter(Boolean).join(" • ");
}

export default async function gerarPdfDocumento({ documento, paciente, apiUrl, token }) {
  const w = window.open("", "_blank", "width=800,height=1000");
  if (!w) {
    alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");
    return;
  }
  try {
    const resposta = await fetch(`${apiUrl}/clinica`, { headers: { Authorization: token || "" } });
    if (!resposta.ok) throw new Error("Não foi possível carregar os dados da clínica.");
    const dados = (await resposta.json()).clinica || {};
    const nome = dados.nome_fantasia || dados.nome || dados.razao_social || "";
    const endereco = enderecoClinica(dados);
    const contato = [dados.telefone, dados.email_contato, dados.site].filter(Boolean).join(" • ");
    const logo = dados.logo_url ? `<img class="logo" src="${esc(dados.logo_url)}" alt="Logo da clínica">` : "";
    const conteudo = esc(documento.conteudo || "").replace(/\r?\n/g, "<br>");
    const titulo = documento.titulo || documento.tipo || "Documento";
    w.document.write(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(titulo)}</title>
<style>
@page{size:A4;margin:18mm 22mm}*{box-sizing:border-box}body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:12pt;line-height:1.65;margin:0}
.cabecalho{display:flex;align-items:center;gap:18px;border-bottom:2px solid #1e40af;padding-bottom:16px;margin-bottom:34px}.logo{max-width:110px;max-height:85px;object-fit:contain}
.identidade{flex:1}.nome{font-size:16pt;font-weight:700;margin-bottom:5px}.dados{font-size:9pt;color:#444;line-height:1.5}
h1{text-align:center;font-size:17pt;margin:0 0 28px;text-transform:uppercase}.meta{font-size:10pt;margin-bottom:22px}.conteudo{white-space:normal;text-align:justify;min-height:220px}
.assinatura{text-align:center;margin-top:90px}.linha{width:280px;border-top:1px solid #333;margin:0 auto 8px}@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
<header class="cabecalho">${logo}<div class="identidade">${nome ? `<div class="nome">${esc(nome)}</div>` : ""}<div class="dados">${endereco ? esc(endereco)+"<br>" : ""}${contato ? esc(contato)+"<br>" : ""}${dados.cnpj ? "CNPJ: "+esc(dados.cnpj) : ""}</div></div></header>
<h1>${esc(titulo)}</h1><div class="meta"><strong>Paciente:</strong> ${esc(paciente?.nome || "—")}<br><strong>Data:</strong> ${esc(dataBR(documento.data))}${documento.profissional ? "<br><strong>Profissional:</strong> "+esc(documento.profissional) : ""}</div>
<div class="conteudo">${conteudo}</div><div class="assinatura"><div class="linha"></div><strong>${esc(documento.profissional || dados.responsavel_tecnico || "")}</strong><br>${esc(dados.cro || "")}</div>
<script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
  } catch (erro) {
    w.close();
    alert(erro.message || "Não foi possível gerar o PDF.");
  }
}
