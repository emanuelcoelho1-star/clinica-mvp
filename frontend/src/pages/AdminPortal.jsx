import { useEffect, useState } from "react";
import { useTheme } from "../contexts/ThemeContext";
import API_URL from "../api";
import "./AdminPortal.css";

const TOKEN_KEY = "sorrisa_admin_token";

const formatarBytes = (bytes = 0) => {
  const valor = Number(bytes) || 0;
  if (valor < 1024) return valor + " B";
  const unidades = ["KB", "MB", "GB", "TB"];
  let tamanho = valor / 1024;
  let indice = 0;
  while (tamanho >= 1024 && indice < unidades.length - 1) {
    tamanho /= 1024;
    indice += 1;
  }
  return tamanho.toLocaleString("pt-BR", { maximumFractionDigits: 2 }) + " " + unidades[indice];
};

const dataBR = (valor) => valor ? new Date(String(valor).replace(" ", "T")).toLocaleDateString("pt-BR") : "—";

function Icone({ tipo, size = 18 }) {
  const comum = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round", strokeLinejoin: "round" };
  const caminhos = {
    grid: <><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /></>,
    clinic: <><path d="M3 21h18" /><path d="M5 21V7l7-4 7 4v14" /><path d="M9 21v-5h6v5" /><path d="M9 9h.01M15 9h.01M9 12h.01M15 12h.01" /></>,
    users: <><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" /></>,
    storage: <><ellipse cx="12" cy="5" rx="8" ry="3" /><path d="M4 5v14c0 1.66 3.58 3 8 3s8-1.34 8-3V5" /><path d="M4 12c0 1.66 3.58 3 8 3s8-1.34 8-3" /></>,
    check: <><path d="m5 12 4 4L19 6" /><circle cx="12" cy="12" r="9" /></>,
    clock: <><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></>,
    search: <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>,
    refresh: <><path d="M20 7v5h-5" /><path d="M4 17v-5h5" /><path d="M5.6 9a7 7 0 0 1 11.6-2L20 12M4 12l2.8 5a7 7 0 0 0 11.6-2" /></>,
    logout: <><path d="M10 17l5-5-5-5" /><path d="M15 12H3" /><path d="M12 3h6a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-6" /></>,
    sun: <><circle cx="12" cy="12" r="4" /><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42" /></>,
    moon: <path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z" />,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2" /><path d="M8 10V7a4 4 0 1 1 8 0v3" /></>,
    arrow: <><path d="M5 12h14" /><path d="m13 6 6 6-6 6" /></>
  };
  return <svg {...comum} aria-hidden="true">{caminhos[tipo] || caminhos.grid}</svg>;
}

