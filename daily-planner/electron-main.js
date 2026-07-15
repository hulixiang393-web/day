/* Electron 主进程 — 二次元计划表 */

const { app, BrowserWindow, Tray, Menu, nativeImage, Notification, globalShortcut } = require('electron');
const path = require('path');
const http = require('http');
const fs = require('fs');

// 静态文件 MIME 类型
const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

let mainWindow = null;
let tray = null;
let server = null;
const PORT = 0; // 0 = 自动分配端口

/** 创建内置 HTTP 服务器 (解决 ES Module 的 CORS 问题) */
function createServer(rootDir) {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let filePath = path.join(rootDir, req.url.split('?')[0]);
      if (filePath.endsWith('/')) filePath = path.join(filePath, 'index.html');
      if (!path.extname(filePath)) filePath += '.html'; // SPA fallback

      const ext = path.extname(filePath).toLowerCase();
      const mimeType = MIME_TYPES[ext] || 'application/octet-stream';

      fs.readFile(filePath, (err, data) => {
        if (err) {
          // SPA fallback: 所有未匹配路由返回 index.html
          fs.readFile(path.join(rootDir, 'index.html'), (err2, data2) => {
            if (err2) {
              res.writeHead(404);
              res.end('Not Found');
            } else {
              res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
              res.end(data2);
            }
          });
        } else {
          res.writeHead(200, { 'Content-Type': mimeType });
          res.end(data);
        }
      });
    });

    srv.listen(PORT, '127.0.0.1', () => {
      resolve(srv);
    });
  });
}

/** 创建主窗口 */
function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 800,
    minHeight: 600,
    title: '🌸 二次元计划表',
    icon: path.join(__dirname, 'assets', 'icon.png'),
    frame: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      webSecurity: true,
    },
  });

  mainWindow.loadURL(`http://127.0.0.1:${port}/index.html`);

  // 打开 DevTools (开发时)
  if (process.argv.includes('--dev')) {
    mainWindow.webContents.openDevTools();
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

/** 创建系统托盘 */
function createTray() {
  // 使用 emoji 作为图标 (通过 canvas 生成)
  const icon = nativeImage.createFromDataURL(
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAACXBIWXMAAAsTAAALEwEAmpwYAAABGklEQVQ4ja2TvUoDQRSFv5nZn6y7RhCx00LwJXwHH8AnECtfQbCysRBrK0F8BUFrGxErtfIRbHwAi2wRYWcj/s3OTDF3dQmxMIEThsPcOXPv+c6h6H+USoBzYBmYCPoZMBb0ayBivYEnSQlgnUgPgwXwgILVAU8Ei3gfkXoPZkHy7qBZBOPAdR5kEvQQXB3Ap5u0AKwB/wLbXAAmbVMGFoGfFHF4B1CBBngHFm1TBC6BCxt4CO7XzKcljW2AniVnIIKbgfuxtP8TaJyD0l0osBZZOQk0m9d6B0Hgo5V5/FcBd1FUqL0mglIubY6CxE9Mq9V1sO2ug/DusBs5m3VA1DqgOgN6bn/IqzYPY7B1RCsFq6k2Rh3vnwPQN/WNgoGuQuH8AAAAAElFTkSuQmCC'
  );

  tray = new Tray(icon.resize(16, 16));
  tray.setToolTip('🌸 二次元计划表');

  const contextMenu = Menu.buildFromTemplate([
    { label: '显示主窗口', click: () => { if (mainWindow) mainWindow.show(); } },
    { label: '新建任务 (Ctrl+N)', click: () => { if (mainWindow) { mainWindow.show(); mainWindow.webContents.executeJavaScript("window.location.hash='#/list'"); } } },
    { type: 'separator' },
    { label: '退出', click: () => { app.quit(); } },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on('double-click', () => {
    if (mainWindow) mainWindow.show();
  });
}

/** 注册全局快捷键 */
function registerShortcuts() {
  globalShortcut.register('CommandOrControl+N', () => {
    if (mainWindow) {
      mainWindow.show();
      mainWindow.webContents.executeJavaScript("document.getElementById('btn-quick-add')?.click()");
    }
  });
}

app.whenReady().then(async () => {
  const rootDir = __dirname;

  // 启动内置服务器
  server = await createServer(rootDir);
  const port = server.address().port;
  console.log(`Server running at http://127.0.0.1:${port}`);

  // 创建窗口
  createWindow(port);
  createTray();
  registerShortcuts();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow(port);
  });
});

// 关闭时最小化到托盘 (不退出)
app.on('window-all-closed', () => {
  // Windows 上允许关闭到托盘
});

app.on('before-quit', () => {
  globalShortcut.unregisterAll();
});

// 退出时关闭服务器
app.on('will-quit', () => {
  if (server) server.close();
});
