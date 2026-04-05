import { useState } from "react";
import S from "./rbacStyles";
import Icons from "./RbacIcons";
import { API, CORES_DISPONIVEIS } from "./rbacHelpers";

function RbacRoles({ roles, token, onReload, onMsg, onErro }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [form, setForm] = useState({ nome: "", descricao: "", cor: "#64748b" });
  const [salvando, setSalvando] = useState(false);

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };

  /* ── Abrir modal criar ──────────────────────── */
  const abrirCriar = () => {
    setEditandoId(null);
    setForm({ nome: "", descricao: "", cor: "#64748b" });
    setModalAberto(true);
  };

  /* ── Abrir modal editar ─────────────────────── */
  const abrirEditar = (role) => {
    setEditandoId(role.id);
    setForm({ nome: role.nome, descricao: role.descricao || "", cor: role.cor || "#64748b" });
    setModalAberto(true);
  };

  /* ── Fechar modal ───────────────────────────── */
  const fecharModal = () => {
    setModalAberto(false);
    setEditandoId(null);
    setForm({ nome: "", descricao: "", cor: "#64748b" });
  };

  /* ── Salvar (criar ou editar) ───────────────── */
  const salvar = async () => {
    if (!form.nome.trim()) {
      onErro("Nome do perfil é obrigatório.");
      return;
    }

    setSalvando(true);

    try {
      const url = editandoId
        ? `${API}/rbac/roles/${editandoId}`
        : `${API}/rbac/roles`;

      const res = await fetch(url, {
        method: editandoId ? "PUT" : "POST",
        headers,
        body: JSON.stringify(form),
      });
      const data = await res.json();

      if (!res.ok) {
        onErro(data.erro || "Erro ao salvar perfil.");
      } else {
        onMsg(editandoId ? "Perfil atualizado!" : "Perfil criado com sucesso!");
        fecharModal();
        onReload();
      }
    } catch (e) {
      onErro("Erro de conexão.");
    }

    setSalvando(false);
  };

  /* ── Excluir role ───────────────────────────── */
  const excluir = async (role) => {
    if (role.protegido) {
      onErro("Este perfil é protegido e não pode ser excluído.");
      return;
    }

    if (!window.confirm(`Excluir o perfil "${role.nome}"? Esta ação é irreversível.`)) return;

    try {
      const res = await fetch(`${API}/rbac/roles/${role.id}`, {
        method: "DELETE",
        headers,
      });
      const data = await res.json();

      if (!res.ok) {
        onErro(data.erro || "Erro ao excluir.");
      } else {
        onMsg("Perfil excluído com sucesso.");
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
            <span style={S.cardIcon}>{Icons.shield}</span>
            <h2 style={S.cardTitle}>Perfis de Acesso</h2>
          </div>
          <button style={S.btnPrimary} onClick={abrirCriar}>
            {Icons.plus}
            <span>Novo Perfil</span>
          </button>
        </div>

        {/* ── Grid de cards ─────────────────────── */}
        <div style={S.rolesGrid}>
          {roles.map((role) => (
            <div
              key={role.id}
              style={{
                ...S.roleCard,
                borderColor: role.cor ? `${role.cor}30` : "#f1f5f9",
              }}
            >
              <div style={S.roleCardHeader}>
                <div style={S.roleCardInfo}>
                  <div
                    style={{
                      ...S.roleCardDot,
                      backgroundColor: role.cor || "#64748b",
                    }}
                  />
                  <span style={S.roleCardName}>{role.nome}</span>
                </div>
                {role.protegido === 1 && (
                  <span style={S.protectedBadge}>PROTEGIDO</span>
                )}
              </div>

              <p style={S.roleCardDesc}>
                {role.descricao || "Sem descrição"}
              </p>

              <div style={S.roleCardFooter}>
                <span style={S.roleCardBadge}>
                  {role.total_usuarios || 0} usuário(s)
                </span>

                {!role.protegido && (
                  <div style={{ display: "flex", gap: "6px" }}>
                    <button
                      style={{ ...S.btnSecondary, padding: "6px 10px", height: "30px", fontSize: "12px" }}
                      onClick={() => abrirEditar(role)}
                      title="Editar perfil"
                    >
                      {Icons.edit}
                    </button>
                    <button
                      style={{ ...S.btnDanger, padding: "6px 10px", height: "30px", fontSize: "12px" }}
                      onClick={() => excluir(role)}
                      title="Excluir perfil"
                    >
                      {Icons.trash}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}

          {roles.length === 0 && (
            <div style={S.emptyState}>Nenhum perfil cadastrado.</div>
          )}
        </div>
      </div>

      {/* ── Modal: Criar / Editar perfil ──────────── */}
      {modalAberto && (
        <div style={S.overlay} onClick={fecharModal}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>
                {editandoId ? "Editar Perfil" : "Novo Perfil"}
              </h3>
              <button style={S.modalCloseBtn} onClick={fecharModal}>
                {Icons.x}
              </button>
            </div>

            <div style={S.modalBody}>
              {/* Nome */}
              <div style={S.inputGroup}>
                <label style={S.label}>Nome do perfil</label>
                <input
                  type="text"
                  value={form.nome}
                  onChange={(e) => setForm({ ...form, nome: e.target.value })}
                  style={S.input}
                  placeholder="Ex: Auxiliar, Estagiário..."
                  autoFocus
                />
              </div>

              {/* Descrição */}
              <div style={S.inputGroup}>
                <label style={S.label}>Descrição</label>
                <textarea
                  value={form.descricao}
                  onChange={(e) => setForm({ ...form, descricao: e.target.value })}
                  style={S.textarea}
                  placeholder="Descreva as responsabilidades deste perfil..."
                />
              </div>

              {/* Cor */}
              <div style={S.inputGroup}>
                <label style={S.label}>Cor de identificação</label>
                <div style={S.coresRow}>
                  {CORES_DISPONIVEIS.map((cor) => (
                    <button
                      key={cor}
                      type="button"
                      onClick={() => setForm({ ...form, cor })}
                      style={{
                        ...S.corBtn,
                        backgroundColor: cor,
                        borderColor: form.cor === cor ? "#0f172a" : "transparent",
                        transform: form.cor === cor ? "scale(1.15)" : "scale(1)",
                      }}
                    >
                      {form.cor === cor && Icons.checkSmall}
                    </button>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "10px",
                  padding: "12px 16px",
                  borderRadius: "10px",
                  background: "#f8fafc",
                  border: "1px solid #f1f5f9",
                }}
              >
                <div
                  style={{
                    width: "12px",
                    height: "12px",
                    borderRadius: "50%",
                    background: form.cor || "#64748b",
                    flexShrink: 0,
                  }}
                />
                <span style={{ fontSize: "14px", fontWeight: "600", color: "#0f172a" }}>
                  {form.nome || "Nome do perfil"}
                </span>
                <span style={{ fontSize: "12px", color: "#94a3b8", marginLeft: "auto" }}>
                  Preview
                </span>
              </div>
            </div>

            <div style={S.modalFooter}>
              <button style={S.btnSecondary} onClick={fecharModal}>
                Cancelar
              </button>
              <button
                style={{ ...S.btnPrimary, opacity: salvando ? 0.7 : 1 }}
                onClick={salvar}
                disabled={salvando}
              >
                {Icons.check}
                <span>{salvando ? "Salvando..." : editandoId ? "Salvar" : "Criar Perfil"}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default RbacRoles;