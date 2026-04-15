const { app, BrowserWindow, Menu, nativeImage } = require('electron');
const path = require('path');

const SUPPORT_TEXT = 'Plix - Okul Yönetim Sistemi - Destek Hattı 0850 302 83 62';

let mainWindow = null;
let splashWindow = null;
let offlineWindow = null;
let titleTimer = null;
let isLaunching = false;

app.setName('Plix');
app.setAppUserModelId('com.plix.app');

function buildTitle(isOnline) {
  const statusText = isOnline ? 'Çevrimiçi' : 'Çevrimdışı';
  return `${SUPPORT_TEXT} | ${statusText}`;
}

function appIcon() {
  return nativeImage.createFromPath(path.join(__dirname, 'icon.ico'));
}

function createSplash() {
  splashWindow = new BrowserWindow({
    width: 420,
    height: 320,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: true,
    backgroundColor: '#ffffff',
    icon: appIcon(),
    skipTaskbar: true
  });
  splashWindow.loadFile('splash.html');
}

function createOfflineWindow() {
  offlineWindow = new BrowserWindow({
    width: 520,
    height: 360,
    frame: false,
    alwaysOnTop: true,
    center: true,
    resizable: false,
    minimizable: false,
    maximizable: false,
    show: false,
    backgroundColor: '#ffffff',
    icon: appIcon(),
    skipTaskbar: true
  });
  offlineWindow.loadFile('offline.html');
}

async function getOnlineState() {
  if (!mainWindow || mainWindow.isDestroyed()) return true;
  try {
    return !!(await mainWindow.webContents.executeJavaScript('navigator.onLine'));
  } catch {
    return true;
  }
}

async function refreshTitleAndOfflineState() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  const isOnline = await getOnlineState();
  try { mainWindow.setTitle(buildTitle(isOnline)); } catch (_) {}

  if (offlineWindow && !offlineWindow.isDestroyed()) {
    if (isOnline) {
      if (offlineWindow.isVisible()) offlineWindow.hide();
    } else {
      if (!offlineWindow.isVisible()) {
        offlineWindow.show();
        offlineWindow.focus();
      }
    }
  }
}

function createMain() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    icon: appIcon(),
    autoHideMenuBar: true,
    resizable: true,
    fullscreenable: false,
    show: false,
    backgroundColor: '#ffffff',
    title: buildTitle(true),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      sandbox: false
    }
  });

  mainWindow.maximize();

  mainWindow.webContents.on('before-input-event', (event, input) => {
    if (input.key === 'Escape' || input.key === 'F11') event.preventDefault();
  });

  mainWindow.on('page-title-updated', (e) => e.preventDefault());
  mainWindow.on('closed', () => { mainWindow = null; });

  mainWindow.loadURL('https://portal.plixapp.com/');

  mainWindow.webContents.once('did-finish-load', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    }
    await refreshTitleAndOfflineState();
  });

  mainWindow.webContents.on('did-finish-load', refreshTitleAndOfflineState);
  mainWindow.webContents.on('did-navigate', refreshTitleAndOfflineState);
  mainWindow.webContents.on('did-navigate-in-page', refreshTitleAndOfflineState);
  mainWindow.on('focus', refreshTitleAndOfflineState);

  if (titleTimer) clearInterval(titleTimer);
  titleTimer = setInterval(refreshTitleAndOfflineState, 3000);
}

async function launchAppWindows() {
  if (isLaunching) return;
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.show();
    mainWindow.focus();
    return;
  }

  isLaunching = true;
  createSplash();
  createOfflineWindow();

  setTimeout(() => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    createMain();
    isLaunching = false;
  }, 1500);
}

function setupMenu() {
  const template = [
    { label: 'Plix', submenu: [
      { role: 'about', label: 'Plix Hakkında' },
      { type: 'separator' },
      { role: 'quit', label: 'Çıkış' }
    ]},
    { role: 'editMenu', label: 'Düzenle' },
    { role: 'viewMenu', label: 'Görünüm' },
    { role: 'windowMenu', label: 'Pencere' }
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}

app.whenReady().then(async () => {
  setupMenu();
  await launchAppWindows();

  app.on('activate', async () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
      mainWindow.focus();
    } else {
      await launchAppWindows();
    }
  });
});

app.on('before-quit', () => {
  if (titleTimer) clearInterval(titleTimer);
});

app.on('window-all-closed', () => {
  app.quit();
});
