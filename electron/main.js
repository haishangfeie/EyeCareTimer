const {
  app,
  BrowserWindow,
  Tray,
  Menu,
  ipcMain,
  dialog,
  shell,
} = require('electron');
const path = require('path');
const Store = require('electron-store').default;
const AutoLaunch = require('auto-launch');
const fs = require('fs');

let tray = null;
let configWindow = null;

let workTimer = null;
let breakTimer = null;

let breakWindow = null;

let nextBreakTime = void 0;

const PREPARE_HIDE_MS = 20_000; // 20秒

let isQuitting = false;

// 日志目录
const logDir = path.join(app.getPath('userData'), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir);
}

const store = new Store({
  projectName: 'eye-care-timer',
  defaults: {
    workMin: 30,
    breakMin: 5,
    autoLaunch: true,
  },
});

const launcher = new AutoLaunch({ name: '护眼时光', path: app.getPath('exe') });

const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  // 没拿到锁，说明已有实例在运行，直接退出
  app.quit();
  return;
}

// 拿到锁，说明这是唯一的实例，可以继续创建窗口和托盘
app.on('second-instance', () => {
  // 如果用户再次双击 exe，就会触发这个事件
  if (configWindow) {
    if (configWindow.isMinimized()) configWindow.restore();
    configWindow.show();
  } else {
    createConfigWindow();
  }
});

app.on('will-quit', () => {
  writeLog('info', '应用正在正常退出');
});

app.on('before-quit', () => {
  isQuitting = true;
});

app.on('window-all-closed', (event) => {
  if (!isQuitting) {
    event.preventDefault(); // 阻止默认退出行为
  }
});

app.whenReady().then(async () => {
  cleanOldLogs(); // 每次启动时清理旧日志

  createTray();
  startWorkTimer();

  const autoLaunch = store.get('autoLaunch');
  if (autoLaunch) {
    if (!(await launcher.isEnabled())) await launcher.enable();
  } else {
    if (await launcher.isEnabled()) await launcher.disable();
  }
});

// IPC 通信：接收配置
ipcMain.handle('config:update', async (_event, config) => {
  store.set('workMin', config.workMin);
  store.set('breakMin', config.breakMin);
  store.set('autoLaunch', config.autoLaunch);

  if (config.autoLaunch) {
    if (!(await launcher.isEnabled())) await launcher.enable();
  } else {
    if (await launcher.isEnabled()) await launcher.disable();
  }

  startWorkTimer();
});

ipcMain.handle('config:get', () => {
  return store.store;
});

ipcMain.handle('break:close', () => {
  closeBreakWindow();
  startWorkTimer();
});

ipcMain.handle('break:prepare', () => {
  if (breakWindow) {
    breakWindow.hide();
    setTimeout(() => {
      breakWindow?.show();
    }, PREPARE_HIDE_MS);
  }
});

// 捕捉异常和退出
process.on('uncaughtException', (err) => {
  writeLog('error', `未捕获的异常: ${err.stack || err}`);
});

process.on('unhandledRejection', (reason, promise) => {
  const detail =
    reason instanceof Error ? reason.stack : JSON.stringify(reason);
  writeLog('warn', `未处理的 Promise 拒绝: ${detail}`);
});

process.on('exit', (code) => {
  writeLog('info', `进程退出，退出码: ${code}`);
});

function createConfigWindow() {
  if (configWindow) {
    configWindow.focus();
    return;
  }
  configWindow = new BrowserWindow({
    width: 400,
    height: 600,
    title: '配置',
    autoHideMenuBar: true, // 自动隐藏菜单栏
    minimizable: false, // 禁止最小化
    maximizable: false, // 禁止最大化
    resizable: false, // 禁止调整大小
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
    },
    icon: path.join(__dirname, '../build/icon.ico'),
  });

  const url = !app.isPackaged
    ? `http://localhost:5173/#/`
    : `file://${path.join(__dirname, '../dist/index.html')}#/`;

  configWindow.loadURL(url);

  configWindow.on('closed', () => {
    configWindow = null;
  });
}

