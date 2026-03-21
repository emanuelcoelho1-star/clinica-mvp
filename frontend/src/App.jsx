import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import Pacientes from "./pages/Pacientes";
import Consultas from "./pages/Consultas";
import Dashboard from "./pages/Dashboard";

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
      </aside>

      <main style={styles.main}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/pacientes" element={<Pacientes />} />
          <Route path="/consultas" element={<Consultas />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}

const styles = {
  app: {
    display: "flex",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
    fontFamily:
      "'Inter', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
  },
  sidebar: {
    width: "260px",
    background: "linear-gradient(180deg, #0f172a 0%, #111827 100%)",
    color: "#fff",
    padding: "24px 18px",
    boxSizing: "border-box",
    boxShadow: "4px 0 20px rgba(15, 23, 42, 0.15)",
  },
  brandBox: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "30px",
    padding: "10px",
    borderRadius: "16px",
    backgroundColor: "rgba(255,255,255,0.04)",
  },
  brandIcon: {
    width: "46px",
    height: "46px",
    borderRadius: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "22px",
    background: "linear-gradient(135deg, #3b82f6, #2563eb)",
  },
  brandTitle: {
    margin: 0,
    fontSize: "20px",
    fontWeight: "700",
  },
  brandSubtitle: {
    margin: "2px 0 0 0",
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
    backgroundColor: "transparent",
    transition: "0.2s",
    fontWeight: "500",
  },
  navLinkActive: {
    background: "linear-gradient(135deg, #2563eb, #1d4ed8)",
    color: "#fff",
    boxShadow: "0 10px 20px rgba(37, 99, 235, 0.25)",
  },
  main: {
    flex: 1,
    padding: "32px",
    boxSizing: "border-box",
  },
};

export default App;