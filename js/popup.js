let currentTab = 'notes';

document.addEventListener('DOMContentLoaded', async () => {
    initializeTabs();
    initializeColorPicker();
    await loadSettings();
    await loadNotesList();
    const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
    const currentUrl = tabs[0].url;
    const data = await chrome.storage.local.get('notes_' + currentUrl);
    const notes = data['notes_' + currentUrl] || [];
    chrome.action.setBadgeText({
        text: notes.length.toString(),
        tabId: tabs[0].id
    });
});

async function loadNotesList() {
    const notesList = document.getElementById('notes-list');
    notesList.innerHTML = '';
  
    try {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      const currentUrl = tabs[0].url;
  
      const storage = chrome.storage.local;
      
      const data = await storage.get('notes_' + currentUrl);
      const notes = data['notes_' + currentUrl] || [];
  
      if (notes.length === 0) {
        notesList.innerHTML = '<p>No notes on this page yet. Right-click anywhere on the page to create one!</p>';
        return;
      }
  
      notes.forEach((note, index) => {
        const noteElement = document.createElement('div');
        noteElement.className = 'note-item';
        noteElement.style.borderLeft = `4px solid ${note.color || '#ffd75e'}`;

        const content = note.content.replace(/<[^>]*>/g, ''); 
        const truncatedContent = content.length > 50 ? 
          content.substring(0, 50) + '...' : 
          content;
        noteElement.innerHTML = `
          <div class="note-preview">
            <span class="note-content">${truncatedContent || 'Empty note'}</span>
            <div class="note-actions">
              <button class="delete-note" data-id="${note.id}">🗑️</button>
              <button class="edit-note" data-id="${note.id}">✏️</button>
            </div>
          </div>
        `;
  
        const deleteBtn = noteElement.querySelector('.delete-note');
        deleteBtn.addEventListener('click', async () => {
          if (confirm('Delete this note?')) {
            notes.splice(index, 1);
            await storage.set({ ['notes_' + currentUrl]: notes });
            await loadNotesList();
          }
        });
  
        const editBtn = noteElement.querySelector('.edit-note');
        editBtn.addEventListener('click', () => {
          chrome.tabs.sendMessage(tabs[0].id, {
            type: 'focusNote',
            noteId: note.id
          });
          window.close(); 
        });
  
        notesList.appendChild(noteElement);
      });
  
    } catch (error) {
      console.error('Error loading notes list:', error);
      notesList.innerHTML = '<p class="error">Error loading notes. Please try again.</p>';
    }
  }
  
  const style = document.createElement('style');
  style.textContent = `
    .note-item {
      margin: 8px 0;
      padding: 8px;
      background: #f5f5f5;
      border-radius: 4px;
      border-left: 4px solid #ffd75e;
    }
  
    .note-preview {
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
  
    .note-content {
      flex: 1;
      margin-right: 8px;
      word-break: break-word;
    }
  
    .note-actions {
      display: flex;
      gap: 4px;
    }
  
    .note-actions button {
      border: none;
      background: none;
      cursor: pointer;
      padding: 4px;
      border-radius: 4px;
    }
  
    .note-actions button:hover {
      background: #e0e0e0;
    }
  
    .error {
      color: #e53935;
      padding: 8px;
      background: #ffebee;
      border-radius: 4px;
    }
  `;
  document.head.appendChild(style);


function initializeTabs() {
    document.querySelectorAll('[data-tab]').forEach(button => {
        button.addEventListener('click', () => switchTab(button.dataset.tab));
    });
}

function switchTab(tabName) {
    currentTab = tabName;
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.toggle('active', tab.id === tabName);
    });
}

async function loadSettings() {
    const settings = await chrome.storage.sync.get('settings');
}

function initializeColorPicker() {
    const colors = ['#ffd75e', '#ff7eb9', '#7afcff', '#feff9c', '#fff740'];
    const picker = document.querySelector('.color-picker');
    
    if (picker) { 
      colors.forEach(color => {
        const div = document.createElement('div');
        div.className = 'color-option';
        div.style.backgroundColor = color;
        picker.appendChild(div);
      });
    }
  }
