"use strict";
(async function () {
  MT.renderShell({
    activeKey: "historico", eyebrow: "Bases corporativas", title: "Histórico Geral",
    mostrarUgb: false,
  });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando catálogo do histórico…</div>`;

  // Esse relatório tem ~35 mil registros (~18MB em JSON) — grande demais pra
  // trazer inteiro pro navegador de uma vez. Por padrão a API já devolve só
  // o catálogo agregado por treinamento (algumas centenas de linhas); os
  // registros individuais de um treinamento ou de um colaborador são
  // buscados sob demanda (?treinamento=/?colaborador=), só quando o usuário
  // pede.
  let catalogo, totalRegistrosBrutos;
  try {
    const res = await fetch("/api/historico-treinamentos");
    if (!res.ok) throw new Error((await res.json().catch(() => ({}))).erro || "Falha ao carregar o histórico de treinamentos");
    const dados = await res.json();
    catalogo = dados.catalogo;
    totalRegistrosBrutos = dados.totalRegistrosBrutos;
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const state = { busca: "", sortKey: "ultimaData", sortDir: "desc" };

  content.innerHTML = `
    <p class="footnote" style="margin-top:-6px;">
      Relatório histórico de treinamentos da empresa toda (todos os setores, desde 2015) — ${MT.fmtInt(totalRegistrosBrutos)}
      registros de realização agrupados em ${MT.fmtInt(catalogo.length)} treinamentos distintos. Base separada da
      matriz individual por UGB: aqui não há "pendente"/"atrasado", só o que já foi realizado.
    </p>

    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar treinamento</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome do treinamento…" style="min-width:260px;" />
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Catálogo de treinamentos (histórico)</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <p class="footnote" style="margin-top:-6px; margin-bottom:10px;">Clique num cabeçalho pra ordenar, ou numa linha pra ver quem já fez esse treinamento.</p>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead>
            <tr>
              <th data-sort="nomeTreinamento">Treinamento</th>
              <th data-sort="revisao">Revisão</th>
              <th class="num" data-sort="totalRegistros">Realizações</th>
              <th class="num" data-sort="colaboradoresUnicos">Colaboradores</th>
              <th data-sort="primeiraData">Primeira</th>
              <th data-sort="ultimaData">Última</th>
            </tr>
          </thead>
          <tbody id="tbody-catalogo"></tbody>
        </table>
      </div>
    </div>

    <div class="card" id="detalhe-card" style="display:none;">
      <div class="card-head">
        <div><div class="card-title" id="detalhe-titulo"></div><div class="card-sub" id="detalhe-sub"></div></div>
        <button class="btn btn-ghost" id="btn-fechar-detalhe" type="button">✕ Fechar</button>
      </div>
      <div id="detalhe-corpo"></div>
    </div>

    <div class="card">
      <div class="card-head"><div><div class="card-title">Buscar histórico por colaborador</div><div class="card-sub">Todo o histórico de treinamentos de uma pessoa, empresa toda</div></div></div>
      <div class="filter-bar" style="margin-bottom:14px;">
        <div class="field">
          <label for="f-colaborador">Nome do colaborador</label>
          <input class="input" id="f-colaborador" type="text" placeholder="Digite pelo menos 3 letras…" style="min-width:260px;" />
        </div>
      </div>
      <div id="resultado-colaborador"></div>
    </div>
  `;

  function ordenar(lista) {
    const { sortKey, sortDir } = state;
    const dir = sortDir === "asc" ? 1 : -1;
    return [...lista].sort((a, b) => {
      const va = a[sortKey] ?? "", vb = b[sortKey] ?? "";
      if (typeof va === "string") return va.localeCompare(vb, "pt-BR") * dir;
      return (va - vb) * dir;
    });
  }

  function filtrarCatalogo() {
    const busca = state.busca.trim().toLowerCase();
    return busca ? catalogo.filter((it) => it.nomeTreinamento.toLowerCase().includes(busca)) : catalogo;
  }

  function renderCatalogo() {
    const filtrados = ordenar(filtrarCatalogo());
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(catalogo.length)} treinamentos`;
    document.getElementById("tbody-catalogo").innerHTML = filtrados.map((it) => `
      <tr data-clickable data-nome="${it.nomeTreinamento.replace(/"/g, "&quot;")}">
        <td>${it.nomeTreinamento}</td>
        <td>${it.revisao ?? "—"}</td>
        <td class="num">${MT.fmtInt(it.totalRegistros)}</td>
        <td class="num">${MT.fmtInt(it.colaboradoresUnicos)}</td>
        <td>${MT.fmtDate(it.primeiraData)}</td>
        <td>${MT.fmtDate(it.ultimaData)}</td>
      </tr>
    `).join("") || `<tr><td colspan="6" class="footnote" style="padding:18px;">Nenhum treinamento encontrado.</td></tr>`;

    document.querySelectorAll("#tbody-catalogo tr[data-nome]").forEach((row) => {
      row.addEventListener("click", () => abrirDetalheTreinamento(row.dataset.nome));
    });
  }

  document.querySelectorAll("th[data-sort]").forEach((th) => {
    th.addEventListener("click", () => {
      const key = th.dataset.sort;
      state.sortDir = state.sortKey === key && state.sortDir === "asc" ? "desc" : "asc";
      state.sortKey = key;
      renderCatalogo();
    });
  });

  let debounceBusca;
  document.getElementById("f-busca").addEventListener("input", (e) => {
    clearTimeout(debounceBusca);
    debounceBusca = setTimeout(() => { state.busca = e.target.value; renderCatalogo(); }, 150);
  });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = "";
    document.getElementById("f-busca").value = "";
    renderCatalogo();
  });

  async function abrirDetalheTreinamento(nome) {
    const card = document.getElementById("detalhe-card");
    const corpo = document.getElementById("detalhe-corpo");
    card.style.display = "";
    document.getElementById("detalhe-titulo").textContent = nome;
    document.getElementById("detalhe-sub").textContent = "Carregando participantes…";
    corpo.innerHTML = "";
    card.scrollIntoView({ behavior: "smooth", block: "nearest" });

    try {
      const res = await fetch(`/api/historico-treinamentos?treinamento=${encodeURIComponent(nome)}`);
      if (!res.ok) throw new Error("Falha ao carregar os participantes desse treinamento");
      const dados = await res.json();
      const registros = [...dados.registros].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
      document.getElementById("detalhe-sub").textContent = `${MT.fmtInt(dados.total)} realizações registradas`;
      corpo.innerHTML = `
        <div class="table-wrap table-wrap-scroll">
          <table class="data">
            <thead><tr><th>Colaborador</th><th>Cargo</th><th>Setor</th><th>Instrutor</th><th>Data</th><th class="num">Duração (h)</th></tr></thead>
            <tbody>
              ${registros.map((r) => `
                <tr>
                  <td>${r.nomeColaborador || "—"}</td>
                  <td>${r.cargoColaborador || "—"}</td>
                  <td>${r.setorColaborador || r.departamentoColaborador || "—"}</td>
                  <td>${r.nomeInstrutor || "—"}</td>
                  <td>${r.data && r.data !== "0000-00-00" ? MT.fmtDate(r.data) : "—"}</td>
                  <td class="num">${r.duracaoHoras && r.duracaoHoras !== "0.0" ? r.duracaoHoras : "—"}</td>
                </tr>`).join("")}
            </tbody>
          </table>
        </div>`;
    } catch (e) {
      document.getElementById("detalhe-sub").textContent = e.message;
    }
  }

  document.getElementById("btn-fechar-detalhe").addEventListener("click", () => {
    document.getElementById("detalhe-card").style.display = "none";
  });

  let debounceColab;
  document.getElementById("f-colaborador").addEventListener("input", (e) => {
    clearTimeout(debounceColab);
    const termo = e.target.value.trim();
    const resultado = document.getElementById("resultado-colaborador");
    if (termo.length < 3) {
      resultado.innerHTML = termo.length ? `<p class="footnote">Digite pelo menos 3 letras.</p>` : "";
      return;
    }
    debounceColab = setTimeout(async () => {
      resultado.innerHTML = `<p class="footnote">Buscando…</p>`;
      try {
        const res = await fetch(`/api/historico-treinamentos?colaborador=${encodeURIComponent(termo)}`);
        if (!res.ok) throw new Error("Falha na busca");
        const dados = await res.json();
        const registros = [...dados.registros].sort((a, b) => (b.data || "").localeCompare(a.data || ""));
        resultado.innerHTML = `
          <p class="footnote" style="margin-bottom:10px;">
            ${MT.fmtInt(dados.total)} registro(s)${dados.truncado ? ` (mostrando os 500 mais recentes)` : ""}.
          </p>
          <div class="table-wrap table-wrap-scroll">
            <table class="data">
              <thead><tr><th>Colaborador</th><th>Treinamento</th><th>Instrutor</th><th>Data</th><th class="num">Duração (h)</th></tr></thead>
              <tbody>
                ${registros.map((r) => `
                  <tr>
                    <td>${r.nomeColaborador || "—"}</td>
                    <td>${r.nomeTreinamento || "—"}</td>
                    <td>${r.nomeInstrutor || "—"}</td>
                    <td>${r.data && r.data !== "0000-00-00" ? MT.fmtDate(r.data) : "—"}</td>
                    <td class="num">${r.duracaoHoras && r.duracaoHoras !== "0.0" ? r.duracaoHoras : "—"}</td>
                  </tr>`).join("") || `<tr><td colspan="5" class="footnote" style="padding:14px;">Nenhum colaborador encontrado com esse nome.</td></tr>`}
              </tbody>
            </table>
          </div>`;
      } catch (e) {
        resultado.innerHTML = `<p class="footnote">${e.message}</p>`;
      }
    }, 300);
  });

  renderCatalogo();
})();
