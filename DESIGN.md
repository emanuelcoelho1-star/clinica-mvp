# DESIGN.md · OdontoPro (clinica-mvp)

> Brief de design vivo do projeto. Seções 1–2 são verdade do produto; 3–12 são o sistema visual.
> Ordem de leitura: tokens no código (`frontend/src/styles/themes.css`) → este arquivo → padrões da skill antiwebslop.

## 1. Product truth
- **Users:** recepção e dentistas de clínicas odontológicas, no computador da recepção e no celular entre atendimentos. Uso repetido o dia todo.
- **Purpose:** agenda, prontuário, financeiro e relacionamento com pacientes de uma clínica, num sistema multi-clínica vendido por assinatura.
- **Constraints:** marca atual (nome OdontoPro, ícone de coração no quadrado azul) fica até existir identidade própria; tema claro e escuro; português do Brasil; dados de saúde (LGPD), então nada de dados reais em telas de exemplo.
- **Success means:** recepção encontra o horário livre e confirma o paciente em segundos; dentista abre o prontuário sem caçar abas; o dono vê o caixa sem planilha.
- **Real content available:** nenhum material de marca além do nome e do ícone. Pedir logo e paleta ao dono antes de qualquer redesign de marca.

## 2. Design Read and surface types
Reading this as: o sistema interno da clínica para recepção e dentistas, com um painel administrativo claro e destaque azul, em React + Vite com estilos inline e variáveis CSS.

| Surface | Type | V | M | D |
|---|---|---|---|---|
| Login / cadastro de clínica | operate (porta de entrada do app, não landing) | 3 | 2 | 4 |
| Dashboard, Agenda, Pacientes, Prontuário, Financeiro, Relacionamento, Configurações | operate | 3 | 2 | 7 |

## 3. Visual direction and project bans
- Direção: utilitário e calmo. Dados primeiro, números com `tabular-nums`, cor só onde há estado (confirmado, atrasado, erro).
- O kit atual (cards brancos, raio 10–16px, cinzas slate, azul `#2563eb`) fica. Mudanças são de higiene, não de estilo.
- Bans do projeto:
  - Fileira de cards de KPI iguais com ícone em quadradinho colorido no topo de toda tela. KPI só quando o número muda uma decisão; senão, uma linha de texto.
  - Arco-íris de pastéis para diferenciar números que não têm estado.
  - Bolhas/círculos desfocados de fundo, selos de "seguro/criptografado" e rodapé com versão/ano no app.
  - Emoji como ícone (inclusive em `alert`).
  - Bloco escuro de "ações rápidas" de marketing dentro de tela de operação.
- Exceções aceitas: as cores de status da Agenda (agendado/confirmado/concluído/faltou/cancelado) têm função de legenda.

## 4. Color tokens

```design-tokens
fonts: Inter, Segoe UI, Roboto, Helvetica, Arial, DM Sans, JetBrains Mono
colors: #ffffff, #f0f4fa, #fafbfc, #fafbfd, #f8fafc, #f1f5f9, #e2e8f0, #cbd5e1, #94a3b8, #64748b, #475569, #334155, #1e293b, #0f172a, #2563eb, #1d4ed8, #eff6ff, #dbeafe, #bfdbfe, #93c5fd, #16a34a, #15803d, #f0fdf4, #dcfce7, #bbf7d0, #4ade80, #dc2626, #b91c1c, #ef4444, #f87171, #fef2f2, #fee2e2, #fecaca, #ca8a04, #fefce8, #fde68a, #ea580c, #fff7ed, #fed7aa, #fb923c, #c2410c, #7c3aed, #faf5ff, #ddd6fe, #a78bfa, #d1d5db, #fafcff, #f0f4ff
radii: 0, 4px, 6px, 8px, 10px, 12px, 14px, 16px, 999px, 9999px
```

Variáveis em `frontend/src/styles/themes.css` (tema claro; o escuro redefine as mesmas):

