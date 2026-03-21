import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Pacientes from "./pages/Pacientes";
import Consultas from "./pages/Consultas";
import Dashboard from "./pages/Dashboard";
import Login from "./pages/Login";

function Layout() {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <div style={styles.app}>
      <aside style={styles.sidebar}>
        <div style={styles.brandBox}>
          <div style={styles.brandIcon}>🦷</div>
          <div>
            <h1 style={styles.brandTitle}>Odonto Pro</h1>
            <p style={styles.brandSubtitle}>Painel da clínica</p>
          </div>
        </div>

        <nav style={styles.nav}>
          <Link
            to="/"
            style={{
              ...styles.navLink,
              ...(isActive("/") ? styles.navLinkActive : {}),
            }}
          >
            Dashboard
          </Link>

          <Link
            to="/pacientes"
            style={{
              ...styles.navLink,
              ...(isActive("/pacientes") ? styles.navLinkActive : {}),
            }}
          >
            Pacientes
          </Link>

          <Link
            to="/consultas"
            style={{
              ...styles.navLink,
              ...(isActive("/consultas") ? styles.navLinkActive : {}),
            }}
          >
            Consultas
          </Link>
        </nav>

        <button
          style={styles.logoutButton}
          onClick={() => {
            localStorage.removeItem("token");
            window.location.reload();
          }}
        >
          Sair
        </button>
      </aside>

      <main style={styles.main}>
        <div style={styles.contentWrapper}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/pacientes" element={<Pacientes />} />
            <Route path="/consultas" element={<Consultas />} />
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
      <Routes>
        {!token ? (
          <Route path="*" element={<Login />} />
        ) : (
          <Route path="/*" element={<Layout />} />
        )}
      </Routes>
    </BrowserRouter>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    background: "linear-gradient(180deg, #f8fafc 0%, #eef4ff 100%)",
    fontFamily: "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  sidebar: {
    width: "260px",
    minWidth: "260px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    padding: "24px 18px",
    boxSizing: "border-box",
    boxShadow: "8px 0 30px rgba(15, 23, 42, 0.12)",
    display: "flex",
    flexDirection: "column",
    position: "sticky",
    top: 0,
    height: "100vh",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "28px",
    padding: "12px",
    borderRadius: "18px",
    backgroundColor: "rgba(255,255,255,0.05)",
    border: "1px solid rgba(255,255,255,0.08)",
  },
  brandIcon: {
    width: "48px",
    height: "48px",
    borderRadius: "16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.35)",
  },
  brandTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "800",
  },
  brandSubtitle: {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#cbd5e1",
  },
  nav: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  navLink: {
    color: "#e2e8f0",
    textDecoration: "none",
    padding: "14px 16px",
    borderRadius: "14px",
    fontWeight: "600",
    border: "1px solid transparent",
  },
  navLinkActive: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    boxShadow: "0 12px 24px rgba(37, 99, 235, 0.25)",
  },
  logoutButton: {
    marginTop: "auto",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #ef4444, #dc2626)",
    color: "#fff",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 12px 22px rgba(239, 68, 68, 0.25)",
  },
  main: {
    flex: 1,
    width: "100%",
    padding: "28px",
    boxSizing: "border-box",
    minWidth: 0,
  },
  contentWrapper: {
    width: "100%",
  },
};

export default App;