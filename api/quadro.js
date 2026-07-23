// Busca o quadro de colaboradores (RH — admissão/desligamento/cargo/setor
// oficial) e devolve só os ativos. É a lista "oficial" de quem trabalha na
// empresa hoje, independente de ter algum treinamento atribuído na matriz —
// por isso ela existe separada de api/treinamentos.js: cruzar as duas é o
// que permite a tela Colaboradores mostrar todo mundo de uma UGB, e não só
// quem já tem pelo menos um treinamento na matriz individual.
import { parseCSV } from "./_csv.js";

const CSV_URL = "https://dados.vianaemoura.com.br/s3/VMC/Gente%20e%20Gestao/quadro/quadro.csv/dI5sHbHXI";

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
    const todos = parseCSV(texto, ";");
    const ativos = todos.filter((r) => r.CODSITUACAO === "A");

    res.setHeader("Cache-Control", "public, max-age=300, s-maxage=300, stale-while-revalidate=600");
    return res.status(200).json({
      atualizadoEm: new Date().toISOString(),
      total: ativos.length,
      registros: ativos,
    });
  } catch (e) {
    console.error("Falha ao carregar o quadro de colaboradores:", e.message);
    return res.status(502).json({ erro: "Não foi possível carregar o quadro de colaboradores no momento. Tente novamente em instantes." });
  }
}
