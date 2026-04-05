import { BrowserRouter, Routes, Route, Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useEffect, useRef } from "react";
import Pacientes from "./pages/Pacientes";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import CadastroPaciente from "./pages/CadastroPaciente";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";
import Configuracoes from "./pages/Configuracoes";
import Financeiro from "./pages/Financeiro";
import { ThemeProvider, useTheme } from "./contexts/ThemeContext";

/* ═══════════════════════════════════════════════════════════
   HELPER: Validar token JWT sem dependência externa
   ═══════════════════════════════════════════════════════════ */
function isTokenValid(token) {
  if (!token) return false;
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return false;
    const payload = JSON.parse(atob(parts[1]));
    if (!payload.exp) return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

/* ═══════════════════════════════════════════════════════════
   HELPER: Limpar sessão expirada
   ═══════════════════════════════════════════════════════════ */
function clearSession() {
  localStorage.removeItem("token");
  localStorage.removeItem("usuario");
}

/* ═══════════════════════════════════════════════════════════
   INTERCEPTOR: Escuta respostas 401 de qualquer fetch
   ═══════════════════════════════════════════════════════════ */
const originalFetch = window.fetch;
window.fetch = async (...args) => {
  const response = await originalFetch(...args);
  if (response.status === 401) {
    const token = localStorage.getItem("token");
    if (token) {
      clearSession();
      window.location.href = "/";
    }
  }
  return response;
};

/* ═══════════════════════════════════════════════════════════
   NAV CONFIG
   ═══════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  {
    path: "/agenda",
    label: "Agenda",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
        <path d="M16 2v4" /><path d="M8 2v4" /><path d="M3 10h18" />
      </svg>
    ),
  },
  {
    path: "/pacientes",
    label: "Pacientes",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
        <circle cx="9" cy="7" r="4" />
        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
      </svg>
    ),
  },
  {
    path: "/financeiro",
    label: "Financeiro",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <line x1="12" x2="12" y1="2" y2="22" />
        <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
      </svg>
    ),
  },
];

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const LogoIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5.5c-1.5-2-4-2.5-6-1s-2.5 4.5-1 7c1.3 2.2 5 6 7 8.5 2-2.5 5.7-6.3 7-8.5 1.5-2.5.5-5.5-1-7s-4.5-1-6 1z" />
  </svg>
);

const SettingsIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73v.18a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const LogoutIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

const SunIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="4" />
    <path d="M12 2v2" /><path d="M12 20v2" />
    <path d="m4.93 4.93 1.41 1.41" /><path d="m17.66 17.66 1.41 1.41" />
    <path d="M2 12h2" /><path d="M20 12h2" />
    <path d="m6.34 17.66-1.41 1.41" /><path d="m19.07 4.93-1.41 1.41" />
  </svg>
);

const MoonIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   HELPER: pegar iniciais do nome
   ═══════════════════════════════════════════════════════════ */
function getInitials(nome) {
  if (!nome) return "U";
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/* ═══════════════════════════════════════════════════════════
   AVATAR DROPDOWN (com toggle de tema)
   ═══════════════════════════════════════════════════════════ */
function AvatarDropdown() {
  const [aberto, setAberto] = useState(false);
  const [hoverConfig, setHoverConfig] = useState(false);
  const [hoverLogout, setHoverLogout] = useState(false);
  const [hoverTema, setHoverTema] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();
  const { tema, alternarTema } = useTheme();

  const usuario = (() => {
    try {
      return JSON.parse(localStorage.getItem("usuario")) || {};
    } catch {
      return {};
    }
  })();

  const nome = usuario.nome || "Administrador";
  const email = usuario.email || "";
  const foto = usuario.foto || null;
  const initials = getInitials(nome);

  useEffect(() => {
    const handleClickFora = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setAberto(false);
      }
    };
    document.addEventListener("mousedown", handleClickFora);
    return () => document.removeEventListener("mousedown", handleClickFora);
  }, []);

  const fazerLogout = () => {
    clearSession();
    window.location.href = "/";
  };

  const isDark = tema === "dark";

  return (
    <div ref={ref} style={S.avatarContainer}>
      <button
        onClick={() => setAberto(!aberto)}
        style={S.avatarBtn}
        title={nome}
      >
        {foto ? (
          <img src={foto} alt={nome} style={S.avatarImg} />
        ) : (
          <div style={S.avatarInitials}>{initials}</div>
        )}
        <span style={S.avatarOnlineDot} />
      </button>

      {aberto && (
        <div style={S.dropdown}>
          <div style={S.dropdownHeader}>
            {foto ? (
              <img src={foto} alt={nome} style={S.dropdownAvatar} />
            ) : (
              <div style={S.dropdownAvatarFallback}>{initials}</div>
            )}
            <div style={S.dropdownInfo}>
              <span style={S.dropdownNome}>{nome}</span>
              <span style={S.dropdownEmail}>{email}</span>
            </div>
          </div>

          <div style={S.dropdownStatus}>
            <span style={S.dropdownStatusDot} />
            <span style={S.dropdownStatusText}>Online</span>
          </div>

          <div style={S.dropdownDivider} />

          <button
            style={{
              ...S.dropdownItem,
              ...(hoverTema ? S.dropdownItemHover : {}),
            }}
            onClick={alternarTema}
            onMouseEnter={() => setHoverTema(true)}
            onMouseLeave={() => setHoverTema(false)}
          >
            <span style={S.dropdownItemIcon}>
              {isDark ? SunIcon : MoonIcon}
            </span>
            <span>{isDark ? "Modo claro" : "Modo escuro"}</span>
          </button>

          <button
            style={{
              ...S.dropdownItem,
              ...(hoverConfig ? S.dropdownItemHover : {}),
            }}
            onClick={() => { setAberto(false); navigate("/configuracoes"); }}
            onMouseEnter={() => setHoverConfig(true)}
            onMouseLeave={() => setHoverConfig(false)}
          >
            <span style={S.dropdownItemIcon}>{SettingsIcon}</span>
            <span>Configurações</span>
          </button>

          <div style={S.dropdownDivider} />

          <button
            style={{
              ...S.dropdownItem,
              ...S.dropdownItemLogout,
              ...(hoverLogout ? S.dropdownItemLogoutHover : {}),
            }}
            onClick={fazerLogout}
            onMouseEnter={() => setHoverLogout(true)}
            onMouseLeave={() => setHoverLogout(false)}
          >
            <span style={S.dropdownItemIcon}>{LogoutIcon}</span>
            <span>Sair da conta</span>
          </button>
        </div>
      )}
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   TOP BAR — COM RESPONSIVIDADE CORRIGIDA
   ═══════════════════════════════════════════════════════════ */
function TopBar() {
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);

  const isActive = (path) => {
    if (path === "/pacientes") {
      return (
        location.pathname === "/pacientes" ||
        location.pathname === "/pacientes/novo" ||
        location.pathname.startsWith("/pacientes/editar/") ||
        location.pathname.startsWith("/pacientes/")
      );
    }
    if (path === "/agenda") {
      return location.pathname === "/agenda";
    }
    if (path === "/financeiro") {
      return location.pathname === "/financeiro";
    }
    return location.pathname === path;
  };

  return (
    <header style={S.topBar}>
      <style>{`
        @media (max-width: 600px) {
          .topbar-inner {
            padding: 0 12px !important;
          }
          .topbar-divider {
            margin: 0 8px !important;
          }
          .topbar-brand-name {
            display: none !important;
          }
          .topbar-nav-label {
            display: none !important;
          }
          .topbar-nav-link {
            padding: 7px 10px !important;
            gap: 0 !important;
          }
        }
        @media (max-width: 400px) {
          .topbar-inner {
            padding: 0 8px !important;
          }
          .topbar-nav-link {
            padding: 7px 8px !important;
          }
          .topbar-divider {
            margin: 0 6px !important;
          }
        }
      `}</style>

      <div className="topbar-inner" style={S.topBarInner}>

        {/* 1. Logo */}
        <Link to="/" style={S.brand}>
          <div style={S.brandIcon}>{LogoIcon}</div>
          <span className="topbar-brand-name" style={S.brandName}>OdontoPro</span>
        </Link>

        {/* 2. Divider */}
        <div className="topbar-divider" style={S.divider} />

        {/* 3. Nav links — INLINE, sem wrapper flex:1 */}
        {NAV_ITEMS.map((item) => {
          const ativo = isActive(item.path);
          const hovered = hoveredPath === item.path && !ativo;
          return (
            <Link
              key={item.path}
              to={item.path}
              className="topbar-nav-link"
              style={{
                ...S.navLink,
                ...(ativo ? S.navLinkActive : {}),
                ...(hovered ? S.navLinkHover : {}),
              }}
              onMouseEnter={() => setHoveredPath(item.path)}
              onMouseLeave={() => setHoveredPath(null)}
            >
              <span style={{ ...S.navIcon, color: ativo ? "var(--accent)" : hovered ? "var(--text-secondary)" : "var(--text-muted)" }}>
                {item.icon}
              </span>
              <span className="topbar-nav-label">{item.label}</span>
              {ativo && <span style={S.navIndicator} />}
            </Link>
          );
        })}

        {/* 4. Spacer — empurra avatar para a direita */}
        <div style={{ flex: 1 }} />

        {/* 5. Avatar — sempre no canto direito */}
        <AvatarDropdown />

      </div>
    </header>
  );
}

/* ═══════════════════════════════════════════════════════════
   LAYOUT
   ═══════════════════════════════════════════════════════════ */
function Layout() {
  return (
    <div style={S.app}>
      <style>{`
        @media (max-width: 768px) {
          .app-main {
            padding: 16px 12px !important;
          }
        }
        @media (max-width: 480px) {
          .app-main {
            padding: 12px 8px !important;
          }
        }
      `}</style>
      <TopBar />
      <main className="app-main" style={S.main}>
        <div style={S.contentWrapper}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/agenda" element={<Agenda />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/pacientes/novo" element={<CadastroPaciente />} />
            <Route path="/pacientes/editar/:id" element={<CadastroPaciente />} />
            <Route path="/pacientes/:id" element={<ProntuarioPaciente />} />
            <Route path="/financeiro" element={<Financeiro />} />
            <Route path="/configuracoes" element={<Configuracoes />} />
          </Routes>
        </div>
      </main>
    </div>
  );
}

/* ═══════════════════════════════════════════════════════════
   APP
   ═══════════════════════════════════════════════════════════ */
function App() {
  const token = localStorage.getItem("token");
  const autenticado = isTokenValid(token);

  if (token && !autenticado) {
    clearSession();
  }

  return (
    <ThemeProvider>
      <BrowserRouter>
        {!autenticado ? (
          <Routes>
            <Route path="*" element={<Login />} />
          </Routes>
        ) : (
          <Routes>
            <Route path="/*" element={<Layout />} />
          </Routes>
        )}
      </BrowserRouter>
    </ThemeProvider>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES
   ═══════════════════════════════════════════════════════════ */
const S = {
  app: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "var(--bg-page)",
    fontFamily: "'Inter', 'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
    transition: "background 0.3s ease",
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "var(--bg-header)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid var(--border-primary)",
    transition: "background 0.3s ease, border-color 0.3s ease",
  },
  topBarInner: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 24px",
    height: "56px",
  },
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    flexShrink: 0,
  },
  brandIcon: {
    width: "32px",
    height: "32px",
    borderRadius: "9px",
    background: "var(--accent)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  brandName: {
    fontWeight: "700",
    fontSize: "16px",
    color: "var(--text-primary)",
    letterSpacing: "-0.025em",
  },
  divider: {
    width: "1px",
    height: "20px",
    background: "var(--border-primary)",
    margin: "0 20px",
    flexShrink: 0,
  },
  navLink: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "7px 14px",
    borderRadius: "8px",
    textDecoration: "none",
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-muted)",
    transition: "all 0.15s ease",
    border: "none",
    background: "transparent",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  navLinkActive: {
    color: "var(--text-primary)",
    background: "var(--bg-badge)",
    fontWeight: "600",
  },
  navLinkHover: {
    color: "var(--text-secondary)",
    background: "var(--bg-table-stripe)",
  },
  navIcon: {
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s ease",
    flexShrink: 0,
  },
  navIndicator: {
    position: "absolute",
    bottom: "-14px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "16px",
    height: "2px",
    background: "var(--accent)",
    borderRadius: "999px",
  },
  avatarContainer: {
    position: "relative",
    flexShrink: 0,
  },
  avatarBtn: {
    position: "relative",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px solid var(--border-input)",
    background: "transparent",
    padding: 0,
    cursor: "pointer",
    transition: "all 0.2s ease",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  avatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
  },
  avatarInitials: {
    width: "100%",
    height: "100%",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "13px",
    fontWeight: "700",
    letterSpacing: "0.02em",
    lineHeight: 1,
  },
  avatarOnlineDot: {
    position: "absolute",
    bottom: "0px",
    right: "0px",
    width: "9px",
    height: "9px",
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid var(--bg-card)",
    boxSizing: "border-box",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "280px",
    background: "var(--bg-dropdown)",
    borderRadius: "16px",
    boxShadow: "var(--shadow-lg), 0 0 0 1px var(--border-primary)",
    padding: "6px",
    zIndex: 200,
  },
  dropdownHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "14px 12px",
  },
  dropdownAvatar: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    objectFit: "cover",
    flexShrink: 0,
  },
  dropdownAvatarFallback: {
    width: "42px",
    height: "42px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "15px",
    fontWeight: "700",
    flexShrink: 0,
  },
  dropdownInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflow: "hidden",
  },
  dropdownNome: {
    fontSize: "14px",
    fontWeight: "600",
    color: "var(--text-primary)",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dropdownEmail: {
    fontSize: "12px",
    color: "var(--text-muted)",
    fontWeight: "500",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dropdownStatus: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px 10px 12px",
  },
  dropdownStatusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
  },
  dropdownStatusText: {
    fontSize: "12px",
    fontWeight: "500",
    color: "var(--success)",
  },
  dropdownDivider: {
    height: "1px",
    background: "var(--border-primary)",
    margin: "2px 8px",
  },
  dropdownItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    width: "100%",
    padding: "10px 12px",
    border: "none",
    background: "transparent",
    borderRadius: "10px",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "500",
    color: "var(--text-secondary)",
    transition: "all 0.15s ease",
    boxSizing: "border-box",
    textAlign: "left",
  },
  dropdownItemHover: {
    background: "var(--bg-table-stripe)",
    color: "var(--text-primary)",
  },
  dropdownItemIcon: {
    display: "flex",
    alignItems: "center",
    color: "var(--text-muted)",
  },
  dropdownItemLogout: {
    color: "var(--text-muted)",
  },
  dropdownItemLogoutHover: {
    background: "var(--danger-bg)",
    color: "var(--danger)",
  },
  main: {
    flex: 1,
    padding: "28px 24px",
    boxSizing: "border-box",
  },
  contentWrapper: {
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
};

export default App;