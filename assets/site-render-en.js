/*
 * site-render-en.js — 英文页「运行时刷新层」（与中文同源数据，渐进增强）
 * ======================================================================
 * 背景（为什么需要它）：
 *   中文 8 页是「静态烘焙 HTML + 运行时从后台拉数据刷新」；
 *   英文 /en/ 页此前**只有烘焙、没有刷新层** ⇒ 后台改了中文，英文永远不动，
 *   只能靠我方重跑 build-en.py。本文件补上英文的刷新层，使：
 *     **哥哥在现有管理后台改一次 → 中英文同时更新**（无需我方介入、无需改 RenServer 后端）。
 *
 * 数据源（与中文 site-render.js 完全一致，故「同源」）：
 *   1) <同源>/api/site-data.json     admin server 实时网关（后台一改即变）
 *   2) ../assets/site-data.json      静态兜底（英文页在 /en/ 下，故上跳一级）
 *   3) 都拿不到 → 保持页面已烘焙的英文内容（渐进增强，绝不把页面刷成空白）
 *
 * 译文与三态判定：**全部来自 assets/site-i18n-core.js**（与后台「英文待译清单」同一份逻辑，
 *   保证后台看到的数字与页面行为永远一致；本文件不自己实现键取法/比较/回退口径）。
 *
 * 页面契约（对英文页实测确定，非猜测）：
 *   publications.html  5 个 <section class="section">，靠 h2 关键词识别分类；卡片 article.pub
 *   cv.html            main 下 3 个 .timeline（appointments / affiliations / education）
 *   honors.html        main 下 2 个 .timeline（honors / professional qualifications）
 *   media.html         .card-grid.media-grid 内 a.record-card
 *   research.html      .grid-3 .idx（方向卡，含手写「Public evidence」外链）+ article.pub（项目卡）
 *   industry.html      article.pub（项目卡）
 *
 * 纪律：
 *   · 全部用 DOM API + textContent（不用 innerHTML 注入数据），class 名与烘焙页保持一致 ⇒ CSS 零改动
 *   · 只重建「数据拥有全部子节点」的容器；方向卡含手写外链，故**只就地改文本**，不重建
 *   · 容器不存在 / 数据为空 / 缺核心 / 出任何异常 ⇒ 静默保留烘焙内容
 *   · 结果汇总到 window.__EN_REPORT__；后台「英文待译清单」走 core.audit() 做全量体检
 */
