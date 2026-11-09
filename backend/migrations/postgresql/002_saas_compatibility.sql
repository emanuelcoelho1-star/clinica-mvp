-- Completa as colunas adicionadas pelas migrações SaaS/RBAC do SQLite.
-- Esta migração é aditiva e pode ser executada novamente com segurança.

ALTER TABLE usuarios ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE consultas ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE odontogramas ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE anamneses ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE documentos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE pagamentos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE evolucoes ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE tratamentos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE profissionais ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE categorias_financeiras ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE contas_pagar ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE contas_receber ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE comissoes ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE fluxo_caixa ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE centros_custo ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE formas_pagamento_config ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE metas_financeiras ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE planos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE procedimentos_catalogo ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE plano_procedimentos ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE roles ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE permissoes ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);
ALTER TABLE role_permissoes ADD COLUMN IF NOT EXISTS clinica_id INTEGER REFERENCES clinicas(id);

-- Campos adicionados depois da criação inicial das tabelas no SQLite.
ALTER TABLE arquivos ADD COLUMN IF NOT EXISTS pasta_id INTEGER REFERENCES pastas_arquivos(id);
ALTER TABLE pacientes ADD COLUMN IF NOT EXISTS foto_url TEXT;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS descricao TEXT;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS dentista_responsavel TEXT;
ALTER TABLE orcamentos ADD COLUMN IF NOT EXISTS plano_id INTEGER REFERENCES planos(id);
ALTER TABLE orcamento_itens ADD COLUMN IF NOT EXISTS faces TEXT;
ALTER TABLE tratamentos ADD COLUMN IF NOT EXISTS origem_orcamento_item_id INTEGER REFERENCES orcamento_itens(id);
ALTER TABLE procedimentos_catalogo ADD COLUMN IF NOT EXISTS aceita_faces INTEGER NOT NULL DEFAULT 0;
ALTER TABLE procedimentos_catalogo ADD COLUMN IF NOT EXISTS custo_tratamento DOUBLE PRECISION NOT NULL DEFAULT 0;
ALTER TABLE procedimentos_catalogo ADD COLUMN IF NOT EXISTS usar_na_frente INTEGER NOT NULL DEFAULT 1;
ALTER TABLE clinicas ADD COLUMN IF NOT EXISTS cpf TEXT;

-- Índices usados nos filtros de isolamento por clínica.
CREATE INDEX IF NOT EXISTS idx_pastas_arquivos_clinica_id ON pastas_arquivos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_medicamentos_clinica_id ON medicamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_clinica_id ON auditoria(clinica_id);
CREATE INDEX IF NOT EXISTS idx_usuarios_clinica_id ON usuarios(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pacientes_clinica_id ON pacientes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_consultas_clinica_id ON consultas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_odontogramas_clinica_id ON odontogramas(clinica_id);
CREATE INDEX IF NOT EXISTS idx_anamneses_clinica_id ON anamneses(clinica_id);
CREATE INDEX IF NOT EXISTS idx_orcamentos_clinica_id ON orcamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_orcamento_itens_clinica_id ON orcamento_itens(clinica_id);
CREATE INDEX IF NOT EXISTS idx_arquivos_clinica_id ON arquivos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_documentos_clinica_id ON documentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_pagamentos_clinica_id ON pagamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_evolucoes_clinica_id ON evolucoes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_tratamentos_clinica_id ON tratamentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_profissionais_clinica_id ON profissionais(clinica_id);
CREATE INDEX IF NOT EXISTS idx_categorias_financeiras_clinica_id ON categorias_financeiras(clinica_id);
CREATE INDEX IF NOT EXISTS idx_contas_pagar_clinica_id ON contas_pagar(clinica_id);
CREATE INDEX IF NOT EXISTS idx_contas_receber_clinica_id ON contas_receber(clinica_id);
CREATE INDEX IF NOT EXISTS idx_comissoes_clinica_id ON comissoes(clinica_id);
CREATE INDEX IF NOT EXISTS idx_fluxo_caixa_clinica_id ON fluxo_caixa(clinica_id);
CREATE INDEX IF NOT EXISTS idx_centros_custo_clinica_id ON centros_custo(clinica_id);
CREATE INDEX IF NOT EXISTS idx_formas_pagamento_config_clinica_id ON formas_pagamento_config(clinica_id);
CREATE INDEX IF NOT EXISTS idx_metas_financeiras_clinica_id ON metas_financeiras(clinica_id);
CREATE INDEX IF NOT EXISTS idx_planos_clinica_id ON planos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_procedimentos_catalogo_clinica_id ON procedimentos_catalogo(clinica_id);
CREATE INDEX IF NOT EXISTS idx_plano_procedimentos_clinica_id ON plano_procedimentos(clinica_id);
CREATE INDEX IF NOT EXISTS idx_roles_clinica_id ON roles(clinica_id);
CREATE INDEX IF NOT EXISTS idx_role_permissoes_clinica_id ON role_permissoes(clinica_id);

-- Perfis podem repetir nomes em clínicas diferentes; perfis globais permanecem possíveis.
CREATE UNIQUE INDEX IF NOT EXISTS idx_roles_clinica_nome
  ON roles(clinica_id, nome);

-- O administrador protegido global é compartilhado, mas não pertence a uma clínica.
CREATE INDEX IF NOT EXISTS idx_roles_protegido_global
  ON roles(protegido, ativo) WHERE clinica_id IS NULL;
