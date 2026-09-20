# 持续服务扩展（v0.3.0）

## 已实现与预留边界

GitHub Pages 使用内置知识、中文意愿提示、Skills 方法，以及用户主动保存的本机访谈。模型连接经现有的上下文预览和用户勾选后，才发送这些内容。没有模型时仍可完成原有规则诊断。公开数据不是用户证据，不参与收益或可行性自动提级。

服务端适配器 `integrations/providers.js` 已实现 WeKnora 检索及 OpenViking 限定用户范围的记忆读取，可通过只读 MCP 服务调用。尚未连接任何外部实例；网页尚不直接调用这些适配器。真实服务写入、账户登录、多租户身份映射和后台任务属于后续部署，不在静态网页伪装提供。

## 部署 MCP 服务

Node.js 22，执行 `npm run mcp`（供开发调试）；MCP 客户端配置使用 `node /绝对路径/ai-opportunity/integrations/mcp-server.js`，避免 npm 日志污染 stdio。

工具：`knowledge_search`、`intent_analyze`、`skills_list`、`memory_search`。支持 stdio JSON-RPC、initialize、ping、tools/list、tools/call。协议版本 2025-11-25。全部只读，无自动下单、写入客户系统或记忆提交工具。现有网页 WebMCP 与此服务端 MCP 是独立入口。

仅在私有服务端环境设置：

| 环境变量 | 含义 |
| --- | --- |
| WEKNORA_URL | 实例根地址，例如 http://127.0.0.1:8080 |
| WEKNORA_KEY | 有检索权限的密钥 |
| WEKNORA_KB | 固定知识库 ID |
| OPENVIKING_URL | 实例根地址，例如 http://127.0.0.1:1933 |
| OPENVIKING_KEY | 有目标用户访问权限的密钥 |
| OPENVIKING_MEMORY_URI | 固定范围，例如 viking://user/alice/memories |

密钥不放入仓库、网页、localStorage 或报告。单个服务进程对应配置的固定用户范围；不向多个未经身份隔离的用户共享该进程。目标 URI 由服务端设置，调用者不能自行切换用户。API key 的实际权限还需由 OpenViking 服务端约束，不能用客户端过滤代替权限。

接口核验来源（2026-09-20）：
- [WeKnora 固定版本 API](https://github.com/Tencent/WeKnora/blob/9aa63c866ff4570767110a6c7d3cf477a4ab955b/docs/api/knowledge-search.md)：POST /api/v1/knowledge-search，X-API-Key，query + knowledge_base_id。
- [OpenViking 固定版本 API](https://github.com/volcengine/OpenViking/blob/f6010a5a1e55519506d9f3181c897fe70c8f76fd/docs/en/api/06-retrieval.md)：POST /api/v1/search/find，X-API-Key，query + target_uri。
- [MCP stdio 规范](https://modelcontextprotocol.io/specification/2025-11-25/basic/transports)。

适配器通过模拟响应测试，未做真实实例联调。部署版本与上述版本不同时，先核验响应结构与权限再接入。

## 知识、记忆和 Skills 如何接续

`data/knowledge.jsonl` 是15个场景的结构化种子，可由部署人员转换导入知识库；`knowledge.js` 是网页运行时版本。标准内容仅有公开元数据和项目分析，不能替代正式标准条文。更新其中一份时同步另一份，执行测试。

`confirmedMemory()` 提供将来写入的结构契约：userId、key、value、source、confirmedAt、supersedes、status。调用它仅构造记录，不代表已经持久化。写入器需在用户核对后执行；更正保留被替代记录；读取内容先确认是否仍适用。当前持续服务通过“保存到本机 / 继续本机访谈”实现，不跨设备同步，不自动上传记忆。

`skills/*/SKILL.md` 可安装到支持 Agent Skills 的宿主；网页与 MCP 使用 `knowledge.js` 中的同版 playbook。分别约束岗位与AI理解访谈、证据和价值判断、长期记忆确认。无互联网下载执行或任意代码工具。修改 Skill 时同时更新运行时 playbook。

未来网页接入路径：Pages → 已认证的私有业务网关 → 用户身份/知识库权限映射 → WeKnora/OpenViking/MCP。不得让网页直接持有服务密钥。扩展不增加日常用户必填表单；保留输入法语音为默认引导。
