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

## Próximos passos sugeridos

- Tela de login (autenticação por usuário/senha ou SSO da Viana & Moura) — deixada de fora da primeira versão de propósito.
- Exportação para Excel/PDF por tela (mesmo padrão do repositório irmão `matiasdev`).
- Alertas automáticos (e-mail/WhatsApp) para treinamentos que entram em atraso.
