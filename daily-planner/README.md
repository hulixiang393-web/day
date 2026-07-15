# 🌸 二次元跨端计划表

跨平台二次元风格日程管理应用，纯前端实现，无需服务器。

## 功能特性

### 📋 核心日程管理
- 任务 CRUD：标题、描述、分类、优先级（4级）、截止日期、提醒
- 重复任务：每天/每周/每月/工作日/间隔天数
- 子任务管理
- 标签系统
- 私密任务加密

### 📅 多维度视图
- **日视图**：小时级时间轴
- **周视图**：7天网格布局
- **月视图**：日历卡片 + 任务角标
- **清单视图**：列表筛选排序
- **时间线视图**：二次元动感时间线

### ✅ 习惯打卡
- 自定义习惯创建
- 每日打卡/取消打卡
- 连续天数追踪
- 勋章系统（3天/7天/30天/100天）

### 🍅 番茄钟
- 专注/短休/长休模式
- 圆形进度动画
- 完成计数统计

### 📊 数据统计
- 日/周完成率
- 逾期统计
- 优先级分布
- 分类占比

### 🎨 二次元视觉
- 3套主题：白桃二次元 / 暗夜星穹 / 软蓝日系
- 樱花飘落特效
- 任务完成星光特效
- 交互式看板娘（🐱/🐕/🦊）
- 空状态二次元插画

### ⌨️ 效率功能
- 键盘快捷键（Ctrl+N 新建, Ctrl+K 搜索, Ctrl+1~5 切换视图）
- 全局搜索
- 批量操作
- 数据导出（JSON/CSV/打印）
- PWA 离线支持

## 快速开始

直接在浏览器中打开 `index.html` 即可使用。

```bash
# 或使用任意静态服务器
npx serve daily-planner
# 或
python -m http.server 8080 -d daily-planner
```

## 技术栈

- 原生 JavaScript (ES Modules)
- CSS Custom Properties (三套主题)
- IndexedDB (数据持久化)
- Service Worker (离线 PWA)
- Web Crypto API (数据加密)
- Notification API (消息提醒)

## 浏览器支持

- Chrome/Edge 90+
- Firefox 90+
- Safari 15+
- 移动端 Chrome/Safari

## 项目结构

```
daily-planner/
├── index.html          # 主入口
├── manifest.json       # PWA 配置
├── sw.js              # Service Worker
├── css/               # 样式系统
│   ├── base/          # 基础 + 变量 + 布局
│   ├── themes/        # 3套主题
│   ├── components/    # 组件样式
│   └── responsive/    # 响应式
├── js/                # JavaScript 模块
│   ├── app.js         # 应用入口
│   ├── core/          # 核心框架
│   ├── data/          # 数据层
│   ├── components/    # UI 组件
│   ├── views/         # 页面视图
│   ├── effects/       # 视觉特效
│   └── utils/         # 工具函数
└── assets/            # 静态资源
```

## 许可证

MIT