export default function AdminPortal() {
  const { tema, alternarTema } = useTheme();
  const [token, setToken] = useState(() => localStorage.getItem(TOKEN_KEY) || "");
  const [email, setEmail] = useState("emanuelcoelho1@gmail.com");
  const [senha, setSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);
  const [busca, setBusca] = useState("");
  const [clinicaSelecionada, setClinicaSelecionada] = useState(() => {
    const match = window.location.pathname.match(/\/administracao\/clinicas\/(\d+)/);
    return match ? Number(match[1]) : null;
  });
  const [detalheClinica, setDetalheClinica] = useState(null);
  const [carregandoDetalhe, setCarregandoDetalhe] = useState(false);
  const [erroDetalhe, setErroDetalhe] = useState("");
  const [abaDetalhe, setAbaDetalhe] = useState("dados");

  async function carregarPainel(chave = token) {
    if (!chave) return;
    setCarregando(true);
    setErro("");
    try {
      const resposta = await fetch(API_URL + "/admin/dashboard", { headers: { Authorization: "Bearer " + chave } });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível carregar o painel.");
      setDados(corpo);
    } catch (e) {
      setErro(e.message || "Falha de conexão com o servidor.");
      if (e.message?.toLowerCase().includes("sessão") || e.message?.toLowerCase().includes("autorizado")) {
        localStorage.removeItem(TOKEN_KEY);
        setToken("");
        setDados(null);
      }
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => { if (token) carregarPainel(token); }, []);

  useEffect(() => {
    const sincronizarRota = () => {
      const match = window.location.pathname.match(/\/administracao\/clinicas\/(\d+)/);
      setClinicaSelecionada(match ? Number(match[1]) : null);
    };
    window.addEventListener("popstate", sincronizarRota);
    return () => window.removeEventListener("popstate", sincronizarRota);
  }, []);

  useEffect(() => {
    if (!token || !clinicaSelecionada) {
      setDetalheClinica(null);
      setErroDetalhe("");
      return;
    }
    let ativo = true;
    async function carregarDetalhe() {
      setDetalheClinica(null);
      setCarregandoDetalhe(true);
      setErroDetalhe("");
      try {
        const resposta = await fetch(API_URL + "/admin/clinicas/" + clinicaSelecionada, {
          headers: { Authorization: "Bearer " + token },
        });
        const corpo = await resposta.json();
        if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível carregar os dados da clínica.");
        if (ativo) setDetalheClinica(corpo);
      } catch (e) {
        if (ativo) setErroDetalhe(e.message || "Falha ao carregar os dados da clínica.");
      } finally {
        if (ativo) setCarregandoDetalhe(false);
      }
    }
    carregarDetalhe();
    return () => { ativo = false; };
  }, [token, clinicaSelecionada]);

  function abrirClinica(id) {
    setAbaDetalhe("dados");
    window.history.pushState({ adminPage: "clinica", clinicId: id }, "", "/administracao/clinicas/" + id);
    setClinicaSelecionada(Number(id));
  }

  function voltarParaClinicas() {
    setAbaDetalhe("dados");
    window.history.pushState({ adminPage: "dashboard" }, "", "/administracao");
    setClinicaSelecionada(null);
  }

  async function entrar(evento) {
    evento.preventDefault();
    setErro("");
    setCarregando(true);
    try {
      const resposta = await fetch(API_URL + "/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, senha }),
      });
      const corpo = await resposta.json();
      if (!resposta.ok) throw new Error(corpo.erro || "Não foi possível entrar.");
      localStorage.setItem(TOKEN_KEY, corpo.token);
      setToken(corpo.token);
      setSenha("");
      await carregarPainel(corpo.token);
    } catch (e) {
      setErro(e.message || "Falha de conexão com o servidor.");
    } finally {
      setCarregando(false);
    }
  }

  function sair() {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setDados(null);
    setErro("");
  }

  const clinicasFiltradas = (dados?.clinicas || []).filter((c) =>
    [c.nome, c.email_contato, c.email_login, String(c.id)].some((v) => String(v || "").toLowerCase().includes(busca.toLowerCase()))
  );
  const indicadores = dados?.indicadores || {};

  if (!token) return (
    <div className="admin-login-page">
      <button className="admin-theme-toggle" type="button" onClick={alternarTema}>
        <Icone tipo={tema === "dark" ? "sun" : "moon"} size={15} />
        {tema === "dark" ? "Modo claro" : "Modo escuro"}
      </button>
      <div className="admin-login-wrap">
        <div className="admin-brand admin-login-brand">
          <div className="admin-brand-mark">S</div>
          <div><div className="admin-brand-name">Sorrisa</div><div className="admin-brand-caption">Gestão inteligente para clínicas</div></div>
        </div>
        <form className="admin-login-card" onSubmit={entrar}>
          <div className="admin-login-icon"><Icone tipo="lock" size={22} /></div>
          <h1>Acesso administrativo</h1>
          <p className="admin-login-description">Entre com suas credenciais para gerenciar a plataforma Sorrisa.</p>
          <div className="admin-field">
            <label htmlFor="admin-email">E-mail</label>
            <input id="admin-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="admin-field">
            <label htmlFor="admin-password">Senha</label>
            <div className="admin-password-wrap">
              <input id="admin-password" type={mostrarSenha ? "text" : "password"} value={senha} onChange={(e) => setSenha(e.target.value)} autoComplete="current-password" required />
              <button type="button" className="admin-password-toggle" onClick={() => setMostrarSenha((v) => !v)} aria-label={mostrarSenha ? "Ocultar senha" : "Mostrar senha"}>{mostrarSenha ? "Ocultar" : "Mostrar"}</button>
            </div>
          </div>
          {erro && <div className="admin-alert" role="alert">{erro}</div>}
          <button className="admin-primary-button admin-login-submit" type="submit" disabled={carregando}>{carregando ? "Verificando acesso..." : <>Entrar no painel <Icone tipo="arrow" size={16} /></>}</button>
          <div className="admin-secure-note"><Icone tipo="lock" size={13} /> Acesso restrito ao administrador da plataforma</div>
        </form>
        <div className="admin-login-footer">SORRISA · PAINEL DE CONTROLE</div>
      </div>
    </div>
  );

  return (
    <div className="admin-app">
      <header className="admin-topbar">
        <div className="admin-topbar-inner">
          <div className="admin-brand">
            <div className="admin-brand-mark">S</div>
            <span className="admin-brand-name">Sorrisa</span>
          </div>
          <div className="admin-topbar-divider" />
          <div className="admin-topbar-section"><Icone tipo="grid" size={16} /><span>Administração</span></div>
          <div className="admin-topbar-spacer" />
          <button className="admin-icon-button" type="button" onClick={alternarTema} title={tema === "dark" ? "Modo claro" : "Modo escuro"} aria-label={tema === "dark" ? "Modo claro" : "Modo escuro"}><Icone tipo={tema === "dark" ? "sun" : "moon"} size={16} /></button>
          <div className="admin-user-chip"><span className="admin-user-avatar">E</span><span className="admin-user-email">Administrador</span></div>
          <button className="admin-logout-button" type="button" onClick={sair}><Icone tipo="logout" size={15} /><span>Sair</span></button>
        </div>
      </header>

      <main className="admin-main">
        {clinicaSelecionada ? (
          <>
            <div className="admin-page-heading admin-detail-heading">
              <div>
                <button className="admin-back-button" type="button" onClick={voltarParaClinicas}><Icone tipo="arrow" size={15} /> Voltar para clínicas</button>
                <div className="admin-eyebrow">DETALHES DA CLÍNICA</div>
                <h1>{detalheClinica?.clinica?.nome || "Clínica"}</h1>
                <p>Informações cadastrais e usuários vinculados a esta clínica.</p>
              </div>
              <span className="admin-detail-id">#{clinicaSelecionada}</span>
            </div>
            {erroDetalhe && <div className="admin-alert admin-dashboard-alert" role="alert">{erroDetalhe}</div>}
            {carregandoDetalhe && !detalheClinica ? (
              <div className="admin-panel admin-loading">Carregando dados da clínica...</div>
            ) : detalheClinica ? (
              <>
                <nav className="admin-detail-tabs" aria-label="Seções dos detalhes da clínica">
                  <button type="button" className={abaDetalhe === "dados" ? "active" : ""} onClick={() => setAbaDetalhe("dados")}>
                    <Icone tipo="clinic" size={16} /> Dados da clínica
                  </button>
                  <button type="button" className={abaDetalhe === "usuarios" ? "active" : ""} onClick={() => setAbaDetalhe("usuarios")}>
                    <Icone tipo="users" size={16} /> Usuários cadastrados
                  </button>
                </nav>
                {abaDetalhe === "dados" && <section className="admin-panel admin-detail-card">
                  <div className="admin-panel-header"><div><h2>Dados da clínica</h2><p>Informações cadastradas na plataforma.</p></div></div>
                  <div className="admin-detail-fields">
                    {[
                      ["Nome da clínica", detalheClinica.clinica.nome],
                      ["Nome fantasia", detalheClinica.clinica.nome_fantasia],
                      ["Razão social", detalheClinica.clinica.razao_social],
                      ["CNPJ", detalheClinica.clinica.cnpj],
                      ["E-mail de contato", detalheClinica.clinica.email_contato],
                      ["Telefone", detalheClinica.clinica.telefone],
                      ["Telefone secundário", detalheClinica.clinica.telefone_secundario],
                      ["Responsável técnico", detalheClinica.clinica.responsavel_tecnico],
                      ["CRO", detalheClinica.clinica.cro],
                      ["Site", detalheClinica.clinica.site],
                      ["CEP", detalheClinica.clinica.cep],
                      ["Rua", detalheClinica.clinica.rua],
                      ["Número", detalheClinica.clinica.numero],
                      ["Complemento", detalheClinica.clinica.complemento],
                      ["Bairro", detalheClinica.clinica.bairro],
                      ["Cidade", detalheClinica.clinica.cidade],
                      ["Estado", detalheClinica.clinica.estado],
                      ["Plano", detalheClinica.clinica.plano],
                      ["Situação", detalheClinica.clinica.status],
                      ["Data de cadastro", dataBR(detalheClinica.clinica.created_at)],
                    ].map(([rotulo, valor]) => (
                      <div className="admin-detail-field" key={rotulo}>
                        <span>{rotulo}</span><strong>{valor || "—"}</strong>
                      </div>
                    ))}
                  </div>
                </section>}
                {abaDetalhe === "usuarios" && <section className="admin-panel admin-detail-users">
                  <div className="admin-panel-header">
                    <div><h2>Usuários cadastrados</h2><p>{detalheClinica.usuarios.length} usuário(s) vinculado(s) a esta clínica.</p></div>
                  </div>
                  <div className="admin-table-scroll">
                    <table className="admin-table">
                      <thead><tr><th>Nome</th><th>E-mail</th><th>Cadastro</th></tr></thead>
                      <tbody>
                        {detalheClinica.usuarios.map((usuario) => (
                          <tr key={usuario.id}>
                            <td><div className="admin-clinic-name">{usuario.nome || "Usuário"}</div></td>
                            <td>{usuario.email || "Sem e-mail cadastrado"}</td>
                            <td>{dataBR(usuario.created_at)}</td>
                          </tr>
                        ))}
                        {!detalheClinica.usuarios.length && <tr><td className="admin-empty-cell" colSpan="3">Nenhum usuário cadastrado nesta clínica.</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>}
              </>
            ) : null}
          </>
        ) : <>
        <div className="admin-page-heading">
          <div>
            <div className="admin-eyebrow">PAINEL DA PLATAFORMA</div>
            <h1>Visão geral</h1>
            <p>Acompanhe o desempenho e a operação de todas as clínicas cadastradas.</p>
          </div>
          <button className="admin-secondary-button" type="button" onClick={() => carregarPainel()} disabled={carregando}><Icone tipo="refresh" size={15} />{carregando ? "Atualizando..." : "Atualizar dados"}</button>
        </div>

        {erro && <div className="admin-alert admin-dashboard-alert" role="alert">{erro}</div>}

        {carregando && !dados ? <div className="admin-panel admin-loading">Carregando informações da plataforma...</div> : <>
          <section className="admin-stats-grid">
            <article className="admin-stat-card">
              <div className="admin-stat-top"><span className="admin-stat-icon blue"><Icone tipo="clinic" /></span><span className="admin-stat-label">Clínicas cadastradas</span></div>
              <div className="admin-stat-value">{indicadores.total_clinicas ?? 0}</div>
              <div className="admin-stat-foot">Total de contas criadas</div>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-top"><span className="admin-stat-icon green"><Icone tipo="check" /></span><span className="admin-stat-label">Clínicas ativas</span></div>
              <div className="admin-stat-value">{indicadores.clinicas_ativas ?? 0}</div>
              <div className="admin-stat-foot">Clínicas em funcionamento</div>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-top"><span className="admin-stat-icon violet"><Icone tipo="users" /></span><span className="admin-stat-label">Usuários</span></div>
              <div className="admin-stat-value">{indicadores.total_usuarios ?? 0}</div>
              <div className="admin-stat-foot">Usuários em todas as clínicas</div>
            </article>
            <article className="admin-stat-card">
              <div className="admin-stat-top"><span className="admin-stat-icon amber"><Icone tipo="storage" /></span><span className="admin-stat-label">Armazenamento utilizado</span></div>
              <div className="admin-stat-value admin-stat-storage">{formatarBytes(indicadores.armazenamento_bytes)}</div>
              <div className="admin-stat-foot">Espaço ocupado pelos arquivos</div>
            </article>
          </section>

          <section className="admin-subscription-strip">
            <div className="admin-subscription-title"><span className="admin-subscription-icon"><Icone tipo="check" size={17} /></span><div><strong>Assinaturas</strong><span>Resumo da situação atual</span></div></div>
            <div className="admin-subscription-metric"><strong>{indicadores.assinaturas_ativas ?? 0}</strong><span>Ativas</span></div>
            <div className="admin-subscription-separator" />
            <div className="admin-subscription-metric pending"><strong>{indicadores.assinaturas_pendentes ?? 0}</strong><span>Pendentes</span></div>
            <div className="admin-subscription-separator" />
            <div className="admin-subscription-metric trial"><strong>{indicadores.assinaturas_trial ?? 0}</strong><span>Em período de teste</span></div>
          </section>

          <section className="admin-panel admin-clinics-panel">
            <div className="admin-panel-header">
              <div><h2>Clínicas cadastradas</h2><p>Consulte usuários, arquivos e situação de cada clínica.</p></div>
              <div className="admin-search"><Icone tipo="search" size={16} /><input value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar clínica..." aria-label="Buscar clínica" /></div>
            </div>
            <div className="admin-table-scroll">
              <table className="admin-table">
                <thead><tr><th>Clínica</th><th>Usuários</th><th>Arquivos</th><th>Armazenamento</th><th>Plano</th><th>Assinatura</th><th>Cadastro</th></tr></thead>
                <tbody>
                  {clinicasFiltradas.map((c) => <tr key={c.id}>
                    <td><button type="button" className="admin-clinic-link" onClick={() => abrirClinica(c.id)}>{c.nome}</button><div className="admin-clinic-meta">{c.email_login ? "Login: " + c.email_login : c.email_contato ? "Contato: " + c.email_contato + " · login não vinculado" : "Sem usuário com e-mail vinculado"}</div></td>
                    <td>{c.total_usuarios ?? 0}</td><td>{c.total_arquivos ?? 0}</td><td>{formatarBytes(c.armazenamento_bytes)}</td>
                    <td><span className="admin-plan-label">{c.plano || "—"}</span></td>
                    <td><span className={"admin-status " + (c.assinatura_status === "ativa" ? "active" : c.assinatura_status === "pendente" || c.assinatura_status === "past_due" ? "pending" : "neutral")}>{c.assinatura_status || "Sem assinatura"}</span></td>
                    <td>{dataBR(c.created_at)}</td>
                  </tr>)}
                  {!clinicasFiltradas.length && <tr><td className="admin-empty-cell" colSpan="7">Nenhuma clínica encontrada.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="admin-table-footer"><span>Exibindo {clinicasFiltradas.length} de {(dados?.clinicas || []).length} clínicas</span><span>Dados atualizados ao carregar o painel</span></div>
          </section>
        </>}
        </>}
      </main>
    </div>
  );
}
