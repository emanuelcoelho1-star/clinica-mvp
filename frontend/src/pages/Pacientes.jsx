import API_URL from "../api";
import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import { useNavigate } from "react-router-dom";

/* ── helpers ─────────────────────────────────────────────── */
const AVATAR_PALETTES = [
  { bg: "#f0f4ff", color: "#4361ee" },
  { bg: "#fef3f2", color: "#e63946" },
  { bg: "#f0fdf4", color: "#16a34a" },
  { bg: "#fefce8", color: "#ca8a04" },
  { bg: "#faf5ff", color: "#9333ea" },
  { bg: "#fff1f2", color: "#e11d48" },
  { bg: "#ecfeff", color: "#0891b2" },
  { bg: "#fdf4ff", color: "#c026d3" },
];

function getAvatarColor(name) {
  let hash = 0;
  for (let i = 0; i < (name || "").length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_PALETTES[Math.abs(hash) % AVATAR_PALETTES.length];
}

function formatCpf(cpf) {
  if (!cpf) return "—";
  const digits = cpf.replace(/\D/g, "");
  if (digits.length === 11) {
    return `${digits.slice(0, 3)}.${digits.slice(3, 6)}.${digits.slice(6, 9)}-${digits.slice(9)}`;
  }
  return cpf;
}

function getInitials(name) {
  if (!name) return "?";
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return parts[0][0].toUpperCase();
}

/* ── Constantes de paginação ──────────────────────────────── */
const ITEMS_PER_PAGE = 20;
const DEBOUNCE_MS = 400;

/* ── SVG Icons (inline, sem dependências) ────────────────── */
const Icons = {
  search: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <path d="m21 21-4.35-4.35" />
    </svg>
  ),
  plus: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 5v14" />
      <path d="M5 12h14" />
    </svg>
  ),
  refresh: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
      <path d="M3 3v5h5" />
      <path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16" />
      <path d="M16 16h5v5" />
    </svg>
  ),
  phone: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
    </svg>
  ),
  mail: (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect width="20" height="16" x="2" y="4" rx="2" />
      <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
    </svg>
  ),
  whatsapp: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
    </svg>
  ),
  edit: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
      <path d="m15 5 4 4" />
    </svg>
  ),
  trash: (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  ),
  chevronLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m15 18-6-6 6-6" />
    </svg>
  ),
  chevronRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m9 18 6-6-6-6" />
    </svg>
  ),
  chevronsLeft: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m11 17-5-5 5-5" />
      <path d="m18 17-5-5 5-5" />
    </svg>
  ),
  chevronsRight: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="m6 17 5-5-5-5" />
      <path d="m13 17 5-5-5-5" />
    </svg>
  ),
  emptyState: (
    <svg width="64" height="64" viewBox="0 0 120 120" fill="none">
      <rect x="10" y="24" width="100" height="76" rx="16" fill="#f1f5f9" stroke="#e2e8f0" strokeWidth="2" />
      <rect x="22" y="40" width="76" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="56" width="52" height="8" rx="4" fill="#e2e8f0" />
      <rect x="22" y="72" width="64" height="8" rx="4" fill="#e2e8f0" />
      <circle cx="96" cy="24" r="18" fill="#eff6ff" stroke="#bfdbfe" strokeWidth="2" />
      <path d="M96 16v16M88 24h16" stroke="#2563eb" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  ),
};

