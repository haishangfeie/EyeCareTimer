const { app, BrowserWindow, Tray, Menu, ipcMain } = require('electron');
const path = require('path');
const Store = require('electron-store').default;
console.log('Store', Store);
const AutoLaunch = require('auto-launch');

let tray = null;
let configWindow = null;

let workTimer = null;
let breakTimer = null;

let breakWindow = null;

const PREPARE_HIDE_MS = 20_000; // 20秒

let nextBreakTime;

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
} else {
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

  app.whenReady().then(async () => {
    createTray();

    const autoLaunch = store.get('autoLaunch');
    if (autoLaunch) {
      if (!(await launcher.isEnabled())) await launcher.enable();
    } else {
      if (await launcher.isEnabled()) await launcher.disable();
    }

    startWorkTimer();
  });
}

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
  // 拦截关闭事件，改为隐藏窗口
  configWindow.on('close', (event) => {
    event.preventDefault();
    configWindow.hide();
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
  const workMs = store.get('workMin') * 60_000;
  const breakMs = store.get('breakMin') * 60_000;
  nextBreakTime = +new Date() + workMs;
  workTimer = setTimeout(() => {
    createBreakWindow();
    breakTimer = setTimeout(() => {
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
    skipTaskbar: false,
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
