import { useEffect, useRef, useState } from "react";
import S from "./rbacStyles";
import Icons from "./RbacIcons";
import { API, getInitials } from "./rbacHelpers";

function SelectPerfil({ value, options, onChange, placeholder = "Selecione um perfil" }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  const selecionado = options.find((option) => String(option.value) === String(value));

  useEffect(() => {
    function fecharAoClicarFora(evento) {
      if (ref.current && !ref.current.contains(evento.target)) setAberto(false);
    }
    document.addEventListener("mousedown", fecharAoClicarFora);
    return () => document.removeEventListener("mousedown", fecharAoClicarFora);
  }, []);

  return (
    <div ref={ref} style={{ position: "relative", width: "100%" }}>
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={aberto}
        onClick={() => setAberto((anterior) => !anterior)}
        style={{
          width: "100%", height: "42px", display: "flex", alignItems: "center",
          justifyContent: "space-between", gap: "10px", padding: "0 14px",
          border: aberto ? "1px solid #93c5fd" : "1px solid #e2e8f0",
          borderRadius: "10px", background: "#fff", color: selecionado ? "#0f172a" : "#94a3b8",
          boxSizing: "border-box", fontSize: "14px", fontWeight: "500",
          fontFamily: "inherit", cursor: "pointer",
          boxShadow: aberto ? "0 0 0 3px rgba(37,99,235,0.08)" : "none",
          textAlign: "left",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {selecionado?.label || placeholder}
        </span>
        <span style={{ display: "flex", alignItems: "center", color: "#94a3b8", flexShrink: 0, transform: aberto ? "rotate(180deg)" : "rotate(0deg)", transition: "transform 0.2s ease" }}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="m6 9 6 6 6-6" />
          </svg>
        </span>
      </button>
      {aberto && (
        <div role="listbox" style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          maxHeight: "220px", overflowY: "auto", display: "flex", flexDirection: "column",
          border: "1px solid #f1f5f9", borderRadius: "12px", background: "#fff",
          boxShadow: "0 12px 32px rgba(15,23,42,0.1)", zIndex: 2000, padding: "4px",
        }}>
          {options.length === 0 ? (
            <div style={{ padding: "14px", color: "#94a3b8", fontSize: "13px" }}>Nenhum perfil disponível</div>
          ) : options.map((option, index) => {
            const ativo = String(option.value) === String(value);
            return (
              <button
                key={option.value}
                type="button"
                role="option"
                aria-selected={ativo}
                onClick={() => { onChange(String(option.value)); setAberto(false); }}
                style={{
                  border: "none", borderBottom: index === options.length - 1 ? "none" : "1px solid #f8fafc",
                  borderRadius: "7px", background: ativo ? "#eff6ff" : "#fff",
                  color: ativo ? "#2563eb" : "#0f172a", padding: "10px 12px",
                  textAlign: "left", cursor: "pointer", width: "100%", fontSize: "14px",
                  fontWeight: ativo ? "600" : "400", fontFamily: "inherit", transition: "background 0.1s",
                }}
                onMouseEnter={(evento) => { if (!ativo) evento.currentTarget.style.background = "#f8fafc"; }}
                onMouseLeave={(evento) => { if (!ativo) evento.currentTarget.style.background = "#fff"; }}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

function RbacUsuarios({ usuarios, roles, token, onReload, onMsg, onErro }) {
  const [modalAberto, setModalAberto] = useState(false);
  const [usuarioSelecionado, setUsuarioSelecionado] = useState(null);
  const [roleId, setRoleId] = useState("");
  const [salvando, setSalvando] = useState(false);
  const [modalCriarAberto, setModalCriarAberto] = useState(false);
  const [salvandoNovo, setSalvandoNovo] = useState(false);
  const [novoUsuario, setNovoUsuario] = useState({ nome: "", email: "", senha: "", role_id: "" });

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
          <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
            <span style={{ fontSize: "13px", color: "#94a3b8", fontWeight: "500" }}>
              {usuarios.length} usuário(s)
            </span>
            <button
              type="button"
              style={S.btnPrimary}
              onClick={() => {
                setNovoUsuario({ nome: "", email: "", senha: "", role_id: roles.find((r) => !r.protegido && r.ativo !== 0)?.id || "" });
                setModalCriarAberto(true);
              }}
            >
              {Icons.plus}
              <span>Novo usuário</span>
            </button>
          </div>
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

      {/* ── Modal: Criar usuário ─────────────────── */}
      {modalCriarAberto && (
        <div style={S.overlay} onClick={() => !salvandoNovo && setModalCriarAberto(false)}>
          <div style={S.modal} onClick={(e) => e.stopPropagation()}>
            <div style={S.modalHeader}>
              <h3 style={S.modalTitle}>Cadastrar novo usuário</h3>
              <button style={S.modalCloseBtn} onClick={() => !salvandoNovo && setModalCriarAberto(false)} disabled={salvandoNovo}>
                {Icons.x}
              </button>
            </div>
            <div style={S.modalBody}>
              <p style={{ margin: "0 0 14px", color: "#64748b", fontSize: "13px", lineHeight: 1.5 }}>
                Cadastre o usuário e escolha um perfil. As permissões desse perfil definirão quais áreas e funções ele poderá acessar.
              </p>
              <div style={S.inputGroup}>
                <label style={S.label}>Nome completo *</label>
                <input
                  type="text"
                  autoComplete="name"
                  value={novoUsuario.nome}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, nome: e.target.value })}
                  style={S.input}
                  placeholder="Nome do profissional"
                  maxLength={120}
                />
              </div>
              <div style={S.inputGroup}>
                <label style={S.label}>E-mail de acesso *</label>
                <input
                  type="email"
                  autoComplete="email"
                  value={novoUsuario.email}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, email: e.target.value })}
                  style={S.input}
                  placeholder="nome@clinica.com"
                />
              </div>
              <div style={S.inputGroup}>
                <label style={S.label}>Senha inicial * (mínimo 8 caracteres)</label>
                <input
                  type="password"
                  autoComplete="new-password"
                  value={novoUsuario.senha}
                  onChange={(e) => setNovoUsuario({ ...novoUsuario, senha: e.target.value })}
                  style={S.input}
                  minLength={8}
                  placeholder="Crie uma senha inicial"
                />
              </div>
              <div style={S.inputGroup}>
                <label style={S.label}>Perfil de acesso *</label>
                <SelectPerfil
                  value={novoUsuario.role_id}
                  onChange={(value) => setNovoUsuario({ ...novoUsuario, role_id: value })}
                  options={roles
                    .filter((r) => !r.protegido && r.ativo !== 0)
                    .map((r) => ({ value: String(r.id), label: r.nome }))}
                />
                {roles.filter((r) => !r.protegido && r.ativo !== 0).length === 0 && (
                  <span style={{ color: "#b45309", fontSize: "12px", lineHeight: 1.5 }}>
                    Crie primeiro um perfil na aba Perfis e configure suas permissões.
                  </span>
                )}
              </div>
            </div>
            <div style={S.modalFooter}>
              <button style={S.btnSecondary} onClick={() => setModalCriarAberto(false)} disabled={salvandoNovo}>Cancelar</button>
              <button
                style={{ ...S.btnPrimary, opacity: salvandoNovo ? 0.7 : 1 }}
                disabled={salvandoNovo || !roles.some((r) => !r.protegido && r.ativo !== 0)}
                onClick={async () => {
                  const nome = novoUsuario.nome.trim();
                  const email = novoUsuario.email.trim().toLowerCase();
                  if (!nome || !email || !novoUsuario.senha || !novoUsuario.role_id) {
                    onErro("Preencha todos os campos e selecione um perfil.");
                    return;
                  }
                  if (novoUsuario.senha.length < 8) {
                    onErro("A senha deve ter no mínimo 8 caracteres.");
                    return;
                  }
                  setSalvandoNovo(true);
                  try {
                    const res = await fetch(`${API}/rbac/usuarios`, {
                      method: "POST",
                      headers,
                      body: JSON.stringify({
                        nome,
                        email,
                        senha: novoUsuario.senha,
                        role_id: Number(novoUsuario.role_id),
                      }),
                    });
                    const data = await res.json();
                    if (!res.ok) {
                      onErro(data.erro || "Não foi possível criar o usuário.");
                    } else {
                      onMsg("Usuário criado com sucesso.");
                      setModalCriarAberto(false);
                      setNovoUsuario({ nome: "", email: "", senha: "", role_id: "" });
                      onReload();
                    }
                  } catch (e) {
                    onErro("Erro de conexão ao criar usuário.");
                  } finally {
                    setSalvandoNovo(false);
                  }
                }}
              >
                {Icons.check}
                <span>{salvandoNovo ? "Criando..." : "Criar usuário"}</span>
              </button>
            </div>
          </div>
        </div>
      )}

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
                <SelectPerfil
                  value={roleId}
                  onChange={setRoleId}
                  options={roles.map((r) => ({ value: String(r.id), label: r.nome }))}
                />
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