| Token | Value | Job |
|---|---|---|
| `--bg-page` | `#f0f4fa` | fundo da página |
| `--bg-card` | `#ffffff` | superfícies (cards, modais) |
| `--text-primary` | `#0f172a` | texto principal e números |
| `--text-secondary` | `#475569` | texto de apoio |
| texto muted (inline) | `#64748b` | legendas e subtítulos. **Não usar `#94a3b8` para texto** (≈2,6:1 sobre branco, reprova AA); `#94a3b8` só em ícones decorativos e placeholders |
| `--border-input` | `#e2e8f0` | hairlines e bordas |
| `--accent` | `#2563eb` | ação primária e item atual da navegação. Só isso |
| `--success` / `--danger` / `--warning` | `#16a34a` / `#dc2626` / `#ca8a04` | estado (pago, atrasado, pendente). Nunca enfeite |

Código novo usa `var(--…)` sempre que existir a variável, para o tema escuro funcionar sem os seletores de atributo de `themes.css`.

## 5. Typography
- A fonte Inter para tudo. Escolha consciente para telas de operação: legível em tabelas e formulários, sem fonte display.
- Números (KPIs, valores, horários): `font-variant-numeric: tabular-nums`.
- Escala usada: 11 (labels em caixa alta) / 12 / 13 / 14 (corpo) / 15 / 18 / 22 / 28 (título de página).
- Títulos com `text-wrap: balance`; descrições com `text-wrap: pretty`.

## 6. Spacing and layout
- Escala: 4 · 8 · 12 · 16 · 20 · 24 · 32 · 48.
- Página: `gap` 24px entre blocos; largura máxima do conteúdo vem do layout do `App.jsx`.
- Densidade alta: listas e tabelas em vez de grades de cards quando há mais de 4 itens.

## 7. Components
- Raio por papel: controles 8–10px · cards 12–16px · pílulas/badges 999px.
- Sombra só em dropdowns, modais e toasts. Cards ficam com borda, sem sombra.
- Botões: primário = fundo `--accent`; secundário = borda neutra. Um primário por área.
- Indicadores (KPIs): uma faixa única com divisórias, número + rótulo, sem ícone. Cor só no número que pede ação (ex.: retornos atrasados > 0 em `--danger`).

## 8. Motion
- Só mudança de estado em hover/foco (≤ 150ms) e indicadores de carregamento.
- Toda animação contínua (spinners, pontos pulsando) fica dentro de `@media (prefers-reduced-motion: no-preference)` ou para quando `reduce`.

## 9. Imagery and content
- Sem ilustração e sem foto de banco. Estados vazios dizem o que fazer a seguir na própria tela ("Programe um retorno ao concluir uma consulta"), não "Os dados aparecerão aqui".
- Voz: direta, em português simples, com números em vez de adjetivos.

## 10. Do / Don't
| Do | Don't |
|---|---|
| Mostrar só o número que muda uma decisão | Repetir "Total" de coisas que a lista logo abaixo já conta |
| Usar cor para estado | Usar cor para diferenciar cards |
| Texto secundário em `#64748b` | Texto secundário em `#94a3b8` |
| `var(--bg-card)` e cia. em código novo | Hex solto que quebra o tema escuro |

## 11. Decision log

### 2026-10-30 · Faixa de KPIs no lugar de cards com ícone
- **Decisão:** indicadores viram uma faixa única (número + rótulo, divisórias), sem ícone em quadradinho e sem cor por card.
- **Por quê:** todas as telas abriam com o mesmo bloco de cards iguais; parte dos números era vaidade e o ícone não ajudava a ler nada.
- **Onde:** Dashboard, Pacientes, Financeiro (visão geral), Relacionamento.

### 2026-10-30 · Login sem decoração
- **Decisão:** removidos círculos desfocados, ícone de cadeado acima do título, selo "Conexão segura e criptografada" e rodapé de versão/ano.
- **Por quê:** decoração genérica de template e uma afirmação de segurança que o app não comprova.

### 2026-10-30 · Contraste do texto secundário
- **Decisão:** texto secundário passa a `#64748b` nas telas tocadas; `#94a3b8` fica restrito a ícones e placeholders.
- **Por quê:** `#94a3b8` sobre branco tem ≈2,6:1 e reprova WCAG AA.

## 12. References
- Tokens: `frontend/src/styles/themes.css`
- Skill: antiwebslop (catálogo de anti-padrões e lint `slop-lint.mjs`)
