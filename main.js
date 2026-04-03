const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')
const Database = require('better-sqlite3');

let db;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  win.loadFile('index.html')
  return win
}

/* FIXED PARAM NAME */
function createChildWindow(parentWin) {
  const child = new BrowserWindow({
    parent: parentWin,
    modal: false,
    width: 500,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  child.loadFile('child.html')
}

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  db = new Database(dbPath);

  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL
    )
  `).run();

  ipcMain.handle('db:get-items', () => {
    return db.prepare('SELECT * FROM items ORDER BY id DESC').all();
  });

  ipcMain.handle('db:add-item', (event, item) => {
    const stmt = db.prepare(`
      INSERT INTO items (name, quantity)
      VALUES (?, ?)
    `);

    const result = stmt.run(item.name, item.quantity);

    return {
      id: result.lastInsertRowid,
      name: item.name,
      quantity: item.quantity
    };
  });

  createWindow()

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow()
    }
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})


ipcMain.on('close-app', () => {
  app.quit();
})

ipcMain.handle('open-child-window', (event) => {
  const parentWin = BrowserWindow.fromWebContents(event.sender)
  if (parentWin) {
    createChildWindow(parentWin)
  }
  return true
})

app.on('before-quit', () => {
  if (db) db.close();
});