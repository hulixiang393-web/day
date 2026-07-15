# 📱 手机端构建指南

## 方式一：PWA 安装（立即可用，无需工具）

1. 在手机上用 **Chrome 浏览器** 打开应用地址
2. 浏览器会自动提示「添加到主屏幕」（或点击菜单 → 添加到主屏幕）
3. 安装后就是一个独立 App，有图标、有启动画面、可离线使用

**优点**：零门槛、自动更新、跨平台（Android + iOS）

---

## 方式二：构建原生 APK（需要 Android Studio）

### 前提条件

安装 **Android Studio**（自带 JDK + Android SDK）：
- 下载：https://developer.android.com/studio
- 安装时勾选 Android SDK Platform 34

### 构建步骤

```bash
cd d:\code\daily-planner

# 1. 初始化 Capacitor Android 平台（仅首次）
npx cap add android

# 2. 同步 Web 资源到 Android 项目
npx cap sync android

# 3. 构建 APK（调试版）
cd android
gradlew assembleDebug

# APK 位置: android/app/build/outputs/apk/debug/app-debug.apk

# 4. 构建 APK（发布版）
gradlew assembleRelease
```

### 一键构建

```bash
npm run build:android
```

---

## 方式三：在线云构建

### PWABuilder
1. 部署应用到公网 URL
2. 访问 https://pwabuilder.com
3. 输入你的 URL，自动生成 APK

### GitHub Actions
已在项目中配置 `.github/workflows/build-android.yml`

---

## 当前 PWA 状态

- ✅ Service Worker 离线缓存
- ✅ 添加到主屏幕安装
- ✅ 自适应移动端布局
- ✅ 触摸手势优化
- ✅ 桌面快捷方式
