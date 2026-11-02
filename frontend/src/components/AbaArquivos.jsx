import { useEffect, useRef, useState } from "react";
import API_URL from "../api";

/* ═══════════════════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════════════════ */
function formatarDataBR(iso) {
  if (!iso) return "—";
  const p = iso.split("T")[0].split("-");
  if (p.length !== 3) return iso;
  return `${p[2]}/${p[1]}/${p[0]}`;
}

function formatarTamanho(bytes) {
  if (!bytes || bytes === 0) return "0 B";
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${sizes[i]}`;
}

function getExtensao(nome) {
  if (!nome) return "";
  const parts = nome.split(".");
  return parts.length > 1 ? parts.pop().toLowerCase() : "";
}

function isImagem(nome, mimetype) {
  const ext = getExtensao(nome);
  const mime = String(mimetype || "").toLowerCase().split(";")[0].trim();
  return mime.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
}

/* ═══════════════════════════════════════════════════════════
   CATEGORY CONFIG
   ═══════════════════════════════════════════════════════════ */
const CATEGORIAS = [
  { value: "exame", label: "Exame" },
  { value: "receita", label: "Receita" },
  { value: "atestado", label: "Atestado" },
  { value: "radiografia", label: "Radiografia" },
  { value: "contrato", label: "Contrato" },
  { value: "outro", label: "Outro" },
];

const CATEGORIA_MAP = {
  exame:        { label: "Exame",        bg: "#eff6ff", color: "#1d4ed8", border: "#dbeafe" },
  receita:      { label: "Receita",      bg: "#f0fdf4", color: "#15803d", border: "#dcfce7" },
  atestado:     { label: "Atestado",     bg: "#fefce8", color: "#a16207", border: "#fef08a" },
  radiografia:  { label: "Radiografia",  bg: "#faf5ff", color: "#7e22ce", border: "#e9d5ff" },
  contrato:     { label: "Contrato",     bg: "#fff1f2", color: "#be123c", border: "#fecdd3" },
  outro:        { label: "Outro",        bg: "#f8fafc", color: "#475569", border: "#e2e8f0" },
};

const EXT_ICONS = {
  pdf: { bg: "#fef2f2", color: "#dc2626" },
  doc: { bg: "#eff6ff", color: "#2563eb" },
  docx: { bg: "#eff6ff", color: "#2563eb" },
  xls: { bg: "#f0fdf4", color: "#16a34a" },
  xlsx: { bg: "#f0fdf4", color: "#16a34a" },
  jpg: { bg: "#fefce8", color: "#ca8a04" },
  jpeg: { bg: "#fefce8", color: "#ca8a04" },
  png: { bg: "#faf5ff", color: "#9333ea" },
  gif: { bg: "#ecfeff", color: "#0891b2" },
  webp: { bg: "#faf5ff", color: "#9333ea" },
};

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const Icons = {
  arrowLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  file: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  fileSmall: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
      <polyline points="14 2 14 8 20 8" />
    </svg>
  ),
  image: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
      <circle cx="9" cy="9" r="2" />
      <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
    </svg>
  ),
  download: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  ),
  eye: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  ),
  trash: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" /><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  plus: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" /><path d="M5 12h14" />
    </svg>
  ),
  alertTriangle: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" /><path d="M12 17h.01" />
    </svg>
  ),
  folderSmall: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /></svg>
  ),
  folderCard: (
    <svg width="100" height="80" viewBox="0 0 100 80" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M4 14C4 7.9 8.9 3 15 3H39L49 13H85C91.1 13 96 17.9 96 24V65C96 71.1 91.1 76 85 76H15C8.9 76 4 71.1 4 65V14Z" fill="#258FF0"/></svg>
  ),
  folder: (
    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="#cbd5e1" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 20h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.93a2 2 0 0 1-1.66-.9l-.82-1.2A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13c0 1.1.9 2 2 2Z" />
    </svg>
  ),
  search: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.3-4.3" />
    </svg>
  ),
  close: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 6 6 18" /><path d="m6 6 12 12" />
    </svg>
  ),
};

/* ═══════════════════════════════════════════════════════════
   CATEGORY BADGE
   ═══════════════════════════════════════════════════════════ */
function CategoriaBadge({ categoria }) {
  const cfg = CATEGORIA_MAP[categoria] || CATEGORIA_MAP.outro;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        padding: "3px 10px",
        borderRadius: "6px",
        fontSize: "11px",
        fontWeight: "600",
        background: cfg.bg,
        color: cfg.color,
        border: `1px solid ${cfg.border}`,
        letterSpacing: "0.01em",
      }}
    >
      {cfg.label}
    </span>
  );
}

/* ═══════════════════════════════════════════════════════════
   FILE ICON
   ═══════════════════════════════════════════════════════════ */
function FileIcon({ arquivo }) {
  const nome = arquivo.nome_original || "Arquivo";
  const imagem = isImagem(nome, arquivo.mimetype);
  const pdf = getExtensao(nome) === "pdf";
  const [thumbnailUrl, setThumbnailUrl] = useState("");

  useEffect(() => {
    if (!imagem) {
      setThumbnailUrl("");
      return undefined;
    }
    let cancelled = false;
    let objectUrl = "";
    const tk = localStorage.getItem("token");
    fetch(`${API_URL}/arquivos/${arquivo.id}/download`, {
      headers: { Authorization: tk || "" },
    })
      .then((response) => {
        if (!response.ok) throw new Error();
        return response.blob();
      })
      .then((blob) => {
        // Alguns arquivos antigos podem chegar como application/octet-stream.
        // Reaplica o MIME correto pela extensão para o navegador conseguir renderizar a miniatura.
        const extensao = getExtensao(nome);
        const mimePorExtensao = {
          jpg: "image/jpeg",
          jpeg: "image/jpeg",
          png: "image/png",
          gif: "image/gif",
          webp: "image/webp",
        };
        const mime = blob.type && blob.type.startsWith("image/")
          ? blob.type
          : (arquivo.mimetype && arquivo.mimetype.startsWith("image/")
            ? arquivo.mimetype
            : mimePorExtensao[extensao]);
        const imagemBlob = mime ? new Blob([blob], { type: mime }) : blob;
        objectUrl = URL.createObjectURL(imagemBlob);
        if (cancelled) URL.revokeObjectURL(objectUrl);
        else setThumbnailUrl(objectUrl);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [arquivo.id, imagem]);

  if (imagem) {
    return (
      <div style={S.fileTileImage}>
        {thumbnailUrl
          ? <img src={thumbnailUrl} alt={nome} style={S.fileThumbnail} onError={() => setThumbnailUrl("")} />
          : <span style={S.fileTileFallback}>{Icons.image}</span>}
      </div>
    );
  }

  if (pdf) {
    return (
      <div style={S.fileTilePdf}>
        <strong>PDF</strong>
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
          <path d="M14 2v6h6" />
        </svg>
      </div>
    );
  }

  return <div style={S.fileTileGeneric}>{Icons.file}</div>;
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaArquivos({ pacienteId }) {
  const [arquivos, setArquivos] = useState([]);
  const [pastas, setPastas] = useState([]);
  const [pastaAtualId, setPastaAtualId] = useState(null);
  const [carregando, setCarregando] = useState(true);
  const [menuNovoAberto, setMenuNovoAberto] = useState(false);
  const [modalPastaAberto, setModalPastaAberto] = useState(false);
  const [nomeNovaPasta, setNomeNovaPasta] = useState("");
  const [salvandoPasta, setSalvandoPasta] = useState(false);
  const [erro, setErro] = useState("");

  const [tela, setTela] = useState("lista"); // "lista" | "upload" | "preview"
  const [preview, setPreview] = useState(null);
  const [previewUrl, setPreviewUrl] = useState("");
  const [tipoSelecao, setTipoSelecao] = useState("arquivo");
  const [enviandoArquivos, setEnviandoArquivos] = useState(false);
  const inputUploadRef = useRef(null);


  // Busca e filtros
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Excluir
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);
  const [confirmarExclusaoPasta, setConfirmarExclusaoPasta] = useState(null);
  const [excluindoPasta, setExcluindoPasta] = useState(false);

  // Hover
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    setPastaAtualId(null);
    carregarArquivos();
    carregarPastas();
  }, [pacienteId]);

  useEffect(() => {
    if (!preview) {
      setPreviewUrl("");
      return undefined;
    }

    let cancelled = false;
    let objectUrl = "";
    const tk = localStorage.getItem("token");
    setPreviewUrl("");

    fetch(`${API_URL}/arquivos/${preview.id}/download`, {
      headers: { Authorization: tk || "" },
    })
      .then((response) => {
        if (!response.ok) throw new Error("Não foi possível carregar o arquivo.");
        return response.blob();
      })
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob);
        if (cancelled) {
          URL.revokeObjectURL(objectUrl);
        } else {
          setPreviewUrl(objectUrl);
        }
      })
      .catch(() => {
        if (!cancelled) setErro("Não foi possível carregar o arquivo.");
      });

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [preview]);

  async function carregarPastas() {
    try {
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/arquivos/pastas/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setPastas(Array.isArray(data) ? data : []);
    } catch {
      // A ausência ou indisponibilidade da listagem de pastas não deve
      // esconder a apresentação da aba Arquivos nem impedir a lista de arquivos.
      setPastas([]);
    }
  }

  async function carregarArquivos() {
    try {
      setCarregando(true);
      setErro("");
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/arquivos/paciente/${pacienteId}`, {
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      const data = await r.json();
      setArquivos(Array.isArray(data) ? data : []);
    } catch {
      setErro("Erro ao carregar arquivos.");
    } finally {
      setCarregando(false);
    }
  }

  /* ── Filtrar ─────────────────────────────── */
  const arquivosDaPasta = arquivos.filter((a) => Number(a.pasta_id || 0) === Number(pastaAtualId || 0));
  const pastasDaPasta = pastas.filter((p) => Number(p.pasta_pai_id || 0) === Number(pastaAtualId || 0));
  const caminhoPastas = [];
  let pastaCaminho = pastas.find((p) => Number(p.id) === Number(pastaAtualId));
  while (pastaCaminho) {
    caminhoPastas.unshift(pastaCaminho);
    pastaCaminho = pastas.find((p) => Number(p.id) === Number(pastaCaminho.pasta_pai_id));
  }
  const arquivosFiltrados = arquivosDaPasta.filter((a) => {
    const matchBusca =
      !busca ||
      (a.nome_original || "").toLowerCase().includes(busca.toLowerCase()) ||
      (a.descricao || "").toLowerCase().includes(busca.toLowerCase());
    const matchCategoria =
      filtroCategoria === "todos" || a.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  function iniciarSelecaoArquivo(tipo) {
    setTipoSelecao(tipo);
    setMenuNovoAberto(false);
    if (inputUploadRef.current) {
      inputUploadRef.current.value = "";
      inputUploadRef.current.click();
    }
  }

  async function handleSelecionarArquivos(e) {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;

    try {
      setEnviandoArquivos(true);
      setErro("");
      const tk = localStorage.getItem("token");

      for (const file of files) {
        const formData = new FormData();
        formData.append("arquivo", file);
        formData.append("paciente_id", pacienteId);
        formData.append("categoria", "outro");
        formData.append("descricao", "");
        if (pastaAtualId) formData.append("pasta_id", pastaAtualId);

        const response = await fetch(`${API_URL}/arquivos`, {
          method: "POST",
          headers: { Authorization: tk || "" },
          body: formData,
        });
        if (!response.ok) throw new Error("Não foi possível enviar os arquivos.");
      }

      await carregarArquivos();
      await carregarPastas();
    } catch (err) {
      setErro(err.message || "Não foi possível enviar os arquivos.");
    } finally {
      setEnviandoArquivos(false);
      e.target.value = "";
    }
  }

  async function criarPasta(e) {
    e.preventDefault();
    const nome = nomeNovaPasta.trim();
    if (!nome) return;
    try {
      setSalvandoPasta(true);
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/arquivos/pastas`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: tk || "" },
        body: JSON.stringify({ paciente_id: pacienteId, nome, pasta_pai_id: pastaAtualId || null }),
      });
      if (!r.ok) {
        const data = await r.json().catch(() => ({}));
        throw new Error(data.erro || "Não foi possível criar a pasta.");
      }
      setNomeNovaPasta("");
      setModalPastaAberto(false);
      await carregarPastas();
    } catch (err) {
      setErro(err.message || "Não foi possível criar a pasta.");
    } finally {
      setSalvandoPasta(false);
    }
  }

  /* ── Preview ─────────────────────────────── */
  function abrirPreview(arquivo) {
    setPreview(arquivo);
  }

  function voltarParaLista() {
    setTela("lista");
    setPreview(null);
  }

  /* ── Baixar ──────────────────────────────── */
  async function baixarArquivo(arquivo) {
    const tab = window.open("about:blank", "_blank");
    try {
      const tk = localStorage.getItem("token");
      const response = await fetch(`${API_URL}/arquivos/${arquivo.id}/download`, {
        headers: { Authorization: tk || "" },
      });
      if (!response.ok) throw new Error("Não foi possível baixar o arquivo.");
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      if (tab) {
        tab.location.href = url;
      } else {
        const link = document.createElement("a");
        link.href = url;
        link.download = arquivo.nome_original || "arquivo";
        link.click();
      }
      window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
    } catch {
      if (tab) tab.close();
      setErro("Não foi possível baixar o arquivo. Tente novamente.");
    }
  }

  /* ── Excluir ─────────────────────────────── */
  async function handleExcluir() {
    if (!confirmarExclusao?.id) return;
    try {
      setExcluindo(true);
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/arquivos/${confirmarExclusao.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      if (!r.ok) throw new Error();
      setConfirmarExclusao(null);
      await carregarArquivos();
      if (tela !== "lista") voltarParaLista();
    } catch {
      setErro("Erro ao excluir arquivo.");
    } finally {
      setExcluindo(false);
    }
  }

  async function handleExcluirPasta() {
    if (!confirmarExclusaoPasta?.id) return;
    try {
      setExcluindoPasta(true);
      const tk = localStorage.getItem("token");
      const r = await fetch(`${API_URL}/arquivos/pastas/${confirmarExclusaoPasta.id}`, {
        method: "DELETE",
        headers: { Authorization: tk || "" },
      });
      const data = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(data.erro || "Não foi possível excluir a pasta.");
      setConfirmarExclusaoPasta(null);
      await carregarPastas();
    } catch (err) {
      setErro(err.message || "Não foi possível excluir a pasta.");
      setConfirmarExclusaoPasta(null);
    } finally {
      setExcluindoPasta(false);
    }
  }

  /* ═══════════════════════════════════════════
     RENDER — LISTA
     ═══════════════════════════════════════════ */
  if (tela === "lista") {
    return (
      <div style={S.wrapper}>
        <input
          ref={inputUploadRef}
          type="file"
          accept={tipoSelecao === "imagem" || tipoSelecao === "camera" ? "image/*" : undefined}
          capture={tipoSelecao === "camera" ? "environment" : undefined}
          multiple={tipoSelecao !== "camera"}
          onChange={handleSelecionarArquivos}
          style={{ display: "none" }}
        />
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Arquivos</h2>
            <p style={S.subtitle}>
              {arquivos.length} arquivo{arquivos.length !== 1 ? "s" : ""} armazenado{arquivos.length !== 1 ? "s" : ""} • {pastas.length} pasta{pastas.length !== 1 ? "s" : ""}
            </p>
          </div>
          <div style={{ position: "relative" }}>
            <button type="button" style={{ ...S.btnPrimary, ...(hoveredBtn === "upload" ? S.btnPrimaryHover : {}) }}
              onMouseEnter={() => setHoveredBtn("upload")} onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => setMenuNovoAberto((v) => !v)}>
              {Icons.plus}<span>Novo</span>
            </button>
            {menuNovoAberto && <div style={S.newMenu}>
              <button type="button" style={S.newMenuItem} onClick={() => { setMenuNovoAberto(false); setNomeNovaPasta(""); setModalPastaAberto(true); }}>{Icons.folderSmall}<span>Pasta</span></button>
              <button type="button" style={S.newMenuItem} onClick={() => iniciarSelecaoArquivo("arquivo")}>{Icons.fileSmall}<span>Arquivo</span></button>
              <button type="button" style={S.newMenuItem} onClick={() => iniciarSelecaoArquivo("imagem")}>{Icons.image}<span>Imagem</span></button>
              <button type="button" style={S.newMenuItem} onClick={() => iniciarSelecaoArquivo("camera")}>{Icons.image}<span>Tirar foto</span></button>
            </div>}
          </div>
        </div>

        {/* Busca e filtros */}
        {!carregando && !erro && arquivos.length > 0 && (
          <div style={S.filtersRow}>
            <div style={S.searchBox}>
              <span style={S.searchIcon}>{Icons.search}</span>
              <input
                type="text"
                placeholder="Buscar por nome ou descrição..."
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                style={S.searchInput}
              />
              {busca && (
                <button
                  style={S.searchClear}
                  onClick={() => setBusca("")}
                >
                  {Icons.close}
                </button>
              )}
            </div>
            <select
              value={filtroCategoria}
              onChange={(e) => setFiltroCategoria(e.target.value)}
              style={S.filterSelect}
            >
              <option value="todos">Todas categorias</option>
              {CATEGORIAS.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Loading */}
        {carregando && (
          <div style={S.feedbackBox}>
            <div style={S.loadingPulse}>
              <div style={S.loadingDot1} />
              <div style={S.loadingDot2} />
              <div style={S.loadingDot3} />
            </div>
            <span style={S.feedbackText}>Carregando arquivos...</span>
          </div>
        )}

        {enviandoArquivos && <div style={S.feedbackBox}><span style={S.feedbackText}>Enviando arquivo(s)...</span></div>}

        {/* Erro */}
        {erro && <div style={S.errorBox}><span>{erro}</span></div>}

        {!carregando && !erro && (
          <div style={S.folderArea}>
            <div style={S.breadcrumbs}>
              <button type="button" style={S.breadcrumbButton} onClick={() => setPastaAtualId(null)}>Arquivos</button>
              {caminhoPastas.map((p) => <span key={p.id} style={S.breadcrumbPart}><span style={S.breadcrumbSlash}>/</span><button type="button" style={S.breadcrumbButton} onClick={() => setPastaAtualId(p.id)}>{p.nome}</button></span>)}
            </div>

            {/* Área de conteúdo no estilo do explorador de arquivos do Windows */}
            <div style={S.contentPanel}>
              {pastasDaPasta.length > 0 && <div style={S.folderGrid}>
                {pastasDaPasta.map((p) => <div key={p.id} style={S.folderCard}>
                  <button type="button" style={S.folderOpenButton} onClick={() => { setPastaAtualId(p.id); setBusca(""); setFiltroCategoria("todos"); }}>
                    <span style={S.folderCardIcon}>{Icons.folderCard}</span><span style={S.folderCardName}>{p.nome}</span><span style={S.folderCardHint}>Abrir pasta</span>
                  </button>
                  <button type="button" title="Excluir pasta" aria-label={`Excluir pasta ${p.nome}`} style={S.folderDeleteButton}
                    onClick={() => setConfirmarExclusaoPasta(p)}>{Icons.trash}<span>Excluir</span></button>
                </div>)}
              </div>}

              {arquivosDaPasta.length > 0 && arquivosFiltrados.length === 0 && (
                <div style={S.panelEmptyHint}>
                  <span style={{ color: "#94a3b8" }}>{Icons.search}</span>
                  <span>Nenhum resultado encontrado. Tente ajustar o filtro ou termo de busca.</span>
                </div>
              )}

              {arquivosFiltrados.length > 0 && (
                <div style={S.fileExplorerGrid}>
                  {arquivosFiltrados.map((a) => {
                    const hovered = hoveredCardId === a.id;
                    return (
                      <div
                        key={a.id}
                        style={{ ...S.fileExplorerItem, ...(hovered ? S.fileExplorerItemHover : {}) }}
                        onMouseEnter={() => setHoveredCardId(a.id)}
                        onMouseLeave={() => setHoveredCardId(null)}
                      >
                        <button type="button" style={S.fileTileButton}
                          onClick={() => abrirPreview(a)}
                          title={a.nome_original || "Visualizar arquivo"}>
                          <FileIcon arquivo={a} />
                        </button>
                        <div style={S.fileTileName} title={a.nome_original || "Arquivo"}>{a.nome_original || "Arquivo"}</div>
                        <div style={S.fileTileMeta}>{formatarDataBR(a.created_at || a.data)}</div>
                        {hovered && <div style={S.fileTileActions}>
                          <button type="button" title="Baixar" style={S.fileTileAction} onClick={() => baixarArquivo(a)}>{Icons.download}</button>
                          <button type="button" title="Excluir" style={{ ...S.fileTileAction, color: "#dc2626" }} onClick={() => setConfirmarExclusao(a)}>{Icons.trash}</button>
                        </div>}
                      </div>
                    );
                  })}
                </div>
              )}

              {arquivosFiltrados.length === 0 && pastasDaPasta.length === 0 && (
                <div style={S.emptyBox}>
                  {Icons.folder}
                  <h3 style={S.emptyTitle}>{pastaAtualId ? "Esta pasta está vazia" : "Nenhum arquivo armazenado"}</h3>
                  <p style={S.emptyText}>
                    {pastaAtualId
                      ? "Adicione arquivos ou crie novas pastas usando o botão Novo."
                      : "Envie exames, receitas, radiografias e outros documentos do paciente. Você também pode organizar tudo em pastas."}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
        {confirmarExclusaoPasta && (
          <div style={S.overlay} onClick={() => !excluindoPasta && setConfirmarExclusaoPasta(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir pasta?</h3>
              <p style={S.confirmText}>
                A pasta <strong>{confirmarExclusaoPasta.nome}</strong> será excluída. Para evitar perda de conteúdo, ela precisa estar vazia, sem arquivos ou subpastas.
              </p>
              <div style={S.modalActions}>
                <button type="button" style={S.btnSecondary} onClick={() => setConfirmarExclusaoPasta(null)} disabled={excluindoPasta}>Cancelar</button>
                <button type="button" style={S.btnDanger} onClick={handleExcluirPasta} disabled={excluindoPasta}>
                  {Icons.trash}<span>{excluindoPasta ? "Excluindo..." : "Excluir pasta"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {modalPastaAberto && (
          <div style={S.overlay} onClick={() => setModalPastaAberto(false)}>
            <form style={S.modal} onClick={(e) => e.stopPropagation()} onSubmit={criarPasta}>
              <div style={S.modalIconWrap}>{Icons.folderCard}</div>
              <h3 style={S.confirmTitle}>Criar nova pasta</h3>
              <p style={S.confirmText}>A pasta será criada dentro de {caminhoPastas.length ? caminhoPastas[caminhoPastas.length - 1].nome : "Arquivos"}.</p>
              <input autoFocus value={nomeNovaPasta} onChange={(e) => setNomeNovaPasta(e.target.value)} maxLength={100} placeholder="Nome da pasta" style={{ ...S.input, marginTop: "18px" }} />
              <div style={S.modalActions}>
                <button type="button" style={S.btnSecondary} onClick={() => setModalPastaAberto(false)} disabled={salvandoPasta}>Cancelar</button>
                <button type="submit" style={S.btnPrimary} disabled={salvandoPasta || !nomeNovaPasta.trim()}>{salvandoPasta ? "Criando..." : "Criar pasta"}</button>
              </div>
            </form>
          </div>
        )}

        {/* Visualização do arquivo em modal na própria aba */}
        {preview && (
          <div style={S.viewerOverlay} onClick={voltarParaLista}>
            <div style={S.viewerModal} onClick={(e) => e.stopPropagation()}>
              <div style={S.viewerHeader}>
                <div style={{ minWidth: 0 }}>
                  <div style={S.viewerTitle}>{preview.nome_original || "Visualizar arquivo"}</div>
                  <div style={S.viewerSubtitle}>{formatarTamanho(preview.tamanho)} • {formatarDataBR(preview.created_at || preview.data)}</div>
                </div>
                <div style={S.viewerHeaderActions}>
                  <button type="button" style={S.btnSecondary} onClick={() => baixarArquivo(preview)}>{Icons.download}<span>Baixar</span></button>
                  <button type="button" style={S.viewerClose} aria-label="Fechar visualização" onClick={voltarParaLista}>{Icons.close}</button>
                </div>
              </div>
              <div style={S.viewerBody}>
                {!previewUrl
                  ? <span style={S.viewerMessage}>Carregando visualização...</span>
                  : isImagem(preview.nome_original, preview.mimetype)
                    ? <img src={previewUrl} alt={preview.nome_original} style={S.viewerImage} />
                    : getExtensao(preview.nome_original) === "pdf" || String(preview.mimetype || "").includes("pdf")
                      ? <iframe title={preview.nome_original || "Documento PDF"} src={previewUrl} style={S.viewerFrame} />
                      : <div style={S.viewerUnsupported}>
                          <span>Não é possível exibir este formato diretamente no navegador.</span>
                          <button type="button" style={S.btnSecondary} onClick={() => baixarArquivo(preview)}>{Icons.download}<span>Baixar arquivo</span></button>
                        </div>}
              </div>
            </div>
          </div>
        )}

        {/* Modal exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir arquivo?</h3>
              <p style={S.confirmText}>
                <strong>{confirmarExclusao.nome_original}</strong> será permanentemente removido.
              </p>
              <div style={S.modalActions}>
                <button
                  style={{
                    ...S.btnSecondary,
                    ...(hoveredBtn === "cancel-modal" ? S.btnSecondaryHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("cancel-modal")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    ...S.btnDanger,
                    ...(hoveredBtn === "confirm-modal" ? S.btnDangerHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("confirm-modal")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={handleExcluir}
                  disabled={excluindo}
                >
                  {Icons.trash}
                  <span>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Keyframes */}
        <style>{`
          @keyframes arquivo-pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
          @keyframes arquivo-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  /* ═══════════════════════════════════════════
     RENDER — PREVIEW
     ═══════════════════════════════════════════ */
  if (tela === "preview" && preview) {
    const imgUrl = previewUrl;

    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <button
              style={{
                ...S.backBtn,
                ...(hoveredBtn === "back-preview" ? S.backBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("back-preview")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
            >
              {Icons.arrowLeft}
              <span>Voltar</span>
            </button>
            <h2 style={S.title}>{preview.nome_original}</h2>
            <p style={S.subtitle}>
              {formatarTamanho(preview.tamanho)} • {formatarDataBR(preview.created_at || preview.data)}
              {preview.categoria && <> • <CategoriaBadge categoria={preview.categoria} /></>}
            </p>
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              style={{
                ...S.btnSecondary,
                ...(hoveredBtn === "download-preview" ? S.btnSecondaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("download-preview")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => baixarArquivo(preview)}
            >
              {Icons.download}
              <span>Baixar</span>
            </button>
            <button
              style={{
                ...S.btnDanger,
                ...(hoveredBtn === "delete-preview" ? S.btnDangerHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("delete-preview")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={() => setConfirmarExclusao(preview)}
            >
              {Icons.trash}
              <span>Excluir</span>
            </button>
          </div>
        </div>

        {/* Imagem */}
        <div style={S.previewCard}>
          <img
            src={imgUrl}
            alt={preview.nome_original}
            style={S.previewImage}
            onError={(e) => {
              e.target.style.display = "none";
              e.target.parentElement.innerHTML =
                '<div style="padding:48px;text-align:center;color:#94a3b8;font-size:14px;">Não foi possível carregar a imagem.</div>';
            }}
          />
        </div>

        {preview.descricao && (
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.fileSmall}</span>
              <span style={S.formCardTitle}>Descrição</span>
            </div>
            <p style={S.previewDesc}>{preview.descricao}</p>
          </div>
        )}

        {/* Modal exclusão */}
        {confirmarExclusao && (
          <div style={S.overlay} onClick={() => setConfirmarExclusao(null)}>
            <div style={S.modal} onClick={(e) => e.stopPropagation()}>
              <div style={S.modalIconWrap}>{Icons.alertTriangle}</div>
              <h3 style={S.confirmTitle}>Excluir arquivo?</h3>
              <p style={S.confirmText}>
                <strong>{confirmarExclusao.nome_original}</strong> será permanentemente removido.
              </p>
              <div style={S.modalActions}>
                <button
                  style={{
                    ...S.btnSecondary,
                    ...(hoveredBtn === "cancel-modal-p" ? S.btnSecondaryHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("cancel-modal-p")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={() => setConfirmarExclusao(null)}
                  disabled={excluindo}
                >
                  Cancelar
                </button>
                <button
                  style={{
                    ...S.btnDanger,
                    ...(hoveredBtn === "confirm-modal-p" ? S.btnDangerHover : {}),
                  }}
                  onMouseEnter={() => setHoveredBtn("confirm-modal-p")}
                  onMouseLeave={() => setHoveredBtn(null)}
                  onClick={handleExcluir}
                  disabled={excluindo}
                >
                  {Icons.trash}
                  <span>{excluindo ? "Excluindo..." : "Confirmar exclusão"}</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <style>{`
          @keyframes arquivo-fade-in {
            from { opacity: 0; transform: translateY(8px); }
            to { opacity: 1; transform: translateY(0); }
          }
        `}</style>
      </div>
    );
  }

  return null;
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  folderArea: { display: "flex", flexDirection: "column", gap: "16px" },
  contentPanel: { minHeight: "260px", padding: "24px", background: "#fff", border: "1px solid #f1f5f9", borderRadius: "16px", display: "flex", flexDirection: "column", gap: "20px" },
  panelEmptyHint: { display: "flex", alignItems: "center", justifyContent: "center", gap: "10px", padding: "28px 16px", color: "#94a3b8", fontSize: "13px" },
  breadcrumbs: { display: "flex", alignItems: "center", flexWrap: "wrap", gap: "8px", minHeight: "28px", color: "#94a3b8", fontSize: "13px" },
  breadcrumbPart: { display: "inline-flex", alignItems: "center", gap: "8px" },
  breadcrumbSlash: { color: "#cbd5e1" },
  breadcrumbButton: { border: "none", background: "transparent", color: "#64748b", padding: "4px 0", fontSize: "13px", fontWeight: "600", cursor: "pointer" },
  folderGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: "22px 18px" },
  folderCard: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "5px", padding: "4px 5px 8px", minHeight: "132px", textAlign: "center", background: "transparent", border: "1px solid transparent", borderRadius: "10px", transition: "all .18s ease" },
  folderOpenButton: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "flex-start", gap: "7px", width: "100%", padding: "0", border: "none", background: "transparent", textAlign: "center", cursor: "pointer" },
  folderDeleteButton: { display: "inline-flex", alignItems: "center", justifyContent: "center", alignSelf: "flex-end", gap: "6px", padding: "6px 9px", border: "1px solid #fee2e2", borderRadius: "8px", background: "#fff", color: "#dc2626", fontSize: "12px", fontWeight: "600", cursor: "pointer" },
  folderCardIcon: { display: "flex", alignItems: "center", justifyContent: "center", width: "100px", height: "100px", color: "#258ff0" },
  folderCardName: { color: "#0f172a", fontSize: "13px", fontWeight: "500", lineHeight: 1.25, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: "100%" },
  folderCardHint: { display: "none" },
  newMenu: { position: "absolute", top: "calc(100% + 8px)", right: 0, zIndex: 30, width: "190px", padding: "6px", background: "#fff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 32px rgba(15,23,42,.12)" },
  newMenuItem: { display: "flex", alignItems: "center", gap: "10px", width: "100%", padding: "10px 12px", border: "none", borderRadius: "8px", background: "transparent", color: "#334155", fontSize: "13px", fontWeight: "550", textAlign: "left", cursor: "pointer" },
  wrapper: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
    animation: "arquivo-fade-in 0.3s ease",
  },

  /* ── Header ──────────────────────────────────── */
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: "16px",
    flexWrap: "wrap",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.02em",
    lineHeight: 1.2,
  },
  subtitle: {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "500",
    lineHeight: 1.4,
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },

  /* ── Back Button ─────────────────────────────── */
  backBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "none",
    background: "none",
    color: "#64748b",
    fontWeight: "600",
    fontSize: "13px",
    cursor: "pointer",
    padding: "6px 10px 6px 4px",
    marginBottom: "8px",
    marginLeft: "-4px",
    borderRadius: "8px",
    transition: "all 0.15s ease",
  },
  backBtnHover: { background: "#f1f5f9", color: "#0f172a" },

  /* ── Buttons ─────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex", alignItems: "center", gap: "8px",
    border: "none", borderRadius: "10px", padding: "10px 20px",
    background: "#2563eb", color: "#fff", fontWeight: "600", fontSize: "14px",
    cursor: "pointer", boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease", whiteSpace: "nowrap", height: "40px", boxSizing: "border-box",
  },
  btnPrimaryHover: {
    background: "#1d4ed8", boxShadow: "0 4px 12px rgba(37,99,235,0.3)", transform: "translateY(-1px)",
  },
  btnSecondary: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "1px solid #e2e8f0", borderRadius: "10px", padding: "0 16px",
    background: "#fff", color: "#475569", fontWeight: "500", fontSize: "13px",
    cursor: "pointer", transition: "all 0.15s ease", whiteSpace: "nowrap",
    height: "40px", boxSizing: "border-box",
  },
  btnSecondaryHover: { background: "#f8fafc", borderColor: "#cbd5e1" },
  btnDanger: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    border: "none", borderRadius: "10px", padding: "0 16px",
    background: "#ef4444", color: "#fff", fontWeight: "600", fontSize: "13px",
    cursor: "pointer", transition: "all 0.2s ease", whiteSpace: "nowrap",
    height: "40px", boxSizing: "border-box",
  },
  btnDangerHover: {
    background: "#dc2626", boxShadow: "0 4px 12px rgba(239,68,68,0.3)", transform: "translateY(-1px)",
  },

  /* ── Filters ─────────────────────────────────── */
  filtersRow: {
    display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center",
  },
  searchBox: {
    display: "flex", alignItems: "center", gap: "8px", flex: 1, minWidth: "200px",
    background: "#fff", border: "1px solid #e2e8f0", borderRadius: "10px",
    padding: "0 14px", height: "40px", transition: "border-color 0.2s",
  },
  searchIcon: { display: "flex", color: "#94a3b8", flexShrink: 0 },
  searchInput: {
    flex: 1, border: "none", outline: "none", fontSize: "14px",
    color: "#0f172a", background: "transparent",
  },
  searchClear: {
    display: "flex", alignItems: "center", justifyContent: "center",
    background: "none", border: "none", color: "#94a3b8", cursor: "pointer",
    padding: "4px", borderRadius: "6px", transition: "all 0.15s",
  },
  filterSelect: {
    height: "40px", borderRadius: "10px", border: "1px solid #e2e8f0",
    padding: "0 14px", fontSize: "13px", fontWeight: "500", color: "#475569",
    background: "#fff", cursor: "pointer", outline: "none",
  },

  /* ── Feedback ────────────────────────────────── */
  feedbackBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "16px", padding: "48px", background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9",
  },
  loadingPulse: { display: "flex", gap: "8px", alignItems: "center" },
  loadingDot1: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "arquivo-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "arquivo-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px", height: "10px", borderRadius: "50%", background: "#2563eb",
    animation: "arquivo-pulse-dot 1.4s ease-in-out infinite", animationDelay: "0.4s",
  },
  feedbackText: { fontSize: "14px", color: "#94a3b8", fontWeight: "500" },
  errorBox: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "#fef2f2", border: "1px solid #fecaca", color: "#b91c1c",
    borderRadius: "12px", padding: "14px 18px", fontSize: "14px", fontWeight: "600",
  },

  /* ── Empty ───────────────────────────────────── */
  emptyBox: {
    display: "flex", flexDirection: "column", alignItems: "center",
    gap: "12px", padding: "64px 24px", background: "#fff", borderRadius: "16px",
    border: "1px solid #f1f5f9", textAlign: "center",
  },
  emptyTitle: { margin: 0, fontSize: "16px", fontWeight: "600", color: "#0f172a" },
  emptyText: { margin: 0, fontSize: "14px", color: "#94a3b8", lineHeight: 1.5, maxWidth: "360px" },

  /* ── Card Grid ───────────────────────────────── */
  fileExplorerGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(112px, 1fr))", gap: "22px 18px", alignItems: "start" },
  fileExplorerItem: { position: "relative", display: "flex", flexDirection: "column", alignItems: "center", gap: "7px", minWidth: 0, padding: "4px 5px 8px", borderRadius: "10px", transition: "background .15s ease" },
  fileExplorerItemHover: { background: "#f8fafc" },
  fileTileButton: { display: "flex", alignItems: "center", justifyContent: "center", width: "100%", height: "100px", padding: 0, border: "none", background: "transparent", cursor: "pointer" },
  fileTileImage: { width: "100px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", background: "#f8fafc", borderRadius: "3px", boxShadow: "0 2px 5px rgba(15,23,42,.16)" },
  fileThumbnail: { width: "100%", height: "100%", objectFit: "contain", display: "block" },
  fileTileFallback: { color: "#94a3b8" },
  fileTilePdf: { width: "100px", height: "80px", display: "flex", flexDirection: "column", alignItems: "flex-start", justifyContent: "space-between", padding: "11px 13px", boxSizing: "border-box", background: "#d9001b", color: "#fff", boxShadow: "0 2px 5px rgba(15,23,42,.18)" },
  fileTileGeneric: { width: "100px", height: "80px", display: "flex", alignItems: "center", justifyContent: "center", background: "#eef2f7", color: "#64748b", boxShadow: "0 2px 5px rgba(15,23,42,.12)" },
  fileTileName: { width: "100%", color: "#0f172a", fontSize: "13px", fontWeight: "500", lineHeight: 1.25, textAlign: "center", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflowWrap: "anywhere", minHeight: "32px" },
  fileTileMeta: { color: "#94a3b8", fontSize: "11px", textAlign: "center" },
  fileTileActions: { position: "absolute", top: "5px", right: "5px", display: "flex", gap: "3px", padding: "3px", borderRadius: "7px", background: "rgba(255,255,255,.96)", boxShadow: "0 2px 8px rgba(15,23,42,.12)" },
  fileTileAction: { width: "25px", height: "25px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "5px", background: "transparent", color: "#475569", cursor: "pointer" },
  cardGrid: {
    display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(360px, 1fr))", gap: "16px",
  },

  /* ── Card ─────────────────────────────────────── */
  card: {
    background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9",
    padding: "20px", display: "flex", flexDirection: "column", gap: "14px",
    transition: "all 0.2s ease", cursor: "default",
  },
  cardHover: { boxShadow: "0 8px 24px rgba(15,23,42,0.06)", borderColor: "#e2e8f0" },
  cardTop: { display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" },
  cardId: { fontSize: "12px", color: "#cbd5e1", fontWeight: "500", flexShrink: 0 },
  fileName: {
    margin: 0, fontSize: "14px", fontWeight: "600", color: "#0f172a",
    overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
  },
  fileMeta: {
    display: "flex", alignItems: "center", gap: "6px",
    fontSize: "12px", color: "#94a3b8", fontWeight: "500", marginTop: "2px",
  },
  cardDesc: {
    margin: 0, fontSize: "13px", color: "#64748b", lineHeight: 1.5,
    display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
  },

  /* ── Card Actions ────────────────────────────── */
  cardActions: {
    display: "flex", gap: "8px", borderTop: "1px solid #f1f5f9",
    paddingTop: "14px", marginTop: "auto",
  },
  cardBtn: {
    flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
    gap: "6px", border: "1px solid #f1f5f9", background: "#fff", borderRadius: "8px",
    padding: "8px 0", fontSize: "13px", fontWeight: "500", color: "#475569",
    cursor: "pointer", transition: "all 0.15s ease",
  },
  cardBtnHover: { background: "#f8fafc", borderColor: "#e2e8f0" },
  cardBtnDanger: { color: "#ef4444", borderColor: "#fef2f2" },
  cardBtnDangerHover: { background: "#fef2f2", borderColor: "#fecaca", color: "#dc2626" },

  /* ── Modal ───────────────────────────────────── */
  overlay: {
    position: "fixed", inset: 0, background: "rgba(15,23,42,0.4)",
    backdropFilter: "blur(6px)", display: "flex", alignItems: "center",
    justifyContent: "center", padding: "20px", zIndex: 999,
  },
  modal: {
    width: "100%", maxWidth: "420px", background: "#fff", borderRadius: "16px",
    padding: "32px", textAlign: "center", boxShadow: "0 24px 64px rgba(15,23,42,0.18)",
    animation: "arquivo-fade-in 0.2s ease",
  },
  modalIconWrap: { display: "flex", justifyContent: "center", marginBottom: "4px" },
  confirmTitle: { margin: "12px 0 0", fontSize: "17px", fontWeight: "700", color: "#0f172a", lineHeight: 1.3 },
  confirmText: { margin: "8px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 },
  modalActions: { display: "flex", justifyContent: "center", gap: "10px", marginTop: "24px" },

  viewerOverlay: {
    position: "fixed", inset: 0, zIndex: 1200, display: "flex", alignItems: "center",
    justifyContent: "center", padding: "24px", background: "rgba(15,23,42,.68)",
    backdropFilter: "blur(5px)",
  },
  viewerModal: {
    width: "min(100%, 1040px)", height: "min(90vh, 820px)", background: "#fff",
    borderRadius: "16px", boxShadow: "0 24px 80px rgba(0,0,0,.3)", display: "flex",
    flexDirection: "column", overflow: "hidden",
  },
  viewerHeader: {
    minHeight: "66px", padding: "12px 18px", display: "flex", alignItems: "center",
    justifyContent: "space-between", gap: "16px", borderBottom: "1px solid #e2e8f0",
  },
  viewerTitle: { fontSize: "14px", fontWeight: "700", color: "#0f172a", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  viewerSubtitle: { marginTop: "4px", fontSize: "12px", color: "#94a3b8" },
  viewerHeaderActions: { display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 },
  viewerClose: { width: "36px", height: "36px", display: "inline-flex", alignItems: "center", justifyContent: "center", border: "none", borderRadius: "9px", background: "#f1f5f9", color: "#475569", cursor: "pointer" },
  viewerBody: { flex: 1, minHeight: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "#f1f5f9", overflow: "auto" },
  viewerImage: { maxWidth: "100%", maxHeight: "100%", objectFit: "contain", display: "block" },
  viewerFrame: { width: "100%", height: "100%", border: "none", background: "#fff" },
  viewerMessage: { color: "#64748b", fontSize: "14px" },
  viewerUnsupported: { display: "flex", flexDirection: "column", alignItems: "center", gap: "16px", color: "#64748b", fontSize: "14px", padding: "24px", textAlign: "center" },

  /* ── Form ────────────────────────────────────── */
  formCard: {
    background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9", padding: "22px",
  },
  formCardHeader: { display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" },
  formCardIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "32px", height: "32px", borderRadius: "8px",
    background: "#eff6ff", color: "#2563eb", flexShrink: 0,
  },
  formCardTitle: { fontSize: "14px", fontWeight: "600", color: "#0f172a", letterSpacing: "-0.01em" },
  input: {
    width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
    padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff",
    boxSizing: "border-box", color: "#0f172a", transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },

  /* ── Preview ─────────────────────────────────── */
  previewCard: {
    background: "#fff", borderRadius: "16px", border: "1px solid #f1f5f9",
    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
    minHeight: "300px",
  },
  previewImage: {
    maxWidth: "100%", maxHeight: "70vh", objectFit: "contain", display: "block",
  },
  previewDesc: {
    margin: 0, fontSize: "14px", color: "#334155", lineHeight: 1.6,
    whiteSpace: "pre-wrap", wordBreak: "break-word",
  },
};

export default AbaArquivos;