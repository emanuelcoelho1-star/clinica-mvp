import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Pacientes from "./pages/Pacientes";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";
import Agenda from "./pages/Agenda";
import CadastroPaciente from "./pages/CadastroPaciente";
import ProntuarioPaciente from "./pages/ProntuarioPaciente";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: "⊞" },
  { path: "/agenda", label: "Agenda", icon: "◫" },
  { path: "/pacientes", label: "Pacientes", icon: "◎" },
];

function TopBar() {
  const location = useLocation();

  const isActive = (path) => {
    if (path === "/pacientes") {
      return (
        location.pathname === "/pacientes" ||
        location.pathname === "/pacientes/novo" ||
        location.pathname.startsWith("/pacientes/editar/") ||
        location.pathname.startsWith("/pacientes/")
      );
    }
    return location.pathname === path;
  };

  return (
    <header style={styles.topBar}>
      <div style={styles.topBarInner}>

        {/* Logo */}
        <Link to="/" style={styles.brand}>
          <div style={styles.brandIcon}>🦷</div>
          <div style={styles.brandText}>
            <span style={styles.brandName}>Odonto Pro</span>
            <span style={styles.brandDot}></span>
          </div>
        </Link>

        {/* Divisor */}
        <div style={styles.divider} />

        {/* Nav links */}
        <nav style={styles.nav}>
          {NAV_ITEMS.map((item) => {
            const ativo = isActive(item.path);
            return (
              <Link
                key={item.path}
                to={item.path}
                style={{ ...styles.navLink, ...(ativo ? styles.navLinkActive : {}) }}
              >
                <span style={styles.navIcon}>{item.icon}</span>
                {item.label}
                {ativo && <span style={styles.navIndicator} />}
              </Link>
            );
          })}
        </nav>

        {/* Lado direito */}
        <div style={styles.topBarRight}>
          <div style={styles.statusDot} title="Sistema online" />
          <span style={styles.statusLabel}>Online</span>
          <button
            style={styles.logoutBtn}
            onClick={() => {
              localStorage.removeItem("token");
              window.location.reload();
            }}
          >
            Sair
          </button>
        </div>

      </div>
    </header>
  );
}

function Layout() {
  return (
    <div style={styles.app}>
      <TopBar />
      <main style={styles.main}>
        <div style={styles.contentWrapper}>
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

const styles = {
  app: {
    display: "flex",
    flexDirection: "column",
    minHeight: "100vh",
    background: "#f0f4fa",
    fontFamily: "'DM Sans', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },

  // ---- Top bar ----
  topBar: {
    position: "sticky",
    top: 0,
    zIndex: 100,
    background: "rgba(255,255,255,0.92)",
    backdropFilter: "blur(12px)",
    WebkitBackdropFilter: "blur(12px)",
    borderBottom: "1px solid #e4eaf4",
    boxShadow: "0 2px 16px rgba(15,23,42,0.06)",
  },
  topBarInner: {
    display: "flex",
    alignItems: "center",
    gap: "0",
    maxWidth: "1400px",
    margin: "0 auto",
    padding: "0 28px",
    height: "62px",
  },

  // Brand
  brand: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    textDecoration: "none",
    flexShrink: 0,
  },
  brandIcon: {
    width: "36px",
    height: "36px",
    borderRadius: "10px",
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "18px",
    boxShadow: "0 4px 12px rgba(37,99,235,0.28)",
  },
  brandText: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
  },
  brandName: {
    fontWeight: "800",
    fontSize: "17px",
    color: "#0f172a",
    letterSpacing: "-0.02em",
  },
  brandDot: {
    width: "6px",
    height: "6px",
    borderRadius: "50%",
    background: "#2563eb",
    marginBottom: "2px",
  },

  divider: {
    width: "1px",
    height: "24px",
    background: "#e2e8f0",
    margin: "0 24px",
    flexShrink: 0,
  },

  // Nav
  nav: {
    display: "flex",
    alignItems: "center",
    gap: "4px",
    flex: 1,
  },
  navLink: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    gap: "7px",
    padding: "8px 14px",
    borderRadius: "10px",
    textDecoration: "none",
    fontSize: "14px",
    fontWeight: "600",
    color: "#64748b",
    transition: "all 0.15s ease",
    border: "1px solid transparent",
  },
  navLinkActive: {
    color: "#2563eb",
    background: "#eff6ff",
    border: "1px solid #dbeafe",
  },
  navIcon: {
    fontSize: "14px",
    lineHeight: 1,
  },
  navIndicator: {
    position: "absolute",
    bottom: "-1px",
    left: "50%",
    transform: "translateX(-50%)",
    width: "20px",
    height: "2px",
    background: "#2563eb",
    borderRadius: "999px",
  },

  // Right side
  topBarRight: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    marginLeft: "auto",
    flexShrink: 0,
  },
  statusDot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#22c55e",
    boxShadow: "0 0 0 2px #dcfce7",
  },
  statusLabel: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#22c55e",
  },
  logoutBtn: {
    border: "1px solid #e2e8f0",
    background: "#ffffff",
    color: "#64748b",
    borderRadius: "10px",
    padding: "8px 16px",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    marginLeft: "8px",
    transition: "all 0.15s ease",
  },

  // Main
  main: {
    flex: 1,
    padding: "32px 28px",
    boxSizing: "border-box",
  },
  contentWrapper: {
    maxWidth: "1400px",
    margin: "0 auto",
    width: "100%",
  },
};

export default App;
