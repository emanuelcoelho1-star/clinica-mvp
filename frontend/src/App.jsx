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
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z" />
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

const UserIcon = (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
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
   AVATAR DROPDOWN
   ═══════════════════════════════════════════════════════════ */
function AvatarDropdown() {
  const [aberto, setAberto] = useState(false);
  const [hoverConfig, setHoverConfig] = useState(false);
  const [hoverLogout, setHoverLogout] = useState(false);
  const ref = useRef(null);
  const navigate = useNavigate();

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
    localStorage.removeItem("token");
    localStorage.removeItem("usuario");
    window.location.href = "/";
  };

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
   TOP BAR
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
      <div style={S.topBarInner}>

        <Link to="/" style={S.brand}>
          <div style={S.brandIcon}>{LogoIcon}</div>
          <span style={S.brandName}>OdontoPro</span>
        </Link>

        <div style={S.divider} />

        <nav style={S.nav}>
          {NAV_ITEMS.map((item) => {
            const ativo = isActive(item.path);
            const hovered = hoveredPath === item.path && !ativo;
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{
                  ...S.navLink,
                  ...(ativo ? S.navLinkActive : {}),
                  ...(hovered ? S.navLinkHover : {}),
                }}
                onMouseEnter={() => setHoveredPath(item.path)}
                onMouseLeave={() => setHoveredPath(null)}
              >
                <span style={{ ...S.navIcon, color: ativo ? "#2563eb" : hovered ? "#475569" : "#94a3b8" }}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
                {ativo && <span style={S.navIndicator} />}
              </Link>
            );
          })}
        </nav>

        <div style={S.topBarRight}>
          <AvatarDropdown />
        </div>

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
      <TopBar />
      <main style={S.main}>
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

  return (
    <BrowserRouter>
      {!token ? (
        <Routes>
          <Route path="*" element={<Login />} />
        </Routes>
      ) : (
        <Routes>
          <Route path="/*" element={<Layout />} />
        </Routes>
      )}
    </BrowserRouter>
  );
}

/* ═══════════════════════════════════════════════════════════
   STYLES — Ultra Premium Minimal SaaS
   ═══════════════════════════════════════════════════════════ */
const S = {
  app: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#f0f4fa",
    fontFamily: "'Inter', 'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(255,255,255,0.85)",
    backdropFilter: "blur(16px)",
    WebkitBackdropFilter: "blur(16px)",
    borderBottom: "1px solid #f1f5f9",
  },
  topBarInner: {
    display: "flex",
    alignItems: "center",
    gap: "0",
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
    background: "#2563eb",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  brandName: {
    fontWeight: "700",
    fontSize: "16px",
    color: "#0f172a",
    letterSpacing: "-0.025em",
  },
  divider: {
    width: "1px",
    height: "20px",
    background: "#e8eef5",
    margin: "0 20px",
    flexShrink: 0,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "2px",
    flex: 1,
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
    color: "#64748b",
    transition: "all 0.15s ease",
    border: "none",
    background: "transparent",
  },
  navLinkActive: {
    color: "#0f172a",
    background: "#f1f5f9",
    fontWeight: "600",
  },
  navLinkHover: {
    color: "#475569",
    background: "#f8fafc",
  },
  navIcon: {
    display: "flex",
    alignItems: "center",
    transition: "color 0.15s ease",
  },
  navIndicator: {
    position: "absolute",
    bottom: "-14px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "16px",
    height: "2px",
    background: "#2563eb",
    borderRadius: "999px",
  },
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  avatarContainer: {
    position: "relative",
  },
  avatarBtn: {
    position: "relative",
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    border: "2px solid #e2e8f0",
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
    border: "2px solid #fff",
    boxSizing: "border-box",
  },
  dropdown: {
    position: "absolute",
    top: "calc(100% + 8px)",
    right: 0,
    width: "280px",
    background: "#fff",
    borderRadius: "16px",
    boxShadow: "0 20px 50px rgba(15, 23, 42, 0.15), 0 0 0 1px rgba(15, 23, 42, 0.05)",
    padding: "6px",
    zIndex: 200,
    animation: "fadeIn 0.15s ease",
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
    color: "#0f172a",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  dropdownEmail: {
    fontSize: "12px",
    color: "#94a3b8",
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
    color: "#16a34a",
  },
  dropdownDivider: {
    height: "1px",
    background: "#f1f5f9",
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
    color: "#334155",
    transition: "all 0.15s ease",
    boxSizing: "border-box",
    textAlign: "left",
  },
  dropdownItemHover: {
    background: "#f8fafc",
    color: "#0f172a",
  },
  dropdownItemIcon: {
    display: "flex",
    alignItems: "center",
    color: "#94a3b8",
  },
  dropdownItemLogout: {
    color: "#94a3b8",
  },
  dropdownItemLogoutHover: {
    background: "#fef2f2",
    color: "#ef4444",
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