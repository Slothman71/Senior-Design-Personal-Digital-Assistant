const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')
const Database = require('better-sqlite3');

let db;

/*
  Lou: Correction
  Added this variable to keep track of the child window so multiple dont open
*/
let childWindow = null;

const createWindow = () => {
  const win = new BrowserWindow({
    width: 800,
    height: 600,
    fullscreen: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),

      //seperates web app from internal Electron code
      contextIsolation: true,
      nodeIntegration: false  //Removes direct system access from our HTML page
    }
  })

  win.loadFile('index.html')

  return win
}

/*
//Child window --> Each child window gets its own renderer process (multiple tabs)
function createChildWindow(parentWin) {

  /*
    Lou: Correction
    If the child window already exists, focus it instead of creating another one.
  */
  if (childWindow) {
    childWindow.focus()
    return
  }

  /*
    Lou: Correction
    Changed "child" to "childWindow" so we to track it globally
  
  childWindow = new BrowserWindow({

    
    
    parent: parentWin,    //makes it a child of the parent
    modal:false,          //if set to true it prevents action on parent window until some task is completed
    width: 500,
    height: 400,

    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  //loads a different page for the chidl processes
  childWindow.loadFile('child.html')
  

  /*
    Lou: Correction
    Reset childWindow when it's closed so it can be reopened later (this had nothing to do with our problem but it needed fixing anyweays)
  
  childWindow.on('closed', () => {
    childWindow = null
  })
}
*/

app.whenReady().then(() => {
  const dbPath = path.join(app.getPath('userData'), 'app.db');
  db = new Database(dbPath);
  // Creates a table if it doesn't exist
  db.prepare(`
    CREATE TABLE IF NOT EXISTS items (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      quantity INTEGER NOT NULL
    )
  `).run();

  // IPC handlers
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
  BrowserWindow.getFocusedWindow()?.close()
})

ipcMain.handle('open-child-window', (event) => {    //handles renderer request to open child window
  const parentWin = BrowserWindow.fromWebContents(event.sender) //finds which window made request
  if (parentWin) {            //if parent window is found
    //createChildWindow(parentWin)    //create + attach child window to it
  }
  return true
})

app.on('before-quit', () => {
  if (db) db.close();
});