# 人力分配工具 · Workforce Allocation Tool

一个面向研发团队的**每周人力排期工具**，支持 AI 智能分配、截图识别导入、甘特图可视化和历史归档。所有数据存储在本地浏览器，无需后端服务。

---

## 功能概览

### 成员管理
- 录入团队成员、可用人天（0~5天）和技能标签
- 支持上传排期截图，AI 自动识别成员姓名与可用工时

### 需求管理
- 填写需求标题、优先级（数值越小越紧急）、所需人天与技能
- 标记「本周必完」或「可跨周推进」
- 支持上传需求排期截图，AI 自动提取标题、优先级、各端人天等字段

### AI 智能分配
- 对接兼容 OpenAI 格式的 LLM API（支持私有部署模型）
- 根据优先级、技能匹配、可用工时自动生成排期方案
- 无法调用 AI 时自动降级为规则分配

### 甘特图
- SVG 自绘甘特图，按成员可用工时进行右对齐反向排期
- 区分「本周必完」（实色）与「可跨周」（半透明 + 虚线边框）任务

### 历史归档
- 随时「归档本周」，将当前成员、需求、分配结果打包为快照
- 历史记录页支持查看当时的需求列表与甘特图（只读）
- 最多保留 50 条，数据存于 localStorage

---

## 快速开始

```bash
# 安装依赖
npm install

# 本地开发（http://localhost:8080）
npm run dev

# 生产构建（输出单个 HTML 文件）
npm run build
```

> 构建产物为 `dist/index.html`，单文件包含所有资源，可直接双击打开或部署到任意静态托管。

---

## AI 配置

进入「设置」页面，填写：

| 字段 | 说明 |
|---|---|
| API 地址 | 兼容 OpenAI 格式的 base URL，如 `https://api.openai.com` |
| API Key | 对应服务的访问密钥 |
| 模型名称 | 如 `gpt-4o`、`qwen-vl-max` 等 |

配置仅保存在本地浏览器，不会上传到任何地方。

---

## 技术栈

- **React 18** + **Vite**
- **Tailwind CSS** + **Framer Motion**
- **Zustand**（状态管理 + localStorage 持久化）
- **React Router v7**（HashRouter）
- LLM Vision API（截图识别，兼容 OpenAI Chat Completions 格式）

---

## License

MIT
