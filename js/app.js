// Núcleo compartilhado: shell (sidebar/topbar), tema e utilidades de
// dados/formatação usadas por todas as páginas. Sem autenticação por
// enquanto — plataforma de uso interno, tela de login fica para uma
// próxima etapa.
"use strict";

const MT = (() => {
  const THEME_KEY = "mt_theme";
  const UGB_KEY = "mt_ugb_ativa";

  const NAV_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    colaboradores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    treinamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    pendencias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6l4 2"/></svg>',
    equipes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    universidade: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m22 10-10-6L2 10l10 6 10-6Z"/><path d="M6 12v5c0 1.1 2.7 2 6 2s6-.9 6-2v-5"/></svg>',
    historico: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/></svg>',
  };

  const NAV_ITEMS = [
    { key: "dashboard", href: "index.html", label: "Visão Geral" },
    { key: "colaboradores", href: "colaboradores.html", label: "Colaboradores" },
    { key: "treinamentos", href: "treinamentos.html", label: "Treinamentos" },
    { key: "pendencias", href: "pendencias.html", label: "Pendências" },
    { key: "equipes", href: "equipes.html", label: "Equipes" },
    { key: "universidade", href: "universidade.html", label: "Universidade VM" },
    { key: "historico", href: "historico.html", label: "Histórico Geral" },
  ];

  function applyStoredTheme() {
    const saved = localStorage.getItem(THEME_KEY);
    if (saved) document.documentElement.setAttribute("data-theme", saved);
  }

  function wireThemeToggle(btn) {
    if (!btn) return;
    const icon = btn.querySelector("#mt-theme-icon") || btn;
    const setIcon = () => {
      const isDark = getComputedStyle(document.documentElement).colorScheme === "dark" ||
        document.documentElement.getAttribute("data-theme") === "dark" ||
        (!document.documentElement.getAttribute("data-theme") && window.matchMedia("(prefers-color-scheme: dark)").matches);
      icon.textContent = isDark ? "☀" : "☾";
    };
    setIcon();
    btn.addEventListener("click", () => {
      const current = document.documentElement.getAttribute("data-theme") ||
        (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
      const next = current === "dark" ? "light" : "dark";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem(THEME_KEY, next);
      setIcon();
    });
  }

  const NAV_GRUPO_MATRIZ = ["dashboard", "colaboradores", "treinamentos", "pendencias", "equipes"];
  const NAV_GRUPO_CORPORATIVO = ["universidade", "historico"];

  function renderShell({ activeKey, eyebrow, title, actionsHtml, mostrarUgb = true }) {
    const mount = document.getElementById("mt-shell");
    if (!mount) return;

    const linkHtml = (item) => `
      <a class="nav-link" href="${item.href}" ${item.key === activeKey ? 'aria-current="page"' : ""}>
        ${NAV_ICONS[item.key]}<span>${item.label}</span>
      </a>`;
    const navHtmlMatriz = NAV_ITEMS.filter((i) => NAV_GRUPO_MATRIZ.includes(i.key)).map(linkHtml).join("");
    const navHtmlCorp = NAV_ITEMS.filter((i) => NAV_GRUPO_CORPORATIVO.includes(i.key)).map(linkHtml).join("");

    const ugbAtiva = getUgbAtiva();
    const ugbBadgeHtml = mostrarUgb ? `
      <a class="chip ${ugbAtiva ? "chip-neutral" : "chip-good"}" href="inicio.html" style="text-decoration:none;" title="Trocar UGB">
        ${ugbAtiva ? `UGB ${ugbAtiva}` : "Todas as UGBs"}
      </a>` : "";

    mount.innerHTML = `
      <div class="mobile-topbar">
        <button class="mobile-topbar-toggle" id="mt-sidebar-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <a class="mobile-topbar-brand" href="inicio.html">
          <div class="brand-mark" style="width:26px;height:26px;"><img src="assets/images/logo-viana-moura.png" alt="" /></div>
          <span>Matriz de Treinamento</span>
        </a>
      </div>
      <div class="sidebar-backdrop" id="mt-sidebar-backdrop"></div>
      <aside class="sidebar" id="mt-sidebar">
        <a class="brand" href="inicio.html" title="Trocar UGB">
          <div class="brand-mark"><img src="assets/images/logo-viana-moura.png" alt="" /></div>
          <div class="brand-word">Matriz de Treinamento<small>Viana &amp; Moura Construções</small></div>
        </a>
        <nav class="nav-group">
          <div class="nav-label">Matriz por UGB</div>
          ${navHtmlMatriz}
        </nav>
        <nav class="nav-group">
          <div class="nav-label">Bases corporativas</div>
          ${navHtmlCorp}
        </nav>
        <div class="sidebar-foot">
          <button class="btn btn-ghost" id="mt-theme-toggle" style="justify-content:flex-start" type="button">
            <span aria-hidden="true" id="mt-theme-icon">☾</span><span>Alternar tema</span>
          </button>
        </div>
      </aside>
      <div class="main">
        <header class="topbar">
          <div>
            <div class="topbar-eyebrow">${eyebrow ?? "Matriz de Treinamento"}</div>
            <h1>${title}</h1>
          </div>
          <div class="topbar-actions">${ugbBadgeHtml}${actionsHtml ?? ""}</div>
        </header>
        <div class="content" id="mt-content"></div>
      </div>`;

    wireThemeToggle(document.getElementById("mt-theme-toggle"));
    wireMobileSidebar(mount);
  }

  function wireMobileSidebar(mount) {
    const toggle = document.getElementById("mt-sidebar-toggle");
    const backdrop = document.getElementById("mt-sidebar-backdrop");
    if (!toggle || !backdrop) return;
    const close = () => { mount.classList.remove("sidebar-open"); toggle.setAttribute("aria-expanded", "false"); };
    const open = () => { mount.classList.add("sidebar-open"); toggle.setAttribute("aria-expanded", "true"); };
    toggle.addEventListener("click", () => (mount.classList.contains("sidebar-open") ? close() : open()));
    backdrop.addEventListener("click", close);
    document.getElementById("mt-sidebar").addEventListener("click", (e) => { if (e.target.closest("a")) close(); });
  }

  // Cache em memória — todas as páginas usam o mesmo conjunto de registros
  // e o CSV de origem tem centenas de KB, então evita refazer a chamada
  // toda vez que o usuário navega dentro da mesma sessão da aba.
  let _cache = null;
  async function loadTreinamentos({ force = false } = {}) {
    if (_cache && !force) return _cache;
    const res = await fetch("/api/treinamentos");
    if (!res.ok) throw new Error("Falha ao carregar a matriz de treinamentos");
    const dados = await res.json();
    _cache = dados.registros;
    return _cache;
  }

  // Registros crus do quadro de RH (só ativos, já filtrado pela API) —
  // cacheado à parte da matriz de treinamentos porque nem toda tela precisa
  // das duas coisas.
  let _cacheQuadro = null;
  async function carregarQuadro({ force = false } = {}) {
    if (_cacheQuadro && !force) return _cacheQuadro;
    const res = await fetch("/api/quadro");
    if (!res.ok) throw new Error("Falha ao carregar o quadro de colaboradores ativos");
    const dados = await res.json();
    _cacheQuadro = dados.registros;
    return _cacheQuadro;
  }

  // Nomes (normalizados) de quem está ativo hoje no quadro de RH — usado
  // pra tirar gente desligada de rankings/listas que vêm da matriz de
  // treinamentos (que não tem conceito de "ativo", só o histórico de quem
  // já teve algum treinamento atribuído).
  let _cacheAtivos = null;
  async function carregarNomesAtivos({ force = false } = {}) {
    if (_cacheAtivos && !force) return _cacheAtivos;
    const quadro = await carregarQuadro({ force });
    _cacheAtivos = new Set(quadro.map((r) => normalizarNome(r.NOME)));
    return _cacheAtivos;
  }

  function tituloCase(s) {
    return (s || "").toLowerCase().replace(/(^|\s)\S/g, (m) => m.toUpperCase());
  }

  // Todo mundo ativo hoje no quadro de RH, cruzado com a matriz de
  // treinamentos por nome — ao contrário de `loadTreinamentos` (que só
  // enxerga quem já tem algum treinamento atribuído), essa lista inclui
  // quem ainda não tem nenhum. É a base "oficial" de headcount: telas que
  // mostram quantidade de colaboradores (por setor, categoria, UGB) devem
  // usar essa função, não contar registros da matriz, senão quem ainda não
  // tem treinamento atribuído some da contagem.
  let _cacheColaboradores = null;
  async function carregarColaboradoresAtivos({ force = false } = {}) {
    if (_cacheColaboradores && !force) return _cacheColaboradores;
    const [todosRegistros, quadro] = await Promise.all([
      loadTreinamentos({ force }),
      carregarQuadro({ force }),
    ]);

    const porNomeTreino = new Map();
    for (const r of todosRegistros) {
      const chave = normalizarNome(r.NomeColaborador);
      if (!chave) continue;
      if (!porNomeTreino.has(chave)) {
        porNomeTreino.set(chave, {
          nome: r.NomeColaborador, cargo: r.Cargo_Colaborador, ugb: r.UGB_Colaborador,
          ga: r.GA_Colaborador, setor: r.Setor_Colaborador, lider: r.NomeLider, registros: [],
        });
      }
      porNomeTreino.get(chave).registros.push(r);
    }

    _cacheColaboradores = quadro.map((q) => {
      const chave = normalizarNome(q.NOME);
      const treino = porNomeTreino.get(chave);
      const registros = treino?.registros || [];
      const total = registros.length;
      const { realizado, pctRealizado } = calcularPercentuais(registros);
      const piorStatus = total
        ? registros.reduce((pior, r) => (STATUS_PRIORIDADE[r.Status] ?? 3) < (STATUS_PRIORIDADE[pior] ?? 3) ? r.Status : pior, "Realizado")
        : null;

      return {
        nome: treino?.nome || tituloCase(q.NOME),
        cargo: treino?.cargo || tituloCase(q["FUNÇÃO"]),
        ugb: treino?.ugb || ugbPorSetorQuadro(q.SETOR),
        ga: treino?.ga || null,
        setor: treino?.setor || q.SETOR,
        lider: treino?.lider || null,
        categoria: categoriaCargo(treino?.cargo || q["FUNÇÃO"]),
        tipoColaborador: q.DIRETO_INDIRETO === "DIRETO" ? "Direto" : q.DIRETO_INDIRETO === "INDIRETO" ? "Indireto" : "Outros",
        total, realizado, pctRealizado,
        piorStatus, semTreinamento: total === 0,
        registros,
      };
    });
    return _cacheColaboradores;
  }

  // UGB escolhida na tela inicial (inicio.html) — persiste entre páginas via
  // localStorage. `null`/ausente significa "todas as UGBs juntas".
  function getUgbAtiva() { return localStorage.getItem(UGB_KEY) || null; }
  function setUgbAtiva(ugb) { localStorage.setItem(UGB_KEY, ugb); }
  function limparUgbAtiva() { localStorage.removeItem(UGB_KEY); }

  // Igual a loadTreinamentos, mas já aplica o recorte pela UGB ativa — é o
  // que as telas (dashboard, colaboradores etc.) devem chamar.
  async function loadTreinamentosFiltrados(opts) {
    const todos = await loadTreinamentos(opts);
    const ugb = getUgbAtiva();
    return ugb ? todos.filter((r) => r.UGB_Colaborador === ugb) : todos;
  }

  const fmtInt = (n) => new Intl.NumberFormat("pt-BR").format(Math.round(n));
  const fmtPct = (n, casas = 1) => `${new Intl.NumberFormat("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas }).format(n)}%`;
  const fmtDate = (iso) => {
    if (!iso) return "—";
    const d = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(d.getTime())) return iso;
    return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(d);
  };

  function initials(name) {
    return String(name || "?").split(" ").filter(Boolean).slice(0, 2).map((p) => p[0]).join("").toUpperCase();
  }

  // Ordem e cores fixas dos 5 status observados na matriz — "Aguarda
  // Validação" (treinamento feito, falta alguém aprovar) e "Outros" são bem
  // menos frequentes que os 3 principais, mas entram nos gráficos/contagens
  // pra não sumir dado da soma.
  const STATUS_ORDER = ["Realizado", "Aguarda Validação", "Pendente", "Atrasado", "Outros"];
  const STATUS_CHIP = {
    Realizado: "chip-good", "Aguarda Validação": "chip-neutral",
    Pendente: "chip-warning", Atrasado: "chip-critical", Outros: "chip-neutral",
  };
  const STATUS_COLOR_VAR = {
    Realizado: "var(--status-good)", "Aguarda Validação": "var(--cat-a)",
    Pendente: "var(--status-warning)", Atrasado: "var(--status-critical)", Outros: "var(--ink-muted)",
  };
  const STATUS_PRIORIDADE = { Atrasado: 0, Pendente: 1, "Aguarda Validação": 2, Outros: 3, Realizado: 4 };

  function statusChip(status) {
    const cls = STATUS_CHIP[status] || "chip-neutral";
    return `<span class="chip ${cls}">${status || "—"}</span>`;
  }

  // Fórmulas oficiais do dashboard corporativo (Power BI) — % Realizado tira
  // "Aguarda Validação" do denominador (treinamento já foi feito, só falta
  // aprovação, não deveria contar como pendência em aberto); % Pendente e %
  // Atrasado usam o total cheio, sem excluir nada. Usada em toda tela que
  // mostra % de conclusão pra bater com o relatório oficial.
  function calcularPercentuais(registros) {
    const total = registros.length;
    let realizado = 0, pendente = 0, atrasado = 0, aguardaValidacao = 0;
    for (const r of registros) {
      if (r.Status === "Realizado") realizado++;
      else if (r.Status === "Pendente") pendente++;
      else if (r.Status === "Atrasado") atrasado++;
      else if (r.Status === "Aguarda Validação") aguardaValidacao++;
    }
    const baseRealizado = total - aguardaValidacao;
    return {
      total, realizado, pendente, atrasado, aguardaValidacao,
      pctRealizado: baseRealizado ? (realizado / baseRealizado) * 100 : 0,
      pctPendente: total ? (pendente / total) * 100 : 0,
      pctAtrasado: total ? (atrasado / total) * 100 : 0,
    };
  }

  function diasAte(iso, base = new Date()) {
    if (!iso) return null;
    const alvo = new Date(`${iso}T00:00:00`);
    if (Number.isNaN(alvo.getTime())) return null;
    const hoje = new Date(base.getFullYear(), base.getMonth(), base.getDate());
    return Math.round((alvo - hoje) / 86400000);
  }

  // Preenche um <select> com as opções únicas encontradas em `registros[campo]`,
  // ordenadas alfabeticamente, mantendo a opção "Todos" já presente no HTML.
  function popularFiltro(select, registros, campo) {
    const valores = [...new Set(registros.map((r) => r[campo]).filter(Boolean))].sort((a, b) => a.localeCompare(b, "pt-BR"));
    for (const v of valores) {
      const opt = document.createElement("option");
      opt.value = v;
      opt.textContent = v;
      select.appendChild(opt);
    }
  }

  // Categoria macro do colaborador, derivada por palavra-chave do CARGO —
  // não existe um campo "setor" com essas categorias nos dados de origem
  // (Setor_Colaborador é código de unidade, tipo "CA"/"JG"), então isso é
  // uma classificação aproximada a partir do texto do cargo. Ordem importa:
  // termos mais específicos (Suprimentos/Infraestrutura) checados antes de
  // "Produção" pra não capturar cargos como "Supervisor de Suprimentos de
  // Obra" na categoria errada.
  const CATEGORIAS_CARGO = ["Produção", "Infraestrutura", "Suprimentos", "Vendas", "Administrativo"];

  // Mapa cargo → setor extraído de "Quadro Geral - Unidade de Caruaru.xls"
  // (RH, 512 colaboradores, coluna SETOR sem ambiguidade por cargo) — fonte
  // mais confiável que existe pra saber se um cargo é Produção ou não, longe
  // de perfeita por palavra-chave (ex.: "Eletricista", "Marceneiro" e
  // "Gerente de UGB" são Produção lá, sem ter a palavra "produção" no nome).
  // Chave normalizada (maiúsculas, sem acento, sem "(A)"/sufixo de gênero).
  const SETOR_POR_CARGO = {
    "SERVENTE DE PATRIMONIO": "Administrativo", "OPERADOR LIDER DE INFRAESTRUTURA": "Infraestrutura",
    "PEDREIRO DE PRODUCAO": "Produção", "SERVENTE DE INFRAESTRUTURA": "Infraestrutura",
    "OPERADOR DE INFRAESTRUTURA": "Infraestrutura", "OPERADOR DE ASSISTENCIA TECNICA": "Produção",
    "PEDREIRO LIDER DE PRODUCAO": "Produção", "SERVENTE DE SUSTENTABILIDADE": "Administrativo",
    "SERVENTE DE PRODUCAO": "Produção", "SERVENTE DE ASSISTENCIA TECNICA": "Produção",
    "SUPERVISOR DE INFRAESTRUTURA": "Infraestrutura", "ASSISTENTE DE SUPRIMENTOS DE CONTROLE": "Administrativo",
    "ASSISTENTE DE SUPRIMENTOS": "Administrativo", "APRENDIZ ASSISTENTE DE GERENCIAMENTO DE OBRAS": "Produção",
    "SERVENTE POLIVALENTE DE INFRAESTRUTURA": "Infraestrutura", "AUXILIAR DE SUPRIMENTOS": "Administrativo",
    "SERVENTE DE BETONEIRA": "Administrativo", "SUPERVISOR DE PRODUCAO": "Produção",
    "SERVENTEPOLIVALENTE DE PRODUCAO": "Produção", "APRENDIZ ADMINISTRATIVO": "Administrativo",
    "SUPERVISOR DE PRODUCAO LIDER": "Produção", "SUPERVISOR DE ACABAMENTO": "Produção",
    "ELETRICISTA": "Produção", "SERVENTE POLIVALENTE DE PRODUCAO": "Produção",
    "MARCENEIRO": "Produção", "OPERADOR DE PRODUCAO": "Produção",
    "OPERADOR DE BETONEIRA": "Administrativo", "SUPERVISOR DE SUPRIMENTOS DE DISTRIBUICAO": "Administrativo",
    "APONTADOR DE OBRA": "Administrativo", "SUPERVISOR ADMINISTRATIVO DE UGB": "Administrativo",
    "AUXILIAR DE SERVICOS GERAIS": "Administrativo", "SUPERVISOR LIDER DE ACABAMENTO E ASSIST TECNICA": "Produção",
    "SUPERVISOR DE SUPRIMENTOS DE DISTRIBUICAO LIDER": "Administrativo", "TECNICO DE ENFERMAGEM": "Administrativo",
    "ESTAGIARIO DE SEGURANCA DO TRABALHO DE OBRA": "Administrativo", "LIDER DE INFRAESTRUTURA": "Infraestrutura",
    "AUXLIAR DE SUPRIMENTOS": "Administrativo", "AUXILIAR DE KIT'S E FERRAMENTAS": "Administrativo",
    "OPERADOR DE MINI CARREGADEIRA": "Administrativo", "OPERADOR DE DUMPER": "Administrativo",
    "SUPERVISOR DE ASSISTENCIA TECNICA": "Produção", "TECNICO DE SEGURANCA DO TRABALHO": "Administrativo",
    "SUPERVISORA SUPRIMENTOS DE CONTAINER": "Administrativo", "SERVENTE POLIVALENTE DE ASSISTENCIA TECNICA": "Produção",
    "TECNICO DE SEGURANCA DO TRABALHO DE OBRA": "Administrativo", "ASSISTENTE ADMINISTRATIVO DE UGB": "Administrativo",
    "ASSISTENTE DE PESSOAL": "Administrativo", "GERENTE DE GESTAO DE UGB": "Administrativo",
    "GERENTE DE UGB": "Produção", "SUPERVISOR DE SUPRIMENTO DE CONTROLE": "Administrativo",
    "SUPERVISOR DE SAUDE E SEGURANCA DO TRABALHO": "Administrativo", "GERENTE DE INFRAESTRUTURA": "Infraestrutura",
    "ASSISTENTE DE SUPRIMENTOS DE CONTAINER": "Administrativo",
  };

  function categoriaCargo(cargo) {
    const c = (cargo || "").toLowerCase();
    // Palavras-chave inequívocas primeiro — pegam variações (Canteiro,
    // Controle, Obra, "- Vertical", "OléVM"...) que não estão named tale qual
    // no mapa abaixo, sem risco de errar categoria.
    if (c.includes("suprimento")) return "Suprimentos";
    if (c.includes("vendas")) return "Vendas";

    const chave = (cargo || "")
      .normalize("NFD").split("").filter((ch) => { const cc = ch.charCodeAt(0); return cc < 0x0300 || cc > 0x036f; }).join("")
      .toUpperCase().replace(/\(A\)/g, "").replace(/ - VERTICAL$/, "").replace(/ OLEVM$/, "").trim().replace(/\s+/g, " ");
    if (SETOR_POR_CARGO[chave]) return SETOR_POR_CARGO[chave];

    if (c.includes("infraestrutura")) return "Infraestrutura";
    // Produção engloba também Assistência Técnica, Acabamento e Pintor.
    if (c.includes("produção") || c.includes("producao") || c.includes("acabamento") || c.includes("assistência") || c.includes("assistencia") || c.includes("pintor")) return "Produção";
    return "Administrativo";
  }

  // Normaliza nome pra cruzar pessoas entre bases diferentes (matriz de
  // treinamentos usa "Fulano da Silva", o quadro de RH usa "FULANO DA
  // SILVA") — maiúsculas, sem acento, sem espaço duplicado.
  function normalizarNome(nome) {
    // Remove marcas diacríticas (acentos) decompondo em NFD e descartando os
    // combining marks (faixa Unicode 0x0300–0x036F) um a um — evita escrever
    // esse intervalo dentro de uma regex, onde editores/pipelines de texto
    // volta e meia recompõem o range de volta no caractere acentuado.
    const semAcento = (nome || "")
      .normalize("NFD")
      .split("")
      .filter((ch) => { const c = ch.charCodeAt(0); return c < 0x0300 || c > 0x036f; })
      .join("");
    return semAcento.trim().toUpperCase().replace(/\s+/g, " ");
  }

  // UGB "oficial" a partir do SETOR do quadro de RH — só usado pra quem não
  // tem nenhum registro na matriz de treinamentos (onde teríamos a UGB
  // exata via cruzamento por nome). O SETOR do quadro só distingue essas 4
  // UGBs explicitamente; o resto (VT/JG/SL/ITA e áreas corporativas) vem
  // como "UGB Outros" ou nome de departamento, sem dar pra separar.
  function ugbPorSetorQuadro(setor) {
    const s = (setor || "").toUpperCase();
    if (s === "UGB CA") return "CA";
    if (s === "UGB GA") return "GA";
    if (s === "UGB SC") return "SC";
    if (s === "UGB IG") return "IG";
    return null;
  }

  // Se todos os registros compartilham o mesmo valor em `campo`, devolve
  // esse valor; senão devolve "" (fica em branco no formulário pra
  // preencher à mão — ex.: lista com colaboradores de treinamentos
  // diferentes não tem um "Instrutor" único pra estampar).
  function valorUniforme(lista, campo) {
    const valores = [...new Set(lista.map((r) => r[campo]).filter(Boolean))];
    return valores.length === 1 ? valores[0] : "";
  }

  // Gera e imprime a LPT (Lista de Presença de Treinamento — FORM 05-01/11.1)
  // preenchida com os nomes dos colaboradores da lista filtrada, deixando a
  // coluna de assinatura em branco. Segue o mesmo padrão de exportação em
  // PDF do repositório irmão (window.print() sobre uma folha estilizada só
  // pra impressão) — sem gerar o PDF binário, o navegador cuida disso via
  // "Salvar como PDF" na caixa de impressão.
  function exportarLPT(lista) {
    if (!lista || !lista.length) {
      alert("Nenhum registro para exportar com os filtros atuais.");
      return;
    }
    const treinamento = valorUniforme(lista, "NomeTreinamento");
    const instrutor = valorUniforme(lista, "Instrutor");
    const ga = valorUniforme(lista, "GA_Colaborador");
    const supervisor = valorUniforme(lista, "NomeLider");
    const dataTreinamento = valorUniforme(lista, "DataTreinamento");

    const nomes = [...new Set(lista.map((r) => r.NomeColaborador).filter(Boolean))]
      .sort((a, b) => a.localeCompare(b, "pt-BR"));

    const linhas = nomes.map((nome, i) => `
      <tr><td class="lpt-num">${i + 1}</td><td>${nome}</td><td class="lpt-assinatura"></td></tr>
    `).join("");

    const html = `
      <div class="lpt-sheet">
        <div class="lpt-title">LPT<br>(LISTA DE PRESENÇA DE TREINAMENTO)</div>
        <div class="lpt-fields">
          <div class="lpt-field-row">
            <div class="lpt-field"><b>TREINAMENTO:</b> ${treinamento}</div>
            <div class="lpt-field"><b>SUPERVISOR:</b> ${supervisor}</div>
          </div>
          <div class="lpt-field-row">
            <div class="lpt-field"><b>INSTRUTOR:</b> ${instrutor}</div>
            <div class="lpt-field"><b>REVISÃO:</b></div>
          </div>
          <div class="lpt-field-row">
            <div class="lpt-field"><b>HORÁRIO DE INÍCIO:</b></div>
            <div class="lpt-field"><b>LOCAL:</b></div>
          </div>
          <div class="lpt-field-row">
            <div class="lpt-field"><b>GA:</b> ${ga}</div>
            <div class="lpt-field"><b>HORÁRIO DE ALMOÇO:</b></div>
          </div>
          <div class="lpt-field-row">
            <div class="lpt-field"><b>HORÁRIO FINAL:</b></div>
            <div class="lpt-field"><b>DATA:</b> ${dataTreinamento ? fmtDate(dataTreinamento) : ""}</div>
          </div>
          <div class="lpt-field-row">
            <div class="lpt-field lpt-field-full"><b>OBJETIVO:</b></div>
          </div>
        </div>
        <div class="lpt-note">
          <div>Para diretos, preencher por extenso com o nome do colaborador.</div>
          <div>Pedir para o colaborador assinar nesse campo.</div>
        </div>
        <table class="lpt-table">
          <thead><tr><th style="width:28px;">Nº</th><th>NOME</th><th>ASSINATURA</th></tr></thead>
          <tbody>${linhas}</tbody>
        </table>
        <div class="lpt-footer">FORM. 05-01/11.1</div>
      </div>`;

    let container = document.getElementById("lpt-print");
    if (!container) {
      container = document.createElement("div");
      container.id = "lpt-print";
      container.className = "lpt-print";
      document.body.appendChild(container);
    }
    container.innerHTML = html;
    window.print();
  }

  return {
    NAV_ITEMS, STATUS_ORDER, STATUS_CHIP, STATUS_COLOR_VAR, STATUS_PRIORIDADE,
    applyStoredTheme, wireThemeToggle, renderShell, initials,
    loadTreinamentos, loadTreinamentosFiltrados, getUgbAtiva, setUgbAtiva, limparUgbAtiva,
    fmtInt, fmtPct, fmtDate, statusChip, diasAte, popularFiltro, exportarLPT, calcularPercentuais,
    CATEGORIAS_CARGO, categoriaCargo, normalizarNome, ugbPorSetorQuadro, carregarNomesAtivos,
    carregarColaboradoresAtivos,
  };
})();

MT.applyStoredTheme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
