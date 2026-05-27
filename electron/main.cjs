const { app, BrowserWindow, dialog } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');
const fs = require('fs');

let mainWindow;
let serverProcess;

function getServerPath() {
  const isDev = !app.isPackaged;
  if (isDev) {
    const devPath = path.join(__dirname, '..', 'dist', 'server.cjs');
    if (fs.existsSync(devPath)) return { path: devPath, isDev: false };
    return { path: path.join(__dirname, '..', 'server.ts'), isDev: true };
  }
  return { path: path.join(__dirname, '..', 'dist', 'server.cjs'), isDev: false };
}

function startServer() {
  return new Promise((resolve, reject) => {
    const { path: serverPath, isDev } = getServerPath();
    const cwd = path.join(__dirname, '..');

    if (isDev) {
      serverProcess = spawn('npx.cmd', ['tsx', 'server.ts'], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'development',
          ELECTRON_DEV: '1',
        },
        shell: true,
      });
    } else {
      serverProcess = spawn(process.execPath, [serverPath], {
        cwd,
        stdio: ['pipe', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NODE_ENV: 'production',
        },
      });
    }

    let resolved = false;

    serverProcess.stdout.on('data', (data) => {
      const msg = data.toString();
      console.log('[server]', msg.trim());
      if (!resolved && msg.includes('listening')) {
        resolved = true;
        setTimeout(resolve, 300);
      }
    });

    serverProcess.stderr.on('data', (data) => {
      const msg = data.toString().trim();
      if (msg) console.error('[server:err]', msg);
    });

    serverProcess.on('error', (err) => {
      if (!resolved) reject(err);
    });

    serverProcess.on('exit', (code) => {
      console.log(`[server] exited with code ${code}`);
      if (!resolved) reject(new Error(`Server exited with code ${code}`));
    });

    setTimeout(() => {
      if (!resolved) {
        serverProcess.kill();
        reject(new Error('Server start timeout (30s)'));
      }
    }, 30000);
  });
}

function waitForServer(url, timeout) {
  const start = Date.now();
  return new Promise((resolve, reject) => {
    function check() {
      http.get(url, () => resolve()).on('error', () => {
        if (Date.now() - start > timeout) {
          reject(new Error('Server not ready (timeout)'));
        } else {
          setTimeout(check, 400);
        }
      });
    }
    check();
  });
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 920,
    minWidth: 1024,
    minHeight: 700,
    title: 'Wildberries Parser',
    icon: path.join(__dirname, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    show: false,
  });

  mainWindow.loadURL('http://localhost:3000');

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (!app.isPackaged) {
      mainWindow.webContents.openDevTools({ mode: 'detach' });
    }
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(async () => {
  try {
    await startServer();
    await waitForServer('http://localhost:3000', 15000);
    createWindow();
  } catch (e) {
    dialog.showErrorBox('Ошибка запуска', `Не удалось запустить сервер:\n\n${e.message}`);
    app.quit();
  }
});

app.on('window-all-closed', () => {
  if (serverProcess) serverProcess.kill();
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow === null) createWindow();
});

app.on('before-quit', () => {
  if (serverProcess) {
    serverProcess.kill();
    serverProcess = null;
  }
});
