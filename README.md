# 简单 JS Web 应用 + GitHub Pages 自动部署

这是一个**零依赖**的纯前端小应用（Todo 清单），支持：

- 新增 / 完成 / 删除
- 本地持久化（`localStorage`）
- 搜索、筛选（全部/进行中/已完成）
- JSON 导入 / 导出（方便备份迁移）

## 本地启动

要求：安装 Node.js（建议 18+）。

```bash
npm run start
```

然后打开：

- http://127.0.0.1:5173

> 说明：本项目没有使用任何前端框架或构建工具；`scripts/dev-server.js` 只是一个轻量静态文件服务器，方便你一键本地启动。

## GitHub 自动化部署（GitHub Pages）

仓库里已提供 GitHub Actions 工作流：`.github/workflows/pages.yml`，它会在你 push 到默认分支后自动部署到 GitHub Pages。

你需要在 GitHub 仓库里做一次性配置：

1. `Settings` → `Pages`
2. `Build and deployment` → `Source` 选择 `GitHub Actions`

之后每次 push，都会自动部署 `site/` 目录的静态内容。

