const STORAGE_KEY = "pda_notes";


function loadNotes() {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
}


function saveNotes(notes) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes));
}


function saveNote() {
    const title = document.getElementById("noteTitle").value.trim();
    const content = document.getElementById("noteContent").value.trim();

    if (!title) {
        alert("Enter a title");
        return;
    }

    let notes = loadNotes();

    const existingIndex = notes.findIndex(n => n.title === title);

    if (existingIndex !== -1) {
        notes[existingIndex].content = content;
    } else {
        notes.push({ title, content });
    }

    saveNotes(notes);
    clearInputs();
    renderNotes();
}

function deleteNote(index) {
    let notes = loadNotes();

    
    notes.splice(index, 1);

    
    if (currentEditing === index) {
        currentEditing = null;
        clearInputs();
    } else if (currentEditing > index) {
        
        currentEditing--;
    }

    saveNotes(notes);
    renderNotes();
}

// edit note
function editNote(index) {
    const notes = loadNotes();
    const note = notes[index];

    document.getElementById("noteTitle").value = note.title;
    document.getElementById("noteContent").value = note.content;
}

function clearInputs() {
    document.getElementById("noteTitle").value = "";
    document.getElementById("noteContent").value = "";
    currentEditing = null; 
}


function renderNotes() {
    const container = document.getElementById("notesContainer");
    container.innerHTML = "";

    const notes = loadNotes();

    notes.forEach((note, index) => {
        const div = document.createElement("div");
        div.className = "note-card";

        div.innerHTML = `
            <div class="note-title">${note.title}</div>
            <div>${note.content}</div>

            <div class="note-buttons">
                <button onclick="editNote(${index})">Edit</button>
                <button onclick="deleteNote(${index})">Delete</button>
            </div>
        `;

        container.appendChild(div);
    });
}


window.onload = renderNotes;