import { useState, useEffect } from "react";
import S from "./rbacStyles";
import Icons from "./RbacIcons";
import { MODULOS_LABELS, ACOES_LABELS, API } from "./rbacHelpers";

function RbacPermissoes({ roles, permissoes, token, onMsg, onErro }) {
  const [roleSelecionada, setRoleSelecionada] = useState(null);
  const [permissoesDaRole, setPermissoesDaRole] = useState([]);
  const [salvando, setSalvando] = useState(false);
  const [carregando, setCarregando] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  /* ── Selecionar role ─────────────────────────── */
  useEffect(() => {
    if (!roleSelecionada) {
      /* Selecionar a primeira role não-protegida, ou a primeira */
      const primeira = roles.find((r) => !r.protegido) || roles[0];
      if (primeira) setRoleSelecionada(primeira);
    }
  }, [roles]);

  /* ── Carregar permissões da role ─────────────── */
  useEffect(() => {
    if (!roleSelecionada) return;

    const carregar = async () => {
      setCarregando(true);
      try {
        const res = await fetch(`${API}/rbac/roles/${roleSelecionada.id}/permissoes`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
        if (res.ok) {
          setPermissoesDaRole(data.map((p) => p.id));
        }
      } catch (e) {
        console.error("Erro ao carregar permissões:", e);
      }
      setCarregando(false);
    };

    carregar();
  }, [roleSelecionada, token]);

  /* ── Toggle permissão ────────────────────────── */
  const togglePermissao = (permId) => {
    if (roleSelecionada?.protegido) return;

    setPermissoesDaRole((prev) =>
      prev.includes(permId) ? prev.filter((id) => id !== permId) : [...prev, permId]
    );
  };

  /* ── Toggle todas de um módulo ───────────────── */
  const toggleModulo = (modulo) => {
    if (roleSelecionada?.protegido) return;

    const permsDoModulo = permissoes.filter((p) => p.modulo === modulo).map((p) => p.id);
    const todasAtivas = permsDoModulo.every((id) => permissoesDaRole.includes(id));

    if (todasAtivas) {
      setPermissoesDaRole((prev) => prev.filter((id) => !permsDoModulo.includes(id)));
    } else {
      setPermissoesDaRole((prev) => [...new Set([...prev, ...permsDoModulo])]);
    }
  };

  /* ── Salvar permissões ───────────────────────── */
  const salvar = async () => {
    if (!roleSelecionada || roleSelecionada.protegido) return;
    setSalvando(true);

    try {
      const res = await fetch(`${API}/rbac/roles/${roleSelecionada.id}/permissoes`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ permissao_ids: permissoesDaRole }),
      });
      const data = await res.json();

      if (!res.ok) {
        onErro(data.erro || "Erro ao salvar permissões.");
      } else {
        onMsg("Permissões atualizadas com sucesso!");
      }
    } catch (e) {
      onErro("Erro de conexão.");
    }

    setSalvando(false);
  };

  /* ── Agrupar permissões por módulo ───────────── */
  const modulos = [...new Set(permissoes.map((p) => p.modulo))];

  return (
    <div style={S.card}>
      <div style={S.cardHeader}>
        <div style={S.cardTitleRow}>
          <span style={S.cardIcon}>{Icons.key}</span>
          <h2 style={S.cardTitle}>Matriz de Permissões</h2>
        </div>
        {roleSelecionada && !roleSelecionada.protegido && (
          <button
            style={{ ...S.btnPrimary, opacity: salvando ? 0.7 : 1 }}
            onClick={salvar}
            disabled={salvando}
          >
            {Icons.check}
            <span>{salvando ? "Salvando..." : "Salvar Alterações"}</span>
          </button>
        )}
      </div>

      {/* ── Seletor de Role ─────────────────────── */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", flexWrap: "wrap" }}>
        {roles.map((r) => {
          const sel = roleSelecionada?.id === r.id;
          return (
            <button
              key={r.id}
              type="button"
              onClick={() => setRoleSelecionada(r)}
              style={{
                ...S.roleSelectBtn,
                background: sel ? `${r.cor || "#2563eb"}10` : "#fff",
                color: sel ? r.cor || "#2563eb" : "#64748b",
                borderColor: sel ? r.cor || "#2563eb" : "#e2e8f0",
              }}
            >
              <div
                style={{
                  ...S.roleDot,
                  backgroundColor: r.cor || "#64748b",
                  width: "8px",
                  height: "8px",
                }}
              />
              <span>{r.nome}</span>
            </button>
          );
        })}
      </div>

      {/* ── Info Administrador ──────────────────── */}
      {roleSelecionada?.protegido === 1 && (
        <div style={S.alertaInfo}>
          {Icons.shield}
          <span>O perfil Administrador tem acesso total e suas permissões não podem ser alteradas.</span>
        </div>
      )}

      {/* ── Tabela de permissões ────────────────── */}
      {carregando ? (
        <div style={{ textAlign: "center", padding: "40px", color: "#94a3b8" }}>
          Carregando permissões...
        </div>
      ) : (
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, width: "200px" }}>Módulo</th>
                {Object.entries(ACOES_LABELS).map(([key, label]) => (
                  <th key={key} style={{ ...S.th, textAlign: "center", width: "90px" }}>
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {modulos.map((modulo) => {
                const permsDoModulo = permissoes.filter((p) => p.modulo === modulo);
                const todasAtivas = permsDoModulo.every((p) =>
                  permissoesDaRole.includes(p.id)
                );

                return (
                  <tr key={modulo} style={S.tr}>
                    <td style={S.td}>
                      <button
                        type="button"
                        onClick={() => toggleModulo(modulo)}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "8px",
                          background: "transparent",
                          border: "none",
                          cursor: roleSelecionada?.protegido ? "default" : "pointer",
                          padding: 0,
                          fontFamily: "inherit",
                        }}
                      >
                        <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                          {MODULOS_LABELS[modulo] || modulo}
                        </span>
                        {todasAtivas && (
                          <span
                            style={{
                              fontSize: "10px",
                              fontWeight: "700",
                              color: "#15803d",
                              background: "#f0fdf4",
                              padding: "2px 6px",
                              borderRadius: "4px",
                              border: "1px solid #dcfce7",
                            }}
                          >
                            TOTAL
                          </span>
                        )}
                      </button>
                    </td>
                    {Object.keys(ACOES_LABELS).map((acao) => {
                      const perm = permsDoModulo.find((p) => p.acao === acao);
                      if (!perm) {
                        return (
                          <td key={acao} style={{ ...S.td, textAlign: "center" }}>
                            <span style={{ color: "#e2e8f0" }}>—</span>
                          </td>
                        );
                      }

                      const ativa = permissoesDaRole.includes(perm.id);
                      const protegido = roleSelecionada?.protegido;

                      return (
                        <td key={acao} style={{ ...S.td, textAlign: "center" }}>
                          <button
                            type="button"
                            onClick={() => togglePermissao(perm.id)}
                            disabled={protegido}
                            style={{
                              ...S.permCheckbox,
                              background: ativa ? "#2563eb" : "#fff",
                              borderColor: ativa ? "#2563eb" : "#d1d5db",
                              cursor: protegido ? "default" : "pointer",
                              opacity: protegido ? 0.6 : 1,
                            }}
                          >
                            {ativa && Icons.checkSmall}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
              {modulos.length === 0 && (
                <tr>
                  <td
                    colSpan={1 + Object.keys(ACOES_LABELS).length}
                    style={{ ...S.td, textAlign: "center", color: "#94a3b8", padding: "40px" }}
                  >
                    Nenhuma permissão encontrada.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default RbacPermissoes;