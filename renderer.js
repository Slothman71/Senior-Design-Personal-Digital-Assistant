function setupCloseButton() {
  const closeButton = document.getElementById('close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      // Calls the function exposed via contextBridge in the preload script
      window.electronAPI.closeApp();
    });
  }
}

//Handles open child window button clicj
function setupChildButton(){
  //grabs button from HTML
  const childButton = document.getElementById('open-child-button');

  //attach listener if button exists
  if (childButton){
    childButton.addEventListener('click', () => {
      //asks main process to create a child window
      window.electronAPI.openChildWindow();
    })
  }
}

//wait until the page loads before attaching buttons
document.addEventListener('DOMContentLoaded', () => {
  setupCloseButton(); // initialize close button
  setupChildButton(); //initialize child button
});