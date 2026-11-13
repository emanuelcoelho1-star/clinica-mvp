import { useNavigate } from "react-router-dom";
import ClinicaForm from "../components/ClinicaForm";

export default function CadastroClinica() {
  const navigate = useNavigate();
  const concluir = () => navigate("/", { replace: true });
  return (
    <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "40px clamp(18px, 4vw, 56px)", background: "var(--bg-page, #f8fafc)", fontFamily: "'Inter', 'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ width: "100%", maxWidth: 1240, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800, fontSize: 22 }}>S</div>
          <div><div style={{ fontSize: 22, fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>Sorrisa</div><div style={{ fontSize: 13, color: "var(--text-secondary, #64748b)" }}>Configuração inicial</div></div>
        </div>
        <ClinicaForm modoOnboarding onComplete={concluir} />
      </div>
    </main>
  );
}
