// Busca o relatório histórico de treinamentos (empresa toda, desde 2015,
// ~35 mil registros / ~18MB em JSON) — grande demais pra mandar inteiro numa
// resposta de função serverless (limite prático de alguns MB). Por isso essa
// função nunca devolve todos os registros de uma vez: sem parâmetros, devolve
// um catálogo agregado por treinamento (poucas centenas de linhas); com
// ?treinamento= ou ?colaborador=, devolve só os registros individuais
// daquele recorte.
//
// Cache em memória (nível de módulo) — sobrevive entre invocações num mesmo
// container "quente" da Vercel, evitando rebaixar+reprocessar 8MB de CSV a
// cada request nesse período.
import { parseCSV } from "./_csv.js";

const CSV_URL = "https://dados.vianaemoura.com.br/s3/VMC/Gente%20e%20Gestao/relatorio_treinamentos.csv/dI5sHbHXI";
const CACHE_TTL_MS = 5 * 60 * 1000;
const LIMITE_COLABORADOR = 500;

let cache = null;
let cacheEm = 0;

async function obterRegistros() {
  const agora = Date.now();
  if (cache && agora - cacheEm < CACHE_TTL_MS) return cache;

  const resposta = await fetch(CSV_URL, {
    headers: {
      "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
      "Accept": "text/csv,*/*",
    },
  });
  if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
  const texto = await resposta.text();
  cache = parseCSV(texto, ";");
  cacheEm = agora;
  return cache;
}

function agregarPorTreinamento(registros) {
  const mapa = new Map();
  for (const r of registros) {
    const chave = r.nomeTreinamento || "—";
    if (!mapa.has(chave)) {
      mapa.set(chave, { nomeTreinamento: chave, revisao: r.revisao, totalRegistros: 0, colaboradores: new Set(), primeiraData: null, ultimaData: null });
    }
    const it = mapa.get(chave);
    it.totalRegistros++;
    if (r.nomeColaborador) it.colaboradores.add(r.nomeColaborador);
    if (r.revisao) it.revisao = r.revisao;
    if (r.data && r.data !== "0000-00-00") {
      if (!it.primeiraData || r.data < it.primeiraData) it.primeiraData = r.data;
      if (!it.ultimaData || r.data > it.ultimaData) it.ultimaData = r.data;
    }
  }
  return [...mapa.values()].map((it) => ({
    nomeTreinamento: it.nomeTreinamento,
    revisao: it.revisao,
    totalRegistros: it.totalRegistros,
    colaboradoresUnicos: it.colaboradores.size,
    primeiraData: it.primeiraData,
    ultimaData: it.ultimaData,
  }));
}

export default async function handler(req, res) {
  try {
    const registros = await obterRegistros();
    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");

    const treinamento = req.query?.treinamento;
    const colaborador = req.query?.colaborador;

    if (treinamento) {
      const filtrados = registros.filter((r) => r.nomeTreinamento === treinamento);
      return res.status(200).json({ modo: "treinamento", filtro: treinamento, total: filtrados.length, registros: filtrados });
    }

    if (colaborador) {
      const termo = String(colaborador).toLowerCase();
      const todos = registros.filter((r) => (r.nomeColaborador || "").toLowerCase().includes(termo));
      const filtrados = todos.slice(0, LIMITE_COLABORADOR);
      return res.status(200).json({
        modo: "colaborador", filtro: colaborador,
        total: todos.length, truncado: todos.length > LIMITE_COLABORADOR,
        registros: filtrados,
      });
    }

    const catalogo = agregarPorTreinamento(registros);
    return res.status(200).json({ modo: "catalogo", totalRegistrosBrutos: registros.length, total: catalogo.length, catalogo });
  } catch (e) {
    console.error("Falha ao carregar histórico de treinamentos:", e.message);
    return res.status(502).json({ erro: "Não foi possível carregar o histórico de treinamentos no momento. Tente novamente em instantes." });
  }
}
