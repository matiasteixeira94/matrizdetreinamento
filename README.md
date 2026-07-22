# Matriz de Treinamento — Viana & Moura Construções

Plataforma web de acompanhamento da matriz individual de treinamentos:
status, prazos e cobertura por colaborador, equipe, tipo de treinamento e
unidade. HTML/CSS/JS puro (sem build step, sem framework), mesmo padrão do
repositório irmão [`matiasdev`](https://github.com/matiasteixeira94/matiasdev)
(Gestão da Produção) — mesma identidade visual, mesmo motor de gráficos SVG,
mesma estrutura de shell (sidebar/topbar). **Sem tela de login por enquanto**
— uso interno, autenticação fica para uma próxima etapa.

## Estrutura

```
.
├── index.html            # Visão Geral (dashboard)
├── colaboradores.html      # Matriz por colaborador, com drill-down individual
├── treinamentos.html        # Catálogo de treinamentos, % de conclusão
├── pendencias.html            # Atrasados e pendentes, ordenado por prazo
├── equipes.html                 # Rollup por líder/equipe
├── css/styles.css                 # Tokens de design + componentes compartilhados
├── js/
│   ├── app.js                       # Shell (sidebar/topbar), tema, utilidades e acesso aos dados
│   ├── charts.js                      # Gráficos em SVG puro (barras, barras+linha, ranking)
│   ├── dashboard.js                     # Lógica da Visão Geral
│   ├── colaboradores.js                   # Lógica da tela Colaboradores
│   ├── treinamentos.js                      # Lógica da tela Treinamentos
│   ├── pendencias.js                          # Lógica da tela Pendências
│   └── equipes.js                               # Lógica da tela Equipes
├── api/
│   ├── treinamentos.js    # Função serverless: busca + faz parse do CSV de origem, devolve JSON
│   └── _csv.js              # Parser CSV (delimitador ";", RFC4180) sem dependências externas
└── docs/
    └── estrutura-dados.md  # Colunas do CSV de origem + como cada tela usa os dados
```

## Fonte dos dados

`GET /api/treinamentos` busca, no servidor, o CSV publicado pela Viana &
Moura (matriz individual de treinamentos) e devolve como JSON. Ver
[`docs/estrutura-dados.md`](docs/estrutura-dados.md) para as colunas e uma
observação importante: a origem bloqueia requisições sem `User-Agent` de
navegador, então o fetch no servidor sempre envia um explícito.

## Rodando localmente

Como há uma função serverless em `api/`, um servidor estático puro
(`http-server`/`serve`) não é suficiente — ele serviria os `.html`/`.js` mas
`/api/treinamentos` retornaria 404. Use o CLI da Vercel:

```bash
npm i -g vercel
vercel dev
```

Depois acesse `http://localhost:3000/index.html`.

## Deploy (GitHub + Vercel)

```bash
git add .
git commit -m "Estrutura inicial da Matriz de Treinamento"
git push -u origin main
```

Na Vercel: **Add New → Project → Import Git Repository**, selecione
`matiasteixeira94/matrizdetreinamento`. Site estático + 1 função serverless —
a Vercel detecta tudo automaticamente, não precisa configurar *build command*
nem *output directory*. Cada push na branch `main` gera um novo deploy em
produção automaticamente (e cada PR/branch gera um preview deploy próprio) —
é esse o mecanismo de "depuração automática": não existe um passo manual
extra depois do primeiro import, a Vercel builda e observa o repositório
sozinha a partir daí.

## Documentação

- [`docs/estrutura-dados.md`](docs/estrutura-dados.md) — colunas do CSV de origem e como cada tela consome os dados
