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

  /* 数据里存在 HTML 实体（实测：&amp; 、&#x27;）——烘焙页是浏览器解码后显示，
     而 textContent 会把实体**原样显示**出来（"Trend &amp; Influencing"）。
     ⇒ 统一在此解码，保证「重建后的文本」与「烘焙页的文本」逐字一致。 */
  var ENT = { "&lt;": "<", "&gt;": ">", "&quot;": '"', "&#39;": "'", "&#x27;": "'", "&apos;": "'", "&nbsp;": " " };
  function decodeEntities(v) {
    return String(v == null ? "" : v)
      .replace(/&(lt|gt|quot|#39|#x27|apos|nbsp);/gi, function (m) { return ENT[m.toLowerCase()] || m; })
      .replace(/&amp;/g, "&");   // 放最后，避免二次解码
  }
  function esc(s) { return s == null ? "" : decodeEntities(s); }

  /* ---------- 本人姓名高亮（哥哥 2026-09-19 定规） ----------
   * 用途：成果页的作者名单、荣誉页的完成人名单/排名里，把本人姓名标出来。
   * 规格（哥哥原话）：用显眼的颜色或底纹 + 加粗，**不要用红色**、**人名外加方框/圆圈**。
   * ⇒ 这里只加一个 class（底色 + 加粗由 styles.css 的 .self-name 决定），不加边框、不改红。
   * 覆盖写法：中文「任昱衡」；英文 Ren Yuheng / Yuheng Ren / Ren, Yuheng（大小写不敏感）。
   * 加粗与底纹都落在姓名本身，姓名后的 * （通讯作者标记）留在高亮之外。 */
  var SELF_NAME_RE = /(任昱衡|Ren,?\s+Yuheng|Yuheng\s+Ren)/gi;
  function selfNameFrag(text) {
    var s = esc(text == null ? "" : text);
    var frag = document.createDocumentFragment();
    if (!s) return frag;
    var last = 0, m;
    SELF_NAME_RE.lastIndex = 0;
    while ((m = SELF_NAME_RE.exec(s)) !== null) {
      if (!m[0]) { SELF_NAME_RE.lastIndex++; continue; }
      if (m.index > last) frag.appendChild(document.createTextNode(s.slice(last, m.index)));
      frag.appendChild(el("span", "self-name", m[0]));
      last = m.index + m[0].length;
    }
    if (last < s.length) frag.appendChild(document.createTextNode(s.slice(last)));
    return frag;
  }
  /** 造 <p>（class 可空），文本里的本人姓名已高亮 */
  function selfP(cls, text) {
    var p = el("p", cls, null);
    p.appendChild(selfNameFrag(text));
    return p;
  }

  /* ---------- DOI 健壮性（2026-09-19 实测线上脏数据后加） ----------
   * 线上 papers 表里有 2 条的 doi 字段被塞了字面文本「查看原文」（导入时抓错字段）。
   * 若照原样渲染，会出现「DOI 查看原文 ↗」这种坏标签（英文页实测已命中 2 处）。
   * ⇒ 只有真正长成 DOI 的值才当 DOI 用；否则退回按 url 显示「查看原文」。
   * 这是**渲染层兜底**：数据本身的脏值仍需后台更正（等 /admin 账号）。 */
  function cleanDoi(v) {
    var s = String(v == null ? "" : v).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    return /^10\.\d{4,9}\/\S+$/.test(s) ? s : "";
  }

  /* ---------- 已撤稿论文提示（2026-09-19 核对发现，必须显式标注）----------
   * 理由：站上若把**已被出版方撤稿**的文章当普通成果展示，既不透明，也会被 AI 引擎/学术索引
   *      先于本站披露（显得像隐瞒）。规范做法是保留条目 + 明示撤稿。
   * 出处（实测）：Springer《Optical and Quantum Electronics》撤稿说明
   *   DOI 10.1007/s11082-024-07659-y（2024-10-08）；Crossref 该记录 update-to 指向原文
   *   10.1007/s11082-023-05720-w（type=retraction, source=publisher）。
   * key 一律用小写 DOI。 */
  var RETRACTED = {
    "10.1007/s11082-023-05720-w": { date: "2024-10-08", noteDoi: "10.1007/s11082-024-07659-y" }
  };
  function retractNoteFor(doi) {
    var k = String(doi == null ? "" : doi).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
    return RETRACTED[k] || null;
  }
  /** 生成撤稿提示行（含指向 Retraction Note 的链接） */
  function retractNoteEl(doi) {
    var r = retractNoteFor(doi);
    if (!r) return null;
    var p = el("p", "retract-note", null);
    p.appendChild(document.createTextNode("⚠️ 该文已被出版方撤稿（Retraction Note）：" + r.date + "（"));
    var a = el("a", null, r.noteDoi);
    a.href = "https://doi.org/" + r.noteDoi; a.target = "_blank"; a.rel = "noopener";
    p.appendChild(a);
    p.appendChild(document.createTextNode("）"));
    return p;
  }

  // ---------- publications.html：5 类成果重建 ----------
  // 修正（2026-09-19）：原实现是「只要静态页里已有 article.pub，就只同步计数、不重建」，
  // 后果是**后台新增/删除成果时页面根本不跟着变** —— 计数变成「标准（5）」而卡片还是 4 张，
  // 页面自相矛盾。现改为「先比对，只在真的变了才重建」：
  //   · 比对用「空白归一化后的标题集合」。**不能按位置比**：实测烘焙顺序与数据顺序本就不一致
  //     （且有一处仅差一个双空格），按位置比会在基线上就误判成漂移。
  //   · 集合相等 ⇒ 原样保留（零风险；线上绝大多数情况走这条，行为与从前一致）。
  //   · 集合不等 ⇒ 重建该分类。重建必须生成与页面 prepare() **同构**的 DOM
  //     （article.pub.pub-row > span.pub-no + div.pub-body），否则左侧连续序号会丢。
  //   · 重建后调用该分类既有 pager 的 reset()：pager 的 activeItems() 是实时查 DOM 的，
  //     条目换了只需重渲染，**不需要重新初始化**（避免重复挂载分页控件）。
  var PUB_CATS = {
    "cat-publication": "publication", "cat-patent": "patent",
    "cat-software": "software", "cat-book": "book", "cat-standard": "standard",
  };
  var PUB_TYPE_ZH = { publication: "论文", patent: "专利", software: "软著", book: "著作", standard: "标准" };

  function normTitle(s) { return decodeEntities(s).replace(/\s+/g, " ").trim(); }

  /** 造一个与页面 prepare() 产物同构的条目 */
  function buildPubArticle(p, type, i) {
    var art = el("article", "pub pub-row");
    art.setAttribute("data-order", String(i));
    var ym = String(p.year_raw || p.year || "").match(/\d{4}/);
    art.setAttribute("data-year", ym ? ym[0] : "0");
    var no = el("span", "pub-no", String(i + 1));
    no.setAttribute("aria-hidden", "true");
    art.appendChild(no);
    var body = el("div", "pub-body");
    var meta = el("div", "meta");
    meta.appendChild(el("span", "badge badge-year", esc(p.year_raw || p.year || "")));
    meta.appendChild(el("span", "badge badge-type", PUB_TYPE_ZH[type] || "成果"));
    body.appendChild(meta);
    body.appendChild(el("h3", null, esc(p.title || "")));
    if (p.authors) body.appendChild(selfP("authors", p.authors));
    if (p.venue) body.appendChild(el("p", "venue", esc(p.venue)));
    var realDoi = cleanDoi(p.doi);
    if (realDoi) {
      var dp = el("p", "doi");
      var a = el("a", null, "DOI " + esc(realDoi) + " ↗");
      a.href = p.url || ("https://doi.org/" + esc(realDoi));
      a.target = "_blank"; a.rel = "noopener";
      dp.appendChild(a);
      body.appendChild(dp);
    } else if (p.url) {
      // doi 字段不是真 DOI（脏数据/空）但有条目原文地址 ⇒ 按「查看原文」渲染，与烘焙页写法一致
      var up = el("p", "doi");
      var ua = el("a", null, "查看原文 ↗");
      ua.href = p.url; ua.target = "_blank"; ua.rel = "noopener";
      up.appendChild(ua);
      body.appendChild(up);
    }
    var rn = retractNoteEl(p.doi);          // 已撤稿文章：显式标注（不删不藏）
    if (rn) body.appendChild(rn);
    art.appendChild(body);
    return art;
  }

  /** 「当前显示：X 共 N 条」由页面内联脚本的闭包维护，外部调不到 ⇒ 触发它自己的刷新路径 */
  function syncPubCounter(sec) {
    var counter = document.getElementById("pub-count");
    if (!counter) return;
    var sorter = document.getElementById("pub-sort");
    if (sorter) {
      // 派发它自己的 change ⇒ 页面会重跑 applySort + reindex + pager.render + refreshCount
      try { sorter.dispatchEvent(new Event("change")); } catch (e) { /* 忽略 */ }
      return;
    }
    if (sec.hidden) return;
    var h2 = sec.querySelector("h2");
    var name = h2 ? (h2.textContent || "").replace(/（.*/, "") : "当前类别";
    counter.textContent = "当前显示：" + name + " 共 " + sec.querySelectorAll("article.pub").length + " 条";
  }

  function renderPublications(d) {
    if (!d.publications || !d.publications.length) return;
    Object.keys(PUB_CATS).forEach(function (secId) {
      var sec = document.getElementById(secId);
      if (!sec) return;
      var box = sec.querySelector(".container");
      if (!box) return;
      var type = PUB_CATS[secId];
      var items = d.publications.filter(function (p) {
        return (p.type || "publication") === type || (p.category || "") === secId;
      });
      if (!items.length) return;
      var h2 = box.querySelector("h2");
      var baked = box.querySelectorAll("article.pub");

      // ---- 漂移判定：归一化标题集合是否一致 ----
      var bakedSet = {};
      Array.prototype.forEach.call(baked, function (a) {
        var t = a.querySelector("h3");
        bakedSet[normTitle(t ? t.textContent : "")] = 1;
      });
      var drift = baked.length !== items.length;
      if (!drift) {
        for (var k = 0; k < items.length; k++) {
          if (!bakedSet[normTitle(items[k].title)]) { drift = true; break; }
        }
      }
      if (!drift) {
        // 没变 ⇒ 保持原样（含页面 prepare() 已做的包装），只同步计数
        if (h2) h2.textContent = h2.textContent.replace(/（\d+）/, "（" + items.length + "）");
        return;
      }

      // ---- 真漂移 ⇒ 重建。先整段造好再一次性换掉，中途抛错则原样保留（不出现空白页）----
      var frag = document.createDocumentFragment();
      items.forEach(function (p, i) { frag.appendChild(buildPubArticle(p, type, i)); });
      Array.prototype.forEach.call(baked, function (n) { n.remove(); });
      box.appendChild(frag);
      if (h2) h2.textContent = h2.textContent.replace(/（\d+）/, "（" + items.length + "）");
      if (sec._pager && typeof sec._pager.reset === "function") {
        try { sec._pager.reset(); } catch (e) { /* 分页异常不影响内容 */ }
      }
      syncPubCounter(sec);
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
    // renderCv：把 H2 的（N）与数据同步（2026-09-20 补：此前只有 renderHonors 会同步，
    //   cv 页计数是硬编码的，数据一增删就漂移 —— 社会兼职 24/26 的不一致即由此暴露）
    [["任职经历", "任职经历"], ["社会兼职", "社会兼职"], ["教育经历", "教育经历"]].forEach(function (pair) {
      var heads = document.querySelectorAll("h2");
      for (var hi = 0; hi < heads.length; hi++) {
        var ht = heads[hi].textContent || "";
        if (ht.indexOf(pair[0]) === 0 || ht.indexOf(pair[0] + "（") === 0) {
          var n = (d.cv || []).filter(function (x) { return (x.section || "") === pair[1]; }).length;
          if (n) heads[hi].textContent = pair[0] + "（" + n + "）";
          break;
        }
      }
    });
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
        dets.forEach(function (p) { row.appendChild(selfP(null, p)); });   // 完成人名单/排名行：本人姓名高亮
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
    // 2026-09-20 加固：原来盲取第一个 .grid-3，只要里面含 .idx 就重建 ——
    //   结果把成果页新加的「代表作」区块（当时也用 .grid-3 + .idx）灌成了 7 个研究方向卡片。
    //   现在按「显式标记 → id → 带 .idx 且未被占用」三级定位，并显式排除非方向容器。
    var grid = document.querySelector('[data-render="directions"]')
            || document.getElementById("research-grid")
            || null;
    if (!grid) {
      var cands = document.querySelectorAll(".grid-3");
      for (var ci = 0; ci < cands.length; ci++) {
        if (cands[ci].hasAttribute("data-render") || cands[ci].classList.contains("featured-grid")) continue;
        if (cands[ci].querySelector(".idx")) { grid = cands[ci]; break; }
      }
    }
    if (!grid || !grid.querySelector(".idx")) return;
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
