// Busca o CSV de progresso da Universidade VM (plataforma de e-learning
// corporativo) — trilhas de aprendizagem e cursos concluídos por
// colaborador. Mesmo padrão de api/treinamentos.js: fetch no servidor (evita
// CORS, permite cache) com User-Agent de navegador (a origem bloqueia sem
// isso — ver docs/estrutura-dados.md). Dataset pequeno (~15 mil linhas, ~3MB
// de JSON), então é enviado inteiro, sem paginação.
import { parseCSV } from "./_csv.js";

const CSV_URL = "https://dados.vianaemoura.com.br/s3/VMC/Gente%20e%20Gestao/ProgressoUniVM.csv/dI5sHbHXI";

export default async function handler(req, res) {
  try {
    const resposta = await fetch(CSV_URL, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36",
        "Accept": "text/csv,*/*",
      },
    });
    if (!resposta.ok) throw new Error(`HTTP ${resposta.status}`);
    const texto = await resposta.text();
    const registros = parseCSV(texto, ";");

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      atualizadoEm: new Date().toISOString(),
      total: registros.length,
      registros,
    });
  } catch (e) {
    console.error("Falha ao carregar CSV de progresso da Universidade VM:", e.message);
    return res.status(502).json({ erro: "Não foi possível carregar os dados da Universidade VM no momento. Tente novamente em instantes." });
  }
}
