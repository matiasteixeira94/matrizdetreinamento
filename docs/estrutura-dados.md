# Estrutura dos dados — Matriz de Treinamento

## Origem

`GET /api/treinamentos` (função serverless em `api/treinamentos.js`) busca, no
servidor, o CSV publicado pela Viana & Moura em:

```
https://dados.vianaemoura.com.br/s3/VMC/Obra/treinamentosMatrizIndividual.csv/dI5sHbHXI
```

Essa URL redireciona (302) para um link assinado do S3 (`vm-datalake`),
válido por 7 dias — a própria origem renova a assinatura a cada acesso, então
a URL pública acima nunca expira, só o redirecionamento momentâneo.

**Importante:** a origem recusa requisições sem um `User-Agent` de navegador
("Acesso negado. Atividade suspeita detectada..."). Por isso
`api/treinamentos.js` sempre envia um `User-Agent` explícito — sem isso a
função quebra em produção mesmo funcionando em teste manual no navegador.

O fetch acontece no servidor (não direto do navegador) por dois motivos:
evitar CORS entre `dados.vianaemoura.com.br` e o domínio da Vercel, e permitir
cache da resposta (`Cache-Control`, ver `vercel.json`) sem reprocessar o CSV
inteiro (≈950 KB, ~3.300 linhas) a cada carregamento de página.

## Colunas do CSV (delimitador `;`)

| Coluna | Descrição |
|---|---|
| `NomeColaborador` | Nome do colaborador atribuído ao treinamento |
| `UGB_Colaborador` | Unidade de Gestão de Base do colaborador (ex.: CA, JG) |
| `Cargo_Colaborador` | Cargo do colaborador |
| `Departamento_Colaborador` | Departamento (frequentemente vazio — nem toda área preenche) |
| `Setor_Colaborador` | Setor do colaborador |
| `GA_Colaborador` | Grupo de Atuação / equipe do colaborador |
| `TipoColaborador` | Direto / Indireto / Direto Infra etc. |
| `NomeLider` ... `TipoLider` | Mesmos 7 campos acima, mas do líder direto do colaborador |
| `TipoTreinamento` | Categoria do treinamento (Projetos, POP, Lista de Kits, Manual de Treinamento, Anexo) |
| `NomeTreinamento` | Nome específico do treinamento |
| `UnidadeResponsavel` | Área responsável por ministrar/validar o treinamento |
| `Status` | `Realizado`, `Atrasado`, `Pendente`, `Aguarda Validação` ou `Outros` |
| `Instrutor` | Quem ministrou (só preenchido quando `Status = Realizado`) |
| `Prazo` | Data-limite para conclusão (AAAA-MM-DD) |
| `DataTreinamento` | Data em que o treinamento foi de fato realizado (só preenchida quando `Status = Realizado`) |

Cada linha é um par **colaborador × treinamento atribuído** — o mesmo
colaborador aparece em várias linhas (uma por treinamento da matriz dele).

## Como as telas usam isso

Todo o processamento (agrupar por colaborador, por líder, por tipo de
treinamento, calcular % de conclusão, ordenar por prazo etc.) acontece no
navegador, em cima do array retornado por `MT.loadTreinamentos()`
(`js/app.js`) — não existe um "banco" intermediário; o CSV é a fonte da
verdade e a função serverless só faz o papel de proxy + parser + cache.

- **Visão Geral** (`index.html`) — KPIs gerais, composição por status, tipo, UGB e evolução mensal.
- **Colaboradores** (`colaboradores.html`) — uma linha por colaborador (agregado de `NomeColaborador`), com drill-down para os treinamentos individuais dele.
- **Treinamentos** (`treinamentos.html`) — catálogo por `NomeTreinamento`, com % de conclusão entre todos os atribuídos.
- **Pendências** (`pendencias.html`) — apenas linhas com `Status` `Atrasado` ou `Pendente`, ordenadas por `Prazo`.
- **Equipes** (`equipes.html`) — uma linha por `NomeLider`, agregando o time dele.

## Outras bases (empresa toda, fora da matriz por UGB)

Duas fontes adicionais, de domínios diferentes da matriz individual — não são
filtradas pela UGB ativa (ver `inicio.html`) e têm suas próprias telas
("Bases corporativas" na barra lateral):

### Universidade VM (`api/progresso-univm.js` → `universidade.html`)

CSV: `.../Gente e Gestao/ProgressoUniVM.csv` — colunas `id;numero;Colaborador;
Trilha;Cursos;Qtde_Curso;Cargo;Setor`. Cada linha é um curso concluído por um
colaborador dentro de uma trilha de aprendizagem da Universidade VM
(e-learning corporativo). `Qtde_Curso` é o currículo total daquela trilha
(fixo pro sistema todo, não por pessoa — conferido nos dados reais), então
`% de progresso = cursos concluídos daquela trilha / Qtde_Curso`. Dataset
pequeno (~15 mil linhas, ~3MB em JSON) — a API devolve tudo de uma vez, igual
`api/treinamentos.js`.

### Histórico Geral (`api/historico-treinamentos.js` → `historico.html`)

CSV: `.../Gente e Gestao/relatorio_treinamentos.csv` — relatório histórico de
treinamentos da empresa toda desde 2015 (~35 mil linhas, ~18MB em JSON, grande
demais pra mandar inteiro numa resposta de função serverless). Por isso essa
API **nunca devolve os registros brutos inteiros**:

- sem parâmetros → catálogo agregado por `nomeTreinamento` (~590 linhas: total
  de realizações, colaboradores únicos, primeira/última data);
- `?treinamento=<nome exato>` → registros individuais só daquele treinamento;
- `?colaborador=<substring>` → histórico só dos colaboradores cujo nome bate
  (limitado a 500 registros mais recentes).

Tem um cache em memória de 5 minutos no nível do módulo da função (sobrevive
entre invocações num mesmo container "quente" da Vercel) pra não rebaixar+
reprocessar o CSV de 8MB a cada request. Ambas as funções (`progresso-univm` e
`historico-treinamentos`) têm `maxDuration: 30` no `vercel.json` — o fetch do
CSV de origem sozinho já leva uns 7-8s nesse volume de dados, perto do limite
padrão de 10s da Vercel.

## Próximos passos sugeridos

- Tela de login (autenticação por usuário/senha ou SSO da Viana & Moura) — deixada de fora da primeira versão de propósito.
- Exportação para Excel/PDF por tela (mesmo padrão do repositório irmão `matiasdev`).
- Alertas automáticos (e-mail/WhatsApp) para treinamentos que entram em atraso.
