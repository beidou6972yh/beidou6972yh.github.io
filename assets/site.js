/* 任昱衡学术主页 · 动效层（渐进增强）
 * - 标记 html.js，使 CSS 揭示/入场动效仅在 JS 可用时生效
 * - 滚动揭示：IntersectionObserver 给 .section/.card/.pub/.record-card/.stat/.contact-card/.jy-phase/.page-head 等加 .reveal + .is-visible
 * - 导航滚动态：滚动超过 8px 给 .site-header 加 .scrolled（加深阴影）
 * - 尊重 prefers-reduced-motion：直接全部可见，不做动画
 */
(function () {
  "use strict";
  var root = document.documentElement;
  root.classList.add("js");

  var reduce = window.matchMedia &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  // 需要揭示的容器/卡片选择器
  // 注意：成果页 .pub 由底部 inline 脚本包裹为 .pub-row/.pub-body，且数量庞大（150 篇），
  // 交由 IntersectionObserver 揭示极易出现「父级标题可见、子项 .pub 未拿到 .is-visible 而整片透明」的缺陷，
  // 故此处不把 .pub 纳入揭示动画，成果文章始终直接可见。
  // 同样：成果页的 .cat-section（论文/专利/软著/著作/标准）每个都装着几十上百条、section 极高，
  // 且非当前分类默认 display:none；若给它们加 .reveal(opacity:0)，阈值 0.08 在高 section 上首屏永远达不到，
  // 切 tab 时 display:none 元素也永远不进入视口 → 整片永久透明。所以 .cat-section 直接排除，内容区永远可见。
  var SEL = ".section:not(.cat-section), .card, .record-card, .stat, .contact-card, " +
            ".jy-phase, .page-head, .media-grid > *, .card-grid > *";
  var targets = Array.prototype.slice.call(document.querySelectorAll(SEL));

  if (reduce || !("IntersectionObserver" in window)) {
    targets.forEach(function (el) { el.classList.add("is-visible"); });
  } else {
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting) {
          e.target.classList.add("is-visible");
          io.unobserve(e.target);
        }
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0 });

    targets.forEach(function (el) {
      el.classList.add("reveal");
      io.observe(el);
    });

    // 兜底：无论 IntersectionObserver 是否触发，1.5s 后强制让所有 .reveal 元素可见，
    // 杜绝「长内容 section / display:none 后切出」等边界情况下内容永久透明。
    setTimeout(function () {
      Array.prototype.forEach.call(document.querySelectorAll(".reveal"), function (el) {
        el.classList.add("is-visible");
      });
    }, 1500);
  }

  // 导航滚动态
  var header = document.querySelector(".site-header");
  if (header) {
    var onScroll = function () {
      header.classList.toggle("scrolled", window.scrollY > 8);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }
})();
