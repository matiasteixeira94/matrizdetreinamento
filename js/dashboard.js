"use strict";
(async function () {
  MT.renderShell({ activeKey: "dashboard", eyebrow: "Matriz de Treinamento", title: "Visão Geral" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentos();
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
      <div class="card stat-tile">
        <div class="stat-label">Registros na matriz</div>
        <div class="stat-value">${MT.fmtInt(total)}</div>
        <span class="footnote">colaborador × treinamento</span>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Realizados</div>
        <div class="stat-value">${MT.fmtPct(pct(realizado), 0)}</div>
        <span class="chip chip-good">${MT.fmtInt(realizado)} registros</span>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Pendentes</div>
        <div class="stat-value">${MT.fmtPct(pct(pendente), 0)}</div>
        <span class="chip chip-warning">${MT.fmtInt(pendente)} registros</span>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Atrasados</div>
        <div class="stat-value">${MT.fmtPct(pct(atrasado), 0)}</div>
        <span class="chip chip-critical">${MT.fmtInt(atrasado)} registros</span>
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

    <div class="card">
      <div class="card-head"><div><div class="card-title">Por tipo de treinamento</div><div class="card-sub">Composição de status em cada tipo</div></div></div>
      <div class="chart-host" id="chart-tipo"></div>
    </div>

    <div class="card">
      <div class="card-head"><div><div class="card-title">Por UGB do colaborador</div><div class="card-sub">Composição de status em cada unidade</div></div></div>
      <div class="chart-host" id="chart-ugb"></div>
    </div>

    <div class="grid grid-2">
      <div class="card">
        <div class="card-head"><div><div class="card-title">Áreas com maior % de atraso</div><div class="card-sub">Agrupamento por GA do colaborador · mínimo 5 registros</div></div></div>
        <div class="chart-host" id="chart-areas-atraso"></div>
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

    const porTipo = {};
    for (const r of registros) {
      const tipo = r.TipoTreinamento || "Sem tipo";
      porTipo[tipo] ??= Object.fromEntries(MT.STATUS_ORDER.map((s) => [s, 0]));
      const st = r.Status;
      if (porTipo[tipo][st] !== undefined) porTipo[tipo][st]++;
    }
    const tipos = Object.keys(porTipo).sort((a, b) => Object.values(porTipo[b]).reduce((x, y) => x + y, 0) - Object.values(porTipo[a]).reduce((x, y) => x + y, 0));
    MTCharts.stackedBars(document.getElementById("chart-tipo"), {
      categories: tipos,
      series: MT.STATUS_ORDER.map((s) => ({ name: s, color: MT.STATUS_COLOR_VAR[s], values: tipos.map((t) => porTipo[t][s]) })),
      yFormat: (v) => MT.fmtInt(v),
    });

    const porUGB = {};
    for (const r of registros) {
      const ugb = r.UGB_Colaborador || "Não tem UGB";
      porUGB[ugb] ??= Object.fromEntries(MT.STATUS_ORDER.map((s) => [s, 0]));
      const st = r.Status;
      if (porUGB[ugb][st] !== undefined) porUGB[ugb][st]++;
    }
    const ugbs = Object.keys(porUGB).sort((a, b) => Object.values(porUGB[b]).reduce((x, y) => x + y, 0) - Object.values(porUGB[a]).reduce((x, y) => x + y, 0));
    MTCharts.stackedBars(document.getElementById("chart-ugb"), {
      categories: ugbs,
      series: MT.STATUS_ORDER.map((s) => ({ name: s, color: MT.STATUS_COLOR_VAR[s], values: ugbs.map((u) => porUGB[u][s]) })),
      yFormat: (v) => MT.fmtInt(v),
    });

    const porArea = {};
    for (const r of registros) {
      const area = r.GA_Colaborador || "Sem GA";
      porArea[area] ??= { total: 0, atrasado: 0 };
      porArea[area].total++;
      if (r.Status === "Atrasado") porArea[area].atrasado++;
    }
    const ranking = Object.entries(porArea)
      .filter(([, v]) => v.total >= 5)
      .map(([label, v]) => ({ label, value: Math.round((v.atrasado / v.total) * 1000) / 10, total: v.total }))
      .sort((a, b) => b.value - a.value)
      .slice(0, 10);
    MTCharts.hbars(document.getElementById("chart-areas-atraso"), {
      items: ranking.map((r) => ({ label: `${r.label} (${MT.fmtInt(r.total)})`, value: r.value, color: r.value >= 40 ? "var(--status-critical)" : r.value >= 15 ? "var(--status-warning)" : "var(--status-good)" })),
      valueFormat: (v) => MT.fmtPct(v, 0),
      showTarget: false,
    });

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
