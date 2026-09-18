/*
 * site-render.js — 前后台一体化渲染（渐进增强）
 * ==============================================
 * 前台页面保持硬编码 HTML（无 JS / 无数据时完全可用）。
 * 本脚本加载数据后，用其「重建」各列表容器（publications/journey/cv/honors/media/projects）。
 *
 * 数据源优先级：
 *   1) <同源>/api/site-data.json                  （admin server 实时网关，端口自适应）
 *   2) assets/site-data.json                       （静态兜底，同源）
 *   3) 都没有 → 保持页面硬编码内容
 *
 * 所有渲染使用 DOM API + textContent，避免注入；class 名与硬编码保持一致，
 * 既有 CSS 零改动。null-guard：容器不存在时静默跳过。
 */
(function () {
  "use strict";

  var ADMIN = location.origin;  // 同源：随部署端口自适应（8788 / 9000 等）

  function loadData() {
    // 预注入数据优先（服务端渲染 / 测试注入场景）
    if (window.__SITE_DATA__) {
      return Promise.resolve(window.__SITE_DATA__);
    }
    // 优先实时网关；失败回退静态文件
    function fetchJSON(url) {
      return fetch(url, { cache: "no-store" }).then(function (r) {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      });
    }
    return fetchJSON(ADMIN + "/api/site-data.json").catch(function () {
      return fetchJSON("assets/site-data.json");
    });
  }

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  function esc(s) { return s == null ? "" : String(s); }

  // ---------- publications.html：5 类成果重建 ----------
  function renderPublications(d) {
    if (!d.publications || !d.publications.length) return;
    var CATS = {
      "cat-publication": "publication", "cat-patent": "patent",
      "cat-software": "software", "cat-book": "book", "cat-standard": "standard",
    };
    var TYPE_ZH = { publication: "论文", patent: "专利", software: "软著", book: "著作", standard: "标准" };
    Object.keys(CATS).forEach(function (secId) {
      var sec = document.getElementById(secId);
      if (!sec) return;
      var box = sec.querySelector(".container");
      if (!box) return;
      var type = CATS[secId];
      var items = d.publications.filter(function (p) {
        return (p.type || "publication") === type || (p.category || "") === secId;
      });
      if (!items.length) return;
      // 渐进增强：静态页面已含真实 article（导入时生成），直接保留并仅同步计数，
      // 避免「清空重建」在重建后不跑 prepare / 中途出错时导致内容丢失变空白。
      if (box.querySelectorAll("article.pub").length) {
        var h2s = box.querySelector("h2");
        if (h2s) h2s.textContent = h2s.textContent.replace(/（\d+）/, "（" + items.length + "）");
        return;
      }
      // 仅当静态内容缺失时才用数据重建
      Array.prototype.forEach.call(box.querySelectorAll("article.pub"), function (n) { n.remove(); });
      // 更新 h2 计数
      var h2 = box.querySelector("h2");
      if (h2) h2.textContent = h2.textContent.replace(/（\d+）/, "（" + items.length + "）");
      items.forEach(function (p, i) {
        var art = el("article", "pub");
        var meta = el("div", "meta");
        var by = el("span", "badge badge-year", esc(p.year_raw || p.year || ""));
        var bt = el("span", "badge badge-type", TYPE_ZH[type] || "成果");
        meta.appendChild(by); meta.appendChild(bt);
        art.appendChild(meta);
        var h3 = el("h3", null, esc(p.title || ""));
        art.appendChild(h3);
        if (p.authors) art.appendChild(el("p", "authors", esc(p.authors)));
        if (p.venue) art.appendChild(el("p", "venue", esc(p.venue)));
        if (p.doi) {
          var dp = el("p", "doi");
          var a = el("a", null, "DOI " + esc(p.doi) + " ↗");
          a.href = p.url || ("https://doi.org/" + esc(p.doi));
          a.target = "_blank"; a.rel = "noopener";
          dp.appendChild(a);
          art.appendChild(dp);
        }
        box.appendChild(art);
      });
      // 触发页面既有 prepare/reindex（若存在）
      if (typeof window.pubPrepare === "function") window.pubPrepare(sec);
      if (typeof window.pubReindex === "function") window.pubReindex(sec);
    });
  }

  // ---------- index.html：历程重建（journey） ----------
  function renderJourney(d) {
    if (!d.journey || !d.journey.length) return;
    var box = document.getElementById("journey-list");
    if (!box) return;
    var PHASES = [
      { from: 2024, to: 2026, sub: "数智跃迁 · 荣誉密集" },
      { from: 2020, to: 2023, sub: "产教融合 · 产业互联网" },
      { from: 2016, to: 2019, sub: "学术深造 · 国际化" },
      { from: 2012, to: 2015, sub: "平台建设 · 理论奠基" },
      { from: 2008, to: 2011, sub: "起步期 · 求学入职" },
    ];
    var LABEL = { project: "项目", result: "成果", honor: "荣誉", qual: "资质", role: "职务" };
    var byYear = {};
    d.journey.forEach(function (it) {
      (byYear[it.year] = byYear[it.year] || []).push(it);
    });
    box.innerHTML = "";
    PHASES.forEach(function (ph) {
      var years = [];
      for (var y = ph.to; y >= ph.from; y--) if (byYear[y]) years.push(y);
      if (!years.length) return;
      var phEl = el("div", "jy-phase");
      var head = el("div", "jy-phase-head");
      head.setAttribute("role", "button"); head.setAttribute("tabindex", "0");
      head.setAttribute("aria-expanded", "false");
      head.innerHTML = '<span class="jy-phase-title">' + ph.from + "–" + ph.to + "</span>" +
        '<span class="jy-phase-sub">' + esc(ph.sub) + "</span>" +
        '<span class="jy-phase-arrow" aria-hidden="true"></span>';
      var body = el("div", "jy-phase-body");
      years.forEach(function (y) {
        var data = byYear[y];
        var label = el("h4", "jy-y-label");
        label.innerHTML = '<span class="y">' + y + '</span><span class="yc">' + data.length + " 项大事记</span>";
        body.appendChild(label);
        data.forEach(function (ev) {
          var row = el("div", "jy-ev");
          var tag = el("span", "jy-tag " + (ev.type || "result"), LABEL[ev.type] || "成果");
          var tx = el("span", "jy-tx", ev.text || "");
          row.appendChild(tag); row.appendChild(tx);
          body.appendChild(row);
        });
      });
      phEl.appendChild(head); phEl.appendChild(body);
      box.appendChild(phEl);
    });
    // 默认展开最新一段
    var first = box.querySelector(".jy-phase");
    if (first) {
      first.classList.add("open");
      var fh = first.querySelector(".jy-phase-head");
      if (fh) fh.setAttribute("aria-expanded", "true");
      var fb = first.querySelector(".jy-phase-body");
      if (fb) fb.style.maxHeight = fb.scrollHeight + "px";
    }
  }

  // ---------- cv.html：3 分节履历重建 ----------
  function renderCv(d) {
    if (!d.cv || !d.cv.length) return;
    var SEC_MAP = { "任职经历": 0, "社会兼职": 1, "教育经历": 2 };
    var timelines = document.querySelectorAll("main .timeline");
    if (!timelines.length) return;
    var groups = {};
    d.cv.forEach(function (it) {
      var s = it.section || "其他";
      (groups[s] = groups[s] || []).push(it);
    });
    Object.keys(groups).forEach(function (s) {
      var idx = SEC_MAP[s];
      var tl = timelines[idx] || null;
      // 找不到对应 timeline 时：按顺序找空档（若某分节在页面上无独立 timeline 则跳过）
      if (!tl) return;
      var items = groups[s];
      tl.innerHTML = "";
      items.forEach(function (it) {
        var row = el("div", "tl-item");
        row.appendChild(el("div", "date", esc(it.date || "")));
        row.appendChild(el("h3", null, esc(it.title || "")));
        var det = (it.details || "").split("\n").filter(Boolean);
        det.forEach(function (p) { row.appendChild(el("p", null, esc(p))); });
        tl.appendChild(row);
      });
    });
  }

  // ---------- honors.html：2 分节荣誉重建 ----------
  function renderHonors(d) {
    if (!d.honors || !d.honors.length) return;
    var timelines = document.querySelectorAll("main .timeline");
    if (!timelines.length) return;
    var groups = {};
    d.honors.forEach(function (it) {
      var s = it.section || "荣誉";
      (groups[s] = groups[s] || []).push(it);
    });
    // 按页面各 timeline 前一 h2 标题（去（N）后缀）匹配分节，保证顺序稳定
    Array.prototype.forEach.call(timelines, function (tl, i) {
      var sec = tl.closest(".container") || tl.parentElement;
      var h2 = sec ? sec.querySelector("h2") : null;
      var h2Text = h2 ? h2.textContent.replace(/（\d+）/, "").trim() : "";
      var matched = null;
      Object.keys(groups).forEach(function (s) {
        if (h2Text && (h2Text.indexOf(s) > -1 || s.indexOf(h2Text) > -1)) matched = s;
      });
      if (!matched) matched = Object.keys(groups)[i] || null;
      if (!matched) return;
      var items = groups[matched];
      tl.innerHTML = "";
      items.forEach(function (it) {
        var row = el("div", "tl-item");
        row.appendChild(el("div", "date", esc(it.awarded_at_raw || it.awarded_at || "")));
        row.appendChild(el("h3", null, esc(it.title || "")));
        var dets = [];
        if (it.details_json) {
          try { dets = JSON.parse(it.details_json); } catch (e) { dets = [it.details_json]; }
        } else if (it.description) dets = [it.description];
        dets.forEach(function (p) { row.appendChild(el("p", null, esc(p))); });
        tl.appendChild(row);
      });
      if (h2) h2.textContent = h2.textContent.replace(/（\d+）/, "（" + items.length + "）");
    });
  }

  // ---------- media.html：动态卡片重建 ----------
  function renderMedia(d) {
    if (!d.media || !d.media.length) return;
    var grid = document.querySelector(".media-grid");
    if (!grid) return;
    grid.innerHTML = "";
    var byType = {};
    d.media.forEach(function (it) {
      (byType[it.type || "其他"] = byType[it.type || "其他"] || []).push(it);
    });
    d.media.forEach(function (it) {
      var card = el("a", "record-card linked");
      card.href = it.url || "#";
      card.target = "_blank"; card.rel = "noreferrer";
      card.setAttribute("data-type", it.type || "");
      var meta = el("div", "card-meta");
      meta.appendChild(el("span", null, esc(it.published_at || "")));
      meta.appendChild(el("span", null, esc(it.type || "")));
      card.appendChild(meta);
      card.appendChild(el("h3", null, esc(it.title || "")));
      if (it.source) card.appendChild(el("p", null, esc(it.source)));
      if (it.body || it.content) card.appendChild(el("p", "record-body", esc(it.body || it.content || "")));
      var sl = el("span", "source-link", "查看原文");
      sl.appendChild(el("span", "card-arrow", " ↗"));
      card.appendChild(sl);
      grid.appendChild(card);
    });
    // 更新 tabs 计数与 result-count
    Array.prototype.forEach.call(document.querySelectorAll(".media-tabs button"), function (btn) {
      var f = btn.getAttribute("data-filter");
      var n = f === "all" ? d.media.length : (byType[f] ? byType[f].length : 0);
      var strong = btn.querySelector("strong");
      if (strong) strong.textContent = String(n);
    });
    var rc = document.querySelector(".result-count");
    if (rc) rc.textContent = "显示 " + d.media.length + " 条含原文链接的报道";
  }

  // ---------- research.html / industry.html：项目重建 ----------
  function renderProjects(d) {
    // 仅研究/产业页：publications 页也有 article.pub，用 pathname 与 .kv 结构双重判定
    var path = location.pathname || "";
    var isProjPage = /research\.html/.test(path) || /industry\.html/.test(path);
    var arts = document.querySelectorAll("article.pub");
    if (!isProjPage || !arts.length) return;
    var isIndustry = /industry\.html/.test(path);
    var items = isIndustry ? (d.projects_industry || []) : (d.projects_research || []);
    if (!items.length) return;
    var box = arts[0].parentNode;
    if (!box) return;
    Array.prototype.forEach.call(arts, function (n) { n.remove(); });
    items.forEach(function (p) {
      var art = el("article", "pub");
      var meta = el("div", "meta");
      meta.appendChild(el("span", "badge badge-year", esc(p.period || "")));
      art.appendChild(meta);
      art.appendChild(el("h3", null, esc(p.title || "")));
      var kv = {};
      try { kv = JSON.parse(p.kv_json || "{}"); } catch (e) { kv = {}; }
      var dl = el("dl", "kv");
      Object.keys(kv).forEach(function (k) {
        var row = el("div");
        row.appendChild(el("dt", null, esc(k)));
        row.appendChild(el("dd", null, esc(kv[k])));
        dl.appendChild(row);
      });
      if (dl.childNodes.length) art.appendChild(dl);
      box.appendChild(art);
    });
  }

  // ---------- research.html：核心方向卡片重建 ----------
  function renderDirections(d) {
    if (!d.research_directions || !d.research_directions.length) return;
    var grids = document.querySelectorAll(".grid-3");
    if (!grids.length) return;
    var grid = grids[0];
    // 仅当该 grid 内是方向卡片（含 .idx）才重建
    if (!grid.querySelector(".idx")) return;
    grid.innerHTML = "";
    d.research_directions.forEach(function (dir) {
      var card = el("article", "card");
      card.appendChild(el("div", "idx", esc(dir.idx || "")));
      card.appendChild(el("h3", null, esc(dir.title || "")));
      if (dir.desc) card.appendChild(el("p", null, esc(dir.desc)));
      grid.appendChild(card);
    });
  }

  // ---------- 分发 ----------
  function apply(d) {
    if (!d) return;
    if (document.getElementById("journey-list")) renderJourney(d);
    if (document.querySelector(".cat-section")) renderPublications(d);
    if (document.querySelector(".media-grid")) renderMedia(d);
    // 履历页：3 个 timeline（任职经历/社会兼职/教育经历）
    var tls = document.querySelectorAll("main .timeline");
    if (tls.length === 3) renderCv(d);
    // 荣誉页：2 个 timeline（荣誉/任职资格）
    if (tls.length === 2) renderHonors(d);
    // 项目页：仅 research/industry（内部有 pathname 判定）
    renderProjects(d);
    if (document.querySelector(".grid-3 .idx")) renderDirections(d);
  }

  // ---------- 启动 ----------
  // 渐进增强：有预注入数据则直接渲染；否则需要 fetch（老浏览器/jsdom 无 fetch 且无数据时保持硬编码）
  if (!window.__SITE_DATA__ && typeof fetch !== "function") return;
  function boot() {
    loadData().then(apply).catch(function () { /* 保持硬编码 */ });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
