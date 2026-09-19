/*
 * site-i18n-core.js — 中英双语层的**单一真源**（页面刷新层与后台清单共用）
 * ==========================================================================
 * 为什么单独抽出来：
 *   「英文运行时刷新层」(site-render-en.js) 与「后台英文待译清单」(admin-en-todo.js)
 *   必须给出**完全一致**的判定结果 —— 否则后台说"都译好了"、页面却在回退中文，这种不一致
 *   比没有清单更糟。所以键的取法、三态判定、取值口径全部只写在这里一份。
 *
 * 与 en-build/build-en-tm.py 的对应关系（改一边必须改另一边）：
 *   KEYS    ← 生成器的 key 取法（有 id 按 id，成果按中文标题原文，方向按 idx）
 *   FIELDS  ← 生成器为每个分节收录的字段集合
 *   LIVE    ← 生成器写进 src 的「中文源文」口径（honors 取 raw||at；kv 为对象；明细按整段比对）
 *
 * 三态：
 *   ok      译文存在且 src == 线上中文  → 用译文
 *   stale   译文存在但 src != 线上中文  → **仍用译文**（不把英文页回退成中文），计入待复核
 *   missing 没有译文（多为新增条目）    → 回退中文，计入待译
 */
(function () {
  "use strict";

  // 键序无关的规范串：译文记忆落盘时对象键被排序，直接 JSON.stringify 会把
  // 「同内容不同键序」误判成 stale（v1 踩过：industry 18/18 + research 5/5 全假 stale）
  function stable(v) {
    if (v == null) return "";
    if (Array.isArray(v)) return "[" + v.map(stable).join(",") + "]";
    if (typeof v === "object") {
      return "{" + Object.keys(v).sort().map(function (k) {
        return JSON.stringify(k) + ":" + stable(v[k]);
      }).join(",") + "}";
    }
    return JSON.stringify(v);
  }

  function norm(v) {
    if (v == null) return "";
    if (typeof v === "object") return stable(v);
    return String(v).trim();
  }

  function parseKV(json) {
    try { return JSON.parse(json || "{}"); } catch (e) { return {}; }
  }

  function lines(s) {
    return String(s == null ? "" : s).split("\n").filter(Boolean);
  }

  /** 线上值为空 ⇒ 无内容可译，**不参与**统计（生成器也不会为空值建条目）。
      踩过的坑：把空 details 也当 missing，cv 凭空多出 21 条"待译"。 */
  function isEmptyLive(v) {
    if (v == null) return true;
    if (typeof v === "string") return v.trim() === "";
    if (Array.isArray(v)) return v.length === 0;
    if (typeof v === "object") return Object.keys(v).length === 0;
    return false;
  }

  // ---------- 分节定义 ----------
  // arr: 从 site-data.json 取哪个数组；key: 稳定键；fields: 参与翻译的字段及其口径
  var SECTIONS = {
    cv: {
      label: "履历",
      arr: function (d) { return d.cv || []; },
      key: function (it) { return "cv:" + it.id; },
      fields: function (it) {
        return [
          { field: "date", live: it.date || "", mode: "text" },
          { field: "title", live: it.title || "", mode: "text" },
          { field: "details", live: it.details || "", mode: "lines" }
        ];
      }
    },
    honors: {
      label: "荣誉",
      arr: function (d) { return d.honors || []; },
      key: function (it) { return "honors:" + it.id; },
      fields: function (it) {
        return [
          // 与生成器一致：src 取 awarded_at_raw || awarded_at
          { field: "awarded_at", live: it.awarded_at_raw || it.awarded_at || "", mode: "text" },
          { field: "title", live: it.title || "", mode: "text" },
          // 英文烘焙契约：每个条目只输出一个 <p>（description_en or description）
          { field: "description", live: it.description || "", mode: "text" }
        ];
      }
    },
    journey: {
      label: "历程",
      arr: function (d) { return d.journey || []; },
      key: function (it) { return "journey:" + it.id; },
      fields: function (it) {
        return [
          { field: "text", live: it.text || "", mode: "text" },
          { field: "type", live: it.type || "", mode: "text" }
        ];
      }
    },
    media: {
      label: "媒体报道",
      arr: function (d) { return d.media || []; },
      key: function (it) { return "media:" + it.id; },
      fields: function (it) {
        return [
          { field: "title", live: it.title || "", mode: "text" },
          { field: "source", live: it.source || "", mode: "text" },
          { field: "media_type", live: it.media_type || it.type || "", mode: "text" }
        ];
      }
    },
    industry: {
      label: "产业项目",
      arr: function (d) { return d.projects_industry || []; },
      key: function (it) { return "industry:" + it.id; },
      fields: function (it) {
        return [
          { field: "title", live: it.title || "", mode: "text" },
          { field: "description", live: it.description || "", mode: "text" },
          { field: "kv", live: parseKV(it.kv_json), mode: "kv" }
        ];
      }
    },
    rproj: {
      label: "科研项目",
      arr: function (d) { return d.projects_research || []; },
      key: function (it) { return "rproj:" + it.id; },
      fields: function (it) {
        return [
          { field: "title", live: it.title || "", mode: "text" },
          { field: "kv", live: parseKV(it.kv_json), mode: "kv" }
        ];
      }
    },
    dir: {
      label: "研究方向",
      arr: function (d) { return d.research_directions || []; },
      key: function (it) { return "dir:" + it.idx; },
      fields: function (it) {
        return [
          { field: "title", live: it.title || "", mode: "text" },
          { field: "desc", live: it.desc || "", mode: "text" }
        ];
      }
    },
    pub: {
      label: "成果",
      arr: function (d) { return d.publications || []; },
      key: function (it) { return "pub:" + String(it.title || "").trim(); },
      fields: function (it) {
        return [
          { field: "title", live: it.title || "", mode: "text" },
          { field: "authors", live: it.authors || "", mode: "text" },
          { field: "venue", live: it.venue || "", mode: "text" }
        ];
      }
    }
  };

  // 项目四要素的英文标签（英文页上是这两套，实测确认）
  var KV_LABELS = {
    industry: { "牵头单位": "Client / funder", "项目角色": "Role", "项目金额": "Funding", "项目内容": "Content" },
    rproj: { "牵头单位": "Lead institution", "项目角色": "Role", "项目金额": "Funding", "项目内容": "Content" }
  };

  // ---------- 单项判定 ----------
  /** 返回 {state, value}：value 为应显示的内容（text→字符串 / lines→字符串数组 / kv→对象） */
  function classify(entries, key, field, live, mode) {
    var e = entries[key];
    var en = e && e.en ? e.en[field] : null;
    // lines 模式无论命中与否都返回数组，调用方不用再分支
    function asLines(v) { return Array.isArray(v) ? v.filter(Boolean) : lines(v); }
    if (en == null) {
      return { state: "missing", value: mode === "lines" ? asLines(live) : live };
    }
    var src = e && e.src ? e.src[field] : null;
    var state = (norm(src) === norm(live)) ? "ok" : "stale";
    if (mode === "lines") return { state: state, value: asLines(en) };
    return { state: state, value: en };
  }

  /** 把 kv 译文按分节标签映射成 {英文标签: 值}；缺译文时回退中文值（原样，标待译） */
  function kvWithLabels(section, en, liveKv) {
    var map = KV_LABELS[section] || {};
    var out = {};
    if (en) {
      Object.keys(en).forEach(function (k) { out[map[k] || k] = en[k]; });
    } else {
      Object.keys(liveKv || {}).forEach(function (k) { out[map[k] || k] = liveKv[k]; });
    }
    return out;
  }

  /** 只返回「线上确有内容」的字段规格 —— 页面刷新层与后台清单都用它，口径才一致 */
  function activeFields(sectionName, it) {
    return SECTIONS[sectionName].fields(it).filter(function (f) { return !isEmptyLive(f.live); });
  }

  // ---------- 全量体检（后台清单用；页面刷新层只关心自己那页） ----------
  function audit(tmDoc, data) {
    var entries = (tmDoc && tmDoc.entries) || {};
    var res = { ok: 0, stale: 0, missing: 0, total: 0, sections: {}, items: [] };
    Object.keys(SECTIONS).forEach(function (name) {
      var sec = SECTIONS[name];
      var list = sec.arr(data) || [];
      var stat = { label: sec.label, items: list.length, ok: 0, stale: 0, missing: 0 };
      list.forEach(function (it) {
        var key = sec.key(it);
        activeFields(name, it).forEach(function (f) {
          var r = classify(entries, key, f.field, f.live, f.mode);
          stat[r.state]++;
          res[r.state]++;
          res.total++;
          if (r.state !== "ok") {
            res.items.push({
              section: name, cid: sec.label, key: key, field: f.field,
              state: r.state, zh: f.mode === "kv" ? JSON.stringify(f.live) : String(f.live).slice(0, 300)
            });
          }
        });
      });
      res.sections[name] = stat;
    });
    return res;
  }

  window.__SITE_I18N__ = {
    stable: stable, norm: norm, parseKV: parseKV, lines: lines,
    SECTIONS: SECTIONS, KV_LABELS: KV_LABELS,
    classify: classify, kvWithLabels: kvWithLabels, audit: audit,
    isEmptyLive: isEmptyLive, activeFields: activeFields
  };
})();
