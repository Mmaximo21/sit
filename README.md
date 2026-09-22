# 🏥 SI-ILPI — Sistema Interno de Gestão e Assistência em ILPI

> **Plataforma Integrada de Gestão Clínica, Protocolos Multiprofissionais e Apoio Operacional para Instituições de Longa Permanência para Idosos (ILPI).**  
> Totalmente em conformidade com as diretrizes da **RDC ANVISA nº 502/2021** e padrões de acreditação **ONA**.

---

## 🌟 Visão Geral

O **SI-ILPI** é uma solução corporativa moderna projetada especificamente para atender à complexidade operacional e clínica de ILPIs. O sistema unifica a gestão de prontuários, planos terapêuticos individuais (PIA), escalas de trabalho de equipes multiprofissionais, monitoramento de sinais vitais com alertas clínicos precoces (NEWS 2), censo diário de enfermagem e uma central de inteligência clínica para consulta a protocolos institucionais.

---

## 🚀 Principais Módulos & Recursos

### 1. 🛡️ Segurança Corporativa & Auditoria
- **Headers HTTP Avançados**: Injeção automática de `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` e `X-XSS-Protection`.
- **Proteção Contra Força Bruta**: Bloqueio progressivo do formulário de autenticação por 30 segundos após 5 tentativas falhas consecutivas, com contagem regressiva em tempo real.
- **Prevenção Anti-Open Redirect**: Validação estrita por expressão regular do parâmetro `?next=` na autenticação.
- **Mascaramento de Falhas (Error Masking)**: Respostas 500 do servidor SSR ocultam stacktraces e detalhes sensíveis do banco de dados em produção.
- **Row Level Security (RLS)**: Isolamento granular de permissões e perfis no banco de dados Supabase PostgreSQL.

### 2. 🌌 Experiência Visual 3D & 4D (Tela de Acesso)
- **Hipercubo 4D Interativo (Tesseract)**: Motor gráfico proprietário em Canvas HTML5 (`Hyper4DCanvas.tsx`) com 16 vértices e 32 arestas projetadas esterograficamente do espaço quadridimensional $(x, y, z, w)$ para a tela através de rotações acopladas nos planos $XZ$, $YW$ e $XW$.
- **Campo de Partículas Espaçotemporal**: Simulação com atração gravitacional e filamentos sinápticos que reagem dinamicamente à posição do cursor do mouse.
- **Efeito Shockwave**: Onda de choque luminosa disparada no envio do formulário de acesso.
- **Card em Camadas de Profundidade 3D**: Interface construída com CSS 3D (`transform-style: preserve-3d`), relevo por eixos $Z$ e reflexo especular de vidro que acompanha o mouse.
- **Otimização de Desempenho**: Pausa automática em segundo plano (`document.hidden`) e respeito total ao modo `prefers-reduced-motion`.

### 3. 📑 Central de Protocolos Clínicos & Apoio Multiprofissional (Lumi)
- **Assistente Especializado**: Inteligência artificial reconfigurada institucionalmente como consultor de protocolos operacionais padrão (POPs), farmacologia geriátrica e condutas assistenciais.
- **Controle de Cota Diária**: Limite atômico de **10 perguntas por dia por especialidade**, sincronizado via função PostgreSQL (`SECURITY DEFINER`) com fuso horário oficial de Brasília (`America/Sao_Paulo`).
- **Sanitização de Entrada**: Proteção com corte de prompts acima de 4.000 caracteres e limitação do histórico a 50 mensagens por sessão.

### 4. 🧭 Navegação em Barra Lateral (Sidebar)
- **Design Retrátil & Responsivo**: Barra lateral vertical translúcida (*glass-panel*) com transições fluidas.
- **Modos Expandido (`w-64`) e Compacto (`w-20`)**: Exibição detalhada ou com ícones e tooltips interativos flutuantes, mantendo a preferência salva no `localStorage`.
- **Gaveta Mobile (Slide-over Drawer)**: Acesso rápido em smartphones com fechamento automático ao navegar.
- **Menu Categorizado**:
  - **Avaliações**: Avaliações Multiprofissionais, PIA, Exames, Cardápios
  - **Assistência**: Censo de Enfermagem, Escala NEWS 2, Relatório de Plantão
  - **Saídas**: Controle de Saídas e Retornos de Residentes
  - **Escalas**: Escala Geral de Trabalho, Escala de Enfermagem, Escala Administrativa, Escala Técnica
  - **Protocolos**: Central de Protocolos Clínicos
  - **Administração**: Usuários, Prazos, Permissões, Avisos, Configurações Gerais

### 5. 📋 Gestão Clínica e Assistencial Integrada
- **Plano Individual de Atenção (PIA)**: Histórico de avaliações, metas personalizadas, autosave em tempo real e geração de termos de fechamento.
- **Escala NEWS 2 (National Early Warning Score)**: Pontuação clínica parametrizada para detecção precoce de deterioração fisiológica do idoso.
- **Censo de Enfermagem & Relatório de Plantão**: Registro diário de residentes acamados, sondados, em isolamento ou com lesão por pressão, com exportação para planilhas e relatórios.
- **Escalas de Plantão com Exportação**: Painel interativo de turnos com exportação direta para **Excel (.xlsx)** e **PDF**.

---

## 🛠️ Stack Tecnológica

