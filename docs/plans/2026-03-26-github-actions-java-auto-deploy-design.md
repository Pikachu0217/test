# GitHub Actions：Java 项目自动部署（新增工作流，不影响现有 Pages）

日期：2026-03-26  
范围：仅新增 `.github/workflows/java-deploy.yml`（不修改当前 `.github/workflows/pages.yml`）

## 背景与目标

当前仓库已有 `pages.yml` 用于部署 `site/` 静态站点到 GitHub Pages。

本次希望新增一个**独立的** GitHub Actions 工作流，用于 **Java 项目** 的自动构建与“可选的自动部署”，满足：

- 不改动、不干扰现有 Pages 工作流。
- 对不同 Java 项目结构更友好（单仓库/子目录、Maven/Gradle）。
- 允许“只构建”或“构建 + 推送镜像 + 远程部署”两种模式。
- 默认行为尽量安全：仓库里没有 Java 项目时工作流也不应失败（自动跳过）。

## 方案概述

新增工作流：`.github/workflows/java-deploy.yml`

工作流分为两段：

1. **Build（构建）**
   - 自动探测 Java 项目目录（`pom.xml` / `gradlew` / `build.gradle*`）。
   - 根据探测结果选择 Maven 或 Gradle 构建（默认跳过测试，可自行改为跑测试）。

2. **Deploy（部署，可选）**
   - 若存在 `Dockerfile` 且配置允许，则构建 Docker 镜像并推送到 GitHub Container Registry（GHCR）。
   - 若配置了 SSH 相关 Secrets，则通过 SSH 在远程服务器执行自定义部署脚本（例如 `docker compose pull && docker compose up -d`）。

> 为什么选择 GHCR：无需额外第三方镜像仓库，配合 `GITHUB_TOKEN` 即可在 Actions 里推送（服务器侧拉取建议用单独 token）。

## 触发策略

- `push` 到 `main/master`：自动运行（用于持续交付）。
- `workflow_dispatch`：允许手动触发（便于首次验证/回滚）。

并发控制：

- 使用 `concurrency` 分组 `java-deploy`，避免同分支多次 push 触发并行部署导致相互覆盖。

## 可配置项（通过 env / Secrets）

工作流提供下列可配置项（都写在 YAML 里并附带注释）：

- `JAVA_PROJECT_DIR`：手动指定 Java 项目目录（单仓库/多模块时更可靠）。
- `DOCKER_PUSH`：是否推送镜像到 GHCR（需要 `Dockerfile`）。

部署相关 Secrets（可选，未配置则自动跳过部署阶段）：

- `DEPLOY_HOST`：服务器地址
- `DEPLOY_USER`：SSH 用户名
- `DEPLOY_SSH_KEY`：SSH 私钥（多行文本）
- `DEPLOY_PORT`：SSH 端口（可选，默认 22）
- `DEPLOY_SCRIPT`：远程执行脚本（建议用 `bash`，可写多行）

此外，为了让服务器能 `docker pull ghcr.io/...`，建议再准备：

- `DEPLOY_GHCR_USER`：GHCR 用户名（通常用你的 GitHub 用户名）
- `DEPLOY_GHCR_TOKEN`：具备 `read:packages` 的 PAT（或组织级 token）

> 注意：GitHub Actions 里的 `GITHUB_TOKEN` 不适合直接复制到服务器长期使用；服务器应使用独立的、最小权限的 token。

## 约束与已知风险

- 仓库当前是纯前端示例工程，并没有 Java 代码：因此工作流会先探测 `pom.xml/gradlew`，**探测不到就跳过**，避免误报失败。
- Docker 镜像构建要求 Java 项目目录下存在 `Dockerfile`；否则只做 Java 构建（不推镜像、不部署）。
- 真正的“自动部署”依赖你的目标环境（VPS/K8s/云平台）。这里用 `DEPLOY_SCRIPT` 让你自由定制，避免把部署逻辑写死。

## 验证方式

1. 在 GitHub 仓库新增该工作流后，手动 `Run workflow`：
   - 若仓库里仍无 Java 项目，应显示“跳过”并成功结束。
2. 当你加入 Java 项目（含 `pom.xml` 或 `gradlew`）后：
   - Build job 应能正确识别并构建。
3. 当你加入 `Dockerfile` 并打开 `DOCKER_PUSH`：
   - Actions 应能推送镜像到 GHCR。
4. 配置部署 Secrets 后：
   - Deploy job 应通过 SSH 执行你的脚本并完成远程更新。

