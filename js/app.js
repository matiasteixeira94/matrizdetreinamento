// Núcleo compartilhado: shell (sidebar/topbar), tema e utilidades de
// dados/formatação usadas por todas as páginas. Sem autenticação por
// enquanto — plataforma de uso interno, tela de login fica para uma
// próxima etapa.
"use strict";

const MT = (() => {
  const THEME_KEY = "mt_theme";

  const NAV_ICONS = {
    dashboard: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>',
    colaboradores: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
    treinamentos: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2Z"/></svg>',
    pendencias: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 7v6l4 2"/></svg>',
    equipes: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>',
  };

  const NAV_ITEMS = [
    { key: "dashboard", href: "index.html", label: "Visão Geral" },
    { key: "colaboradores", href: "colaboradores.html", label: "Colaboradores" },
    { key: "treinamentos", href: "treinamentos.html", label: "Treinamentos" },
    { key: "pendencias", href: "pendencias.html", label: "Pendências" },
    { key: "equipes", href: "equipes.html", label: "Equipes" },
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

  function renderShell({ activeKey, eyebrow, title, actionsHtml }) {
    const mount = document.getElementById("mt-shell");
    if (!mount) return;

    const navHtml = NAV_ITEMS.map((item) => `
      <a class="nav-link" href="${item.href}" ${item.key === activeKey ? 'aria-current="page"' : ""}>
        ${NAV_ICONS[item.key]}<span>${item.label}</span>
      </a>`).join("");

    mount.innerHTML = `
      <div class="mobile-topbar">
        <button class="mobile-topbar-toggle" id="mt-sidebar-toggle" type="button" aria-label="Abrir menu" aria-expanded="false">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M3 12h18M3 18h18"/></svg>
        </button>
        <a class="mobile-topbar-brand" href="index.html">
          <div class="brand-mark" style="width:26px;height:26px;"><img src="assets/images/logo-viana-moura.png" alt="" /></div>
          <span>Matriz de Treinamento</span>
        </a>
      </div>
      <div class="sidebar-backdrop" id="mt-sidebar-backdrop"></div>
      <aside class="sidebar" id="mt-sidebar">
        <a class="brand" href="index.html" title="Ir para a Visão Geral">
          <div class="brand-mark"><img src="assets/images/logo-viana-moura.png" alt="" /></div>
          <div class="brand-word">Matriz de Treinamento<small>Viana &amp; Moura Construções</small></div>
        </a>
        <nav class="nav-group">
          <div class="nav-label">Monitoramento</div>
          ${navHtml}
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
          <div class="topbar-actions">${actionsHtml ?? ""}</div>
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

  return {
    NAV_ITEMS, STATUS_ORDER, STATUS_CHIP, STATUS_COLOR_VAR, STATUS_PRIORIDADE,
    applyStoredTheme, wireThemeToggle, renderShell, initials,
    loadTreinamentos, fmtInt, fmtPct, fmtDate, statusChip, diasAte, popularFiltro,
  };
})();

MT.applyStoredTheme();

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("sw.js").catch(() => {});
  });
}