| Camada | Tecnologia | Finalidade |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19 + TanStack Start | Arquitetura moderna com SSR, hydration híbrida e alta performance |
| **Roteamento** | TanStack Router | Roteamento totalmente tipado (*type-safe routes*) baseado em sistema de arquivos |
| **Gerenciamento de Estado** | TanStack React Query v5 | Cache inteligente, revalidação e sincronização otimista de dados |
| **Estilização** | Tailwind CSS v4 + PostCSS | Utility-first CSS de última geração com tema escuro/claro nativo |
| **Design System** | Radix UI + Lucide Icons | Componentes acessíveis com foco em usabilidade (WAI-ARIA) |
| **Animações & Motion** | Framer Motion (motion/react) | Animações fluidas, físicas de mola e transições de layout |
| **Motor 3D/4D** | HTML5 Canvas Nativo | Renderização matemática de hipercubo 4D sem sobrecarga de bibliotecas pesadas |
| **Backend & Banco de Dados**| Supabase PostgreSQL | Auth, Row Level Security, RPCs atômicas e Storage |
| **Bundler & Build** | Vite 6 + Rolldown / Nitro | Compilação ultrarrápida para produção |
| **Exportação de Documentos**| Docx + ExcelJS + jsPDF | Geração de prontuários, laudos e planilhas formatadas |

---

## 📁 Estrutura do Projeto

```text
si-ilpi/
├── .lovable/                 # Metadados e configurações da plataforma Lovable
├── public/                   # Favicons, ícones e assets estáticos públicos
├── src/
│   ├── components/
│   │   ├── ai/               # Interface da Central de Protocolos (ChatWorkspace)
│   │   ├── ai-elements/      # Componentes granulares de mensagens e prompts
│   │   ├── login/            # Motor gráfico 4D (Hyper4DCanvas)
│   │   ├── ui/               # Biblioteca de componentes base (Radix UI)
│   │   ├── AppShell.tsx      # Barra lateral (Sidebar), gaveta mobile e layout mestre
│   │   ├── FormRenderer.tsx  # Renderizador de formulários clínicos dinâmicos
│   │   ├── NoticeBanner.tsx  # Banners de comunicados institucionais
│   │   └── ThemeProvider.tsx # Provedor de temas (Claro, Escuro, Automático)
│   ├── hooks/                # Hooks customizados (useAuth, useIsMobile)
│   ├── integrations/
│   │   └── supabase/         # Conexão, middlewares e tipagens geradas do Supabase
│   ├── lib/                  # Utilitários, cálculos clínicos (NEWS 2, PIA), limites e regras
│   ├── routes/               # Rotas autenticadas e públicas (TanStack Router)
│   │   ├── _authenticated/   # Telas restritas (Painel, PIA, Exames, Escalas, Censo, etc.)
│   │   ├── api/              # Endpoints de API internos (/api/chat)
│   │   ├── __root.tsx        # Layout raiz com tratamento global de erros e 404
│   │   └── index.tsx         # Tela de login com efeitos 4D e proteção contra força bruta
│   ├── server.ts             # Servidor SSR com injeção de headers de segurança
│   ├── start.ts              # Ponto de entrada do TanStack Start
│   └── styles.css            # Folha de estilos globais e variáveis de tema
├── supabase/
│   └── migrations/           # Migrações SQL versionadas (tabelas, RLS e RPCs)
├── eslint.config.js          # Configuração de linter e boas práticas
├── package.json              # Dependências e scripts do ecossistema
├── tsconfig.json             # Configuração estrita do compilador TypeScript
└── vite.config.ts            # Configurações do Vite e plugins de compilação
```

---

## ⚙️ Pré-requisitos & Instalação

### Pré-requisitos
- **Node.js**: Versão `>= 18.0.0` (Recomendado: LTS Node 20 ou 22)
- **npm** ou **bun**

### Instalação Passo a Passo

1. **Clonar o Repositório**:
   ```bash
   git clone https://github.com/Mmaximo21/sit.git
   cd sit
   ```

2. **Instalar Dependências**:
   ```bash
   npm install
   ```

3. **Configurar Variáveis de Ambiente**:
   Crie um arquivo `.env` na raiz do projeto com as chaves do seu projeto Supabase:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_PUBLISHABLE_KEY="sua-chave-anon-publica"
   SUPABASE_URL="https://seu-projeto.supabase.co"
   SUPABASE_PUBLISHABLE_KEY="sua-chave-anon-publica"
   ```

4. **Aplicar Migrações do Banco de Dados**:
   Aplique os scripts SQL localizados na pasta `supabase/migrations/` no seu painel do Supabase, incluindo a migração `20260921200000_specialty_daily_chat_limit.sql` para ativação da cota diária por especialidade.

---

## 💻 Scripts Disponíveis

| Comando | Descrição |
| :--- | :--- |
| `npm run dev` | Inicia o servidor de desenvolvimento com hot-reload ativo |
| `npm run build` | Compila o projeto com otimizações de produção (Vite + Nitro) |
| `npm run preview` | Executa o preview local do build de produção |
| `npm run lint` | Executa o ESLint para validação de qualidade em todo o código |
| `npm run format` | Aplica a formatação automática via Prettier em todos os arquivos |

---

## 📊 Relatório de Auditoria e Qualidade

O projeto foi submetido a uma auditoria integral de código e segurança:

- **TypeScript (`npx tsc --noEmit`)**: **0 erros** de tipagem em todo o projeto.
- **Qualidade de Código (`npm run lint`)**: **0 erros** de sintaxe ou violação de regras de hook.
- **Formatação de Código (`npm run format`)**: 100% dos arquivos padronizados e alinhados.
- **Tempo de Compilação**: Build de produção compilado em média em **5 a 7 segundos**.
- **Compatibilidade Multiplataforma**: Arquivos ZIP gerados com caminhos canônicos e permissões POSIX (`0755`/`0644`), funcionando sem erros em Windows, Linux e contêineres Docker.

---

## 📄 Licença & Autoria

Desenvolvido e estruturado com foco em excelência no cuidado ao idoso por **Matheus Máximo**.  
Todos os direitos reservados à **ILPI - LOSA*.
