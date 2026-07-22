"use strict";
(async function () {
  MT.renderShell({
    activeKey: "universidade", eyebrow: "Bases corporativas", title: "Universidade VM",
    mostrarUgb: false,
  });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando progresso da Universidade VM…</div>`;

  let registros;
  try {
    const res = await fetch("/api/progresso-univm");
    if (!res.ok) throw new Error("Falha ao carregar os dados da Universidade VM");
    const dados = await res.json();
    registros = dados.registros;
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  // Base: e-learning corporativo, independente da UGB ativa da matriz de
  // obra — cada linha do CSV é um curso concluído; agrega por colaborador +
  // trilha porque Qtde_Curso é o currículo total daquela trilha (fixo pro
  // sistema todo, não por pessoa — conferido nos dados reais).
  const linhas = (() => {
    const mapa = new Map();
    for (const r of registros) {
      const chave = `${r.Colaborador}||${r.Trilha}`;
      if (!mapa.has(chave)) {
        mapa.set(chave, { colaborador: r.Colaborador, cargo: r.Cargo, setor: r.Setor, trilha: r.Trilha, totalCursos: Number(r.Qtde_Curso) || 0, cursos: [] });
      }
      mapa.get(chave).cursos.push(r.Cursos);
    }
    return [...mapa.values()].map((l) => ({
      ...l, concluidos: l.cursos.length,
      pct: l.totalCursos ? Math.min(100, (l.cursos.length / l.totalCursos) * 100) : 0,
    }));
  })();

  const colaboradoresUnicos = new Set(linhas.map((l) => l.colaborador)).size;
  const trilhasUnicas = [...new Set(linhas.map((l) => l.trilha))];
  const progressoMedioGeral = linhas.length ? linhas.reduce((a, l) => a + l.pct, 0) / linhas.length : 0;

  const state = { busca: "", trilha: "", setor: "" };

  content.innerHTML = `
    <p class="footnote" style="margin-top:-6px;">
      Progresso de cursos concluídos na Universidade VM (plataforma de e-learning corporativo) por colaborador e
      trilha de aprendizagem — ${MT.fmtInt(registros.length)} cursos concluídos ao todo, ${MT.fmtInt(colaboradoresUnicos)}
      colaboradores em ${MT.fmtInt(trilhasUnicas.length)} trilhas. Base independente da matriz de treinamentos por UGB.
    </p>

    <div class="grid grid-4">
      <div class="card stat-tile">
        <div class="stat-label">Colaboradores na plataforma</div>
        <div class="stat-value">${MT.fmtInt(colaboradoresUnicos)}</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Trilhas de aprendizagem</div>
        <div class="stat-value">${MT.fmtInt(trilhasUnicas.length)}</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Cursos concluídos</div>
        <div class="stat-value">${MT.fmtInt(registros.length)}</div>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Progresso médio</div>
        <div class="stat-value">${MT.fmtPct(progressoMedioGeral, 0)}</div>
        <span class="footnote">média de conclusão por colaborador × trilha</span>
      </div>
    </div>

    <div class="card">
      <div class="card-head"><div><div class="card-title">Progresso médio por trilha</div><div class="card-sub">% de cursos concluídos sobre o currículo de cada trilha</div></div></div>
      <div class="chart-host" id="chart-trilhas"></div>
    </div>

    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar colaborador</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome…" style="min-width:200px;" />
      </div>
      <div class="field">
        <label for="f-trilha">Trilha</label>
        <select class="select" id="f-trilha"><option value="">Todas</option></select>
      </div>
      <div class="field">
        <label for="f-setor">Setor</label>
        <select class="select" id="f-setor"><option value="">Todos</option></select>
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar filtros</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Colaborador × trilha</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <p class="footnote" style="margin-top:-6px; margin-bottom:10px;">Ordenado por progresso — menor conclusão primeiro. Clique numa linha pra ver os cursos concluídos.</p>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead><tr><th>Colaborador</th><th>Cargo</th><th>Setor</th><th>Trilha</th><th class="num">Cursos</th><th>Progresso</th></tr></thead>
          <tbody id="tbody-univm"></tbody>
        </table>
      </div>
    </div>

    <div class="card" id="detalhe-card" style="display:none;">
      <div class="card-head">
        <div><div class="card-title" id="detalhe-titulo"></div><div class="card-sub" id="detalhe-sub"></div></div>
        <button class="btn btn-ghost" id="btn-fechar-detalhe" type="button">✕ Fechar</button>
      </div>
      <ul id="lista-cursos" style="display:flex; flex-direction:column; gap:6px;"></ul>
    </div>
  `;

  MT.popularFiltro(document.getElementById("f-trilha"), linhas, "trilha");
  MT.popularFiltro(document.getElementById("f-setor"), linhas, "setor");

  function filtrar() {
    const busca = state.busca.trim().toLowerCase();
    return linhas.filter((l) => {
      if (busca && !l.colaborador.toLowerCase().includes(busca)) return false;
      if (state.trilha && l.trilha !== state.trilha) return false;
      if (state.setor && l.setor !== state.setor) return false;
      return true;
    });
  }

  function render() {
    const filtrados = filtrar().sort((a, b) => a.pct - b.pct);
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(linhas.length)} combinações`;
    document.getElementById("tbody-univm").innerHTML = filtrados.map((l, i) => `
      <tr data-clickable data-i="${i}">
        <td>${l.colaborador}</td>
        <td>${l.cargo || "—"}</td>
        <td>${l.setor || "—"}</td>
        <td>${l.trilha}</td>
        <td class="num">${MT.fmtInt(l.concluidos)} / ${MT.fmtInt(l.totalCursos)}</td>
        <td style="min-width:120px;">
          <div class="bar-track"><div class="bar-fill" style="width:${l.pct}%;"></div></div>
          <span class="footnote mono">${MT.fmtPct(l.pct, 0)}</span>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="footnote" style="padding:18px;">Nenhum registro encontrado com os filtros atuais.</td></tr>`;

    document.querySelectorAll("#tbody-univm tr[data-i]").forEach((row) => {
      row.addEventListener("click", () => abrirDetalhe(filtrados[Number(row.dataset.i)]));
    });
  }

  function abrirDetalhe(l) {
    document.getElementById("detalhe-card").style.display = "";
    document.getElementById("detalhe-titulo").textContent = `${l.colaborador} — ${l.trilha}`;
    document.getElementById("detalhe-sub").textContent = `${l.cargo || "—"} · ${l.setor || "—"} · ${MT.fmtInt(l.concluidos)} de ${MT.fmtInt(l.totalCursos)} cursos (${MT.fmtPct(l.pct, 0)})`;
    document.getElementById("lista-cursos").innerHTML = l.cursos.map((c) => `
      <li class="chip chip-good" style="width:fit-content;">${c}</li>
    `).join("");
    document.getElementById("detalhe-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("btn-fechar-detalhe").addEventListener("click", () => {
    document.getElementById("detalhe-card").style.display = "none";
  });

  let debounce;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.busca = e.target.value; render(); }, 150);
  });
  document.getElementById("f-trilha").addEventListener("change", (e) => { state.trilha = e.target.value; render(); });
  document.getElementById("f-setor").addEventListener("change", (e) => { state.setor = e.target.value; render(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.trilha = ""; state.setor = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-trilha").value = "";
    document.getElementById("f-setor").value = "";
    render();
  });

  function renderGrafico() {
    const porTrilha = {};
    for (const l of linhas) {
      porTrilha[l.trilha] ??= { soma: 0, n: 0 };
      porTrilha[l.trilha].soma += l.pct;
      porTrilha[l.trilha].n++;
    }
    const itens = Object.entries(porTrilha)
      .map(([label, v]) => ({ label, value: Math.round((v.soma / v.n) * 10) / 10 }))
      .sort((a, b) => a.value - b.value);
    MTCharts.hbars(document.getElementById("chart-trilhas"), {
      items: itens.map((it) => ({ ...it, color: it.value >= 70 ? "var(--status-good)" : it.value >= 40 ? "var(--status-warning)" : "var(--status-critical)" })),
      valueFormat: (v) => MT.fmtPct(v, 0),
      showTarget: false,
    });
  }

  renderGrafico();
  render();
  window.addEventListener("resize", () => { clearTimeout(window.__mtResize); window.__mtResize = setTimeout(renderGrafico, 200); });
})();
