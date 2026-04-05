import { useState } from "react";

/* ══════════════════════════════════════════════════════════════
   RBAC — Ícones SVG usados na sub-navegação
   ══════════════════════════════════════════════════════════════ */
const Icons = {
  users: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
      <circle cx="9" cy="7" r="4" />
      <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
      <path d="M16 3.13a4 4 0 0 1 0 7.75" />
    </svg>
  ),
  shield: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  ),
  key: (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4" />
    </svg>
  ),
};

/* ══════════════════════════════════════════════════════════════
   RBAC — Sub-navegação (Usuários | Perfis | Permissões)
   ══════════════════════════════════════════════════════════════ */

const SUB_TABS = [
  { id: "usuarios", label: "Usuários", icon: Icons.users },
  { id: "roles", label: "Perfis", icon: Icons.shield },
  { id: "permissoes", label: "Permissões", icon: Icons.key },
];

function RbacSubTabs({ activeTab, onChangeTab }) {
  const [hovered, setHovered] = useState(null);

  return (
    <div style={styles.container}>
      {SUB_TABS.map((tab) => {
        const ativo = activeTab === tab.id;
        const hover = hovered === tab.id && !ativo;

        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChangeTab(tab.id)}
            onMouseEnter={() => setHovered(tab.id)}
            onMouseLeave={() => setHovered(null)}
            style={{
              ...styles.btn,
              background: ativo ? "#2563eb" : hover ? "#f1f5f9" : "#fff",
              color: ativo ? "#fff" : hover ? "#0f172a" : "#64748b",
              borderColor: ativo ? "#2563eb" : "#e2e8f0",
            }}
          >
            <span style={{ display: "flex", alignItems: "center" }}>
              {tab.icon}
            </span>
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
}

const styles = {
  container: {
    display: "flex",
    gap: "8px",
    marginBottom: "20px",
    flexWrap: "wrap",
  },
  btn: {
    display: "inline-flex",
    alignItems: "center",
    gap: "8px",
    padding: "9px 18px",
    borderRadius: "10px",
    border: "1px solid #e2e8f0",
    cursor: "pointer",
    fontSize: "13px",
    fontWeight: "600",
    transition: "all 0.15s ease",
    fontFamily: "inherit",
  },
};

export default RbacSubTabs;