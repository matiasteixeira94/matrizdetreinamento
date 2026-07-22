"use strict";
(async function () {
  MT.renderShell({ activeKey: "pendencias", eyebrow: "Matriz de Treinamento", title: "Pendências" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentos();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const pendencias = registros.filter((r) => r.Status === "Atrasado" || r.Status === "Pendente");
  const totalAtrasado = pendencias.filter((r) => r.Status === "Atrasado").length;
  const totalPendente = pendencias.filter((r) => r.Status === "Pendente").length;

  const state = { busca: "", ugb: "", ga: "", status: "", lider: "" };

  content.innerHTML = `
    <div class="grid grid-3">
      <div class="card stat-tile">
        <div class="stat-label">Total de pendências</div>
        <div class="stat-value">${MT.fmtInt(pendencias.length)}</div>
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
        <input class="input" id="f-busca" type="text" placeholder="Nome…" style="min-width:200px;" />
      </div>
      <div class="field">
        <label for="f-status">Situação</label>
        <select class="select" id="f-status">
          <option value="">Atrasados e pendentes</option>
          <option value="Atrasado">Só atrasados</option>
          <option value="Pendente">Só pendentes</option>
        </select>
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
        <h2>Treinamentos pendentes</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <p class="footnote" style="margin-top:-6px; margin-bottom:10px;">Ordenado por prazo — mais urgentes primeiro.</p>
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

  MT.popularFiltro(document.getElementById("f-ugb"), pendencias, "UGB_Colaborador");
  MT.popularFiltro(document.getElementById("f-ga"), pendencias, "GA_Colaborador");
  MT.popularFiltro(document.getElementById("f-lider"), pendencias, "NomeLider");

  function chipPrazo(r) {
    const dias = MT.diasAte(r.Prazo);
    if (dias === null) return `<span class="footnote">sem prazo definido</span>`;
    if (dias < 0) return `<span class="chip chip-critical">${MT.fmtInt(Math.abs(dias))} dia(s) em atraso</span>`;
    if (dias <= 7) return `<span class="chip chip-warning">vence em ${MT.fmtInt(dias)} dia(s)</span>`;
    return `<span class="chip chip-neutral">vence em ${MT.fmtInt(dias)} dia(s)</span>`;
  }

  function filtrar() {
    const busca = state.busca.trim().toLowerCase();
    return pendencias.filter((r) => {
      if (busca && !(r.NomeColaborador || "").toLowerCase().includes(busca)) return false;
      if (state.status && r.Status !== state.status) return false;
      if (state.ugb && r.UGB_Colaborador !== state.ugb) return false;
      if (state.ga && r.GA_Colaborador !== state.ga) return false;
      if (state.lider && r.NomeLider !== state.lider) return false;
      return true;
    });
  }

  function render() {
    const filtrados = filtrar().sort((a, b) => {
      if (!a.Prazo) return 1;
      if (!b.Prazo) return -1;
      return a.Prazo.localeCompare(b.Prazo);
    });
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(pendencias.length)} pendências`;
    document.getElementById("tbody-pendencias").innerHTML = filtrados.map((r) => `
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
    `).join("") || `<tr><td colspan="8" class="footnote" style="padding:18px;">Nenhuma pendência encontrada com os filtros atuais.</td></tr>`;
  }

  let debounce;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.busca = e.target.value; render(); }, 150);
  });
  document.getElementById("f-status").addEventListener("change", (e) => { state.status = e.target.value; render(); });
  document.getElementById("f-ugb").addEventListener("change", (e) => { state.ugb = e.target.value; render(); });
  document.getElementById("f-ga").addEventListener("change", (e) => { state.ga = e.target.value; render(); });
  document.getElementById("f-lider").addEventListener("change", (e) => { state.lider = e.target.value; render(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.status = ""; state.ugb = ""; state.ga = ""; state.lider = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-status").value = "";
    document.getElementById("f-ugb").value = "";
    document.getElementById("f-ga").value = "";
    document.getElementById("f-lider").value = "";
    render();
  });

  render();
})();
