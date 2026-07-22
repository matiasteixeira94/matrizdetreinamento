// Primitivas de gráfico em SVG puro (sem dependências externas). Mesmo
// motor usado no repositório irmão "Gestão da Produção" — barras verticais
// agrupadas, barras + linha de evolução e barras horizontais (ranking).
"use strict";

const MTCharts = (() => {
  const NS = "http://www.w3.org/2000/svg";
  const el = (tag, attrs = {}) => {
    const node = document.createElementNS(NS, tag);
    for (const [k, v] of Object.entries(attrs)) node.setAttribute(k, v);
    return node;
  };

  function ensureTooltip(host) {
    let tip = host.querySelector(".mt-tooltip");
    if (!tip) {
      tip = document.createElement("div");
      tip.className = "mt-tooltip";
      tip.setAttribute("role", "tooltip");
      host.style.position = "relative";
      host.appendChild(tip);
    }
    return tip;
  }

  function showTip(host, tip, xPx, yPx, html) {
    tip.innerHTML = html;
    tip.style.opacity = "1";
    const hostRect = host.getBoundingClientRect();
    let left = xPx + 14, top = yPx - 10;
    if (left + 170 > hostRect.width) left = xPx - 170 - 14;
    tip.style.left = `${left}px`;
    tip.style.top = `${Math.max(0, top)}px`;
  }
  function hideTip(tip) { tip.style.opacity = "0"; }

  /* ---------------- Barras verticais empilhadas (composição por categoria) ---------------- */
  function stackedBars(host, { categories, series, height = 260, yFormat = (v) => v }) {
    host.innerHTML = "";
    const tip = ensureTooltip(host);
    const width = host.clientWidth || 640;
    const pad = { t: 16, r: 12, b: 46, l: 40 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const totals = categories.map((_, ci) => series.reduce((a, s) => a + (s.values[ci] || 0), 0));
    const max = Math.max(...totals, 1) * 1.12;
    const yScale = (v) => pad.t + innerH - (v / max) * innerH;

    const groupW = innerW / categories.length;
    const barW = Math.min(52, groupW * 0.62);

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, role: "img" });
    const ticks = 4;
    let lastYLabel = null;
    for (let i = 0; i <= ticks; i++) {
      const v = (max * i) / ticks;
      const y = yScale(v);
      svg.appendChild(el("line", { x1: pad.l, x2: width - pad.r, y1: y, y2: y, stroke: "var(--chart-grid)", "stroke-width": 1 }));
      const label = yFormat(v);
      if (label === lastYLabel) continue;
      lastYLabel = label;
      const t = el("text", { x: pad.l - 8, y: y + 3, "text-anchor": "end", class: "mt-axis-label" });
      t.textContent = label;
      svg.appendChild(t);
    }

    const passo = Math.max(1, Math.ceil((categories.length * 40) / innerW));
    categories.forEach((cat, ci) => {
      const cx = pad.l + ci * groupW + groupW / 2;
      let acc = 0;
      series.forEach((s) => {
        const v = s.values[ci] || 0;
        if (v <= 0) return;
        const yTop = yScale(acc + v);
        const yBottom = yScale(acc);
        const rect = el("rect", { x: cx - barW / 2, y: yTop, width: barW, height: Math.max(0, yBottom - yTop), fill: s.color, class: "mt-bar" });
        rect.addEventListener("mousemove", (e) => {
          const rect2 = svg.getBoundingClientRect();
          showTip(host, tip, (e.clientX - rect2.left) * (width / rect2.width), yTop,
            `<div class="mt-tip-head">${cat}</div><div class="mt-tip-row"><span class="mt-tip-dot" style="background:${s.color}"></span>${s.name}<b>${yFormat(v)}</b></div>`);
        });
        rect.addEventListener("mouseleave", () => hideTip(tip));
        svg.appendChild(rect);
        acc += v;
      });
      if (ci % passo === 0) {
        const t = el("text", { x: cx, y: height - 10, "text-anchor": "middle", class: "mt-axis-label" });
        t.textContent = cat;
        svg.appendChild(t);
      }
    });

    host.appendChild(svg);
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.style.marginTop = "8px";
    legend.innerHTML = series.map((s) => `<span class="tag-dot" style="color:${s.color}">${s.name}</span>`).join("");
    host.appendChild(legend);
  }

  /* ---------------- Barras + linha de evolução (sequência categórica) ---------------- */
  function barsLine(host, { items, height = 240, yFormat = (v) => v, lineColor = "var(--gold)", tooltipLabel = "Valor", legendLabel = "Evolução", onClick = null }) {
    host.innerHTML = "";
    const tip = ensureTooltip(host);
    const width = host.clientWidth || 640;
    const pad = { t: 20, r: 16, b: 34, l: 44 };
    const innerW = width - pad.l - pad.r;
    const innerH = height - pad.t - pad.b;
    const values = items.map((it) => it.value);
    const min = Math.min(0, Math.min(...values));
    const max = Math.max(...values, 1) * 1.12;
    const yScale = (v) => pad.t + innerH - ((v - min) / (max - min)) * innerH;

    const groupW = innerW / items.length;
    const barW = Math.min(64, groupW * 0.46);

    const svg = el("svg", { viewBox: `0 0 ${width} ${height}`, width: "100%", height, role: "img" });
    const ticks = 4;
    let lastYLabel = null;
    for (let i = 0; i <= ticks; i++) {
      const v = min + ((max - min) * i) / ticks;
      const y = yScale(v);
      svg.appendChild(el("line", { x1: pad.l, x2: width - pad.r, y1: y, y2: y, stroke: "var(--chart-grid)", "stroke-width": 1 }));
      const label = yFormat(v);
      if (label === lastYLabel) continue;
      lastYLabel = label;
      const t = el("text", { x: pad.l - 8, y: y + 3, "text-anchor": "end", class: "mt-axis-label" });
      t.textContent = label;
      svg.appendChild(t);
    }

    const passo = Math.max(1, Math.ceil((items.length * 34) / innerW));

    const pontos = [];
    items.forEach((it, i) => {
      const cx = pad.l + i * groupW + groupW / 2;
      const y = yScale(it.value);
      const barX = cx - barW / 2;
      const h = pad.t + innerH - y;
      const rect = el("rect", { x: barX, y, width: barW, height: Math.max(0, h), rx: 4, fill: it.color || "var(--accent)", class: "mt-bar" });
      rect.addEventListener("mousemove", (e) => {
        const rect2 = svg.getBoundingClientRect();
        showTip(host, tip, (e.clientX - rect2.left) * (width / rect2.width), y,
          `<div class="mt-tip-head">${it.label}</div><div class="mt-tip-row"><span class="mt-tip-dot" style="background:${it.color || "var(--accent)"}"></span>${tooltipLabel}<b>${yFormat(it.value)}</b></div>`);
      });
      rect.addEventListener("mouseleave", () => hideTip(tip));
      if (onClick) { rect.style.cursor = "pointer"; rect.addEventListener("click", () => onClick(it, i)); }
      svg.appendChild(rect);
      if (i % passo === 0) {
        const t = el("text", { x: cx, y: height - 10, "text-anchor": "middle", class: "mt-axis-label" });
        t.textContent = it.label;
        svg.appendChild(t);
      }
      pontos.push([cx, y]);
    });

    svg.appendChild(el("polyline", {
      points: pontos.map(([x, y]) => `${x},${y}`).join(" "),
      fill: "none", stroke: lineColor, "stroke-width": 2.5,
      "stroke-linecap": "round", "stroke-linejoin": "round",
      "pointer-events": "none",
    }));
    pontos.forEach(([x, y], i) => {
      svg.appendChild(el("circle", { cx: x, cy: y, r: 5, fill: lineColor, stroke: "var(--surface-raised)", "stroke-width": 2, "pointer-events": "none" }));
      const label = el("text", { x, y: y - 12, "text-anchor": "middle", class: "mt-axis-label", style: "font-weight:700;", "pointer-events": "none" });
      label.textContent = yFormat(items[i].value);
      svg.appendChild(label);
    });

    host.appendChild(svg);
    const legend = document.createElement("div");
    legend.className = "legend";
    legend.style.marginTop = "8px";
    legend.innerHTML = `<span class="tag-dot" style="color:${lineColor}">${legendLabel}</span>`;
    host.appendChild(legend);
  }

  /* ---------------- Barras horizontais (ranking / progresso) ---------------- */
  function hbars(host, { items, valueFormat = (v) => v, showTarget = true, onClick = null }) {
    host.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.style.display = "flex"; wrap.style.flexDirection = "column"; wrap.style.gap = "12px";
    const max = Math.max(...items.map((i) => Math.max(i.value, i.target || 0)), 1);
    items.forEach((item) => {
      const row = document.createElement("div");
      const pct = Math.min(100, (item.value / max) * 100);
      const targetPct = item.target ? Math.min(100, (item.target / max) * 100) : null;
      row.style.cursor = onClick ? "pointer" : "default";
      row.innerHTML = `
        <div style="display:flex; justify-content:space-between; font-size:12.5px; margin-bottom:4px;">
          <span style="font-weight:600;">${item.label}</span>
          <span class="footnote" style="font-family:var(--font-mono);">${valueFormat(item.value)}${item.target ? ` / meta ${valueFormat(item.target)}` : ""}</span>
        </div>
        <div class="bar-track" style="position:relative;">
          <div class="bar-fill" style="width:${pct}%; background:${item.color || "var(--accent)"};"></div>
          ${targetPct !== null && showTarget ? `<div style="position:absolute; top:-3px; left:${targetPct}%; width:2px; height:14px; background:var(--ink);"></div>` : ""}
        </div>`;
      if (onClick) row.addEventListener("click", () => onClick(item));
      wrap.appendChild(row);
    });
    host.appendChild(wrap);
  }

  return { stackedBars, hbars, barsLine };
})();
