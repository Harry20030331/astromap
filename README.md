# AstraMap

面向占星师的移动端优先 AI 工作台（MVP）。产品说明见 [docs/prd.md](docs/prd.md)、[docs/mvp.md](docs/mvp.md)。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `apps/web` | Next.js 前端（Vercel） |
| `services/api` | FastAPI 后端（Render 或本地） |
| `docs/` | PRD、MVP、规则等文档（保留） |

**会话与图表数据**：运行时由 API 通过 **Supabase** 读写；不在仓库中保存用户 JSON。本地若曾存在 `services/data/sessions/`，仅为历史遗留，可忽略或删除。

## 星历许可说明

星盘计算经 **Kerykeion** 使用 Swiss Ephemeris，依赖链可能涉及 GPL/AGPL 类许可；商业化分发前请自行核对。

## 环境要求

- Node.js 20+
- Python 3.11+（API；也可用 Conda，见 `services/api/environment.yml`）

## 本地开发

### 1. API（`services/api`）

```bash
cd services/api
python -m venv .venv && source .venv/bin/activate   # 或: conda env create -f environment.yml && conda activate astramap-api
pip install -r requirements.txt
cp .env.example .env
# 在 .env 中填写：OPENAI_API_KEY、SUPABASE_URL、SUPABASE_SERVICE_KEY（必填）；可选 GEONAMES_USERNAME、CORS_ORIGINS
uvicorn app.main:app --reload --port 8000
```

`app.main` 使用 **`supabase_store`** 持久化会话；`local_json` 仅用于测试夹具，日常开发也应配置 Supabase 与线上一致。

### 2. Web（`apps/web`）

```bash
cd apps/web
npm install
cp .env.example .env.local
# .env.local：NEXT_PUBLIC_API_URL（默认 http://localhost:8000）、NEXT_PUBLIC_SUPABASE_* 
npm run dev
```

浏览器打开 http://localhost:3000

## 部署（Vercel + Render）

根目录 [`render.yaml`](render.yaml) 提供 **Render Blueprint**（仅 API）。前端在 Vercel 单独连接同一仓库。

### API（Render）

1. 将仓库推到 GitHub（含 `render.yaml`）。
2. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint** → 选择该仓库。
3. 服务创建后，在 **Environment** 至少配置：`OPENAI_API_KEY`、`SUPABASE_URL`、`SUPABASE_SERVICE_KEY`、`CORS_ORIGINS`（你的 Vercel 生产域名，多个用逗号分隔）。
4. 可选：自定义域名如 `api.astramap.app`，按 Render 提示在 DNS（如 Namecheap）添加 CNAME。

### Web（Vercel）

1. [Vercel](https://vercel.com) → **Add New Project** → 导入 GitHub 仓库。
2. **Root Directory** 设为 `apps/web`。
3. **Environment Variables**：`NEXT_PUBLIC_API_URL`（Render API 地址）、`NEXT_PUBLIC_SUPABASE_URL`、`NEXT_PUBLIC_SUPABASE_ANON_KEY`（见 `apps/web/.env.example`）。
4. **Domains** 绑定主站域名；DNS 按 Vercel 给出的 A/CNAME 在注册商处配置。

[`apps/web/vercel.json`](apps/web/vercel.json) 含 `ignoreCommand`：仅当本次提交未改动 `apps/web` 下文件时会跳过前端构建；若希望每次推送都构建，可删除该字段。

### 自动部署

推送到默认生产分支（一般为 `main`）会触发 Vercel 生产部署与（若已连接）Render 构建；其他分支 / PR 通常得到 Vercel Preview URL。

## 上线前检查清单

- [ ] Render：API 环境变量已设，健康检查 `/health` 通过。
- [ ] Vercel：前端环境变量指向生产 API 与 Supabase。
- [ ] Supabase：项目与 RLS/策略与当前应用假设一致（服务角色仅在后端使用）。
- [ ] `CORS_ORIGINS` 包含实际用户访问的前端来源。
- [ ] （可选）Google Search Console：保留 `apps/web/public/google*.html` 验证文件。
- [ ] 站点图标：`apps/web/src/app/icon.png`、`apple-icon.png` 已提交并重新部署。

## 可选：命令行发版（Vercel）

在 `apps/web` 执行 `npx vercel login` 后可用 `npx vercel --prod`；一般更推荐依赖 Git 集成，避免与自动部署重复。
