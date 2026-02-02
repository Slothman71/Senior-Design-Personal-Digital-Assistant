function setupCloseButton() {
  const closeButton = document.getElementById('close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      // Calls the function exposed via contextBridge in the preload script
      window.electronAPI.closeApp();
    });
  }
}

document.addEventListener('DOMContentLoaded', setupCloseButton);