# 任昱衡 · 学术主页（Yuheng Ren — Academic Homepage）

静态站点（HTML + CSS + JS，无构建步骤）。内容数据在 `assets/site-data.json`。

- 页面：首页 / 研究方向 / 论文 / 荣誉 / 产业 / 媒体 / CV / 联系
- 线上（GitHub Pages）：https://beidou6972yh.github.io/
- 原始站点：http://ryh.ceces.cn:9000/

## 更新方式
1. 改 `assets/site-data.json`（内容）或 HTML/CSS（版式）；
2. `git commit && git push`，GitHub Pages 自动发布（约 1 分钟）。

## 与源站的差异（仅这一处）
- 头像：源站 `assets/avatar.jpg` 是 2936×4116 / **1.67MB** 的原图，而页面里最大只显示到 220px 高 →
  GitHub 侧改成 **439×616 / 26KB**（2 倍屏余量，肉眼无差），原图保留为 `assets/avatar-original.jpg`。
  原因：github.io 在国内**下行慢**（实测同一文件 1.67MB 需 **32 秒**、54KB/s；源站 0.4 秒）。
- 另加 `robots.txt` + `sitemap.xml`（源站没有，利于搜索引擎/AI 抓取）。

> 由灰狼指挥官（DSH 系统管家）代为发布与维护；内容版权归任昱衡所有。
