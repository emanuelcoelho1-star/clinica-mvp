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

function isImagem(nome) {
  const ext = getExtensao(nome);
  return ["jpg", "jpeg", "png", "gif", "webp", "svg", "bmp"].includes(ext);
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
  upload: (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" x2="12" y1="3" y2="15" />
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
function FileIcon({ nome }) {
  const ext = getExtensao(nome);
  const cfg = EXT_ICONS[ext] || { bg: "#f8fafc", color: "#64748b" };
  return (
    <div
      style={{
        width: "40px",
        height: "40px",
        borderRadius: "10px",
        background: cfg.bg,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
        color: cfg.color,
      }}
    >
      {isImagem(nome) ? Icons.image : Icons.fileSmall}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   COMPONENTE
   ═══════════════════════════════════════════════════════════ */
function AbaArquivos({ pacienteId }) {
  const [arquivos, setArquivos] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  const [tela, setTela] = useState("lista"); // "lista" | "upload" | "preview"
  const [preview, setPreview] = useState(null);

  // Upload
  const [selectedFiles, setSelectedFiles] = useState([]);
  const [categoria, setCategoria] = useState("outro");
  const [descricao, setDescricao] = useState("");
  const [uploading, setUploading] = useState(false);
  const [erroUpload, setErroUpload] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  // Busca e filtros
  const [busca, setBusca] = useState("");
  const [filtroCategoria, setFiltroCategoria] = useState("todos");

  // Excluir
  const [confirmarExclusao, setConfirmarExclusao] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  // Hover
  const [hoveredCardId, setHoveredCardId] = useState(null);
  const [hoveredBtn, setHoveredBtn] = useState(null);

  /* ── Carregar ────────────────────────────── */
  useEffect(() => {
    carregarArquivos();
  }, [pacienteId]);

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
  const arquivosFiltrados = arquivos.filter((a) => {
    const matchBusca =
      !busca ||
      (a.nome_original || "").toLowerCase().includes(busca.toLowerCase()) ||
      (a.descricao || "").toLowerCase().includes(busca.toLowerCase());
    const matchCategoria =
      filtroCategoria === "todos" || a.categoria === filtroCategoria;
    return matchBusca && matchCategoria;
  });

  /* ── Upload ──────────────────────────────── */
  function abrirUpload() {
    setSelectedFiles([]);
    setCategoria("outro");
    setDescricao("");
    setErroUpload("");
    setTela("upload");
  }

  function handleFileSelect(e) {
    const files = Array.from(e.target.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    const files = Array.from(e.dataTransfer.files || []);
    setSelectedFiles((prev) => [...prev, ...files]);
  }

  function removerFile(index) {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleUpload(e) {
    e.preventDefault();
    if (selectedFiles.length === 0) {
      setErroUpload("Selecione pelo menos um arquivo.");
      return;
    }

    try {
      setUploading(true);
      setErroUpload("");
      const tk = localStorage.getItem("token");

      for (const file of selectedFiles) {
        const formData = new FormData();
        formData.append("arquivo", file);
        formData.append("paciente_id", pacienteId);
        formData.append("categoria", categoria);
        formData.append("descricao", descricao);

        const r = await fetch(`${API_URL}/arquivos`, {
          method: "POST",
          headers: { Authorization: tk || "" },
          body: formData,
        });
        if (!r.ok) throw new Error();
      }

      await carregarArquivos();
      voltarParaLista();
    } catch {
      setErroUpload("Não foi possível enviar o(s) arquivo(s).");
    } finally {
      setUploading(false);
    }
  }

  function voltarParaLista() {
    setTela("lista");
    setPreview(null);
    setSelectedFiles([]);
    setErroUpload("");
  }

  /* ── Preview ─────────────────────────────── */
  function abrirPreview(arquivo) {
    setPreview(arquivo);
    setTela("preview");
  }

  /* ── Baixar ──────────────────────────────── */
  function baixarArquivo(arquivo) {
    const tk = localStorage.getItem("token");
    const url = `${API_URL}/arquivos/${arquivo.id}/download?token=${encodeURIComponent(tk || "")}`;
    window.open(url, "_blank");
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

  /* ═══════════════════════════════════════════
     RENDER — LISTA
     ═══════════════════════════════════════════ */
  if (tela === "lista") {
    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <h2 style={S.title}>Arquivos</h2>
            <p style={S.subtitle}>
              {arquivos.length} arquivo{arquivos.length !== 1 ? "s" : ""} armazenado
              {arquivos.length !== 1 ? "s" : ""}
            </p>
          </div>
          <button
            style={{
              ...S.btnPrimary,
              ...(hoveredBtn === "upload" ? S.btnPrimaryHover : {}),
            }}
            onMouseEnter={() => setHoveredBtn("upload")}
            onMouseLeave={() => setHoveredBtn(null)}
            onClick={abrirUpload}
          >
            {Icons.upload}
            <span>Enviar arquivo</span>
          </button>
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

        {/* Erro */}
        {erro && <div style={S.errorBox}><span>{erro}</span></div>}

        {/* Vazio */}
        {!carregando && !erro && arquivos.length === 0 && (
          <div style={S.emptyBox}>
            {Icons.folder}
            <h3 style={S.emptyTitle}>Nenhum arquivo armazenado</h3>
            <p style={S.emptyText}>
              Envie exames, receitas, radiografias e outros documentos do paciente.
            </p>
            <button
              style={{
                ...S.btnPrimary,
                marginTop: "4px",
                ...(hoveredBtn === "upload-empty" ? S.btnPrimaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("upload-empty")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={abrirUpload}
            >
              {Icons.upload}
              <span>Enviar primeiro arquivo</span>
            </button>
          </div>
        )}

        {/* Sem resultados de filtro */}
        {!carregando && !erro && arquivos.length > 0 && arquivosFiltrados.length === 0 && (
          <div style={S.emptyBox}>
            <span style={{ color: "#94a3b8" }}>{Icons.search}</span>
            <h3 style={S.emptyTitle}>Nenhum resultado encontrado</h3>
            <p style={S.emptyText}>Tente ajustar o filtro ou termo de busca.</p>
          </div>
        )}

        {/* Lista de cards */}
        {!carregando && !erro && arquivosFiltrados.length > 0 && (
          <div style={S.cardGrid}>
            {arquivosFiltrados.map((a) => {
              const hovered = hoveredCardId === a.id;
              return (
                <div
                  key={a.id}
                  style={{ ...S.card, ...(hovered ? S.cardHover : {}) }}
                  onMouseEnter={() => setHoveredCardId(a.id)}
                  onMouseLeave={() => setHoveredCardId(null)}
                >
                  {/* Topo */}
                  <div style={S.cardTop}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px", flex: 1, minWidth: 0 }}>
                      <FileIcon nome={a.nome_original} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <p style={S.fileName}>{a.nome_original || "Arquivo"}</p>
                        <div style={S.fileMeta}>
                          <span>{formatarTamanho(a.tamanho)}</span>
                          <span>•</span>
                          <span>{formatarDataBR(a.created_at || a.data)}</span>
                        </div>
                      </div>
                    </div>
                    <span style={S.cardId}>#{a.id}</span>
                  </div>

                  {/* Categoria + Descrição */}
                  <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                    {a.categoria && <CategoriaBadge categoria={a.categoria} />}
                    {a.descricao && (
                      <p style={S.cardDesc}>{a.descricao}</p>
                    )}
                  </div>

                  {/* Ações */}
                  <div style={S.cardActions}>
                    {isImagem(a.nome_original) && (
                      <button
                        style={{
                          ...S.cardBtn,
                          ...(hoveredBtn === `preview-${a.id}` ? S.cardBtnHover : {}),
                        }}
                        onMouseEnter={() => setHoveredBtn(`preview-${a.id}`)}
                        onMouseLeave={() => setHoveredBtn(null)}
                        onClick={() => abrirPreview(a)}
                      >
                        {Icons.eye}
                        <span>Ver</span>
                      </button>
                    )}
                    <button
                      style={{
                        ...S.cardBtn,
                        ...(hoveredBtn === `download-${a.id}` ? S.cardBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`download-${a.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => baixarArquivo(a)}
                    >
                      {Icons.download}
                      <span>Baixar</span>
                    </button>
                    <button
                      style={{
                        ...S.cardBtn,
                        ...S.cardBtnDanger,
                        ...(hoveredBtn === `excluir-${a.id}` ? S.cardBtnDangerHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`excluir-${a.id}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => setConfirmarExclusao(a)}
                    >
                      {Icons.trash}
                      <span>Excluir</span>
                    </button>
                  </div>
                </div>
              );
            })}
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
     RENDER — UPLOAD
     ═══════════════════════════════════════════ */
  if (tela === "upload") {
    return (
      <div style={S.wrapper}>
        {/* Header */}
        <div style={S.header}>
          <div>
            <button
              style={{
                ...S.backBtn,
                ...(hoveredBtn === "back-upload" ? S.backBtnHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("back-upload")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
            >
              {Icons.arrowLeft}
              <span>Voltar</span>
            </button>
            <h2 style={S.title}>Enviar arquivos</h2>
            <p style={S.subtitle}>Selecione os arquivos que deseja enviar para o prontuário.</p>
          </div>
        </div>

        <form onSubmit={handleUpload} style={S.formWrap}>
          {/* Drop zone */}
          <div
            style={{
              ...S.dropZone,
              ...(dragOver ? S.dropZoneActive : {}),
            }}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
          >
            <div style={S.dropIcon}>{Icons.upload}</div>
            <p style={S.dropTitle}>
              Arraste arquivos aqui ou <span style={S.dropLink}>clique para selecionar</span>
            </p>
            <p style={S.dropHint}>PDF, imagens, documentos — até 10 MB por arquivo</p>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              onChange={handleFileSelect}
              style={{ display: "none" }}
            />
          </div>

          {/* Arquivos selecionados */}
          {selectedFiles.length > 0 && (
            <div style={S.formCard}>
              <div style={S.formCardHeader}>
                <span style={S.formCardIcon}>{Icons.fileSmall}</span>
                <span style={S.formCardTitle}>
                  {selectedFiles.length} arquivo{selectedFiles.length !== 1 ? "s" : ""} selecionado{selectedFiles.length !== 1 ? "s" : ""}
                </span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {selectedFiles.map((file, idx) => (
                  <div key={idx} style={S.fileRow}>
                    <FileIcon nome={file.name} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={S.fileName}>{file.name}</p>
                      <span style={S.fileMeta}>{formatarTamanho(file.size)}</span>
                    </div>
                    <button
                      type="button"
                      style={{
                        ...S.removeFileBtn,
                        ...(hoveredBtn === `rm-${idx}` ? S.removeFileBtnHover : {}),
                      }}
                      onMouseEnter={() => setHoveredBtn(`rm-${idx}`)}
                      onMouseLeave={() => setHoveredBtn(null)}
                      onClick={() => removerFile(idx)}
                    >
                      {Icons.close}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Categoria + Descrição */}
          <div style={S.formCard}>
            <div style={S.formCardHeader}>
              <span style={S.formCardIcon}>{Icons.file}</span>
              <span style={S.formCardTitle}>Detalhes</span>
            </div>
            <div style={S.formGrid2}>
              <div style={S.fieldGroup}>
                <label style={S.label}>Categoria</label>
                <select
                  value={categoria}
                  onChange={(e) => setCategoria(e.target.value)}
                  style={S.input}
                >
                  {CATEGORIAS.map((c) => (
                    <option key={c.value} value={c.value}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>
              <div style={S.fieldGroup}>
                <label style={S.label}>Descrição (opcional)</label>
                <input
                  type="text"
                  value={descricao}
                  onChange={(e) => setDescricao(e.target.value)}
                  placeholder="Ex: Panorâmica 2026"
                  style={S.input}
                />
              </div>
            </div>
          </div>

          {/* Erro */}
          {erroUpload && <div style={S.errorBox}><span>{erroUpload}</span></div>}

          {/* Ações */}
          <div style={S.formActions}>
            <button
              type="button"
              style={{
                ...S.btnSecondary,
                ...(hoveredBtn === "cancel-upload" ? S.btnSecondaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("cancel-upload")}
              onMouseLeave={() => setHoveredBtn(null)}
              onClick={voltarParaLista}
              disabled={uploading}
            >
              Cancelar
            </button>
            <button
              type="submit"
              style={{
                ...S.btnPrimary,
                ...(hoveredBtn === "confirm-upload" ? S.btnPrimaryHover : {}),
              }}
              onMouseEnter={() => setHoveredBtn("confirm-upload")}
              onMouseLeave={() => setHoveredBtn(null)}
              disabled={uploading || selectedFiles.length === 0}
            >
              {Icons.upload}
              <span>{uploading ? "Enviando..." : "Enviar arquivos"}</span>
            </button>
          </div>
        </form>

        <style>{`
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
    const tk = localStorage.getItem("token");
    const imgUrl = `${API_URL}/arquivos/${preview.id}/download?token=${encodeURIComponent(tk || "")}`;

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

  /* ── Form ────────────────────────────────────── */
  formWrap: { display: "flex", flexDirection: "column", gap: "16px" },
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
  formGrid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "6px" },
  label: { fontSize: "12px", fontWeight: "600", color: "#64748b", letterSpacing: "0.02em" },
  input: {
    width: "100%", height: "42px", borderRadius: "10px", border: "1px solid #e2e8f0",
    padding: "0 14px", outline: "none", fontSize: "14px", background: "#fff",
    boxSizing: "border-box", color: "#0f172a", transition: "border-color 0.2s ease, box-shadow 0.2s ease",
  },
  formActions: { display: "flex", justifyContent: "flex-end", gap: "10px", flexWrap: "wrap" },

  /* ── Drop Zone ───────────────────────────────── */
  dropZone: {
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    gap: "12px", padding: "48px 24px", background: "#fff", borderRadius: "16px",
    border: "2px dashed #e2e8f0", cursor: "pointer", transition: "all 0.2s ease",
    textAlign: "center",
  },
  dropZoneActive: {
    borderColor: "#2563eb", background: "#eff6ff",
  },
  dropIcon: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "48px", height: "48px", borderRadius: "12px",
    background: "#eff6ff", color: "#2563eb",
  },
  dropTitle: {
    margin: 0, fontSize: "14px", fontWeight: "600", color: "#334155",
  },
  dropLink: { color: "#2563eb", textDecoration: "underline" },
  dropHint: {
    margin: 0, fontSize: "13px", color: "#94a3b8",
  },

  /* ── File row ────────────────────────────────── */
  fileRow: {
    display: "flex", alignItems: "center", gap: "12px",
    background: "#fafbfc", borderRadius: "10px", padding: "12px 14px",
    border: "1px solid #f1f5f9",
  },
  removeFileBtn: {
    display: "flex", alignItems: "center", justifyContent: "center",
    width: "28px", height: "28px", borderRadius: "6px",
    border: "1px solid #f1f5f9", background: "#fff", color: "#94a3b8",
    cursor: "pointer", flexShrink: 0, transition: "all 0.15s ease",
  },
  removeFileBtnHover: { background: "#fef2f2", borderColor: "#fecaca", color: "#ef4444" },

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