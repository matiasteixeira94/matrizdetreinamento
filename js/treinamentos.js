"use strict";
(async function () {
  MT.renderShell({ activeKey: "treinamentos", eyebrow: "Matriz de Treinamento", title: "Treinamentos" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentosFiltrados();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const catalogo = (() => {
    const map = new Map();
    for (const r of registros) {
      const key = r.NomeTreinamento || "—";
      if (!map.has(key)) {
        map.set(key, { nome: key, tipo: r.TipoTreinamento, unidade: r.UnidadeResponsavel, total: 0, realizado: 0, pendente: 0, atrasado: 0 });
      }
      const it = map.get(key);
      it.total++;
      if (r.Status === "Realizado") it.realizado++;
      else if (r.Status === "Pendente") it.pendente++;
      else if (r.Status === "Atrasado") it.atrasado++;
    }
    return [...map.values()].map((it) => ({ ...it, pctConclusao: it.total ? (it.realizado / it.total) * 100 : 0 }));
  })();

  const state = { busca: "", tipo: "", unidade: "", sortKey: "pctConclusao", sortDir: "asc" };

  content.innerHTML = `
    <p class="footnote" style="margin-top:-6px;">
      Catálogo de treinamentos distintos na matriz — cada linha agrega todos os colaboradores atribuídos
      a um mesmo treinamento (${MT.fmtInt(catalogo.length)} treinamentos únicos).
    </p>

    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar treinamento</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome do treinamento…" style="min-width:240px;" />
      </div>
      <div class="field">
        <label for="f-tipo">Tipo</label>
        <select class="select" id="f-tipo"><option value="">Todos</option></select>
      </div>
      <div class="field">
        <label for="f-unidade">Unidade responsável</label>
        <select class="select" id="f-unidade"><option value="">Todas</option></select>
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar filtros</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Catálogo de treinamentos</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <p class="footnote" style="margin-top:-6px; margin-bottom:10px;">Clique num cabeçalho para ordenar. Por padrão, mostra primeiro os treinamentos com menor % de conclusão.</p>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead>
            <tr>
              <th data-sort="nome">Treinamento</th>
              <th data-sort="tipo">Tipo</th>
              <th data-sort="unidade">Unidade responsável</th>
              <th class="num" data-sort="total">Atribuídos</th>
              <th class="num" data-sort="realizado">Realizados</th>
              <th class="num" data-sort="atrasado">Atrasados</th>
              <th data-sort="pctConclusao">Conclusão</th>
            </tr>
          </thead>
          <tbody id="tbody-catalogo"></tbody>
        </table>
      </div>
    </div>
  `;

  MT.popularFiltro(document.getElementById("f-tipo"), registros, "TipoTreinamento");
  MT.popularFiltro(document.getElementById("f-unidade"), registros, "UnidadeResponsavel");

  function ordenar(lista) {
    const { sortKey, sortDir } = state;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[sortKey], vb = b[sortKey];
      if (typeof va === "string") return va.localeCompare(vb, "pt-BR") * dir;
      return (va - vb) * dir;
    });
  }

  function filtrar() {
    const busca = state.busca.trim().toLowerCase();
    return catalogo.filter((it) => {
      if (busca && !it.nome.toLowerCase().includes(busca)) return false;
      if (state.tipo && it.tipo !== state.tipo) return false;
      if (state.unidade && it.unidade !== state.unidade) return false;
      return true;
    });
  }

  function render() {
    const filtrados = ordenar(filtrar());
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(catalogo.length)} treinamentos`;
    document.getElementById("tbody-catalogo").innerHTML = filtrados.map((it) => `
      <tr>
        <td>${it.nome}</td>
        <td>${it.tipo || "—"}</td>
        <td>${it.unidade || "—"}</td>
        <td class="num">${MT.fmtInt(it.total)}</td>
        <td class="num">${MT.fmtInt(it.realizado)}</td>
        <td class="num">${it.atrasado > 0 ? `<span class="chip chip-critical">${MT.fmtInt(it.atrasado)}</span>` : "0"}</td>
        <td style="min-width:120px;">
          <div class="bar-track"><div class="bar-fill" style="width:${it.pctConclusao}%;"></div></div>
          <span class="footnote mono">${MT.fmtPct(it.pctConclusao, 0)}</span>
        </td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="footnote" style="padding:18px;">Nenhum treinamento encontrado com os filtros atuais.</td></tr>`;
  }

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      state.sortDir = state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc";
      state.sortKey = key;
      render();
    });
  });

  let debounce;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounce);
    debounce = setTimeout(() => { state.busca = e.target.value; render(); }, 150);
  });
  document.getElementById("f-tipo").addEventListener("change", (e) => { state.tipo = e.target.value; render(); });
  document.getElementById("f-unidade").addEventListener("change", (e) => { state.unidade = e.target.value; render(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.tipo = ""; state.unidade = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-tipo").value = "";
    document.getElementById("f-unidade").value = "";
    render();
  });

  render();
})();
