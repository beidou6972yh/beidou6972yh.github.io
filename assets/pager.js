/*
 * pager.js — 轻量客户端分页（纯原生，无依赖）
 * 用法：window.initListPager(cfg)
 *   cfg.root          容器元素（在其中查找条目）
 *   cfg.itemSelector  条目选择器，相对 root
 *   cfg.pageSize      每页条数（默认 20）
 *   cfg.filter        可选 (item)->bool，返回“在范围内”的条目（用于分类筛选）；默认全部
 *   cfg.pagerMount    分页控件挂载点（默认 root 末尾）
 *   cfg.onRender      可选 (visibleItems, page, pages) 回调（如更新计数）
 * 返回 { reset, render, el }，并对其 root 挂 __pagerReset / __pagerRender
 *
 * 设计要点：先隐藏 root 内全部条目，再按当前页显示“在范围内”的条目；
 * 翻页/筛选只切换 display，不增删 DOM，故与 site-render.js 的渐进增强重建互不冲突。
 * 体验细节：每次翻页/筛选/切类后自动将视线滚动回列表顶部（smooth），
 * 避免用户停留在原位置、看不见新一页的开头。
 */
(function () {
  "use strict";

  function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }

  function initListPager(cfg) {
    var root = cfg.root;
    if (!root) return null;
    var sel = cfg.itemSelector || "article";
    var ps = cfg.pageSize || 20;
    var filter = cfg.filter || function () { return true; };
    var page = 1;

    var mount = cfg.pagerMount || root;
    var nav = document.createElement("nav");
    nav.className = "pager";
    nav.setAttribute("aria-label", "分页导航");
    mount.appendChild(nav);

    function activeItems() {
      var all = root.querySelectorAll(sel);
      var out = [];
      for (var i = 0; i < all.length; i++) {
        if (filter(all[i])) out.push(all[i]);
      }
      return out;
    }

    function render() {
      var items = activeItems();
      var total = items.length;
      var pages = Math.max(1, Math.ceil(total / ps));
      page = clamp(page, 1, pages);
      // 先全部隐藏
      var every = root.querySelectorAll(sel);
      for (var i = 0; i < every.length; i++) every[i].style.display = "none";
      // 显示当前页的“在范围内”条目
      var start = (page - 1) * ps;
      var end = Math.min(start + ps, total);
      for (var j = start; j < end; j++) items[j].style.display = "";
      renderControls(total, pages);
      if (typeof cfg.onRender === "function") cfg.onRender(items, page, pages);
    }

    function renderControls(total, pages) {
      nav.innerHTML = "";
      if (pages <= 1) { nav.style.display = "none"; return; }
      nav.style.display = "";
      nav.appendChild(btn("‹ 上一页", page <= 1, function () { go(page - 1); }));
      pageWindow(page, pages).forEach(function (n) {
        if (n === "…") {
          var gap = document.createElement("span");
          gap.className = "pager-gap";
          gap.textContent = "…";
          nav.appendChild(gap);
        } else {
          nav.appendChild(btn(String(n), false, function () { go(n); }, n === page));
        }
      });
      nav.appendChild(btn("下一页 ›", page >= pages, function () { go(page + 1); }));
      var info = document.createElement("span");
      info.className = "pager-info";
      info.textContent = "共 " + total + " 条 · 第 " + page + " / " + pages + " 页";
      nav.appendChild(info);
    }

    function btn(label, disabled, fn, current) {
      var b = document.createElement("button");
      b.type = "button";
      b.className = "pager-btn" + (current ? " current" : "");
      b.textContent = label;
      b.disabled = !!disabled;
      if (!disabled) b.addEventListener("click", fn);
      return b;
    }

    // 翻页/筛选/切类后，把视线带回列表顶部，避免用户停留在原位置、看不见新一页开头
    function scrollToTop() {
      var target = root.closest("section, .section") || root;
      if (!target || !target.getBoundingClientRect) return;
      var rect = target.getBoundingClientRect();
      var navH = 0;
      var hdr = document.querySelector(".site-header, header.site-header, .nav, .navbar");
      if (hdr && hdr.offsetHeight) navH = hdr.offsetHeight;
      var y = window.pageYOffset + rect.top - navH - 10;
      if (y < 0) y = 0;
      window.scrollTo({ top: y, behavior: "smooth" });
    }

    function go(n) { page = n; render(); scrollToTop(); }

    // 页码窗口：1 … cur-1 cur cur+1 … pages
    function pageWindow(cur, pages) {
      var out = [];
      var left = Math.max(1, cur - 1);
      var right = Math.min(pages, cur + 1);
      if (left > 1) { out.push(1); if (left > 2) out.push("…"); }
      for (var i = left; i <= right; i++) out.push(i);
      if (right < pages) { if (right < pages - 1) out.push("…"); out.push(pages); }
      return out;
    }

    var api = {
      reset: function () { page = 1; render(); scrollToTop(); },
      render: render,
      el: nav
    };
    root.__pagerReset = api.reset;
    root.__pagerRender = api.render;
    render();
    return api;
  }

  window.initListPager = initListPager;
})();
