"use strict";
(async function () {
  MT.renderShell({ activeKey: "dashboard", eyebrow: "Matriz de Treinamento", title: "Visão Geral" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros, nomesAtivos;
  try {
    [registros, nomesAtivos] = await Promise.all([
      MT.loadTreinamentosFiltrados(),
      MT.carregarNomesAtivos(),
    ]);
    // A matriz de treinamentos não tem conceito de "ativo" — é histórico de
    // quem já teve algum treinamento atribuído, incluindo gente desligada.
    // Filtra pelo quadro de RH pra Visão Geral (stats, gráficos e rankings)
    // refletir só quem trabalha aqui hoje.
    registros = registros.filter((r) => nomesAtivos.has(MT.normalizarNome(r.NomeColaborador)));
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  // % Realizado/Pendente/Atrasado seguem exatamente as fórmulas do dashboard
  // corporativo (Power BI): Realizado tira "Aguarda Validação" do
  // denominador, Pendente/Atrasado usam o total cheio.
  const { total, realizado, pendente, atrasado, pctRealizado, pctPendente, pctAtrasado } = MT.calcularPercentuais(registros);
  const outros = total - realizado - pendente - atrasado;
  const porStatus = {};
  for (const r of registros) porStatus[r.Status || "—"] = (porStatus[r.Status || "—"] || 0) + 1;
  const stateRankingColab = { tipo: "" }; // "" | "direto" | "indireto"

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
        <div class="stat-value">${MT.fmtPct(pctRealizado, 0)}</div>
        <span class="chip chip-good">${MT.fmtInt(realizado)} registros</span>
      </a>
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Pendente" title="Ver os treinamentos pendentes">
        <div class="stat-label">Pendentes</div>
        <div class="stat-value">${MT.fmtPct(pctPendente, 0)}</div>
        <span class="chip chip-warning">${MT.fmtInt(pendente)} registros</span>
      </a>
      <a class="card stat-tile stat-tile-link" href="pendencias.html?status=Atrasado" title="Ver os treinamentos atrasados">
        <div class="stat-label">Atrasados</div>
        <div class="stat-value">${MT.fmtPct(pctAtrasado, 0)}</div>
        <span class="chip chip-critical">${MT.fmtInt(atrasado)} registros</span>
      </a>
    </div>

    <div class="section-head">
      <h2>Rankings — maior % concluído primeiro</h2>
      <span class="footnote">Lista completa, role pra ver todo mundo · clique num nome, líder ou setor pra ver o detalhe · líder/setor/áreas exigem mínimo 5 registros</span>
    </div>
    <div class="grid grid-3">
      <div class="card">
        <div class="card-head">
          <div><div class="card-title">Colaboradores</div><div class="card-sub">Todos os cargos e setores</div></div>
        </div>
        <div class="seg" id="seg-tipo-colaborador" style="margin-bottom:12px;">
          <button type="button" data-tipo="" aria-pressed="true">Todos</button>
          <button type="button" data-tipo="direto" aria-pressed="false">Diretos</button>
          <button type="button" data-tipo="indireto" aria-pressed="false">Indiretos</button>
        </div>
        <div class="chart-host chart-host-scroll" id="chart-ranking-colaborador"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Líderes</div><div class="card-sub">Clique pra ver a equipe</div></div></div>
        <div class="chart-host chart-host-scroll" id="chart-ranking-lider"></div>
      </div>
      <div class="card">
        <div class="card-head"><div><div class="card-title">Setores</div><div class="card-sub">Setor do colaborador (UGB/Vendas/Infra)</div></div></div>
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
        <div class="card-head"><div><div class="card-title">Áreas com maior % concluído</div><div class="card-sub">GA do colaborador; sem GA, usa o Setor · mínimo 5 registros</div></div></div>
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

    // Ranking genérico por % concluído — usado pra Colaboradores, Líder,
    // Setor e GA. % segue a fórmula do dashboard corporativo (Power BI):
    // Realizado / (Total - Aguarda Validação), não Realizado / Total puro.
    // Mínimo de 5 registros evita destacar grupos minúsculos onde 1 registro
    // já vira 0% ou 100% e distorce o ranking. Ordena do menor % concluído
    // pro maior — quem mais precisa de atenção primeiro. Mostra a lista
    // inteira (sem top N) — o card tem rolagem própria (.chart-host-scroll)
    // pra caber. `campoOuFn` aceita tanto o nome de um campo do registro
    // quanto uma função (registro) => chave, pra grupos derivados como o
    // setor (GA, com Setor_Colaborador como reserva).
    function rankingPorConclusao(campoOuFn, rotuloVazio, minRegistros = 5, fonte = registros) {
      const obterChave = typeof campoOuFn === "function" ? campoOuFn : (r) => r[campoOuFn];
      const porGrupo = {};
      for (const r of fonte) {
        const chave = obterChave(r) || rotuloVazio;
        porGrupo[chave] ??= { total: 0, realizado: 0, aguardaValidacao: 0, pessoas: new Set() };
        porGrupo[chave].total++;
        if (r.Status === "Realizado") porGrupo[chave].realizado++;
        else if (r.Status === "Aguarda Validação") porGrupo[chave].aguardaValidacao++;
        if (r.NomeColaborador) porGrupo[chave].pessoas.add(r.NomeColaborador);
      }
      return Object.entries(porGrupo)
        .filter(([, v]) => v.total >= minRegistros)
        .map(([label, v]) => {
          const base = v.total - v.aguardaValidacao;
          return { label, value: base ? Math.round((v.realizado / base) * 1000) / 10 : 0, total: v.total, pessoas: v.pessoas.size };
        })
        .sort((a, b) => b.value - a.value);
    }

    // O número entre parênteses mostra QUEM está no grupo (colaboradores
    // distintos), não quantos registros de treinamento existem — uma pessoa
    // com 6 treinamentos não deve "pesar 6" na contagem que aparece do lado
    // do nome do grupo. Exceção: no ranking de Colaboradores (agrupado por
    // pessoa), `pessoas` sempre daria 1 — ali o parêntese é mesmo a
    // quantidade de treinamentos daquela pessoa, por isso usarPessoas=false.
    function itensDoRanking(ranking, usarPessoas = true) {
      return ranking.map((r) => ({
        label: `${r.label} (${MT.fmtInt(usarPessoas ? r.pessoas : r.total)})`, value: r.value, _nome: r.label,
        color: r.value >= 70 ? "var(--status-good)" : r.value >= 40 ? "var(--status-warning)" : "var(--status-critical)",
      }));
    }

    function renderRankingConclusao(hostId, campoOuFn, rotuloVazio, aoClicar, fonte) {
      const ranking = rankingPorConclusao(campoOuFn, rotuloVazio, 5, fonte);
      MTCharts.hbars(document.getElementById(hostId), {
        items: itensDoRanking(ranking),
        valueFormat: (v) => MT.fmtPct(v, 0),
        showTarget: false,
        onClick: aoClicar ? (item) => aoClicar(item._nome) : null,
      });
    }

    // Ranking de colaboradores — sem o mínimo de 5 registros dos outros
    // rankings: exigir 5+ treinamentos por PESSOA excluía praticamente todo
    // mundo com cargo Direto/Direto Infra (que costuma ter só 1-4
    // treinamentos atribuídos), sobrando só supervisores indiretos e dando a
    // falsa impressão de que só existia gente de Produção. Segmentado por
    // Direto/Indireto (TipoColaborador) via o seg acima da lista.
    function renderRankingColaboradores() {
      const fonte = stateRankingColab.tipo === "direto"
        ? registros.filter((r) => r.TipoColaborador === "Direto" || r.TipoColaborador === "Direto Infra")
        : stateRankingColab.tipo === "indireto"
          ? registros.filter((r) => r.TipoColaborador === "Indireto")
          : registros;
      const ranking = rankingPorConclusao("NomeColaborador", "Sem nome", 1, fonte);
      MTCharts.hbars(document.getElementById("chart-ranking-colaborador"), {
        items: itensDoRanking(ranking, false),
        valueFormat: (v) => MT.fmtPct(v, 0),
        showTarget: false,
        onClick: (item) => { window.location.href = `colaboradores.html?colaborador=${encodeURIComponent(item._nome)}`; },
      });
    }
    renderRankingColaboradores();

    // Líder também precisa estar ativo (o colaborador reportado já está,
    // pelo filtro geral de `registros`, mas o líder listado no registro dele
    // pode ter saído da empresa desde então).
    const registrosLiderAtivo = registros.filter((r) => nomesAtivos.has(MT.normalizarNome(r.NomeLider)));
    renderRankingConclusao("chart-ranking-lider", "NomeLider", "Sem líder", (nome) => {
      window.location.href = `equipes.html?lider=${encodeURIComponent(nome)}`;
    }, registrosLiderAtivo);
    // Setor = Setor_Colaborador puro (código de UGB, com prefixo Vendas/Infra
    // quando aplicável) — mesmo campo usado pela coluna "Setor" do dashboard
    // corporativo (Power BI).
    renderRankingConclusao("chart-ranking-setor", "Setor_Colaborador", "Sem setor", (nome) => {
      window.location.href = `colaboradores.html?setor=${encodeURIComponent(nome)}`;
    });
    // Áreas = GA_Colaborador; a maioria dos registros vem como "Não tem GA"
    // (só quem está numa turma/grupo específico de treinamento tem GA), então
    // cai pro Setor_Colaborador nesses casos — sem isso "Não tem GA" vira um
    // bloco único gigante (quase 2/3 dos registros) sem informação nenhuma.
    // Mesmo critério da coluna "GA" do dashboard corporativo.
    const chaveGA = (r) => (r.GA_Colaborador && r.GA_Colaborador !== "Não tem GA") ? r.GA_Colaborador : r.Setor_Colaborador;
    const valoresGA = new Set(registros.map((r) => r.GA_Colaborador).filter((g) => g && g !== "Não tem GA"));
    renderRankingConclusao("chart-areas-atraso", chaveGA, "Sem área", (nome) => {
      const param = valoresGA.has(nome) ? "ga" : "setor";
      window.location.href = `colaboradores.html?${param}=${encodeURIComponent(nome)}`;
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

  document.querySelectorAll("#seg-tipo-colaborador button").forEach((btn) => {
    btn.addEventListener("click", () => {
      stateRankingColab.tipo = btn.dataset.tipo;
      document.querySelectorAll("#seg-tipo-colaborador button").forEach((b) => b.setAttribute("aria-pressed", String(b === btn)));
      renderGraficos();
    });
  });

  renderGraficos();
  window.addEventListener("resize", () => { clearTimeout(window.__mtResize); window.__mtResize = setTimeout(renderGraficos, 200); });
})();
