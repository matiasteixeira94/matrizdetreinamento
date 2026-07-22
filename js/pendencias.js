"use strict";
(async function () {
  MT.renderShell({
    activeKey: "pendencias", eyebrow: "Matriz de Treinamento", title: "Pendências",
    actionsHtml: `<button class="btn btn-primary" id="btn-exportar-lpt" type="button">Exportar PDF (LPT)</button>`,
  });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentosFiltrados();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  // Vindo de um card clicável da Visão Geral (?status=Realizado/Pendente/
  // Atrasado/Todos), abre a tela já filtrada por aquele status em vez do
  // padrão "atrasados e pendentes".
  const statusUrl = new URLSearchParams(location.search).get("status") || "";

  const pendenciasBase = registros.filter((r) => r.Status === "Atrasado" || r.Status === "Pendente");
  const totalAtrasado = pendenciasBase.filter((r) => r.Status === "Atrasado").length;
  const totalPendente = pendenciasBase.filter((r) => r.Status === "Pendente").length;

  const state = { busca: "", status: statusUrl, ugb: "", ga: "", lider: "", tipo: "", treinamento: "" };
  let ultimoFiltrado = [];

  content.innerHTML = `
    <div class="grid grid-3">
      <div class="card stat-tile">
        <div class="stat-label">Total de pendências</div>
        <div class="stat-value">${MT.fmtInt(pendenciasBase.length)}</div>
        <span class="footnote">treinamentos ainda não concluídos</span>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Atrasados</div>
        <div class="stat-value">${MT.fmtInt(totalAtrasado)}</div>
        <span class="chip chip-critical">prazo já vencido</span>
      </div>
      <div class="card stat-tile">
        <div class="stat-label">Pendentes</div>
        <div class="stat-value">${MT.fmtInt(totalPendente)}</div>
        <span class="chip chip-warning">ainda dentro do prazo</span>
      </div>
    </div>

    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar colaborador</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome…" style="min-width:180px;" />
      </div>
      <div class="field">
        <label for="f-status">Situação</label>
        <select class="select" id="f-status">
          <option value="">Atrasados e pendentes</option>
          <option value="Atrasado">Só atrasados</option>
          <option value="Pendente">Só pendentes</option>
          <option value="Realizado">Só realizados</option>
          <option value="Todos">Todos os status</option>
        </select>
      </div>
      <div class="field">
        <label for="f-tipo">Tipo</label>
        <select class="select" id="f-tipo"><option value="">Todos</option></select>
      </div>
      <div class="field">
        <label for="f-treinamento">Treinamento</label>
        <select class="select" id="f-treinamento"><option value="">Todos</option></select>
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
        <label for="f-lider">Líder</label>
        <select class="select" id="f-lider"><option value="">Todos</option></select>
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar filtros</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Registros de treinamento</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <p class="footnote" style="margin-top:-6px; margin-bottom:10px;">
        Ordenado por prazo — mais urgentes primeiro. Filtre por Tipo e/ou Treinamento pra ver rápido a lista de
        colaboradores de um treinamento específico, e use "Exportar PDF (LPT)" pra gerar a lista de presença já
        preenchida com esses nomes.
      </p>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead>
            <tr><th>Colaborador</th><th>UGB</th><th>Líder</th><th>Treinamento</th><th>Tipo</th><th>Status</th><th>Prazo</th><th>Situação do prazo</th></tr>
          </thead>
          <tbody id="tbody-pendencias"></tbody>
        </table>
      </div>
    </div>
  `;

  document.getElementById("f-status").value = statusUrl;
  MT.popularFiltro(document.getElementById("f-tipo"), registros, "TipoTreinamento");
  MT.popularFiltro(document.getElementById("f-treinamento"), registros, "NomeTreinamento");
  MT.popularFiltro(document.getElementById("f-ugb"), registros, "UGB_Colaborador");
  MT.popularFiltro(document.getElementById("f-ga"), registros, "GA_Colaborador");
  MT.popularFiltro(document.getElementById("f-lider"), registros, "NomeLider");

  function chipPrazo(r) {
    const dias = MT.diasAte(r.Prazo);
    if (dias === null) return `<span class="footnote">sem prazo definido</span>`;
    if (dias < 0) return `<span class="chip chip-critical">${MT.fmtInt(Math.abs(dias))} dia(s) em atraso</span>`;
    if (dias <= 7) return `<span class="chip chip-warning">vence em ${MT.fmtInt(dias)} dia(s)</span>`;
    return `<span class="chip chip-neutral">vence em ${MT.fmtInt(dias)} dia(s)</span>`;
  }

  function filtrar() {
    const busca = state.busca.trim().toLowerCase();
    return registros.filter((r) => {
      if (!statusBateComEstado(r)) return false;
      if (busca && !(r.NomeColaborador || "").toLowerCase().includes(busca)) return false;
      if (state.tipo && r.TipoTreinamento !== state.tipo) return false;
      if (state.treinamento && r.NomeTreinamento !== state.treinamento) return false;
      if (state.ugb && r.UGB_Colaborador !== state.ugb) return false;
      if (state.ga && r.GA_Colaborador !== state.ga) return false;
      if (state.lider && r.NomeLider !== state.lider) return false;
      return true;
    });
  }

  function statusBateComEstado(r) {
    if (state.status === "Todos") return true;
    if (state.status) return r.Status === state.status;
    return r.Status === "Atrasado" || r.Status === "Pendente";
  }

  function render() {
    ultimoFiltrado = filtrar().sort((a, b) => {
      if (!a.Prazo) return 1;
      if (!b.Prazo) return -1;
      return a.Prazo.localeCompare(b.Prazo);
    });
    const totalNoStatus = registros.filter(statusBateComEstado).length;
    document.getElementById("contador").textContent = `${MT.fmtInt(ultimoFiltrado.length)} de ${MT.fmtInt(totalNoStatus)} no status atual`;
    document.getElementById("tbody-pendencias").innerHTML = ultimoFiltrado.map((r) => `
      <tr>
        <td>${r.NomeColaborador || "—"}</td>
        <td>${r.UGB_Colaborador || "—"}</td>
        <td>${r.NomeLider || "—"}</td>
        <td>${r.NomeTreinamento || "—"}</td>
        <td>${r.TipoTreinamento || "—"}</td>
        <td>${MT.statusChip(r.Status)}</td>
        <td>${MT.fmtDate(r.Prazo)}</td>
        <td>${chipPrazo(r)}</td>
      </tr>
    `).join("") || `<tr><td colspan="8" class="footnote" style="padding:18px;">Nenhum registro encontrado com os filtros atuais.</td></tr>`;
  }

  let debounce;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.busca = e.target.value; render(); }, 150);
  });
  document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; render(); });
  document.getElementById("f-tipo").addEventListener("change", (e) => { state.tipo = e.target.value; render(); });
  document.getElementById("f-treinamento").addEventListener("change", (e) => { state.treinamento = e.target.value; render(); });
  document.getElementById("f-ugb").addEventListener("change", (e) => { state.ugb = e.target.value; render(); });
  document.getElementById("f-ga").addEventListener("change", (e) => { state.ga = e.target.value; render(); });
  document.getElementById("f-lider").addEventListener("change", (e) => { state.lider = e.target.value; render(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.status = ""; state.tipo = ""; state.treinamento = ""; state.ugb = ""; state.ga = ""; state.lider = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-status").value = "";
    document.getElementById("f-tipo").value = "";
    document.getElementById("f-treinamento").value = "";
    document.getElementById("f-ugb").value = "";
    document.getElementById("f-ga").value = "";
    document.getElementById("f-lider").value = "";
    render();
  });

  document.getElementById("btn-exportar-lpt").addEventListener("click", () => MT.exportarLPT(ultimoFiltrado));

  render();
})();
