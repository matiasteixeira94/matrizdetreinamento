"use strict";
(async function () {
  MT.renderShell({ activeKey: "equipes", eyebrow: "Matriz de Treinamento", title: "Equipes" });

  const content = document.getElementById("mt-content");
  content.innerHTML = `<div class="empty-state">Carregando matriz de treinamentos…</div>`;

  let registros;
  try {
    registros = await MT.loadTreinamentosFiltrados();
  } catch (e) {
    content.innerHTML = `<div class="card empty-state">${e.message}</div>`;
    return;
  }

  const equipes = (() => {
    const map = new Map();
    for (const r of registros) {
      const key = r.NomeLider || "Sem líder";
      if (!map.has(key)) {
        map.set(key, {
          nome: key, cargo: r.Cargo_Lider, ugb: r.UGB_Lider, departamento: r.Departamento_Lider,
          registros: [], colaboradores: new Set(),
        });
      }
      const eq = map.get(key);
      eq.registros.push(r);
      if (r.NomeColaborador) eq.colaboradores.add(r.NomeColaborador);
    }
    return [...map.values()].map((eq) => {
      const total = eq.registros.length;
      const realizado = eq.registros.filter((r) => r.Status === "Realizado").length;
      const atrasado = eq.registros.filter((r) => r.Status === "Atrasado").length;
      return {
        ...eq, total, realizado, atrasado, tamanhoEquipe: eq.colaboradores.size,
        pctConclusao: total ? (realizado / total) * 100 : 0,
      };
    }).sort((a, b) => b.tamanhoEquipe - a.tamanhoEquipe);
  })();

  const state = { busca: "", ugb: "" };

  content.innerHTML = `
    <p class="footnote" style="margin-top:-6px;">
      Uma linha por líder — agrega todos os colaboradores e treinamentos sob a liderança dele
      (${MT.fmtInt(equipes.length)} líderes identificados na matriz).
    </p>

    <div class="filter-bar">
      <div class="field">
        <label for="f-busca">Buscar líder</label>
        <input class="input" id="f-busca" type="text" placeholder="Nome…" style="min-width:200px;" />
      </div>
      <div class="field">
        <label for="f-ugb">UGB</label>
        <select class="select" id="f-ugb"><option value="">Todas</option></select>
      </div>
      <button class="btn btn-ghost" id="f-limpar" type="button" style="margin-top:16px;">Limpar filtros</button>
    </div>

    <div class="card">
      <div class="section-head" style="margin-bottom:14px;">
        <h2>Equipes</h2>
        <span class="footnote" id="contador"></span>
      </div>
      <div class="table-wrap table-wrap-scroll">
        <table class="data">
          <thead>
            <tr><th>Líder</th><th>Cargo</th><th>UGB</th><th class="num">Equipe</th><th class="num">Treinamentos</th><th>Conclusão</th><th class="num">Atrasados</th></tr>
          </thead>
          <tbody id="tbody-equipes"></tbody>
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
          <thead><tr><th>Colaborador</th><th>Cargo</th><th class="num">Treinamentos</th><th>Conclusão</th><th>Situação</th></tr></thead>
          <tbody id="tbody-detalhe"></tbody>
        </table>
      </div>
    </div>
  `;

  MT.popularFiltro(document.getElementById("f-ugb"), registros, "UGB_Lider");

  const PRIORIDADE = MT.STATUS_PRIORIDADE;

  function filtrar() {
    const busca = state.busca.trim().toLowerCase();
    return equipes.filter((eq) => {
      if (busca && !eq.nome.toLowerCase().includes(busca)) return false;
      if (state.ugb && eq.ugb !== state.ugb) return false;
      return true;
    });
  }

  function render() {
    const filtrados = filtrar();
    document.getElementById("contador").textContent = `${MT.fmtInt(filtrados.length)} de ${MT.fmtInt(equipes.length)} líderes`;
    document.getElementById("tbody-equipes").innerHTML = filtrados.map((eq) => `
      <tr data-clickable data-nome="${eq.nome.replace(/"/g, "&quot;")}">
        <td>${eq.nome}</td>
        <td>${eq.cargo || "—"}</td>
        <td>${eq.ugb || "—"}</td>
        <td class="num">${MT.fmtInt(eq.tamanhoEquipe)}</td>
        <td class="num">${MT.fmtInt(eq.total)}</td>
        <td style="min-width:120px;">
          <div class="bar-track"><div class="bar-fill" style="width:${eq.pctConclusao}%;"></div></div>
          <span class="footnote mono">${MT.fmtPct(eq.pctConclusao, 0)}</span>
        </td>
        <td class="num">${eq.atrasado > 0 ? `<span class="chip chip-critical">${MT.fmtInt(eq.atrasado)}</span>` : "0"}</td>
      </tr>
    `).join("") || `<tr><td colspan="7" class="footnote" style="padding:18px;">Nenhum líder encontrado com os filtros atuais.</td></tr>`;

    document.querySelectorAll("#tbody-equipes tr[data-nome]").forEach((row) => {
      row.addEventListener("click", () => abrirDetalhe(row.dataset.nome));
    });
  }

  function abrirDetalhe(nome) {
    const eq = equipes.find((x) => x.nome === nome);
    if (!eq) return;
    document.getElementById("detalhe-card").style.display = "";
    document.getElementById("detalhe-titulo").textContent = `Equipe de ${eq.nome}`;
    document.getElementById("detalhe-sub").textContent = `${eq.cargo || "—"} · ${eq.ugb || "—"} · ${MT.fmtInt(eq.tamanhoEquipe)} colaboradores`;

    const porColaborador = new Map();
    for (const r of eq.registros) {
      const key = r.NomeColaborador || "—";
      if (!porColaborador.has(key)) porColaborador.set(key, { nome: key, cargo: r.Cargo_Colaborador, registros: [] });
      porColaborador.get(key).registros.push(r);
    }
    const membros = [...porColaborador.values()].map((m) => {
      const total = m.registros.length;
      const realizado = m.registros.filter((r) => r.Status === "Realizado").length;
      const piorStatus = m.registros.reduce((pior, r) => (PRIORIDADE[r.Status] ?? 3) < (PRIORIDADE[pior] ?? 3) ? r.Status : pior, "Realizado");
      return { ...m, total, pctConclusao: total ? (realizado / total) * 100 : 0, piorStatus };
    }).sort((a, b) => (PRIORIDADE[a.piorStatus] ?? 3) - (PRIORIDADE[b.piorStatus] ?? 3) || a.nome.localeCompare(b.nome, "pt-BR"));

    document.getElementById("tbody-detalhe").innerHTML = membros.map((m) => `
      <tr>
        <td>${m.nome}</td>
        <td>${m.cargo || "—"}</td>
        <td class="num">${MT.fmtInt(m.total)}</td>
        <td style="min-width:120px;">
          <div class="bar-track"><div class="bar-fill" style="width:${m.pctConclusao}%;"></div></div>
          <span class="footnote mono">${MT.fmtPct(m.pctConclusao, 0)}</span>
        </td>
        <td>${MT.statusChip(m.piorStatus)}</td>
      </tr>
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
  document.getElementById("f-ugb").addEventListener("change", (e) => { state.ugb = e.target.value; render(); });
  document.getElementById("f-limpar").addEventListener("click", () => {
    state.busca = ""; state.ugb = "";
    document.getElementById("f-busca").value = "";
    document.getElementById("f-ugb").value = "";
    render();
  });

  render();
})();
