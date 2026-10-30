/* Gera o receituário em PDF usando a impressão do navegador. */
function esc(valor) {
  return String(valor ?? "").replace(/[&<>"']/g, (caractere) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  }[caractere]));
}

function formatarDataBR(data) {
  if (!data) return "";
  const partes = String(data).split("-");
  return partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : data;
}

function formatarCpf(cpf) {
  const numeros = String(cpf || "").replace(/\\D/g, "");
  return numeros.length === 11
    ? `${numeros.slice(0, 3)}.${numeros.slice(3, 6)}.${numeros.slice(6, 9)}-${numeros.slice(9)}`
    : (cpf || "");
}

function linhasEndereco(clinica) {
  const rua = [clinica.rua, clinica.numero].filter(Boolean).join(", ");
  const cidade = [clinica.cidade, clinica.estado].filter(Boolean).join(" - ");
  return [rua, clinica.complemento, cidade, clinica.cep, clinica.telefone]
    .filter(Boolean)
    .map((linha) => esc(linha));
}

function montarMedicamentos(medicamentos) {
  let usoAtual = "";
  return medicamentos.map((medicamento) => {
    const uso = medicamento.tipo_uso === "externo" ? "Uso Externo" : "Uso Interno";
    const tituloUso = uso !== usoAtual ? `<div class="tipo-uso">${uso}</div>` : "";
    usoAtual = uso;
    return `
      ${tituloUso}
      <section class="medicamento">
        <div class="medicamento-cabecalho">
          <strong>${esc(medicamento.nome)}</strong>
          <span>${esc(medicamento.quantidade)} ${esc(medicamento.unidade)}</span>
        </div>
        <p class="posologia">${esc(medicamento.posologia).replace(/\\n/g, "<br>")}</p>
      </section>`;
  }).join("");
}

function montarVia({ clinica, paciente, profissional, dataBR, medicamentosHtml, controlada, via }) {
  const nomeClinica = clinica.nome_fantasia || clinica.nome || clinica.razao_social || "";
  const logo = clinica.logo_url ? `<img class="logo" src="${esc(clinica.logo_url)}" alt="Logo da clínica">` : "";
  const titulo = controlada ? "Receituário controle especial" : "Receituário";
  const identificacaoVia = controlada ? `<div class="via">${via}</div>` : "";
  const rodapeControlado = controlada ? `
    <section class="controle">
      <div class="controle-coluna comprador">
        <h2>IDENTIFICAÇÃO DO COMPRADOR</h2>
        <div class="campo">Nome: <span></span></div>
        <div class="linha-livre"></div>
        <div class="campo">Ident: <span class="curta"></span> Órg. Emissor: <span class="media"></span></div>
        <div class="campo">End: <span></span></div>
        <div class="linha-livre"></div>
        <div class="campo">Cidade: <span class="media"></span> UF: <span class="curta"></span></div>
        <div class="campo">Telefone: <span></span></div>
      </div>
      <div class="controle-coluna fornecedor">
        <h2>IDENTIFICAÇÃO DO FORNECEDOR</h2>
        <div class="assinatura-farmaceutico">ASSINATURA DO FARMACÊUTICO&nbsp;&nbsp; DATA: ___/___/_____</div>
      </div>
    </section>` : "";

  return `
    <article class="pagina">
      <header class="cabecalho">
        <div class="logo-wrap">${logo}</div>
        <div class="identidade">
          ${nomeClinica ? `<div class="nome-clinica">${esc(nomeClinica)}</div>` : ""}
          <div class="dados-clinica">${linhasEndereco(clinica).map((linha) => `<div>${linha}</div>`).join("")}</div>
        </div>
        <div class="data">${esc(dataBR)}${identificacaoVia}</div>
      </header>
      <main class="conteudo">
        <h1>${titulo}</h1>
        <div class="paciente">Paciente: ${esc(paciente.nome || "Paciente")}<br>CPF: ${esc(formatarCpf(paciente.cpf))}</div>
        <div class="lista-medicamentos">${medicamentosHtml}</div>
      </main>
      <footer class="rodape">
        <div class="assinatura">
          <strong>${esc(profissional)}</strong>
          ${clinica.cro ? `<span>CRO/PI ${esc(clinica.cro)}</span>` : ""}
          <span>${esc(dataBR)}</span>
        </div>
        ${rodapeControlado}
      </footer>
    </article>`;
}

export default async function gerarPdfReceituario({
  paciente, pacienteId, profissional, data, medicamentos, apiUrl, token, janela,
}) {
  const w = janela || window.open("", "_blank", "width=900,height=1100");
  if (!w) throw new Error("Permita pop-ups para gerar o PDF.");

  try {
    const headers = { Authorization: token || "" };
    const [resClinica, resPaciente] = await Promise.all([
      fetch(`${apiUrl}/clinica`, { headers }),
      paciente && paciente.nome && paciente.cpf
        ? Promise.resolve(null)
        : (pacienteId ? fetch(`${apiUrl}/pacientes/${pacienteId}`, { headers }) : Promise.resolve(null)),
    ]);

    if (!resClinica.ok) throw new Error("Não foi possível carregar os dados da clínica.");
    const retornoClinica = await resClinica.json();
    let dadosPaciente = paciente || {};
    if (resPaciente) {
      if (!resPaciente.ok) throw new Error("Não foi possível carregar os dados do paciente.");
      dadosPaciente = await resPaciente.json();
    }
    if (!dadosPaciente.nome) throw new Error("Os dados do paciente não foram encontrados.");

    const clinica = retornoClinica.clinica || {};
    const dataBR = formatarDataBR(data);
    const controlada = medicamentos.some((medicamento) => Number(medicamento.receita_controlada) === 1);
    const medicamentosHtml = montarMedicamentos(medicamentos);
    const paginas = controlada
      ? [
          montarVia({ clinica, paciente: dadosPaciente, profissional, dataBR, medicamentosHtml, controlada, via: "1ª VIA FARMÁCIA" }),
          montarVia({ clinica, paciente: dadosPaciente, profissional, dataBR, medicamentosHtml, controlada, via: "2ª VIA PACIENTE" }),
        ]
      : [montarVia({ clinica, paciente: dadosPaciente, profissional, dataBR, medicamentosHtml, controlada, via: "" })];

    w.document.open();
    w.document.write(`<!DOCTYPE html>
<html lang="pt-BR"><head><meta charset="utf-8"><title>Receituário - ${esc(dadosPaciente.nome)}</title>
<style>
@page{size:A4;margin:0}
*{box-sizing:border-box}
html,body{margin:0;padding:0}
body{font-family:Arial,Helvetica,sans-serif;color:#111;font-size:11pt}
.pagina{position:relative;width:210mm;height:297mm;padding:10mm 14mm 9mm;page-break-after:always;overflow:hidden}
.pagina:last-child{page-break-after:auto}
.cabecalho{display:grid;grid-template-columns:33mm minmax(0,1fr) auto;column-gap:6mm;align-items:start;height:33mm}
.logo-wrap{width:33mm;height:33mm;overflow:hidden;border-radius:5mm;clip-path:inset(0 round 5mm);-webkit-mask-image:-webkit-radial-gradient(white,black)}
.logo{display:block;width:33mm;height:33mm;object-fit:cover;object-position:center;border-radius:5mm;clip-path:inset(0 round 5mm)}
.identidade{line-height:1.2}
.nome-clinica{font-size:14pt;font-weight:700;margin:0 0 3mm}
.dados-clinica{font-size:10.5pt;line-height:1.2}
.data{font-size:10.5pt;white-space:nowrap;text-align:right}
.via{margin-top:1mm;font-size:9.5pt}
.conteudo{margin-top:9mm}
h1{text-align:center;font-size:16pt;line-height:1.2;margin:0 auto 7mm;padding-bottom:1.5mm;border-bottom:1px solid #bbb;width:max-content;max-width:100%}
.paciente{font-size:11pt;line-height:1.35;margin-bottom:9mm}
.lista-medicamentos{font-size:11pt}
.tipo-uso{font-size:10.5pt;color:#555;margin:0 0 3mm}
.medicamento{margin:0 0 6mm;break-inside:avoid}
.medicamento-cabecalho{display:flex;justify-content:space-between;align-items:flex-start;gap:8mm;font-size:11pt}
.medicamento-cabecalho strong{font-weight:700}
.medicamento-cabecalho span{white-space:nowrap}
.posologia{font-size:11pt;line-height:1.35;margin:4mm 0 0;white-space:normal}
.rodape{position:absolute;left:14mm;right:14mm;bottom:9mm}
.assinatura{border-top:1px solid #444;padding-top:2mm;text-align:center;font-size:11pt;line-height:1.35;display:flex;flex-direction:column;align-items:center}
.assinatura strong{font-weight:400}
.controle{height:64mm;margin-top:3mm;border:1px solid #222;display:grid;grid-template-columns:1fr 1fr}
.controle-coluna{position:relative;min-width:0}
.controle-coluna+ .controle-coluna{border-left:1px solid #222}
.controle h2{font-size:9pt;font-weight:400;text-align:center;margin:0;padding:1.5mm 1mm;border-bottom:1px solid #222;white-space:nowrap}
.comprador{padding-bottom:2mm}
.campo{font-size:7.5pt;margin:4mm 3mm 0;display:flex;align-items:flex-end;gap:1mm;white-space:nowrap}
.campo span{display:inline-block;border-bottom:1px solid #111;height:4mm;flex:1;min-width:8mm}
.campo span.curta{flex:0 0 24mm}
.campo span.media{flex:0 0 31mm}
.linha-livre{border-bottom:1px solid #111;margin:4mm 3mm 0;height:2mm}
.assinatura-farmaceutico{position:absolute;bottom:2mm;left:2mm;right:2mm;border-top:1px solid #111;padding-top:1mm;font-size:6.5pt;white-space:nowrap}
@media print{body{print-color-adjust:exact;-webkit-print-color-adjust:exact}}
</style></head><body>
${paginas.join("")}
<script>window.onload=()=>window.print();</script></body></html>`);
    w.document.close();
    return true;
  } catch (erro) {
    w.close();
    throw erro;
  }
}
