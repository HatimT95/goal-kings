/* ==========================================================
   The Goal Kings - app logic (vanilla JS, no dependencies)
   All data comes from players.json. Edit that file to update the site.
   ========================================================== */
(function () {
  "use strict";

  const RING_C = 2 * Math.PI * 94; // circumference of the progress ring
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const $ = (id) => document.getElementById(id);
  const fmt = (n) => (typeof n === "number" ? n.toLocaleString("en-US") : "–");

  const state = { data: null, players: [], status: "all", range: 100, sort: "rank", q: "", trackerId: null, lastFocus: null };

  /* ---------- Helpers ---------- */
  function el(tag, props, children) {
    const node = document.createElement(tag);
    if (props) {
      for (const k in props) {
        if (k === "class") node.className = props[k];
        else if (k === "text") node.textContent = props[k];
        else if (k === "style") node.style.cssText = props[k];
        else if (k.startsWith("on")) node.addEventListener(k.slice(2), props[k]);
        else node.setAttribute(k, props[k]);
      }
    }
    (children || []).forEach((c) => c && node.append(c));
    return node;
  }

  function norm(s) {
    return String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
  }

  function goalsLabel(p) {
    const base = fmt(p.totalGoals);
    if (p.totalIsApprox) return "~" + base;
    if (p.totalIsMinimum) return base + "+";
    return base;
  }

  function flag(code) {
    if (!code) return null;
    const img = el("img", {
      class: "flag", alt: "", loading: "lazy", width: "18", height: "13",
      src: "https://flagcdn.com/w40/" + encodeURIComponent(code) + ".png",
    });
    img.addEventListener("error", () => img.remove());
    return img;
  }

  function animateNumber(node, to, ms) {
    if (reduceMotion || !isFinite(to)) { node.textContent = fmt(to); return; }
    const start = performance.now();
    function tick(now) {
      const t = Math.min(1, (now - start) / ms);
      const eased = 1 - Math.pow(1 - t, 3);
      node.textContent = fmt(Math.round(to * eased));
      if (t < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  function qualityBadge(q) {
    if (q === "disputed") return el("span", { class: "badge-q disputed", text: "Disputed" });
    if (q === "estimate") return el("span", { class: "badge-q estimate", text: "Estimate" });
    return null;
  }

  /* ---------- Load ---------- */
  async function load() {
    try {
      const res = await fetch("players.json?v=" + Date.now(), { cache: "no-store" });
      if (!res.ok) throw new Error("HTTP " + res.status);
      const data = await res.json();
      if (!data || !Array.isArray(data.players)) throw new Error("players.json has no 'players' array");
      state.data = data;
      state.players = data.players;
      init();
    } catch (err) {
      console.error(err);
      const grid = $("grid");
      grid.replaceChildren(
        el("div", { class: "load-error" }, [
          el("strong", { text: "Could not load players.json. " }),
          document.createTextNode(
            "If you opened index.html straight from your disk, browsers block this. Run a local server (python3 -m http.server) or deploy to GitHub Pages. Details: " + err.message
          ),
        ])
      );
    }
  }

  function init() {
    const d = state.data;
    if (d.meta) {
      if (d.meta.title) document.title = d.meta.title;
      $("disclaimer").textContent = d.meta.disclaimer || "";
      $("dataAsOf").textContent = d.meta.dataAsOf ? "Data as of: " + d.meta.dataAsOf : "";
      $("lastUpdated").textContent = d.meta.lastUpdated ? "Last updated " + d.meta.lastUpdated : "";
      const ul = $("sources");
      ul.replaceChildren();
      (d.meta.sources || []).forEach((s) => {
        const a = el("a", { href: s.url, target: "_blank", rel: "noopener noreferrer", text: s.label });
        ul.append(el("li", null, [a]));
      });
    }
    state.trackerId = (d.tracker && d.tracker.playerId) || (state.players[0] && state.players[0].id);
    renderHeroStats();
    renderLegendTabs();
    renderTracker(true);
    bindToolbar();
    renderGrid();
    bindModal();
    openFromHash();
  }

  /* ---------- Hero stats ---------- */
  function renderHeroStats() {
    const active = state.players.filter((p) => p.status === "Active").length;
    const top = state.players[0];
    const stats = [
      [String(state.players.length), "Players"],
      [String(active), "Still active"],
      [top ? fmt(top.totalGoals) : "–", "Record goals"],
    ];
    $("heroStats").replaceChildren(
      ...stats.map(([n, l]) => el("div", { class: "hero-stat" }, [el("b", { text: n }), el("span", { text: l })]))
    );
  }

  /* ---------- Tracker ---------- */
  function legends() {
    const t = state.data.tracker || {};
    return state.players
      .filter((p) => p.status === "Active" && (p.basis === "top-level" || p.id === t.playerId))
      .sort((a, b) => b.totalGoals - a.totalGoals)
      .slice(0, 6);
  }

  function renderLegendTabs() {
    const wrap = $("legendTabs");
    wrap.replaceChildren();
    legends().forEach((p) => {
      const first = p.name.split(" ").slice(-1)[0];
      const b = el("button", {
        class: "legend-tab", type: "button", role: "tab",
        "aria-selected": String(p.id === state.trackerId), "data-id": p.id, text: first,
      });
      b.addEventListener("click", () => { state.trackerId = p.id; renderLegendTabs(); renderTracker(false); });
      wrap.append(b);
    });
  }

  function renderTracker(first) {
    const t = state.data.tracker || {};
    const target = t.target || 1000;
    const p = state.players.find((x) => x.id === state.trackerId) || state.players[0];
    if (!p) return;
    const goals = p.totalGoals;
    const remaining = Math.max(0, target - goals);
    const pct = Math.min(1, goals / target);

    $("trackerName").textContent = p.name;
    animateNumber($("ringNumber"), goals, first ? 1600 : 900);
    $("ringPct").textContent = (pct * 100).toFixed(1) + "% of " + fmt(target);

    const bar = $("ringBar");
    bar.style.strokeDasharray = RING_C.toFixed(2);
    // start from empty so the glow sweep animates every time the legend changes
    bar.style.transition = "none";
    bar.style.strokeDashoffset = RING_C.toFixed(2);
    void bar.getBoundingClientRect();
    bar.style.transition = "";
    requestAnimationFrame(() => { bar.style.strokeDashoffset = (RING_C * (1 - pct)).toFixed(2); });
    $("progressFill").style.width = (pct * 100).toFixed(2) + "%";

    $("cdRemaining").textContent = fmt(remaining);

    const isMain = p.id === t.playerId;
    const gpm = t.goalsPerMatch || p.goalsPerMatch;
    if (remaining === 0) {
      $("cdMatches").textContent = "Done";
      $("cdDate").textContent = "🏆";
    } else if (isMain && gpm && t.matchesPerMonth) {
      const matches = Math.ceil(remaining / gpm);
      const months = matches / t.matchesPerMonth;
      const base = t.asOf ? new Date(t.asOf + "T00:00:00") : new Date();
      const eta = new Date(base.getTime() + months * 30.44 * 86400000);
      $("cdMatches").textContent = "~" + fmt(matches);
      $("cdDate").textContent = eta.toLocaleDateString("en-GB", { month: "short", year: "numeric" });
    } else {
      const rate = p.matches ? p.totalGoals / p.matches : 0.7;
      $("cdMatches").textContent = "~" + fmt(Math.ceil(remaining / rate));
      $("cdDate").textContent = "N/A";
    }

    const foot = isMain
      ? (t.asOf ? "Official count as of " + t.asOf + ". " : "") + (t.projectionNote || "")
      : p.name + " would need " + fmt(remaining) + " more goals. A date isn't projected for players without a set fixture pace.";
    $("trackerFoot").textContent = foot;
  }

  /* ---------- Toolbar ---------- */
  function bindToolbar() {
    let timer;
    $("search").addEventListener("input", (e) => {
      clearTimeout(timer);
      timer = setTimeout(() => { state.q = e.target.value; renderGrid(); }, 80);
    });
    $("statusChips").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-status]"); if (!b) return;
      state.status = b.dataset.status; setOn("statusChips", b); renderGrid();
    });
    $("rangeChips").addEventListener("click", (e) => {
      const b = e.target.closest("button[data-range]"); if (!b) return;
      state.range = Number(b.dataset.range); setOn("rangeChips", b); renderGrid();
    });
    $("sort").addEventListener("change", (e) => { state.sort = e.target.value; renderGrid(); });
    $("resetFilters").addEventListener("click", () => {
      state.q = ""; state.status = "all"; state.range = 100; state.sort = "rank";
      $("search").value = ""; $("sort").value = "rank";
      setOn("statusChips", document.querySelector('#statusChips [data-status="all"]'));
      setOn("rangeChips", document.querySelector('#rangeChips [data-range="100"]'));
      renderGrid();
    });
  }
  function setOn(groupId, btn) {
    $(groupId).querySelectorAll(".chip").forEach((c) => c.classList.toggle("is-on", c === btn));
  }

  /* ---------- Grid ---------- */
  function filtered() {
    const q = norm(state.q.trim());
    let list = state.players.filter((p) => {
      if (p.rank > state.range) return false;
      if (state.status !== "all" && p.status !== state.status) return false;
      if (q && !(norm(p.name).includes(q) || norm(p.nationality).includes(q))) return false;
      return true;
    });
    const s = state.sort;
    list = list.slice().sort((a, b) => {
      if (s === "goals") return b.totalGoals - a.totalGoals;
      if (s === "name") return a.name.localeCompare(b.name);
      if (s === "assists") return (b.assists ?? -1) - (a.assists ?? -1);
      return a.rank - b.rank;
    });
    return list;
  }

  let observer;
  function renderGrid() {
    const list = filtered();
    const grid = $("grid");
    grid.replaceChildren();
    $("empty").hidden = list.length > 0;
    $("resultCount").textContent = list.length + (list.length === 1 ? " player" : " players");

    const max = Math.max(1, ...state.players.map((p) => p.totalGoals));
    if (observer) observer.disconnect();
    observer = new IntersectionObserver((entries) => {
      entries.forEach((en) => {
        if (en.isIntersecting) {
          en.target.classList.add("in");
          const fill = en.target.querySelector(".mini-bar i");
          if (fill) fill.style.width = fill.dataset.w;
          observer.unobserve(en.target);
        }
      });
    }, { rootMargin: "0px 0px -40px 0px" });

    list.forEach((p, i) => {
      const rankCls = p.rank <= 3 && state.sort === "rank" ? " r" + p.rank : "";
      const card = el("button", {
        class: "card" + (p.rank === 1 ? " rank-1" : ""), type: "button",
        "data-id": p.id, "aria-label": p.name + ", rank " + p.rank + ", " + goalsLabel(p) + " goals. Open details.",
        style: "--d:" + Math.min(i % 12, 11) * 0.04 + "s",
      }, [
        el("div", { class: "card-top" }, [
          el("div", { class: "rank" + rankCls, text: "#" + p.rank }),
          el("div", { class: "card-name" }, [
            el("h3", { text: p.name }),
            el("div", { class: "nat" }, [flag(p.countryCode), el("span", { text: p.nationality })]),
          ]),
        ]),
        el("div", { class: "card-goals" }, [
          el("div", null, [el("span", { class: "goals-num", text: goalsLabel(p) }), el("span", { class: "goals-lbl", text: "goals" })]),
          el("span", { class: "pill " + p.status.toLowerCase(), text: p.status }),
        ]),
        el("div", { class: "mini-bar" }, [el("i", { "data-w": ((p.totalGoals / max) * 100).toFixed(1) + "%" })]),
        el("div", { class: "card-meta" }, [
          el("span", { text: p.assists != null ? fmt(p.assists) + " assists" : p.span }),
          qualityBadge(p.dataQuality) || el("span", { text: p.span }),
        ]),
      ]);
      card.addEventListener("click", () => openModal(p.id));
      grid.append(card);
      observer.observe(card);
    });
  }

  /* ---------- Modal ---------- */
  function bindModal() {
    const dlg = $("modal");
    $("modalClose").addEventListener("click", closeModal);
    dlg.addEventListener("click", (e) => { if (e.target === dlg) closeModal(); }); // backdrop click
    dlg.addEventListener("cancel", (e) => { e.preventDefault(); closeModal(); });
    window.addEventListener("hashchange", openFromHash);
  }

  function openFromHash() {
    const m = location.hash.match(/^#player=(.+)$/);
    if (m) {
      const id = decodeURIComponent(m[1]);
      if (state.players.some((p) => p.id === id)) openModal(id, true);
    }
  }

  function bar(label, value, max, blue) {
    const w = max > 0 ? (value / max) * 100 : 0;
    return el("div", { class: "bar-row" }, [
      el("div", { class: "bar-top" }, [el("span", { text: label }), el("b", { text: fmt(value) })]),
      el("div", { class: "bar-track" }, [el("i", { class: blue ? "blue" : "", "data-w": w.toFixed(1) + "%" })]),
    ]);
  }

  function openModal(id, fromHash) {
    const p = state.players.find((x) => x.id === id);
    if (!p) return;
    const dlg = $("modal");
    state.lastFocus = document.activeElement;

    const body = $("modalBody");
    body.replaceChildren();

    // header
    const rankCls = p.rank <= 3 ? " r" + p.rank : "";
    body.append(
      el("div", { class: "m-head" }, [
        el("div", { class: "rank" + rankCls, text: "#" + p.rank, style: "height:52px;min-width:52px;font-size:1.3rem" }),
        el("div", null, [
          el("h2", { id: "mName", text: p.name }),
          el("div", { class: "m-sub" }, [
            flag(p.countryCode), el("span", { text: p.nationality }), el("span", { text: "·" }), el("span", { text: p.span }),
            el("span", { class: "pill " + p.status.toLowerCase(), text: p.status }), qualityBadge(p.dataQuality),
          ]),
        ]),
      ])
    );

    // key stats
    const stats = [
      [goalsLabel(p), "Total goals"],
      [p.clubGoals != null ? fmt(p.clubGoals) : "–", "Club goals"],
      [p.nationalGoals != null ? fmt(p.nationalGoals) : "–", "National team"],
      [p.assists != null ? fmt(p.assists) : "–", "Assists"],
    ];
    body.append(el("div", { class: "m-grid" }, stats.map(([n, l]) => el("div", { class: "m-stat" }, [el("b", { text: n }), el("span", { text: l })]))));

    const donutPairs = [];

    if (p.breakdown && p.clubGoals != null && p.nationalGoals != null) {
      // club vs country donut
      const total = p.clubGoals + p.nationalGoals;
      const C = 2 * Math.PI * 64;
      const clubLen = total ? (p.clubGoals / total) * C : 0;
      const natLen = total ? (p.nationalGoals / total) * C : 0;
      const svgNS = "http://www.w3.org/2000/svg";
      const svg = document.createElementNS(svgNS, "svg");
      svg.setAttribute("viewBox", "0 0 160 160"); svg.setAttribute("class", "donut");
      svg.setAttribute("role", "img");
      svg.setAttribute("aria-label", "Club goals " + p.clubGoals + ", national team goals " + p.nationalGoals);
      const mk = (cls) => { const c = document.createElementNS(svgNS, "circle"); c.setAttribute("cx", 80); c.setAttribute("cy", 80); c.setAttribute("r", 64); c.setAttribute("class", cls); return c; };
      const bg = mk("d-bg"), club = mk("d-club"), nat = mk("d-nat");
      [club, nat].forEach((c) => c.setAttribute("transform", "rotate(-90 80 80)"));
      club.setAttribute("stroke-dasharray", "0 " + C);
      nat.setAttribute("stroke-dasharray", "0 " + C);
      nat.setAttribute("stroke-dashoffset", String(-clubLen));
      svg.append(bg, club, nat);
      donutPairs.push([club, clubLen, C], [nat, natLen, C]);

      body.append(
        el("section", { class: "m-sec" }, [
          el("h3", { text: "Club vs country" }),
          el("div", { class: "split" }, [
            el("div", { class: "donut-wrap" }, [svg, el("div", { class: "donut-center" }, [el("b", { text: fmt(total) }), el("span", { text: "goals" })])]),
            el("div", { class: "legend" }, [
              el("div", null, [el("i", { style: "background:var(--gold)" }), el("span", { text: "Club" }), el("b", { text: fmt(p.clubGoals) + " (" + Math.round((p.clubGoals / total) * 100) + "%)" })]),
              el("div", null, [el("i", { style: "background:var(--blue)" }), el("span", { text: "National team" }), el("b", { text: fmt(p.nationalGoals) + " (" + Math.round((p.nationalGoals / total) * 100) + "%)" })]),
            ]),
          ]),
        ])
      );

      // competition bars
      const b = p.breakdown;
      const rows = [
        ["Domestic leagues", b.league, false],
        ["Domestic cups", b.cup, false],
        ["Continental club competitions", b.continental, false],
        ["National team (all matches)", b.national, true],
      ].filter((r) => typeof r[1] === "number");
      const max = Math.max(1, ...rows.map((r) => r[1]));
      body.append(el("section", { class: "m-sec" }, [el("h3", { text: "Goals by competition type" }), el("div", { class: "bars" }, rows.map((r) => bar(r[0], r[1], max, r[2])))]));
    } else {
      body.append(
        el("section", { class: "m-sec" }, [
          el("h3", { text: "Goal breakdown" }),
          el("p", { class: "no-detail", text: "A club/country split and competition breakdown isn't available for this player in the current data. Add it in players.json (breakdown, clubGoals, nationalGoals) to show charts here." }),
        ])
      );
    }

    // tournaments
    if (Array.isArray(p.tournaments) && p.tournaments.length) {
      const max = Math.max(1, ...p.tournaments.map((t) => t.goals));
      body.append(el("section", { class: "m-sec" }, [el("h3", { text: "Tournament goals" }), el("div", { class: "bars" }, p.tournaments.map((t) => bar(t.label, t.goals, max, false)))]));
    }

    // alternative totals
    const alt = p.altTotals && Object.keys(p.altTotals).length ? p.altTotals : null;
    if (alt) {
      const tbody = el("tbody");
      Object.keys(alt).forEach((k) => tbody.append(el("tr", null, [el("td", { text: k }), el("td", { text: alt[k] })])));
      body.append(el("section", { class: "m-sec" }, [el("h3", { text: "Other published totals" }), el("table", { class: "alt-table" }, [tbody])]));
    }

    if (p.matches) body.append(el("p", { class: "src", text: fmt(p.matches) + " official matches · " + (p.totalGoals / p.matches).toFixed(2) + " goals per match" }));
    if (p.notes) body.append(el("div", { class: "note" + (p.dataQuality === "estimate" ? " warn" : ""), text: p.notes, style: "margin-top:20px" }));
    if (p.source) body.append(el("p", { class: "src", text: "Source: " + p.source }));

    if (!dlg.open) dlg.showModal();
    $("modalPanel").scrollTop = 0;
    if (!fromHash) history.replaceState(null, "", "#player=" + encodeURIComponent(id));

    // kick off bar + donut animations
    requestAnimationFrame(() => requestAnimationFrame(() => {
      body.querySelectorAll(".bar-track i").forEach((i) => { i.style.width = i.dataset.w; });
      donutPairs.forEach(([c, len, C]) => c.setAttribute("stroke-dasharray", len.toFixed(2) + " " + (C - len).toFixed(2)));
    }));
    $("modalClose").focus({ preventScroll: true });
  }

  function closeModal() {
    const dlg = $("modal");
    if (dlg.open) dlg.close();
    if (location.hash.startsWith("#player=")) history.replaceState(null, "", location.pathname + location.search);
    if (state.lastFocus && state.lastFocus.focus) state.lastFocus.focus({ preventScroll: true });
  }

  load();
})();
