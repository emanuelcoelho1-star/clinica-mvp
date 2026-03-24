import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { useState } from "react";
import Pacientes from "./pages/Pacientes";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import CadastroPaciente from "./pages/CadastroPaciente";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";

/* ═══════════════════════════════════════════════════════════
   NAV CONFIG
   ═══════════════════════════════════════════════════════════ */
const NAV_ITEMS = [
  {
    path: "/",
    label: "Dashboard",
    icon: (
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <rect width="7" height="9" x="3" y="3" rx="1" />
        <rect width="7" height="5" x="14" y="3" rx="1" />
        <rect width="7" height="9" x="14" y="12" rx="1" />
        <rect width="7" height="5" x="3" y="16" rx="1" />
      </svg>
    ),
  },
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
];

/* ═══════════════════════════════════════════════════════════
   ICONS
   ═══════════════════════════════════════════════════════════ */
const LogoIcon = (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 5.5c-1.5-2-4-2.5-6-1s-2.5 4.5-1 7c1.3 2.2 5 6 7 8.5 2-2.5 5.7-6.3 7-8.5 1.5-2.5.5-5.5-1-7s-4.5-1-6 1z" />
  </svg>
);

const LogoutIcon = (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
    <polyline points="16 17 21 12 16 7" />
    <line x1="21" x2="9" y1="12" y2="12" />
  </svg>
);

/* ═══════════════════════════════════════════════════════════
   TOP BAR
   ═══════════════════════════════════════════════════════════ */
function TopBar() {
  const location = useLocation();
  const [hoveredPath, setHoveredPath] = useState(null);
  const [logoutHover, setLogoutHover] = useState(false);

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
    return location.pathname === path;
  };

  return (
    <header style={S.topBar}>
      <div style={S.topBarInner}>

        {/* ── Logo ─────────────────────────── */}
        <Link to="/" style={S.brand}>
          <div style={S.brandIcon}>{LogoIcon}</div>
          <span style={S.brandName}>OdontoPro</span>
        </Link>

        {/* ── Divider ──────────────────────── */}
        <div style={S.divider} />

        {/* ── Nav ──────────────────────────── */}
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

        {/* ── Right side ───────────────────── */}
        <div style={S.topBarRight}>
          {/* Status */}
          <div style={S.statusPill}>
            <span style={S.statusDot} />
            <span style={S.statusText}>Online</span>
          </div>

          {/* Logout */}
          <button
            style={{
              ...S.logoutBtn,
              ...(logoutHover ? S.logoutBtnHover : {}),
            }}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
            onMouseEnter={() => setLogoutHover(true)}
            onMouseLeave={() => setLogoutHover(false)}
          >
            {LogoutIcon}
            <span>Sair</span>
          </button>
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
  /* ── App shell ───────────────────────────── */
  app: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#f0f4fa",
    fontFamily: "'Inter', 'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  /* ── Top Bar ─────────────────────────────── */
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

  /* ── Brand ───────────────────────────────── */
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

  /* ── Divider ─────────────────────────────── */
  divider: {
    width: "1px",
    height: "20px",
    background: "#e8eef5",
    margin: "0 20px",
    flexShrink: 0,
  },

  /* ── Nav ──────────────────────────────────── */
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

  /* ── Right side ──────────────────────────── */
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  statusPill: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    padding: "5px 12px",
    borderRadius: "999px",
    background: "#f0fdf4",
    border: "1px solid #dcfce7",
  },
  statusDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#22c55e",
    flexShrink: 0,
  },
  statusText: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#16a34a",
    lineHeight: 1,
  },
  logoutBtn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    border: "1px solid #f1f5f9",
    background: "transparent",
    color: "#94a3b8",
    borderRadius: "8px",
    padding: "6px 14px",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
    transition: "all 0.15s ease",
    height: "32px",
    boxSizing: "border-box",
  },
  logoutBtnHover: {
    background: "#fef2f2",
    borderColor: "#fecaca",
    color: "#ef4444",
  },

  /* ── Main content ────────────────────────── */
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