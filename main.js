const { app, BrowserWindow, ipcMain } = require('electron/main')
const path = require('path')

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

//Child window --> Each child window gets its own renderer process (multiple tabs)
function createChildWindow(parentwin) {

  const child = new BrowserWindow({
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
  child.loadFile('child.html')

}

app.whenReady().then(() => {
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
    createChildWindow(parentWin)    //create + attach child window to it
  }
  return true
})