async function loadItems() {
  const list = document.getElementById('items');
  if (!list || !window.databaseAPI) return;

  const items = await window.databaseAPI.getItems();
  list.innerHTML = '';

  for (const item of items) {
    const li = document.createElement('li');
    li.textContent = `${item.name} (${item.quantity})`;
    list.appendChild(li);
  }
}


const form = document.getElementById('addForm');
if (form && window.databaseAPI) {
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const nameEl = document.getElementById('name');
    const qtyEl = document.getElementById('quantity');

    if (!nameEl || !qtyEl) return;

    const name = nameEl.value.trim();
    const quantity = Number(qtyEl.value);

    if (!name || Number.isNaN(quantity)) return;

    await window.databaseAPI.addItem({ name, quantity });

    e.target.reset();
    loadItems();
  });
}

/* CLOSE BUTTON */
function setupCloseButton() {
  const closeButton = document.getElementById('close-button');
  if (closeButton) {
    closeButton.addEventListener('click', () => {
      window.electronAPI.closeApp();
    });
  }
}

/* CHILD WINDOW BUTTON */
function setupChildButton() {
  const childButton = document.getElementById('open-child-button');
  if (childButton) {
    childButton.addEventListener('click', () => {
      window.electronAPI.openChildWindow();
    });
  }
}

/* RUN AFTER LOAD */
document.addEventListener('DOMContentLoaded', () => {
  setupCloseButton();
  setupChildButton();
  loadItems();
});