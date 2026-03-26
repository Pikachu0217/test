# 设计文档：简单 JS Web 应用 + GitHub Pages 自动部署

日期：2026-03-26  
项目目录：`/Users/pakachuzy/Desktop/zzz/project/test`

## 1. 背景与目标

希望用 JavaScript 开发一个**简单、可直接运行**的 Web 应用，并通过 GitHub 的自动化能力实现**每次 push 自动部署**到 GitHub Pages。

约束与原则：

- **零依赖**：不引入任何前端框架或构建工具，直接静态资源运行。
- **可本地启动**：提供一条命令即可启动本地服务器（不用额外安装 npm 包）。
- **可维护**：代码结构清晰，关注复用（工具函数、状态管理、渲染、事件分层）。
- **易部署**：通过 GitHub Actions 将 `site/` 目录一键部署到 GitHub Pages。

## 2. 功能范围

应用选择：Todo 清单。

支持能力：

- 新增 / 完成 / 删除任务
- 筛选（全部 / 进行中 / 已完成）
- 搜索（关键字匹配）
- 本地持久化：浏览器 `localStorage`
- JSON 导入 / 导出（便于备份与迁移）

## 3. 目录结构

```
.
├─ site/                      # 纯静态站点（GitHub Pages 部署目录）
│  ├─ index.html
│  ├─ style.css
│  └─ app.js
├─ scripts/
│  └─ dev-server.js           # 零依赖静态文件服务器（本地启动）
├─ .github/workflows/
│  └─ pages.yml               # GitHub Actions：自动部署到 Pages
├─ package.json               # 仅用于提供 npm script（不依赖第三方包）
└─ README.md                  # 使用说明
```

## 4. 关键设计

### 4.1 状态管理（单一状态源）

在 `site/app.js` 中使用 `state` 作为应用唯一状态源：

- `state.todos`: 任务数组
- `state.filter`: 过滤条件（`all | active | done`）
- `state.keyword`: 搜索关键词

统一通过 `setState(patch)` 更新状态：

- 合并 patch
- 持久化到 `localStorage`
- 触发 `render()`

这样可以避免在多个事件回调里散落 `render()` 调用，逻辑更集中。

### 4.2 安全与可维护性

- 渲染列表使用 `<template>` + `textContent`，避免拼接 HTML 造成 XSS 风险。
- `localStorage` 读取时做轻量校验与归一化，避免脏数据导致页面崩溃。
- 通用工具函数集中管理（ID、JSON 解析、下载）。

### 4.3 本地启动方式

提供 `scripts/dev-server.js`：

- 仅开放 `site/` 目录
- 防目录穿越（`..`）
- 支持 `GET/HEAD`
- 默认监听 `127.0.0.1:5173`

启动命令：

```bash
npm run start
```

## 5. GitHub Pages 自动部署

工作流文件：`.github/workflows/pages.yml`

流程：

1. `actions/checkout` 拉取代码
2. `actions/configure-pages` 配置 Pages
3. `actions/upload-pages-artifact` 上传 `site/` 作为站点产物
4. `actions/deploy-pages` 发布到 GitHub Pages

一次性 GitHub 仓库配置：

- `Settings` → `Pages` → `Source` 选择 `GitHub Actions`

后续每次 push（到 `main` 或 `master`）都会自动部署。

## 6. 后续可扩展方向（可选）

- 添加任务优先级、截止日期、排序方式
- 任务编辑（双击编辑 / 保存）
- UI 提示替换 alert 为无依赖 toast（纯 DOM 实现）
- 导出/导入支持合并策略配置（覆盖 / 去重 / 追加）