/* ── Componente Principal ────────────────────────────────── */
function Pacientes() {
  const navigate = useNavigate();

  /* ── Estado de dados ────────────────────────────────── */
  const [pacientes, setPacientes] = useState([]);
  const [carregando, setCarregando] = useState(true);

  /* ── Estado de paginação ────────────────────────────── */
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  /* ── Estado de busca (com debounce) ─────────────────── */
  const [busca, setBusca] = useState("");
  const [buscaDebounced, setBuscaDebounced] = useState("");
  const debounceRef = useRef(null);

  /* ── Estado de UI ───────────────────────────────────── */
  const [hoveredId, setHoveredId] = useState(null);
  const [searchFocused, setSearchFocused] = useState(false);

  /* ── Debounce da busca ─────────────────────────────── */
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setBuscaDebounced(busca);
      setPage(1);
    }, DEBOUNCE_MS);
    return () => clearTimeout(debounceRef.current);
  }, [busca]);

  /* ── Fetch paginado ────────────────────────────────── */
  const carregarPacientes = useCallback(() => {
    const token = localStorage.getItem("token");
    setCarregando(true);

    const params = new URLSearchParams({
      page: String(page),
      limit: String(ITEMS_PER_PAGE),
    });

    if (buscaDebounced) {
      params.set("busca", buscaDebounced);
    }

    fetch(`${API_URL}/pacientes?${params.toString()}`, {
      headers: { Authorization: token },
    })
      .then((res) => res.json())
      .then((data) => {
        // Compatibilidade: se backend ainda retorna array (deploy gradual)
        if (Array.isArray(data)) {
          setPacientes(data);
          setTotal(data.length);
          setTotalPages(1);
        } else {
          setPacientes(Array.isArray(data.dados) ? data.dados : []);
          setTotal(data.paginacao?.total ?? 0);
          setTotalPages(data.paginacao?.totalPages ?? 1);
        }
        setCarregando(false);
      })
      .catch((err) => {
        console.error("Erro ao carregar pacientes:", err);
        setCarregando(false);
      });
  }, [page, buscaDebounced]);

  useEffect(() => {
    carregarPacientes();
  }, [carregarPacientes]);

  /* ── Stats ─────────────────────────────────────────── */
  const stats = useMemo(() => {
    const comTel = pacientes.filter((p) => p.telefone).length;
    const comEmail = pacientes.filter((p) => p.email).length;
    return { total, comTel, comEmail };
  }, [pacientes, total]);

  /* ── Helpers ───────────────────────────────────────── */
  const gerarLinkWhatsApp = (telefone) => {
    if (!telefone) return "#";
    let numero = String(telefone).replace(/\D/g, "");
    if (numero.length === 10 || numero.length === 11) numero = `55${numero}`;
    return `https://wa.me/${numero}`;
  };

  const deletarPaciente = async (id) => {
    if (!confirm("Tem certeza que deseja excluir este paciente?")) return;
    const token = localStorage.getItem("token");
    try {
      const resposta = await fetch(`${API_URL}/pacientes/${id}`, {
        method: "DELETE",
        headers: { Authorization: token },
      });
      if (!resposta.ok) throw new Error("Erro ao excluir paciente");
      carregarPacientes();
    } catch (erro) {
      console.error(erro);
      alert("Não foi possível excluir o paciente.");
    }
  };

  /* ── Navegação de páginas ──────────────────────────── */
  const irParaPagina = (p) => {
    const novaPagina = Math.max(1, Math.min(p, totalPages));
    if (novaPagina !== page) {
      setPage(novaPagina);
    }
  };

  /* Gera números de página visíveis (máx 7 botões) */
  const getPageNumbers = () => {
    const maxVisible = 7;

    if (totalPages <= maxVisible) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }

    const pages = [];
    const left = Math.max(2, page - 1);
    const right = Math.min(totalPages - 1, page + 1);

    pages.push(1);

    if (left > 2) {
      pages.push("...");
    }

    for (let i = left; i <= right; i++) {
      pages.push(i);
    }

    if (right < totalPages - 1) {
      pages.push("...");
    }

    pages.push(totalPages);

    return pages;
  };

  /* Cálculo "Exibindo X–Y de Z" */
  const startItem = total === 0 ? 0 : (page - 1) * ITEMS_PER_PAGE + 1;
  const endItem = Math.min(page * ITEMS_PER_PAGE, total);

  /* ── Loading State ──────────────────────────────────── */
  if (carregando && pacientes.length === 0) {
    return (
      <div style={s.loadingWrap}>
        <style>{`
          @keyframes pulse-dot {
            0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
            40% { transform: scale(1); opacity: 1; }
          }
        `}</style>
        <div style={s.loadingPulse}>
          <div style={s.loadingDot1} />
          <div style={s.loadingDot2} />
          <div style={s.loadingDot3} />
        </div>
        <span style={s.loadingText}>Carregando pacientes</span>
      </div>
    );
  }

  /* ── Render ─────────────────────────────────────────── */
  return (
    <div style={s.page}>
      {/* ── Responsive CSS ─────────────────────────────── */}
      <style>{`
        @keyframes pulse-dot {
          0%, 80%, 100% { transform: scale(0); opacity: 0.5; }
          40% { transform: scale(1); opacity: 1; }
        }

        /* ── Mobile: até 768px ──────────────────────── */
        @media (max-width: 768px) {
          .pac-header {
            flex-direction: column !important;
            align-items: stretch !important;
          }
          .pac-header-btn {
            align-self: stretch !important;
            justify-content: center !important;
          }
          .pac-stats-row {
            grid-template-columns: 1fr !important;
          }
          .pac-search-bar {
            flex-direction: column !important;
          }
          .pac-search-bar > * {
            width: 100% !important;
          }
          .pac-search-bar button {
            justify-content: center !important;
          }

          /* Esconder cabeçalho tabela em mobile */
          .pac-table-header {
            display: none !important;
          }

          /* Card layout para cada paciente */
          .pac-row {
            flex-wrap: wrap !important;
            padding: 16px !important;
            gap: 10px !important;
            border-bottom: 1px solid #f1f5f9 !important;
          }

          /* Avatar + Nome ocupa linha inteira */
          .pac-cell-name {
            flex: 1 1 100% !important;
            min-width: 0 !important;
          }

          /* CPF, Telefone, Email empilham em coluna */
          .pac-cell-cpf,
          .pac-cell-tel,
          .pac-cell-email {
            width: auto !important;
            flex: 1 1 auto !important;
            min-width: 0 !important;
          }
          .pac-cell-cpf::before {
            content: "CPF: ";
            font-weight: 600;
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-right: 4px;
          }
          .pac-cell-tel::before {
            content: "Tel: ";
            font-weight: 600;
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-right: 4px;
          }
          .pac-cell-email::before {
            content: "E-mail: ";
            font-weight: 600;
            color: #94a3b8;
            font-size: 11px;
            text-transform: uppercase;
            letter-spacing: 0.04em;
            margin-right: 4px;
          }

          /* Ações sempre visíveis em mobile */
          .pac-cell-actions {
            width: auto !important;
            flex: 1 1 100% !important;
            justify-content: flex-start !important;
            opacity: 1 !important;
            padding-top: 4px;
            border-top: 1px solid #f8fafc;
          }

          /* Paginação responsiva */
          .pac-pagination {
            flex-wrap: wrap !important;
            justify-content: center !important;
          }
          .pac-pagination-numbers {
            order: 3 !important;
            flex: 1 1 100% !important;
            justify-content: center !important;
            margin-top: 8px !important;
          }
        }

        /* ── Muito pequeno: até 480px ───────────────── */
        @media (max-width: 480px) {
          .pac-row {
            padding: 14px 12px !important;
          }
          .pac-cell-cpf,
          .pac-cell-tel,
          .pac-cell-email {
            flex: 1 1 100% !important;
          }
        }
      `}</style>

      {/* ── Header ──────────────────────────────────────── */}
      <div className="pac-header" style={s.header}>
        <div style={s.headerLeft}>
          <div style={s.headerTitleRow}>
            <h1 style={s.headerTitle}>Pacientes</h1>
            <span style={s.headerCount}>{total}</span>
          </div>
          <p style={s.headerSub}>
            Gerencie os pacientes cadastrados na clínica
          </p>
        </div>
        <button
          className="pac-header-btn"
          style={s.btnPrimary}
          onClick={() => navigate("/pacientes/novo")}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "translateY(-1px)";
            e.currentTarget.style.boxShadow = "0 6px 20px rgba(37,99,235,0.3)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "translateY(0)";
            e.currentTarget.style.boxShadow = "0 1px 3px rgba(37,99,235,0.2)";
          }}
        >
          {Icons.plus}
          <span>Novo paciente</span>
        </button>
      </div>

      {/* ── Stats ─────────────────────────────────���─────── */}
      <div className="pac-stats-row" style={s.statsRow}>
        {[
          { label: "Total", value: stats.total, accent: "#2563eb", bg: "#eff6ff" },
          { label: "Com telefone", value: stats.comTel, accent: "#16a34a", bg: "#f0fdf4" },
          { label: "Com e-mail", value: stats.comEmail, accent: "#9333ea", bg: "#faf5ff" },
        ].map((stat) => (
          <div key={stat.label} style={s.statCard}>
            <span style={{ ...s.statValue, color: stat.accent }}>{stat.value}</span>
            <span style={s.statLabel}>{stat.label}</span>
            <div style={{ ...s.statBar, background: stat.bg }}>
              <div
                style={{
                  ...s.statBarFill,
                  background: stat.accent,
                  width: stats.total > 0 ? `${(stat.value / stats.total) * 100}%` : "0%",
                }}
              />
            </div>
          </div>
        ))}
      </div>

      {/* ── Search & Filter Bar ──────────────────────────── */}
      <div className="pac-search-bar" style={s.searchBar}>
        <div
          style={{
            ...s.searchInputWrap,
            borderColor: searchFocused ? "#2563eb" : "#e2e8f0",
            boxShadow: searchFocused
              ? "0 0 0 3px rgba(37,99,235,0.1)"
              : "none",
          }}
        >
          <span style={{ ...s.searchIcon, color: searchFocused ? "#2563eb" : "#94a3b8" }}>
            {Icons.search}
          </span>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
            placeholder="Buscar por nome, CPF, telefone ou e-mail..."
            style={s.searchInput}
          />
          {busca && (
            <button
              style={s.searchClear}
              onClick={() => {
                setBusca("");
                setBuscaDebounced("");
                setPage(1);
              }}
            >
              ✕
            </button>
          )}
        </div>
        <button
          style={s.btnSecondary}
          onClick={carregarPacientes}
          onMouseEnter={(e) => (e.currentTarget.style.background = "#f8fafc")}
          onMouseLeave={(e) => (e.currentTarget.style.background = "#fff")}
        >
          {Icons.refresh}
          <span>Atualizar</span>
        </button>
      </div>

      {/* ── Tabela / Lista ──────────────────────────────── */}
      <div style={{
        ...s.tableCard,
        opacity: carregando ? 0.6 : 1,
        transition: "opacity 0.2s ease",
      }}>
        {/* Table header */}
        <div className="pac-table-header" style={s.tableHeader}>
          <span style={{ ...s.thCell, flex: 1 }}>Paciente</span>
          <span style={{ ...s.thCell, width: "150px" }}>CPF</span>
          <span style={{ ...s.thCell, width: "140px" }}>Telefone</span>
          <span style={{ ...s.thCell, width: "180px" }}>E-mail</span>
          <span style={{ ...s.thCell, width: "120px", textAlign: "right" }}>Ações</span>
        </div>

        {/* Conteúdo */}
        {pacientes.length === 0 ? (
          <div style={s.emptyState}>
            {Icons.emptyState}
            <h3 style={s.emptyTitle}>
              {buscaDebounced ? "Nenhum resultado" : "Nenhum paciente"}
            </h3>
            <p style={s.emptyText}>
              {buscaDebounced
                ? `Não encontramos pacientes com "${buscaDebounced}". Tente outro termo.`
                : "Comece cadastrando o primeiro paciente da sua clínica."}
            </p>
            {!buscaDebounced && (
              <button
                style={{ ...s.btnPrimary, marginTop: "4px" }}
                onClick={() => navigate("/pacientes/novo")}
              >
                {Icons.plus}
                <span>Cadastrar primeiro paciente</span>
              </button>
            )}
          </div>
        ) : (
          <ul style={s.list}>
            {pacientes.map((p) => {
              const isHovered = hoveredId === p.id;
              const palette = getAvatarColor(p.nome);
              return (
                <li
                  key={p.id}
                  className="pac-row"
                  style={{
                    ...s.row,
                    background: isHovered ? "#fafbfd" : "transparent",
                  }}
                  onMouseEnter={() => setHoveredId(p.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  {/* Avatar + Nome */}
                  <div className="pac-cell-name" style={{ ...s.rowCell, flex: 1, gap: "14px" }}>
                    <div
                      style={{
                        ...s.avatar,
                        background: palette.bg,
                        color: palette.color,
                      }}
                    >
                      {getInitials(p.nome)}
                    </div>
                    <div style={s.nameWrap}>
                      <button
                        style={{
                          ...s.nameBtn,
                          color: isHovered ? "#2563eb" : "#0f172a",
                        }}
                        onClick={() => navigate(`/pacientes/${p.id}`)}
                      >
                        {p.nome}
                      </button>
                      {p.profissao && (
                        <span style={s.profession}>{p.profissao}</span>
                      )}
                    </div>
                  </div>

                  {/* CPF */}
                  <div className="pac-cell-cpf" style={{ ...s.rowCell, width: "150px" }}>
                    <span style={s.cellText}>{formatCpf(p.cpf)}</span>
                  </div>

                  {/* Telefone */}
                  <div className="pac-cell-tel" style={{ ...s.rowCell, width: "140px" }}>
                    {p.telefone ? (
                      <span style={{ ...s.cellText, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.phone}</span>
                        {p.telefone}
                      </span>
                    ) : (
                      <span style={s.cellEmpty}>—</span>
                    )}
                  </div>

                  {/* Email */}
                  <div className="pac-cell-email" style={{ ...s.rowCell, width: "180px" }}>
                    {p.email ? (
                      <span style={{ ...s.cellText, display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ color: "#94a3b8", display: "flex" }}>{Icons.mail}</span>
                        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                          {p.email}
                        </span>
                      </span>
                    ) : (
                      <span style={s.cellEmpty}>—</span>
                    )}
                  </div>

                  {/* Actions */}
                  <div
                    className="pac-cell-actions"
                    style={{
                      ...s.rowCell,
                      width: "120px",
                      justifyContent: "flex-end",
                      gap: "6px",
                      opacity: isHovered ? 1 : 0.4,
                      transition: "opacity 0.2s ease",
                    }}
                  >
                    {p.telefone && (
                      <a
                        href={gerarLinkWhatsApp(p.telefone)}
                        target="_blank"
                        rel="noreferrer"
                        style={s.actionBtn}
                        title="WhatsApp"
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = "#f0fdf4";
                          e.currentTarget.style.color = "#16a34a";
                          e.currentTarget.style.borderColor = "#bbf7d0";
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = "transparent";
                          e.currentTarget.style.color = "#64748b";
                          e.currentTarget.style.borderColor = "transparent";
                        }}
                      >
                        {Icons.whatsapp}
                      </a>
                    )}
                    <button
                      style={s.actionBtn}
                      onClick={() => navigate(`/pacientes/editar/${p.id}`)}
                      title="Editar paciente"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fffbeb";
                        e.currentTarget.style.color = "#d97706";
                        e.currentTarget.style.borderColor = "#fde68a";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      {Icons.edit}
                    </button>
                    <button
                      style={s.actionBtn}
                      onClick={() => deletarPaciente(p.id)}
                      title="Excluir paciente"
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = "#fef2f2";
                        e.currentTarget.style.color = "#dc2626";
                        e.currentTarget.style.borderColor = "#fecaca";
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = "transparent";
                        e.currentTarget.style.color = "#64748b";
                        e.currentTarget.style.borderColor = "transparent";
                      }}
                    >
                      {Icons.trash}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {/* ── Footer com Paginação ─────────────────────── */}
        {total > 0 && (
          <div className="pac-pagination" style={s.tableFooter}>
            {/* Info de itens */}
            <span style={s.footerText}>
              Exibindo{" "}
              <strong>{startItem}–{endItem}</strong> de{" "}
              <strong>{total}</strong> paciente
              {total !== 1 ? "s" : ""}
            </span>

            {/* Controles de paginação */}
            {totalPages > 1 && (
              <div className="pac-pagination-numbers" style={s.paginationWrap}>
                {/* Primeira página */}
                <button
                  style={{
                    ...s.pageBtn,
                    ...(page === 1 ? s.pageBtnDisabled : {}),
                  }}
                  onClick={() => irParaPagina(1)}
                  disabled={page === 1}
                  title="Primeira página"
                >
                  {Icons.chevronsLeft}
                </button>

                {/* Anterior */}
                <button
                  style={{
                    ...s.pageBtn,
                    ...(page === 1 ? s.pageBtnDisabled : {}),
                  }}
                  onClick={() => irParaPagina(page - 1)}
                  disabled={page === 1}
                  title="Página anterior"
                >
                  {Icons.chevronLeft}
                </button>

                {/* Números */}
                {getPageNumbers().map((p, idx) =>
                  p === "..." ? (
                    <span key={`ellipsis-${idx}`} style={s.pageEllipsis}>
                      …
                    </span>
                  ) : (
                    <button
                      key={p}
                      style={{
                        ...s.pageBtn,
                        ...(p === page ? s.pageBtnActive : {}),
                      }}
                      onClick={() => irParaPagina(p)}
                    >
                      {p}
                    </button>
                  )
                )}

                {/* Próxima */}
                <button
                  style={{
                    ...s.pageBtn,
                    ...(page === totalPages ? s.pageBtnDisabled : {}),
                  }}
                  onClick={() => irParaPagina(page + 1)}
                  disabled={page === totalPages}
                  title="Próxima página"
                >
                  {Icons.chevronRight}
                </button>

                {/* Última página */}
                <button
                  style={{
                    ...s.pageBtn,
                    ...(page === totalPages ? s.pageBtnDisabled : {}),
                  }}
                  onClick={() => irParaPagina(totalPages)}
                  disabled={page === totalPages}
                  title="Última página"
                >
                  {Icons.chevronsRight}
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const s = {
  page: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },

  /* ── Loading ──────────────────────────────────────── */
  loadingWrap: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    gap: "20px",
    minHeight: "400px",
  },
  loadingPulse: {
    display: "flex",
    gap: "8px",
    alignItems: "center",
  },
  loadingDot1: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0s",
  },
  loadingDot2: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0.2s",
  },
  loadingDot3: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#2563eb",
    animation: "pulse-dot 1.4s ease-in-out infinite",
    animationDelay: "0.4s",
  },
  loadingText: {
    fontSize: "14px",
    fontWeight: "500",
    color: "#94a3b8",
    letterSpacing: "0.02em",
  },

  /* ── Header ───────────────────────────────────────── */
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: "16px",
    flexWrap: "wrap",
  },
  headerLeft: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  headerTitleRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  headerTitle: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "700",
    color: "#0f172a",
    letterSpacing: "-0.025em",
    lineHeight: 1.2,
  },
  headerCount: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#f1f5f9",
    color: "#475569",
    borderRadius: "8px",
    fontSize: "13px",
    fontWeight: "600",
    padding: "4px 10px",
    lineHeight: 1,
  },
  headerSub: {
    margin: 0,
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Buttons ──────────────────────────────────────── */
  btnPrimary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    border: "none",
    borderRadius: "10px",
    padding: "10px 20px",
    background: "#2563eb",
    color: "#fff",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
    boxShadow: "0 1px 3px rgba(37,99,235,0.2)",
    transition: "all 0.2s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
  },
  btnSecondary: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #e2e8f0",
    borderRadius: "10px",
    padding: "0 16px",
    background: "#fff",
    color: "#475569",
    fontWeight: "500",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s ease",
    whiteSpace: "nowrap",
    height: "40px",
    boxSizing: "border-box",
  },

  /* ── Stats ────────────────────────────────────────── */
  statsRow: {
    display: "grid",
    gridTemplateColumns: "repeat(3, 1fr)",
    gap: "16px",
  },
  statCard: {
    background: "#fff",
    border: "1px solid #f1f5f9",
    borderRadius: "14px",
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
  },
  statValue: {
    fontSize: "28px",
    fontWeight: "700",
    letterSpacing: "-0.02em",
    lineHeight: 1.1,
  },
  statLabel: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "500",
  },
  statBar: {
    height: "4px",
    borderRadius: "999px",
    marginTop: "8px",
    overflow: "hidden",
  },
  statBarFill: {
    height: "100%",
    borderRadius: "999px",
    transition: "width 0.6s ease",
  },

  /* ── Search Bar ─────��────────────────────────────── */
  searchBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
  },
  searchInputWrap: {
    flex: 1,
    display: "flex",
    alignItems: "center",
    gap: "10px",
    height: "40px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    padding: "0 14px",
    background: "#fff",
    transition: "all 0.2s ease",
    boxSizing: "border-box",
  },
  searchIcon: {
    display: "flex",
    alignItems: "center",
    flexShrink: 0,
    transition: "color 0.2s ease",
  },
  searchInput: {
    flex: 1,
    border: "none",
    outline: "none",
    fontSize: "14px",
    color: "#0f172a",
    background: "transparent",
    fontWeight: "400",
    height: "100%",
  },
  searchClear: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    width: "20px",
    height: "20px",
    borderRadius: "50%",
    border: "none",
    background: "#f1f5f9",
    color: "#94a3b8",
    fontSize: "10px",
    cursor: "pointer",
    flexShrink: 0,
    lineHeight: 1,
  },

  /* ── Table Card ──────────────────────────────────── */
  tableCard: {
    background: "#fff",
    borderRadius: "16px",
    border: "1px solid #f1f5f9",
    overflow: "hidden",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    padding: "0 24px",
    height: "44px",
    background: "#fafbfc",
    borderBottom: "1px solid #f1f5f9",
    gap: "12px",
  },
  thCell: {
    fontSize: "11px",
    fontWeight: "600",
    color: "#94a3b8",
    textTransform: "uppercase",
    letterSpacing: "0.06em",
  },

  /* ── Row ────────────────────────────────────────── */
  list: {
    listStyle: "none",
    padding: 0,
    margin: 0,
  },
  row: {
    display: "flex",
    alignItems: "center",
    padding: "12px 24px",
    borderBottom: "1px solid #f8fafc",
    gap: "12px",
    transition: "background 0.15s ease",
    cursor: "default",
  },
  rowCell: {
    display: "flex",
    alignItems: "center",
    minWidth: 0,
  },
  avatar: {
    width: "38px",
    height: "38px",
    borderRadius: "10px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    flexShrink: 0,
    letterSpacing: "0.02em",
  },
  nameWrap: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  nameBtn: {
    background: "none",
    border: "none",
    padding: 0,
    margin: 0,
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    textAlign: "left",
    transition: "color 0.15s ease",
    lineHeight: 1.3,
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  profession: {
    fontSize: "12px",
    color: "#94a3b8",
    fontWeight: "400",
    lineHeight: 1.3,
  },
  cellText: {
    fontSize: "13px",
    color: "#475569",
    fontWeight: "400",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  cellEmpty: {
    fontSize: "13px",
    color: "#d1d5db",
    fontWeight: "400",
  },

  /* ── Action buttons ──────────────────────────────── */
  actionBtn: {
    width: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid transparent",
    background: "transparent",
    color: "#64748b",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    textDecoration: "none",
    transition: "all 0.15s ease",
    padding: 0,
    flexShrink: 0,
  },

  /* ── Empty State ─────────────────────────────────── */
  emptyState: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "12px",
    padding: "64px 20px",
  },
  emptyTitle: {
    margin: 0,
    fontSize: "16px",
    fontWeight: "600",
    color: "#0f172a",
  },
  emptyText: {
    margin: 0,
    color: "#94a3b8",
    fontSize: "14px",
    fontWeight: "400",
    textAlign: "center",
    maxWidth: "360px",
    lineHeight: 1.5,
  },

  /* ── Table Footer ────────────────────────────────── */
  tableFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "12px 24px",
    borderTop: "1px solid #f1f5f9",
    background: "#fafbfc",
    gap: "16px",
    flexWrap: "wrap",
  },
  footerText: {
    fontSize: "13px",
    color: "#94a3b8",
    fontWeight: "400",
  },

  /* ── Paginação ───────────────────────────────────── */
  paginationWrap: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
  },
  pageBtn: {
    minWidth: "34px",
    height: "34px",
    borderRadius: "8px",
    border: "1px solid #e2e8f0",
    background: "#fff",
    color: "#475569",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    transition: "all 0.15s ease",
    padding: "0 8px",
  },
  pageBtnActive: {
    background: "#2563eb",
    color: "#fff",
    borderColor: "#2563eb",
    fontWeight: "600",
  },
  pageBtnDisabled: {
    opacity: 0.4,
    cursor: "not-allowed",
    pointerEvents: "none",
  },
  pageEllipsis: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    width: "34px",
    height: "34px",
    fontSize: "14px",
    color: "#94a3b8",
    fontWeight: "500",
    userSelect: "none",
  },
};

export default Pacientes;