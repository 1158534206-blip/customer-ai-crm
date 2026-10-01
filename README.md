# 客户营销总控台（CRM + AI 运营助手）

面向短视频培训、陪跑、代运营业务的「客户长期运营总控台」。每个客户是一个**独立、长期、可随时修改**的工作空间，不是一次性表单。

## 功能一览

### 客户总控台（首页）

- 全部客户 / 新增客户 / 搜索（按名称、行业、地区、合作类型）
- 下一步任务、待完成作业、最近要上门、最近有新视频数据
- 客户当前阶段与合作分类（培训陪跑 / 代运营 / 咨询 / 意向…）
- 「今天该干什么」优先呈现，而不是堆一个复杂大后台

### 每个客户的工作空间

1. 客户基础资料（行业**自由输入**，例如：冷鲜猪肉、川菜馆、美妆集合店、眉形设计、农村自建房、轻钢别墅、奶茶加盟店、农机、农村夫妻 IP、拼多多工厂运营）
2. 老板个人经历、产品/价格/利润/目标客户、竞品与差异化、账号定位与人设、账号包装
3. 第一次深度访谈（11 组、上百个问题，逐条记录，支持：已问/未问、填写回答、标记「重要」「可拍视频」「下次继续追问」）
4. 整体运营规划（客户诊断、账号定位、一句话人设、目标客户、核心优势、昵称/头像/简介/封面、置顶 3 条、主页前 9 条、3—4 条内容主线、同城/人设/专业/产品/真实经营/热点观点方向、阶段目标）
5. 内容文案库（状态：灵感 → 待写 → 待拍 → 已拍 → 待发布 → 已发布 → 已复盘；每条保存类型、选题、开头钩子、完整口播、镜头设计、补素材、封面标题、拍摄目的、发布时间、数据、复盘）
6. 三次上门培训教案（固定逻辑：定选题 → 写/改文案 → 现场拍 → 边拍边教 → 拍完马上剪 → 边剪边教 → 客户实操 → 现场纠错 → 留作业；第一次团队带着做、第二次客户多做、第三次尽量独立完成）
7. 作业管理（作业日期、内容、截止日期、完成状态、客户提交、反馈、主要问题）
8. 视频数据（播放、点赞、评论、收藏、分享、主页访问、私信、问价格、问地址、咨询、到店、成交；每 5 条可自动提示复盘）
9. 客户时间线（新增、沟通、更新定位、拍摄、上门、交作业、发布、更新数据、AI 复盘、改方向，全部按日期留痕）
10. **AI 运营助手**（自动带上该客户完整档案作为上下文，聊完可「保存到客户档案 / 保存为内容选题 / 保存为培训计划」）

### 登录、备份与安全

- 简单可靠的访问密码（HttpOnly Cookie + HMAC，密码常数时间比较，登录限流）
- 客户数据 JSON 一键导出 / 导入，另有 CSV（Excel 可直接打开）导出
- AI Key 等密钥只放服务器环境变量，绝不进前端或 Git
- 中文界面，移动端优先，简洁专业

## 技术栈

- 后端：Node.js（原生 `http`，零框架），单进程即可运行
- 前端：原生 HTML/CSS/JS 单页应用，响应式 + PWA
- 存储：**PostgreSQL（生产）** / JSON 文件（本地开发），同一套代码自动切换

## 本地运行

需要 Node.js 20+。

```bash
npm install
node server.js
```

打开 <http://localhost:3000>。默认使用 `data/crm.json` 作为本地存储（适合开发/测试，无需数据库）。

## 数据存储

代码通过 `lib/store.js` 提供两个后端，根据 `DATABASE_URL` 自动选择：

| 场景 | 配置 | 说明 |
| --- | --- | --- |
| 本地开发 / 测试 | 不设置 `DATABASE_URL` | 存到 `data/crm.json` |
| 生产（Railway） | 设置 `DATABASE_URL` | PostgreSQL，重启不丢数据 |

PostgreSQL 采用关系表设计（对应客户文档的各个板块）：

- `clients`（客户主表 + `basic` JSONB + `ai_notes`）
- `interviews`（深度访谈逐条回答）
- `operation_plans`（运营规划各字段）
- `contents`（内容文案库）
- `trainings`（上门培训记录）
- `homework`（作业/任务）
- `video_metrics`（视频数据）
- `timeline_events`（时间线）
- `ai_conversations`（AI 对话）

`basic`（客户基础资料）作为 JSONB 存于主表，方便以后新增字段而无需迁移；其余高频、需单独查询的板块拆成独立表。所有表建表语句自动执行（`CREATE TABLE IF NOT EXISTS`），首次连接即完成初始化。

## AI 接口

每个客户详情页里的 AI 助手通过服务端调用 OpenAI 兼容接口，**不会把密钥暴露到浏览器**。服务端会把当前客户的基础档案、深度访谈、运营规划、内容库、培训记录、作业、视频数据、时间线作为上下文一起传给 AI。

```bash
OPENAI_API_KEY=你的密钥
OPENAI_MODEL=gpt-5.6-sol
# 可选：使用其他 OpenAI 兼容服务
# OPENAI_BASE_URL=https://api.openai.com/v1
```

## 环境变量

完整示例见 [`.env.example`](.env.example)。关键变量：

| 变量 | 必填 | 说明 |
| --- | --- | --- |
| `APP_PASSWORD` | 是 | 软件访问密码（不设置则任何人都能打开） |
| `OPENAI_API_KEY` | 否 | AI 助手密钥 |
| `OPENAI_MODEL` | 否 | 模型名，默认 `gpt-5.6-sol` |
| `DATABASE_URL` | 生产建议 | PostgreSQL 连接串 |
| `PGSSLMODE` | 视情况 | Railway 内部建议 `no-verify` |
| `PORT` | 否 | 端口，Railway 自动注入 |

## 部署到 Railway

1. 把本项目推到 GitHub 仓库（建议名为 `customer-ai-crm`）。
2. 在 Railway 新建项目，选择从该 GitHub 仓库部署；启动命令 `node server.js`（已由 `package.json` 的 `start` 脚本提供）。
3. 在项目里添加一个 **PostgreSQL** 插件。
4. 配置环境变量：
   - `DATABASE_URL` = `${{Postgres.DATABASE_URL}}`（引用变量）
   - `PGSSLMODE` = `no-verify`
   - `APP_PASSWORD` = 你的访问密码
   - `OPENAI_API_KEY` = 你的密钥
5. 部署完成后，Railway 会生成一个 HTTPS 访问地址，手机和电脑都能打开。

> 只要设置了 `DATABASE_URL`，数据就存在 PostgreSQL 里，服务重启不会丢失客户数据。

## 测试

```bash
npm test
```

覆盖：存储层保存/读取 round-trip（模拟服务器重启）、客户数据完整性（含全部数据指标字段）、CSV 转义、登录保护、客户新增/读取/重启后仍存在、JSON/CSV 导出。

## 项目结构

```text
server.js          HTTP 入口 + 路由 + 登录鉴权
lib/store.js       存储抽象（FileStore / PostgresStore）
lib/ai.js          AI 调用 + 系统提示词 + 客户上下文构建
lib/csv.js         CSV 导出
public/            前端（index.html / app.js / styles.css / PWA）
test/              测试
.env.example       环境变量示例
Dockerfile         可选容器化部署
```

## 后续迭代

代码刻意把「客户文档」与存储层解耦：新增客户板块时，前端在 `ensureClient` 里补字段、后端在 `store.js` 补对应表/列即可，不需要重写整体结构；`basic` 用 JSONB 承载，加字段无需迁移。
