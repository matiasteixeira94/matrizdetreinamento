"use strict";
(async function () {
  MT.renderShell({ activeKey: "dashboard", eyebrow: "Matriz de Treinamento", title: "Visão Geral" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentosFiltrados();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const total = registros.length;
  const porStatus = {};
  for (const r of registros) porStatus[r.Status || "—"] = (porStatus[r.Status || "—"] || 0) + 1;
  const realizado = porStatus["Realizado"] || 0;
  const pendente = porStatus["Pendente"] || 0;
  const atrasado = porStatus["Atrasado"] || 0;
  const outros = total - realizado - pendente - atrasado;
  const pct = (n) => (total ? (n / total) * 100 : 0);

  content.innerHTML = `
    <p class="footnote" style="margin-top:-6px;">
      Dados carregados em tempo real da matriz individual de treinamentos (datalake Viana &amp; Moura) —
      ${MT.fmtInt(total)} registros de treinamento atribuídos a colaboradores
      ${outros > 0 ? `(${MT.fmtInt(outros)} em "Aguarda Validação" ou outras situações, fora dos 3 status principais abaixo).` : "."}
    </p>

    <div class="grid grid-4">
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Todos" title="Ver todos os registros">
        <div class="stat-label">Registros na matriz</div>
        <div class="stat-value">${MT.fmtInt(total)}</div>
        <span class="footnote">colaborador × treinamento</span>
      </a>
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Realizado" title="Ver os treinamentos realizados">
        <div class="stat-label">Realizados</div>
        <div class="stat-value">${MT.fmtPct(pct(realizado), 0)}</div>
        <span class="chip chip-good">${MT.fmtInt(realizado)} registros</span>
      </a>
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Pendente" title="Ver os treinamentos pendentes">
        <div class="stat-label">Pendentes</div>
        <div class="stat-value">${MT.fmtPct(pct(pendente), 0)}</div>
        <span class="chip chip-warning">${MT.fmtInt(pendente)} registros</span>
      </a>
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Atrasado" title="Ver os treinamentos atrasados">
        <div class="stat-label">Atrasados</div>
        <div class="stat-value">${MT.fmtPct(pct(atrasado), 0)}</div>
        <span class="chip chip-critical">${MT.fmtInt(atrasado)} registros</span>
      </a>
    </div>

    <div class="section-head">
      <h2>Rankings — maior % de atraso primeiro</h2>
      <span class="footnote">Lista completa, role pra ver todo mundo · clique num líder ou setor pra ver a equipe / lista completa · mínimo 5 registros</span>
    </div>
    <div class="grid grid-3">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Colaboradores</div><div class="card-sub">Todos os setores</div></div></div>
        <div class="chart-host chart-host-scroll" id="chart-ranking-colaborador"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Líderes</div><div class="card-sub">Clique pra ver a equipe</div></div></div>
        <div class="chart-host chart-host-scroll" id="chart-ranking-lider"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Setores</div><div class="card-sub">Produção, Infraestrutura, Suprimentos, Vendas, Administrativo — pelo cargo</div></div></div>
        <div class="chart-host chart-host-scroll" id="chart-ranking-setor"></div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Registros por status</div><div class="card-sub">Proporção do total da matriz</div></div></div>
        <div class="chart-host" id="chart-status"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Treinamentos realizados por mês</div><div class="card-sub">Contagem pela data de realização</div></div></div>
        <div class="chart-host" id="chart-evolucao"></div>
      </div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Áreas com maior % de atraso</div><div class="card-sub">Agrupamento por GA do colaborador · mínimo 5 registros</div></div></div>
        <div class="chart-host chart-host-scroll" id="chart-areas-atraso"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Instrutores com mais treinamentos realizados</div><div class="card-sub">Top 10</div></div></div>
        <div class="table-wrap"><table class="data">
          <thead><tr><th>Instrutor</th><th class="num">Realizados</th></tr></thead>
          <tbody id="tbody-instrutores"></tbody>
        </table></div>
      </div>
    </div>
  `;

  function renderGraficos() {
    MTCharts.hbars(document.getElementById("chart-status"), {
      items: MT.STATUS_ORDER.map((s) => ({ label: s, value: porStatus[s] || 0, color: MT.STATUS_COLOR_VAR[s] })),
      valueFormat: (v) => MT.fmtInt(v),
      showTarget: false,
    });

    // evolução mensal — usa DataTreinamento (só preenchida quando o
    // treinamento já foi realizado).
    const porMes = {};
    for (const r of registros) {
      if (!r.DataTreinamento) continue;
      const chave = r.DataTreinamento.slice(0, 7); // AAAA-MM
      if (!chave || chave.length !== 7) continue;
      porMes[chave] = (porMes[chave] || 0) + 1;
    }
    const mesesOrdenados = Object.keys(porMes).sort().slice(-12);
    MTCharts.barsLine(document.getElementById("chart-evolucao"), {
      items: mesesOrdenados.map((m) => ({ label: m.slice(2).replace("-", "/"), value: porMes[m] })),
      yFormat: (v) => MT.fmtInt(v),
      tooltipLabel: "Realizados",
      legendLabel: "Treinamentos realizados por mês",
    });

    // Ranking genérico por % de atraso — usado pra Colaborador, Líder, Setor
    // e GA. Mínimo de 5 registros evita destacar grupos minúsculos onde 1
    // atraso já vira 50%+ e distorce o ranking. Mostra a lista inteira (sem
    // top N) — o card tem rolagem própria (.chart-host-scroll) pra caber.
    // `campoOuFn` aceita tanto o nome de um campo do registro quanto uma
    // função (registro) => chave, pra grupos derivados como a categoria por
    // cargo.
    function rankingPorAtraso(campoOuFn, rotuloVazio) {
      const obterChave = typeof campoOuFn === "function" ? campoOuFn : (r) => r[campoOuFn];
      const porGrupo = {};
      for (const r of registros) {
        const chave = obterChave(r) || rotuloVazio;
        porGrupo[chave] ??= { total: 0, atrasado: 0 };
        porGrupo[chave].total++;
        if (r.Status === "Atrasado") porGrupo[chave].atrasado++;
      }
      return Object.entries(porGrupo)
        .filter(([, v]) => v.total >= 5)
        .map(([label, v]) => ({ label, value: Math.round((v.atrasado / v.total) * 1000) / 10, total: v.total }))
        .sort((a, b) => b.value - a.value);
    }

    function renderRankingAtraso(hostId, campoOuFn, rotuloVazio, aoClicar) {
      const ranking = rankingPorAtraso(campoOuFn, rotuloVazio);
      MTCharts.hbars(document.getElementById(hostId), {
        items: ranking.map((r) => ({
          label: `${r.label} (${MT.fmtInt(r.total)})`, value: r.value, _nome: r.label,
          color: r.value >= 40 ? "var(--status-critical)" : r.value >= 15 ? "var(--status-warning)" : "var(--status-good)",
        })),
        valueFormat: (v) => MT.fmtPct(v, 0),
        showTarget: false,
        onClick: aoClicar ? (item) => aoClicar(item._nome) : null,
      });
    }

    renderRankingAtraso("chart-ranking-colaborador", "NomeColaborador", "Sem nome", (nome) => {
      window.location.href = `colaboradores.html?colaborador=${encodeURIComponent(nome)}`;
    });
    renderRankingAtraso("chart-ranking-lider", "NomeLider", "Sem líder", (nome) => {
      window.location.href = `equipes.html?lider=${encodeURIComponent(nome)}`;
    });
    renderRankingAtraso("chart-ranking-setor", (r) => MT.categoriaCargo(r.Cargo_Colaborador), "Sem categoria", (categoria) => {
      window.location.href = `colaboradores.html?categoria=${encodeURIComponent(categoria)}`;
    });
    renderRankingAtraso("chart-areas-atraso", "GA_Colaborador", "Sem GA");

    const porInstrutor = {};
    for (const r of registros) {
      if (r.Status !== "Realizado" || !r.Instrutor) continue;
      porInstrutor[r.Instrutor] = (porInstrutor[r.Instrutor] || 0) + 1;
    }
    const topInstrutores = Object.entries(porInstrutor).sort((a, b) => b[1] - a[1]).slice(0, 10);
    document.getElementById("tbody-instrutores").innerHTML = topInstrutores.map(([nome, qtd]) => `
      <tr><td>${nome}</td><td class="num">${MT.fmtInt(qtd)}</td></tr>
    `).join("") || `<tr><td colspan="2" class="footnote" style="padding:14px;">Sem registros de instrutor.</td></tr>`;
  }

  renderGraficos();
  window.addEventListener("resize", () => { clearTimeout(window.__mtResize); window.__mtResize = setTimeout(renderGraficos, 200); });
})();
