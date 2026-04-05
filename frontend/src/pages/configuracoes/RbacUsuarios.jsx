import { useState } from "react";
import S from "./rbacStyles";
import Icons from "./RbacIcons";
import { API, getInitials } from "./rbacHelpers";

function RbacUsuarios({ usuarios, roles, token, onReload, onMsg, onErro }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [roleId, setRoleId] = useState("");
  const [salvando, setSalvando] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  /* ── Abrir modal de edição ──────────────────── */
  const abrirEdicao = (user) => {
    setUsuarioSelecionado(user);
    setRoleId(user.role_id || 1);
    setModalAberto(true);
  };

  /* ── Salvar role do usuário ─────────────────── */
  const salvarRole = async () => {
    if (!usuarioSelecionado) return;
    setSalvando(true);

    try {
      const res = await fetch(`${API}/rbac/usuarios/${usuarioSelecionado.id}/role`, {
        method: "PUT",
        headers,
        body: JSON.stringify({ role_id: parseInt(roleId) }),
      });
      const data = await res.json();

      if (!res.ok) {
        onErro(data.erro || "Erro ao atualizar perfil.");
      } else {
        onMsg("Perfil do usuário atualizado!");
        setModalAberto(false);
        onReload();
      }
    } catch (e) {
      onErro("Erro de conexão.");
    }

    setSalvando(false);
  };

  /* ── Excluir usuário ────────────────────────── */
  const excluirUsuario = async (id, nome) => {
    if (!window.confirm(`Excluir o usuário "${nome}"? Esta ação é irreversível.`)) return;

    try {
      const res = await fetch(`${API}/rbac/usuarios/${id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        onErro(data.erro || "Erro ao excluir.");
      } else {
        onMsg("Usuário excluído com sucesso.");
        onReload();
      }
    } catch (e) {
      onErro("Erro de conexão.");
    }
  };

  return (
    <>
      <div style={S.card}>
        <div style={S.cardHeader}>
          <div style={S.cardTitleRow}>
            <span style={S.cardIcon}>{Icons.users}</span>
            <h2 style={S.cardTitle}>Usuários do Sistema</h2>
          </div>
          <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
            {usuarios.length} usuário(s)
          </span>
        </div>

        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={S.th}>Usuário</th>
                <th style={S.th}>E-mail</th>
                <th style={S.th}>Perfil</th>
                <th style={S.th}>Criado em</th>
                <th style={{ ...S.th, textAlign: "right" }}>Ações</th>
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.id} style={S.tr}>
                  <td style={S.td}>
                    <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                      <div
                        style={{
                          width: "32px",
                          height: "32px",
                          borderRadius: "8px",
                          background: u.role_cor ? `${u.role_cor}15` : "#f0f4ff",
                          color: u.role_cor || "#2563eb",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "12px",
                          fontWeight: "700",
                          flexShrink: 0,
                        }}
                      >
                        {getInitials(u.nome)}
                      </div>
                      <span style={{ fontWeight: "600" }}>{u.nome || "Sem nome"}</span>
                    </div>
                  </td>
                  <td style={{ ...S.td, color: "#64748b" }}>{u.email}</td>
                  <td style={S.td}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        padding: "4px 10px",
                        borderRadius: "6px",
                        background: u.role_cor ? `${u.role_cor}12` : "#f1f5f9",
                        color: u.role_cor || "#64748b",
                      }}
                    >
                      <span
                        style={{
                          width: "6px",
                          height: "6px",
                          borderRadius: "50%",
                          background: u.role_cor || "#64748b",
                        }}
                      />
                      {u.role_nome || "Administrador"}
                    </span>
                  </td>
                  <td style={{ ...S.td, color: "#94a3b8", fontSize: "12px" }}>
                    {u.created_at
                      ? new Date(u.created_at).toLocaleDateString("pt-BR")
                      : "—"}
                  </td>
                  <td style={{ ...S.td, textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }}>
                      <button
                        style={{ ...S.btnSecondary, padding: "6px 10px", height: "32px" }}
                        onClick={() => abrirEdicao(u)}
                        title="Alterar perfil"
                      >
                        {Icons.edit}
                      </button>
                      <button
                        style={{ ...S.btnDanger, padding: "6px 10px", height: "32px" }}
                        onClick={() => excluirUsuario(u.id, u.nome)}
                        title="Excluir usuário"
                      >
                        {Icons.trash}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} style={S.emptyState}>
                    Nenhum usuário cadastrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── Modal: Alterar perfil ─────────────────── */}
      {modalAberto && usuarioSelecionado && (
        <div style={S.overlay} onClick={() => setModalAberto(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Alterar Perfil</h3>
              <button style={S.modalCloseBtn} onClick={() => setModalAberto(false)}>
                {Icons.x}
              </button>
            </div>

            <div style={S.modalBody}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "4px" }}>
                <div
                  style={{
                    width: "40px",
                    height: "40px",
                    borderRadius: "10px",
                    background: "#f0f4ff",
                    color: "#2563eb",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    fontSize: "14px",
                    fontWeight: "700",
                  }}
                >
                  {getInitials(usuarioSelecionado.nome)}
                </div>
                <div>
                  <div style={{ fontWeight: "600", color: "#0f172a", fontSize: "14px" }}>
                    {usuarioSelecionado.nome}
                  </div>
                  <div style={{ fontSize: "12px", color: "#94a3b8" }}>
                    {usuarioSelecionado.email}
                  </div>
                </div>
              </div>

              <div style={S.inputGroup}>
                <label style={S.label}>Perfil de acesso</label>
                <select
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                  style={S.select}
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.nome}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div style={S.modalFooter}>
              <button style={S.btnSecondary} onClick={() => setModalAberto(false)}>
                Cancelar
              </button>
              <button
                style={{ ...S.btnPrimary, opacity: salvando ? 0.7 : 1 }}
                onClick={salvarRole}
                disabled={salvando}
              >
                {Icons.check}
                <span>{salvando ? "Salvando..." : "Salvar"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RbacUsuarios;