/* ══════════════════════════════════════════════════════════════
   RBAC — Constantes e Helpers compartilhados
   ══════════════════════════════════════════════════════════════ */

import API_URL from "../../api";

export const API = API_URL;

export const MODULOS_LABELS = {
  pacientes: "Pacientes",
  agenda: "Agenda",
  financeiro: "Financeiro",
  orcamentos: "Orçamentos",
  documentos: "Documentos",
  tratamentos: "Tratamentos",
  configuracoes: "Configurações",
};

export const ACOES_LABELS = {
  listar: "Listar",
  criar: "Criar",
  editar: "Editar",
  excluir: "Excluir",
  ver_prontuario: "Prontuário",
  exportar: "Exportar",
  gerenciar_usuarios: "Usuários",
  gerenciar_roles: "Perfis",
  gerenciar_permissoes: "Permissões",
};

export const CORES_DISPONIVEIS = [
  "#2563eb",
  "#10b981",
  "#f59e0b",
  "#8b5cf6",
  "#ef4444",
  "#ec4899",
  "#06b6d4",
  "#f97316",
  "#64748b",
  "#14b8a6",
];

export function getInitials(nome) {
  if (!nome) return "U";
  const parts = nome.trim().split(" ").filter(Boolean);
  if (parts.length >= 2)
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0][0].toUpperCase();
}