(function () {
  "use strict";

  var CORE = window.__SITE_I18N__;
  if (!CORE) { try { console.warn("[site-render-en] 缺少 site-i18n-core.js，保持烘焙内容"); } catch (e) {} return; }

  var TM_DOC = window.__SITE_DATA_EN__ || {};
  var TM = TM_DOC.entries || {};
  var SECTIONS = CORE.SECTIONS;
  var REPORT = { ok: 0, stale: 0, missing: 0, items: [], generated_at: TM_DOC.generated_at || null };
  window.__EN_REPORT__ = REPORT;

  var TYPE_EN = { publication: "Paper", patent: "Patent", software: "Software copyright", book: "Book", standard: "Standard" };

  // ---------- 取数 ----------
  function fetchJSON(url) {
    return fetch(url, { cache: "no-store" }).then(function (r) {
      if (!r.ok) throw new Error("HTTP " + r.status);
      return r.json();
    });
  }

  function loadData() {
    if (window.__SITE_DATA__) return Promise.resolve(window.__SITE_DATA__);
    // 数据源顺序（2026-09-19 修正，重要）：
    //   **静态文件优先**。实测确认 `GET /api/site-data.json` 不是只读接口 ——
    //   它会「导出 DB 并写回 assets/site-data.json」（受控实验：generated_at 被改写、
    //   审计日志多一条 export_site_data）。中文页的 site-render.js 把它当首选，
    //   于是**每一次页面访问都会触发一次全量导出 + 写一个 133KB 文件**。
    //   而静态文件本身在后台每次写入后都会自动导出刷新（_auto_export_after_write），
    //   所以「先静态、后接口兜底」既拿到同样新鲜的数据，又不会让访客触发写入。
    var urls = ["../assets/site-data.json", "assets/site-data.json"];
    try { urls.push(location.origin + "/api/site-data.json"); } catch (e) { /* file:// */ }
    function next(i) {
      if (i >= urls.length) return Promise.reject(new Error("no data source"));
      return fetchJSON(urls[i]).catch(function () { return next(i + 1); });
    }
    return next(0);
  }

  // ---------- 译文查询（统一走核心；本层只额外累计本页报告） ----------
  function tk(sectionName, item, field) {
    var sec = SECTIONS[sectionName];
    var key = sec.key(item);
    var spec = null;
    CORE.activeFields(sectionName, item).forEach(function (f) { if (f.field === field) spec = f; });
    if (!spec) return { state: "empty", value: "" };   // 无内容可译 ⇒ 不渲染、不计入报告
    var r = CORE.classify(TM, key, field, spec.live, spec.mode);
    REPORT[r.state]++;
    if (r.state !== "ok") {
      REPORT.items.push({ key: key, field: field, state: r.state, zh: CORE.norm(spec.live).slice(0, 300) });
    }
    return r;
  }

  // ---------- DOM 小工具 ----------
  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text != null) n.textContent = text;
    return n;
  }

  // ---------- 本人姓名高亮（哥哥 2026-09-19 定规） ----------
  // 规格：显眼底色 + 加粗；不用红色、人名外加方框/圆圈（底色与加粗见 styles.css 的 .self-name）。
  // 覆盖写法：Ren Yuheng / Yuheng Ren / Ren, Yuheng（大小写不敏感）+ 中文「任昱衡」（译文里若保留中文原名）。
  var SELF_NAME_RE = /(任昱衡|Ren,?\s+Yuheng|Yuheng\s+Ren)/gi;
  function selfNameFrag(text) {
    var s = String(text == null ? "" : text);
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

  /** DOI 健壮性：线上有 2 条 papers 的 doi 字段被塞了字面文本「查看原文」（导入抓错字段），
   *  照原样渲染会在英文页出现「DOI 查看原文 ↗」的坏标签（实测已命中）⇒ 非真 DOI 不当 DOI 用。 */

  /* ---------- 已撤稿文章提示（2026-09-19 核对发现，必须显式标注）----------
   * 出处：Springer《Optical and Quantum Electronics》撤稿说明 10.1007/s11082-024-07659-y（2024-10-08）；
   * Crossref 该记录 update-to 指向原文 10.1007/s11082-023-05720-w（type=retraction, source=publisher）。*/
  var RETRACTED = {
    "10.1007/s11082-023-05720-w": { date: "2024-10-08", noteDoi: "10.1007/s11082-024-07659-y" }
  };
  function retractNoteFor(doi) {
    var k = String(doi == null ? "" : doi).trim().toLowerCase().replace(/^https?:\/\/(dx\.)?doi\.org\//, "");
    return RETRACTED[k] || null;
  }
  function retractNoteEl(doi) {
    var r = retractNoteFor(doi);
    if (!r) return null;
    var p = el("p", "retract-note", null);
    p.appendChild(document.createTextNode("⚠️ Retracted by the publisher (Retraction Note): " + r.date + " ("));
    var a = el("a", null, r.noteDoi);
    a.href = "https://doi.org/" + r.noteDoi; a.target = "_blank"; a.rel = "noopener";
    p.appendChild(a);
    p.appendChild(document.createTextNode(")"));
    return p;
  }
  function cleanDoi(v) {
    var s = String(v == null ? "" : v).trim().replace(/^https?:\/\/(dx\.)?doi\.org\//i, "");
    return /^10\.\d{4,9}\/\S+$/.test(s) ? s : "";
  }

  /* ---------- 外部链接修正（2026-09-19 链接体检发现；数据改不动时在前端兜底） ----------
   * 只修**技术性错误**（页面路径变更 / 协议与证书问题）；内容已失效的（域名无解析、404、校内限定）
   * 一律不在此造替代，交哥哥决定换源或删除。
   * 证据：
   *  · 鲲鹭官网改版：page1000089 整页 404，文章已移到 page94（article_id 不变，实测 200 且标题与站内条目一致）
   *  · v.china.com.cn:443 的证书是别人的（CN=www.baishan.com / *.dianping.com）⇒ 浏览器会报证书错误；http 实测 200
   */
  var URL_FIX = {
    "https://www.kunluiot.com/page1000089?article_id=311": "https://www.kunluiot.com/page94?article_id=311",
    "https://www.kunluiot.com/page1000089?article_id=312": "https://www.kunluiot.com/page94?article_id=312",
    "https://v.china.com.cn/finance/2017-12/20/content_42002661.htm": "http://v.china.com.cn/finance/2017-12/20/content_42002661.htm",
    // 2026-09-19 补：失效报道换公开源（哥哥要求"从网上另外找"）
    //  · 电子科大那条：原 newsdata.uestc.edu.cn 带/不带 www 都 403「仅限校内，请通过校园网或 VPN」⇒ 换成成电新闻网公开页（标题逐字一致，正文含任昱衡）
    "https://www.newsdata.uestc.edu.cn/?n=UestcNews.Front.DocumentV2.ArticlePage&Id=79910": "https://news.uestc.edu.cn/info/1005/7909.htm",
    //  · 中国工业报那条：原新浪转载已删文 ⇒ 换回《中国工业报》数字报原文（第15版·行知·理论，2025-03-10，署名任昱衡）
    "https://k.sina.cn/article_7857201856_1d45362c001901mbti.html": "https://dzb.cinn.cn/zggyb/html/2025-03/10/content_15_117895.htm"
  };
  function fixUrl(u) { return URL_FIX[String(u == null ? "" : u).trim()] || u; }

  /* ---------- 内容更正清单（2026-09-19 核对所得；DB 更正前在前端兜底） ----------
   * 每条都必须有权威出处，并注明"DB 更正后应删除本条目"。
   * · 中国服务业科技创新奖一等奖（第十六届 · 一等奖 · 序号 57）完成人名单：
   *   官方公告（中国商业联合会 2024-12-25 发布，附件 1《全国服务业科技创新奖获奖名单》）
   *   为「任昱衡、王学东、…、陈志永、卢凡、倪一铭、董姗姗」，
   *   站内数据误写为「李昱帆」（站内另有李昱帆，系房地产方向论文作者，属两人名混用）⇒ 更正。
   *   出处：https://www.cgcc.org.cn/tzgg/2/53495.html （附件 .doc 已存档 快照/获奖名单证据-20260919/） */
  var DATA_FIX = [
    ["陈志永、李昱帆、倪一铭", "陈志永、卢凡、倪一铭"]
  ];
  function fixText(v) {
    var t = String(v == null ? "" : v);
    for (var i = 0; i < DATA_FIX.length; i++) t = t.split(DATA_FIX[i][0]).join(DATA_FIX[i][1]);
    return t;
  }

  /* ---------- 年份补录（2026-09-19 著作版本核实所得；DB 补录后应删除本表） ----------
   * 由来：6 本著作在库中 year 为空 ⇒ 前台年份徽章空白、排序被当成最旧。
   * 年份来源：版权页 CIP / 当当按 ISBN 检索 / 孔夫子条目 三源交叉（见 成果核对报告 第十九节）。
   * 均为「第 1 版」，未发现第 2 版/修订版。 */
  var YEAR_FIX = {
    "HTML+CSS网页设计详解": "2013",
    "中文版Dreamweaver CC+Flash CC+Photoshop CC网页设计标准教程": "2014",
    "众筹模式": "2016",
    "大数据营销从入门到精通": "2016",
    "微信公众号运营全攻略": "2017",
    "微商": "2016",
    "A Detailed Guide to HTML+CSS Web Design": "2013",
    "Standard Course on Web Design with Chinese Versions of Dreamweaver CC, Flash CC and Photoshop CC": "2014",
    "The Crowdfunding Model": "2016",
    "Big Data Marketing from Beginner to Mastery": "2016",
    "A Complete Guide to Operating a WeChat Official Account": "2017",
    "WeChat Business": "2016"
  };
  function yearOf(p) {
    var y = p && (p.year_raw || p.year);
    if (y) return y;
    var t = String((p && p.title) || "").trim();
    for (var k in YEAR_FIX) if (t === k || t.indexOf(k) > -1) return YEAR_FIX[k];
    return "";
  }

  /* ---------- 书名补全（2026-09-19 著作版本核实所得；DB 补全后应删除本表） ----------
   * 《HTML+CSS网页设计详解》应带丛书名「网站开发非常之旅」；《微商》副题为「12招教你玩转微营销」。
   * 来源：版权页 CIP / 当当按 ISBN 检索 / 孔夫子条目（见 成果核对报告 第十九节）。 */
  var TITLE_FIX = {
    "HTML+CSS网页设计详解": "网站开发非常之旅：HTML+CSS网页设计详解",
    "微商": "微商：12招教你玩转微营销"
  };
  function titleOf(p) {
    var t = String((p && p.title) || "");
    return TITLE_FIX[t] || t;
  }

  /* ---------- 出处补正（2026-09-19 知网报告核对所得；DB 补录后应删除本表） ----------
   * 复旦那条是**硕士**学位论文（知网报告：复旦大学·硕士·2010·导师赵卫东），
   * 站点原写「复旦大学 · 学位论文」不含级别，补明以示与博士区分。 */
  var VENUE_FIX = {
    "基于Web Services的中船集团电子采购平台开发": "复旦大学 · 硕士学位论文"
  };
  function venueOf(p) { return VENUE_FIX[String((p && p.title) || "")] || String((p && p.venue) || ""); }

  function setCount(h2, n) {
    if (!h2) return;
    h2.textContent = h2.textContent.replace(/\(\d+\)/, "(" + n + ")");
  }

  function appendKV(art, kv) {
    var keys = Object.keys(kv || {});
    if (!keys.length) return;
    var dl = el("dl", "kv");
    keys.forEach(function (k) {
      var row = el("div");
      row.appendChild(el("dt", null, k));
      row.appendChild(el("dd", null, String(kv[k])));
      dl.appendChild(row);
    });
    art.appendChild(dl);
  }

  // ---------- publications.html：5 类成果 ----------
  var CATS = [
    { type: "publication", re: /journal|conference|paper/i },
    { type: "patent", re: /patent/i },
    { type: "software", re: /software/i },
    { type: "book", re: /book/i },
    { type: "standard", re: /standard/i }
  ];

  function pubSections() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll("section.section"), function (sec) {
      if (sec.id === "latest") return;
      var h2 = sec.querySelector("h2");
      if (!h2) return;
      var t = h2.textContent || "";
      for (var i = 0; i < CATS.length; i++) {
        if (CATS[i].re.test(t)) {
          var box = sec.querySelector(".container");
          if (box && box.querySelector("article.pub")) out.push({ box: box, h2: h2, type: CATS[i].type });
          return;
        }
      }
    });
    return out;
  }

  function renderPublications(d) {
    var pubs = d.publications || [];
    if (!pubs.length) return;
    pubSections().forEach(function (s) {
      var items = pubs.filter(function (p) { return (p.type || "publication") === s.type; });
      // 英文成果页无分页/标签 JS（实测仅 nav toggle）⇒ 从数据整体重建，能反映后台增删改
      Array.prototype.forEach.call(s.box.querySelectorAll("article.pub"), function (n) { n.remove(); });
      items.forEach(function (p) {
        var art = el("article", "pub");
        var meta = el("div", "meta");
        meta.appendChild(el("span", "badge badge-year", yearOf(p)));
        meta.appendChild(el("span", "badge badge-type", TYPE_EN[s.type] || "Item"));
        art.appendChild(meta);
        art.appendChild(el("h3", null, TITLE_FIX[p.title] || tk("pub", p, "title").value));
        if (p.authors) art.appendChild(selfP("authors", tk("pub", p, "authors").value));
        if (p.venue) art.appendChild(el("p", "venue", VENUE_FIX[p.title] || tk("pub", p, "venue").value));
        var realDoi = cleanDoi(p.doi);
        if (realDoi) {
          var dp = el("p", "doi");
          var a = el("a", null, "DOI " + realDoi + " ↗");
          a.href = p.url || ("https://doi.org/" + realDoi);
          a.target = "_blank"; a.rel = "noopener";
          dp.appendChild(a);
          art.appendChild(dp);
        } else if (p.url) {
          // doi 字段不是真 DOI（脏数据）但有条目原文地址 ⇒ 显示原文链接，别把脏值当 DOI 名
          var up = el("p", "doi");
          var ua = el("a", null, "View original ↗");
          ua.href = p.url; ua.target = "_blank"; ua.rel = "noopener";
          up.appendChild(ua);
          art.appendChild(up);
        }
        var rn = retractNoteEl(p.doi);      // retracted article: state it explicitly
        if (rn) art.appendChild(rn);
        s.box.appendChild(art);
      });
      setCount(s.h2, items.length);
    });
  }

  // ---------- cv.html / honors.html：分节履历与荣誉 ----------
  function timelineSlots() {
    var out = [];
    Array.prototype.forEach.call(document.querySelectorAll("main .timeline"), function (tl) {
      var sec = tl.closest(".container") || tl.parentElement;
      var h2 = sec ? sec.querySelector("h2") : null;
      out.push({ tl: tl, h2: h2, text: h2 ? h2.textContent || "" : "" });
    });
    return out;
  }

  // 中文分节名 → 英文页 h2 关键词（实测标题已确认）
  var CV_SEC = [{ zh: "任职经历", re: /appointment/i }, { zh: "社会兼职", re: /affiliation/i }, { zh: "教育经历", re: /education/i }];
  var HONOR_SEC = [{ zh: "荣誉", re: /honou?r/i }, { zh: "任职资格", re: /qualification/i }];

  function renderSectionTimelines(sectionName, items, sectionDefs, dateField, detailField, hl) {
    if (!items.length) return;
    var slots = timelineSlots();
    if (!slots.length) return;
    var groups = {};
    items.forEach(function (it) {
      var s = it.section || sectionDefs[0].zh;
      (groups[s] = groups[s] || []).push(it);
    });
    sectionDefs.forEach(function (def, i) {
      var target = null;
      for (var j = 0; j < slots.length; j++) if (def.re.test(slots[j].text)) { target = slots[j]; break; }
      if (!target) target = slots[i] || null;
      if (!target) return;
      var list = groups[def.zh];
      if (!list || !list.length) return;
      Array.prototype.forEach.call(target.tl.querySelectorAll(".tl-item"), function (n) { n.remove(); });
      list.forEach(function (it) {
        var row = el("div", "tl-item");
        row.appendChild(el("div", "date", tk(sectionName, it, dateField).value));
        row.appendChild(el("h3", null, tk(sectionName, it, "title").value));
        var det = tk(sectionName, it, detailField).value;
        var lines = (Array.isArray(det) ? det : [det]).filter(Boolean);
        lines.forEach(function (p) {
          row.appendChild(hl ? selfP(null, fixText(p)) : el("p", null, fixText(p)));   // 同上：先套内容更正
        });
        /* 源详情行补回（2026-09-19 核对发现，英文荣誉页信息缺失的根因）：
         * 中文页的「完成人名单 / 证书编号 / 完成单位」等行来自 data.details_json，
         * 而英文层此前只取 description **一行** ⇒ 英文荣誉页比中文少 2/3 的内容（实测：中文 3 条含本人姓名，英文只 1 条）。
         * 按站点既有规则「未译内容回退中文」补回，并显式标 lang="zh-CN"（译文补上后 tk() 会自动改显英文）。 */
        if (hl) {
          // 已在页面上出现过的文本（译文行 + 该行译文所对应的中文原文）都不再重复补
          var shown = lines.join("\u0000") + "\u0000" + String(it[detailField] || "") + "\u0000" + String(CORE.norm ? it[detailField] || "" : "");
          var src = [];
          try { src = JSON.parse(it.details_json || "[]"); } catch (e) { src = []; }
          if (!Array.isArray(src)) src = [src];
          src.forEach(function (line) {
            if (!line || shown.indexOf(line) > -1) return;
            var p = selfP(null, fixText(line));
            p.setAttribute("lang", "zh-CN");
            row.appendChild(p);
          });
        }
        target.tl.appendChild(row);
      });
      setCount(target.h2, list.length);
    });
  }

  function renderCv(d) { renderSectionTimelines("cv", d.cv || [], CV_SEC, "date", "details", false); }
  function renderHonors(d) { renderSectionTimelines("honors", d.honors || [], HONOR_SEC, "awarded_at", "description", true); }

  // ---------- media.html：报道卡片 ----------
  function renderMedia(d) {
    var items = d.media || [];
    var grid = document.querySelector(".media-grid");
    if (!grid || !items.length) return;
    Array.prototype.forEach.call(grid.querySelectorAll("a.record-card"), function (n) { n.remove(); });
    items.forEach(function (it) {
      var card = el("a", "record-card linked");
      card.href = fixUrl(it.url) || "#";
      card.target = "_blank"; card.rel = "noreferrer";
      var meta = el("div", "card-meta");
      meta.appendChild(el("span", null, it.published_at || ""));
      meta.appendChild(el("span", null, tk("media", it, "media_type").value));
      card.appendChild(meta);
      card.appendChild(el("h3", null, tk("media", it, "title").value));
      if (it.source) card.appendChild(el("p", null, tk("media", it, "source").value));
      var sl = el("span", "source-link", "Read the original");
      sl.appendChild(el("span", "card-arrow", " ↗"));
      card.appendChild(sl);
      grid.appendChild(card);
    });
    var note = document.querySelector(".note");
    if (note) note.textContent = items.length + " entries, each linked to its original source.";
  }

  // ---------- research.html / 首页：方向卡（含手写外链 ⇒ 只就地改文本） ----------
  function renderDirections(d) {
    var dirs = d.research_directions || [];
    if (!dirs.length) return;
    // 首页有多个 .grid-3，取**含 .idx 的那个**（方向卡），不能盲取第一个
    var grid = null;
    Array.prototype.some.call(document.querySelectorAll(".grid-3"), function (g) {
      if (g.querySelector(".idx")) { grid = g; return true; }
      return false;
    });
    if (!grid) return;
    var byIdx = {};
    dirs.forEach(function (x) { byIdx[String(x.idx)] = x; });
    Array.prototype.forEach.call(grid.querySelectorAll("article.card"), function (card) {
      var idxEl = card.querySelector(".idx");
      var dir = idxEl ? byIdx[String(idxEl.textContent).trim()] : null;
      if (!dir) return;
      var h3 = card.querySelector("h3");
      if (h3) h3.textContent = tk("dir", dir, "title").value;
      var p = card.querySelector("p");
      if (p && dir.desc) p.textContent = tk("dir", dir, "desc").value;
      // 手写的「Public evidence ↗」外链原样保留
    });
  }

  // ---------- research.html / industry.html：项目卡 ----------
  function renderProjects(d) {
    var path = location.pathname || "";
    var isIndustry = /industry\.html/.test(path);
    var isResearch = /research\.html/.test(path);
    if (!isIndustry && !isResearch) return;
    var name = isIndustry ? "industry" : "rproj";
    var items = SECTIONS[name].arr(d);
    if (!items.length) return;
    var cards = document.querySelectorAll("article.pub");
    if (!cards.length) return;
    var box = cards[0].parentNode;
    if (!box) return;
    Array.prototype.forEach.call(cards, function (n) { n.remove(); });
    items.forEach(function (p) {
      var art = el("article", "pub");
      var meta = el("div", "meta");
      meta.appendChild(el("span", "badge badge-year", p.period || ""));
      art.appendChild(meta);
      art.appendChild(el("h3", null, tk(name, p, "title").value));
      var spec = null;
      CORE.activeFields(name, p).forEach(function (f) { if (f.field === "kv") spec = f; });
      var kvRes = spec ? tk(name, p, "kv") : { value: null };
      appendKV(art, CORE.kvWithLabels(name, kvRes.value, spec ? spec.live : {}));
      box.appendChild(art);
    });
  }

  // ---------- 分发 ----------
  function apply(d) {
    if (!d) return;
    // 只在成果页跑分类重建：研究/产业页的 article.pub 是项目卡，不能当成果分类处理
    if (/publications\.html/.test(location.pathname || "")) renderPublications(d);
    if (document.querySelector(".media-grid")) renderMedia(d);
    var tls = document.querySelectorAll("main .timeline");
    if (tls.length === 3) renderCv(d);
    if (tls.length === 2) renderHonors(d);
    if (document.querySelector(".grid-3 .idx")) renderDirections(d);
    renderProjects(d);
    try {
      console.log("[site-render-en] 译文状态 ok=" + REPORT.ok + " stale=" + REPORT.stale + " missing=" + REPORT.missing);
    } catch (e) { /* ignore */ }
  }

  // ---------- 启动 ----------
  if (!window.__SITE_DATA__ && typeof fetch !== "function") return;
  function boot() {
    loadData().then(apply).catch(function () { /* 保持烘焙英文内容 */ });
  }
  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
