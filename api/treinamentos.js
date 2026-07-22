// Busca o CSV da matriz individual de treinamentos direto do datalake da
// Viana & Moura e devolve como JSON já estruturado. Roda no servidor (não
// no navegador) para evitar problemas de CORS com o domínio de origem e
// para poder cachear a resposta (ver vercel.json) sem expor a URL assinada
// do S3 (a origem redireciona para uma URL com assinatura temporária).
import { parseCSV } from "./_csv.js";

const CSV_URL = "https://dados.vianaemoura.com.br/s3/VMC/Obra/treinamentosMatrizIndividual.csv/dI5sHbHXI";

export default async function handler(req, res) {
  try {
    // A origem bloqueia requisições sem um User-Agent de navegador (responde
    // "Acesso negado. Atividade suspeita detectada" com o fetch padrão do
    // Node) — confirmado testando o endpoint diretamente antes de integrar.
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
    console.error("Falha ao carregar CSV de treinamentos:", e.message);
    return res.status(502).json({ erro: "Não foi possível carregar os dados de treinamentos no momento. Tente novamente em instantes." });
  }
}
