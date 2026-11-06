/* Gera o orçamento em PDF seguindo a identidade visual dos receituários e atestados. */
function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[c]));
}
function dataBR(data) {
  if (!data) return "—";
  const partes = String(data).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}
function cpfBR(cpf) {
  const n = String(cpf || "").replace(/\D/g, "");
  return n.length === 11 ? `${n.slice(0, 3)}.${n.slice(3, 6)}.${n.slice(6, 9)}-${n.slice(9)}` : (cpf || "—");
}
function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
function enderecoClinica(c) {
  const rua = [c.rua, c.numero && `nº ${c.numero}`, c.complemento].filter(Boolean).join(", ");
  const cidade = [c.cidade, c.estado].filter(Boolean).join(" - ");
  return [rua, c.bairro, cidade, c.cep && `CEP: ${c.cep}`, c.telefone].filter(Boolean);
}
function tiposPlano(tipo) {
  if (Array.isArray(tipo)) return tipo;
  if (!tipo) return [];
  try {
    const parsed = JSON.parse(tipo);
    return Array.isArray(parsed) ? parsed : [parsed];
  } catch {
    return [tipo];
  }
}




export default async function gerarPdfOrcamento({ orcamento, pacienteId, apiUrl, token }) {
  const janela = window.open("", "_blank", "width=900,height=1100");
  if (!janela) {
    alert("Pop-up bloqueado! Permita pop-ups para gerar o PDF.");
    return false;
  }

  try {
    const headers = { Authorization: token || "" };
    const [resClinica, resPaciente, resPlanos] = await Promise.all([
      fetch(`${apiUrl}/clinica`, { headers }),
      fetch(`${apiUrl}/pacientes/${pacienteId}`, { headers }),
      fetch(`${apiUrl}/planos/opcoes-orcamento`, { headers }).catch(() => null),
    ]);
    if (!resClinica.ok) throw new Error("Não foi possível carregar os dados da clínica.");
    if (!resPaciente.ok) throw new Error("Não foi possível carregar os dados do paciente.");

    const clinica = (await resClinica.json()).clinica || {};
    const paciente = await resPaciente.json();
    let planos = [];
    if (resPlanos?.ok) {
      const dadosPlanos = await resPlanos.json();
      planos = Array.isArray(dadosPlanos) ? dadosPlanos : [];
    }
    const plano = planos.find((p) => Number(p.id) === Number(orcamento.plano_id));
    const convenio = tiposPlano(plano?.tipo).includes("convenio");
    const itens = Array.isArray(orcamento.itens) ? orcamento.itens : [];
    const subtotal = itens.reduce((soma, item) => soma + (Number(item.valor) || 0) * (Number(item.quantidade) || 1), 0);
    const desconto = Math.max(0, Number(orcamento.desconto) || 0);
    const total = Math.max(0, subtotal - desconto);
    const nomeClinica = clinica.nome_fantasia || clinica.nome || clinica.razao_social || "";
    const logo = clinica.logo_url ? `<img class="logo" src="${esc(clinica.logo_url)}" alt="Logo da clínica">` : "";
    const linhasEndereco = enderecoClinica(clinica);
    const status = ({
      pendente: "Pendente", aprovado: "Aprovado", recusado: "Recusado",
      em_andamento: "Em andamento", concluido: "Concluído",
    })[orcamento.status] || orcamento.status || "—";
    const linhas = itens.map((item, indice) => {
      const quantidade = Number(item.quantidade) || 1;
      const valorUnitario = Number(item.valor) || 0;
      const valorLinha = valorUnitario * quantidade;
      return `<tr>
        <td class="numero">${indice + 1}</td>
        <td>${esc(item.procedimento || "—")}</td>
        <td>${esc([item.dente, item.faces].filter(Boolean).join(" / ") || "—")}</td>
        <td class="centro">${quantidade}</td>
        ${convenio ? "" : `<td class="direita">${moeda(valorUnitario)}</td><td class="direita">${moeda(valorLinha)}</td>`}
      </tr>`;
    }).join("");
    const colunasValores = convenio ? "" : "<th class='direita'>Valor unit.</th><th class='direita'>Subtotal</th>";
    const colSpan = convenio ? 4 : 6;
    const odontograma = gerarOdontograma(itens);

    janela.document.open();
    janela.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Orçamento #${esc(orcamento.id)} - ${esc(paciente.nome)}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:10.5pt}
.pagina{position:relative;min-height:297mm;padding:10mm 14mm 16mm}
.cabecalho{display:grid;grid-template-columns:33mm minmax(0,1fr) auto;column-gap:6mm;align-items:start;min-height:33mm}
.logo-wrap{width:33mm;height:33mm;overflow:hidden;border-radius:5mm;clip-path:inset(0 round 5mm);-webkit-mask-image:-webkit-radial-gradient(white,black)}
.logo{display:block;width:33mm;height:33mm;object-fit:cover;object-position:center;border-radius:5mm;clip-path:inset(0 round 5mm)}
.identidade{line-height:1.25}.nome-clinica{font-size:14pt;font-weight:700;margin:0 0 3mm}.dados-clinica{font-size:9.5pt;line-height:1.35}
.data{font-size:10pt;white-space:nowrap;text-align:right}
.linha-azul{height:1px;background:#cbd5e1;margin:7mm 0 6mm}
h1{text-align:center;font-size:17pt;line-height:1.2;margin:0 0 2mm}
.numero-orcamento{text-align:center;color:#64748b;font-size:9pt;margin-bottom:7mm}
.paciente{display:grid;grid-template-columns:1fr 1fr;gap:3mm 8mm;padding:4mm 5mm;background:#f8fafc;border:1px solid #e2e8f0;border-radius:2mm;margin-bottom:5mm;line-height:1.4}
.campo strong{color:#475569}.descricao{margin:0 0 5mm;line-height:1.45}.descricao strong{color:#475569}
h2{font-size:11pt;margin:7mm 0 3mm}
table{width:100%;border-collapse:collapse;font-size:9.5pt}
thead{display:table-header-group}th{background:#f1f5f9;color:#334155;font-weight:700;text-align:left}
th,td{padding:3mm 2.2mm;border-bottom:1px solid #e2e8f0;vertical-align:top}
.numero{width:8mm;color:#64748b}.centro{text-align:center}.direita{text-align:right;white-space:nowrap}
.totais{width:72mm;margin:6mm 0 0 auto;font-size:10pt}.total-linha{display:flex;justify-content:space-between;gap:8mm;padding:2mm 0}
.total-final{border-top:1.5px solid #334155;margin-top:2mm;padding-top:3mm;font-size:12pt;font-weight:700}
.observacao-convenio{margin-top:5mm;color:#64748b;font-size:9pt}
.odontograma-topo span{font-size:7pt;color:#64748b;font-weight:400}
.rodape{margin-top:22mm;display:flex;justify-content:space-around;gap:16mm;text-align:center;page-break-inside:avoid}
.assinatura{flex:1;max-width:75mm;border-top:1px solid #444;padding-top:2mm;font-size:9.5pt;line-height:1.4}
.assinatura strong{font-weight:600}
@media screen{body{background:#e5e7eb;padding:12px 0}.pagina{width:210mm;min-height:297mm;background:#fff;margin:0 auto 16px;box-shadow:0 2px 12px rgba(0,0,0,.14)}}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}.pagina{page-break-after:always}.pagina:last-child{page-break-after:auto}}
</style></head><body><main class="pagina">
<header class="cabecalho">
  <div class="logo-wrap">${logo}</div>
  <div class="identidade">${nomeClinica ? `<div class="nome-clinica">${esc(nomeClinica)}</div>` : ""}<div class="dados-clinica">${linhasEndereco.map((linha) => `<div>${esc(linha)}</div>`).join("")}</div></div>
  <div class="data">${dataBR(orcamento.data)}</div>
</header>
<div class="linha-azul"></div>
<h1>ORÇAMENTO ODONTOLÓGICO</h1>
<div class="numero-orcamento">Orçamento nº ${esc(orcamento.id)} · ${esc(status)}</div>
<section class="paciente">
  <div class="campo"><strong>Paciente:</strong> ${esc(paciente.nome || "—")}</div>
  <div class="campo"><strong>CPF:</strong> ${esc(cpfBR(paciente.cpf))}</div>
  <div class="campo"><strong>Plano:</strong> ${esc(plano?.nome || "—")}</div>
  <div class="campo"><strong>Data:</strong> ${dataBR(orcamento.data)}</div>
  <div class="campo"><strong>Dentista responsável:</strong> ${esc(orcamento.dentista_responsavel || "—")}</div>
</section>
<div class="descricao"><strong>Descrição:</strong> ${esc(orcamento.descricao || "Plano de tratamento")}</div>
<h2>Procedimentos</h2>
<table><thead><tr><th class="numero">Nº</th><th>Procedimento</th><th>Dente / face</th><th class="centro">Qtd.</th>${colunasValores}</tr></thead><tbody>${linhas || `<tr><td colspan="${colSpan}">Nenhum procedimento informado.</td></tr>`}</tbody></table>
${convenio ? '<p class="observacao-convenio">Valores financeiros omitidos nesta via destinada ao paciente.</p>' : `<section class="totais">
  <div class="total-linha"><span>Subtotal</span><strong>${moeda(subtotal)}</strong></div>
  ${desconto > 0 ? `<div class="total-linha"><span>Desconto</span><strong>- ${moeda(desconto)}</strong></div>` : ""}
  <div class="total-linha total-final"><span>Total</span><strong>${moeda(total)}</strong></div>
</section>`}
<footer class="rodape">
  <div class="assinatura"><strong>${esc(paciente.nome || "Paciente")}</strong><br>Paciente</div>
  <div class="assinatura"><strong>${esc(orcamento.dentista_responsavel || "Dentista responsável")}</strong><br>${esc(clinica.cro ? `CRO/PI ${clinica.cro}` : "")}</div>
</footer>
</main><script>window.onload=()=>window.print();</script></body></html>`);
    janela.document.close();
    return true;
  } catch (erro) {
    janela.close();
    alert(erro.message || "Não foi possível gerar o orçamento em PDF.");
    return false;
  }
}
