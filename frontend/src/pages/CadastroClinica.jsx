import { useNavigate } from "react-router-dom";
import ClinicaForm from "../components/ClinicaForm";

export default function CadastroClinica() {
  const navigate = useNavigate();
  const concluir = () => navigate("/", { replace: true });
  return (
    <main style={{ minHeight: "100vh", boxSizing: "border-box", padding: "32px 18px", background: "var(--bg-page, #f8fafc)", fontFamily: "'Inter', 'DM Sans', 'Segoe UI', sans-serif" }}>
      <div style={{ maxWidth: 960, margin: "0 auto" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 24 }}>
          <div style={{ width: 42, height: 42, borderRadius: 12, background: "#2563eb", color: "#fff", display: "grid", placeItems: "center", fontWeight: 800 }}>O</div>
          <div><div style={{ fontSize: 18, fontWeight: 800, color: "var(--text-primary, #0f172a)" }}>OdontoPro</div><div style={{ fontSize: 12, color: "var(--text-secondary, #64748b)" }}>Configuração inicial</div></div>
        </div>
        <ClinicaForm modoOnboarding onComplete={concluir} />
      </div>
    </main>
  );
}
