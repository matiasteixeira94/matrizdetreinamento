"use strict";
(async function () {
  MT.renderShell({ activeKey: "colaboradores", eyebrow: "Matriz de Treinamento", title: "Colaboradores" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentosFiltrados();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const PRIORIDADE = MT.STATUS_PRIORIDADE;

  const colaboradores = (() => {
    const map = new Map();
    for (const r of registros) {
      const key = r.NomeColaborador || "—";
      if (!map.has(key)) {
        map.set(key, {
          nome: key, cargo: r.Cargo_Colaborador, ugb: r.UGB_Colaborador,
          ga: r.GA_Colaborador, setor: r.Setor_Colaborador, lider: r.NomeLider,
          categoria: MT.categoriaCargo(r.Cargo_Colaborador),
          registros: [],
        });
      }
      map.get(key).registros.push(r);
    }
    return [...map.values()].map((c) => {
      const total = c.registros.length;
      const realizado = c.registros.filter((r) => r.Status === "Realizado").length;
      const piorStatus = c.registros.reduce((pior, r) => {
        const p = PRIORIDADE[r.Status] ?? 3;
        return p < (PRIORIDADE[pior] ?? 3) ? r.Status : pior;
      }, "Realizado");
      return { ...c, total, realizado, pctRealizado: total ? (realizado / total) * 100 : 0, piorStatus };
    }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  })();

  // Vindo do ranking da Visão Geral: ?setor=X ou ?categoria=X abrem já
  // filtrados; ?colaborador=X busca e abre o detalhe direto dessa pessoa.
  const params = new URLSearchParams(location.search);
  const setorUrl = params.get("setor") || "";
  const categoriaUrl = params.get("categoria") || "";
  const colaboradorUrl = params.get("colaborador") || "";

  const state = { busca: colaboradorUrl, ugb: "", ga: "", setor: setorUrl, categoria: categoriaUrl, status: "", selecionado: null };

  content.innerHTML = `
    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar colaborador</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome…" style="min-width:200px;" />
      </div>
      <div class="field">
        <label for="f-ugb">UGB</label>
        <select class="select" id="f-ugb"><option value="">Todas</option></select>
      </div>
      <div class="field">
        <label for="f-ga">GA / Área</label>
        <select class="select" id="f-ga"><option value="">Todas</option></select>
      </div>
      <div class="field">
        <label for="f-setor">Setor</label>
        <select class="select" id="f-setor"><option value="">Todos</option></select>
      </div>
      <div class="field">
        <label for="f-categoria">Categoria (pelo cargo)</label>
        <select class="select" id="f-categoria">
          <option value="">Todas</option>
          ${MT.CATEGORIAS_CARGO.map((c) => `<option value="${c}">${c}</option>`).join("")}
        </select>
      </div>
      <div class="field">
        <label for="f-status">Situação</label>
        <select class="select" id="f-status">
          <option value="">Todas</option>
          <option value="Atrasado">Tem atraso</option>
          <option value="Pendente">Tem pendência</option>
          <option value="Realizado">100% realizado</option>
        </select>
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar filtros</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Colaboradores</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead>
            <tr><th>Colaborador</th><th>Cargo</th><th>UGB</th><th>GA</th><th>Setor</th><th>Líder</th><th class="num">Treinamentos</th><th>Conclusão</th><th>Situação</th></tr>
          </thead>
          <tbody id="tbody-colaboradores"></tbody>
        </table>
      </div>
    </div>

    <div class="card" id="detalhe-card" style="display:none;">
      <div class="card-head">
        <div><div class="card-title" id="detalhe-titulo"></div><div class="card-sub" id="detalhe-sub"></div></div>
        <button class="btn btn-ghost" id="btn-fechar-detalhe" type="button">✕ Fechar</button>
      </div>
      <div class="table-wrap">
        <table class="data">
          <thead><tr><th>Tipo</th><th>Treinamento</th><th>Status</th><th>Instrutor</th><th>Prazo</th><th>Realizado em</th></tr></thead>
          <tbody id="tbody-detalhe"></tbody>
        </table>
      </div>
    </div>
  `;

  MT.popularFiltro(document.getElementById("f-ugb"), registros, "UGB_Colaborador");
  MT.popularFiltro(document.getElementById("f-ga"), registros, "GA_Colaborador");
  MT.popularFiltro(document.getElementById("f-setor"), registros, "Setor_Colaborador");
  document.getElementById("f-busca").value = state.busca;
  document.getElementById("f-setor").value = state.setor;
  document.getElementById("f-categoria").value = state.categoria;

  function filtrarColaboradores() {
    const busca = state.busca.trim().toLowerCase();
    return colaboradores.filter((c) => {
      if (busca && !c.nome.toLowerCase().includes(busca)) return false;
      if (state.ugb && c.ugb !== state.ugb) return false;
      if (state.ga && c.ga !== state.ga) return false;
      if (state.setor && c.setor !== state.setor) return false;
      if (state.categoria && c.categoria !== state.categoria) return false;
      if (state.status === "Realizado" && c.piorStatus !== "Realizado") return false;
      if (state.status === "Atrasado" && c.piorStatus !== "Atrasado") return false;
      if (state.status === "Pendente" && !(c.piorStatus === "Pendente" || c.piorStatus === "Atrasado")) return false;
      return true;
    });
  }

  function renderTabela() {
    const filtrados = filtrarColaboradores();
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(colaboradores.length)} colaboradores`;
    document.getElementById("tbody-colaboradores").innerHTML = filtrados.map((c) => `
      <tr data-clickable data-nome="${c.nome.replace(/"/g, "&quot;")}">
        <td>${c.nome}</td>
        <td>${c.cargo || "—"}</td>
        <td>${c.ugb || "—"}</td>
        <td>${c.ga || "—"}</td>
        <td>${c.setor || "—"}</td>
        <td>${c.lider || "—"}</td>
        <td class="num">${MT.fmtInt(c.total)}</td>
        <td style="min-width:120px;">
          <div class="bar-track"><div class="bar-fill" style="width:${c.pctRealizado}%;"></div></div>
          <span class="footnote mono">${MT.fmtPct(c.pctRealizado, 0)}</span>
        </td>
        <td>${MT.statusChip(c.piorStatus)}</td>
      </tr>
    `).join("") || `<tr><td colspan="9" class="footnote" style="padding:18px;">Nenhum colaborador encontrado com os filtros atuais.</td></tr>`;

    document.querySelectorAll("#tbody-colaboradores tr[data-nome]").forEach((row) => {
      row.addEventListener("click", () => abrirDetalhe(row.dataset.nome));
    });
  }

  function abrirDetalhe(nome) {
    const c = colaboradores.find((x) => x.nome === nome);
    if (!c) return;
    state.selecionado = nome;
    document.getElementById("detalhe-card").style.display = "";
    document.getElementById("detalhe-titulo").textContent = c.nome;
    document.getElementById("detalhe-sub").textContent = `${c.cargo || "—"} · ${c.ugb || "—"} · líder: ${c.lider || "—"} · ${MT.fmtInt(c.total)} treinamentos (${MT.fmtPct(c.pctRealizado, 0)} concluídos)`;
    const ordenados = [...c.registros].sort((a, b) => (PRIORIDADE[a.Status] ?? 3) - (PRIORIDADE[b.Status] ?? 3));
    document.getElementById("tbody-detalhe").innerHTML = ordenados.map((r) => `
      <tr>
        <td>${r.TipoTreinamento || "—"}</td>
        <td>${r.NomeTreinamento || "—"}</td>
        <td>${MT.statusChip(r.Status)}</td>
        <td>${r.Instrutor || "—"}</td>
        <td>${MT.fmtDate(r.Prazo)}</td>
        <td>${MT.fmtDate(r.DataTreinamento)}</td>
      </tr>
    `).join("");
    document.getElementById("detalhe-card").scrollIntoView({ behavior: "smooth", block: "nearest" });
  }

  document.getElementById("btn-fechar-detalhe").addEventListener("click", () => {
    document.getElementById("detalhe-card").style.display = "none";
    state.selecionado = null;
  });

  let debounce;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.busca = e.target.value; renderTabela(); }, 150);
  });
  document.getElementById("f-ugb").addEventListener("change", (e) => { state.ugb = e.target.value; renderTabela(); });
  document.getElementById("f-ga").addEventListener("change", (e) => { state.ga = e.target.value; renderTabela(); });
  document.getElementById("f-setor").addEventListener("change", (e) => { state.setor = e.target.value; renderTabela(); });
  document.getElementById("f-categoria").addEventListener("change", (e) => { state.categoria = e.target.value; renderTabela(); });
  document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; renderTabela(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.ugb = ""; state.ga = ""; state.setor = ""; state.categoria = ""; state.status = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-ugb").value = "";
    document.getElementById("f-ga").value = "";
    document.getElementById("f-setor").value = "";
    document.getElementById("f-categoria").value = "";
    document.getElementById("f-status").value = "";
    renderTabela();
  });

  renderTabela();
  if (colaboradorUrl && colaboradores.some((c) => c.nome === colaboradorUrl)) abrirDetalhe(colaboradorUrl);
})();