function createTray() {
  tray = new Tray(path.join(__dirname, 'icon.png'));
  const contextMenu = Menu.buildFromTemplate([
    {
      label: '打开设置',
      click: () => {
        if (configWindow) {
          if (configWindow.isMinimized()) configWindow.restore();
          configWindow.show();
        } else {
          createConfigWindow();
        }
      },
    },
    { label: '立即休息', click: () => createBreakWindow() },
    {
      label: '帮助',
      submenu: [
        {
          label: '关于',
          click: () => {
            dialog.showMessageBox({
              type: 'info',
              title: '关于护眼时光',
              message: `护眼时光\n版本: ${app.getVersion()}`,
              buttons: ['确定'],
            });
          },
        },
      ],
    },
    {
      label: '查看退出日志',
      click: () => {
        shell.openPath(logDir); // 打开日志目录
      },
    },
    { label: '退出', click: () => app.quit() },
  ]);
  tray.setToolTip('护眼时光');
  tray.setContextMenu(contextMenu);

  tray.on('click', () => {
    if (configWindow) {
      if (configWindow.isMinimized()) configWindow.restore();
      configWindow.show();
    } else {
      createConfigWindow();
    }
  });
}

function startWorkTimer() {
  if (workTimer) clearTimeout(workTimer);
  if (breakTimer) clearTimeout(breakTimer);
  breakTimer = null;
  const workMs = store.get('workMin') * 60_000;
  const breakMs = store.get('breakMin') * 60_000;
  nextBreakTime = +new Date() + workMs;
  updateNextRestTime(nextBreakTime);
  workTimer = setTimeout(() => {
    workTimer = null;
    createBreakWindow();
    if (breakTimer) clearTimeout(breakTimer);
    breakTimer = setTimeout(() => {
      breakTimer = null;
      closeBreakWindow();
      startWorkTimer();
    }, breakMs);
  }, workMs);
}

function createBreakWindow() {
  if (breakWindow && !breakWindow.isDestroyed()) {
    breakWindow.show();
    breakWindow.focus();
    breakWindow.setAlwaysOnTop(true, 'screen-saver');
    return;
  }

  breakWindow = new BrowserWindow({
    fullscreen: true,
    frame: false,
    alwaysOnTop: true,
    skipTaskbar: true,
    movable: false,
    resizable: false,
    transparent: false,
    focusable: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, '../build/icon.ico'),
  });

  const url = !app.isPackaged
    ? `http://localhost:5173/#/break`
    : `file://${path.join(__dirname, '../dist/index.html')}#/break`;
  console.log('url', url);
  breakWindow.loadURL(url);

  breakWindow.on('closed', () => {
    breakWindow = null;
  });

  breakWindow.setAlwaysOnTop(true, 'screen-saver');
  breakWindow.setFullScreen(true);
}

function closeBreakWindow() {
  console.log('closeBreakWindow');
  if (breakWindow && !breakWindow.isDestroyed()) {
    breakWindow.close();
  } else {
    console.log('closeBreakWindow不应该进入到这里');
  }
}

function updateNextRestTime(nextBreakTime) {
  store.set('nextBreakTime', nextBreakTime);

  // 格式化时间戳
  const text = formatTimestamp(nextBreakTime).standard;

  if (tray) {
    // 更新托盘悬浮提示
    tray.setToolTip(`下次休息时间：${text}`);
  }

  if (configWindow) {
    configWindow.webContents.send('next-rest-time', nextBreakTime);
  }
}

function formatTimestamp(timestamp) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 返回两种格式
  return {
    standard: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    chinese: `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`,
  };
}

// 获取今天的日志文件路径
function getLogFile() {
  const date = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
  return path.join(logDir, `exit-${date}.log`);
}

function writeLog(level, message) {
  const time = formatTimestamp(+new Date()).standard;
  const line = `[${time}] [${level}] ${message}\n`;
  fs.appendFileSync(getLogFile(), line);
}

// 清理超过 14 天的日志
function cleanOldLogs() {
  const files = fs.readdirSync(logDir);
  const now = Date.now();
  const maxAge = 14 * 24 * 60 * 60 * 1000; // 14 天

  files.forEach((file) => {
    const match = file.match(/^exit-(\d{4}-\d{2}-\d{2})\.log$/);
    if (match) {
      const fileDate = new Date(match[1]).getTime();
      if (now - fileDate > maxAge) {
        fs.unlinkSync(path.join(logDir, file));
        console.log(`Deleted old log: ${file}`);
      }
    }
  });
}

function formatTimestamp(timestamp: number) {
  const date = new Date(timestamp);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');

  // 返回两种格式
  return {
    standard: `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`,
    chinese: `${year}年${month}月${day}日 ${hours}时${minutes}分${seconds}秒`,
  };
}
