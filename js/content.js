if (!window.contentScriptInjected) {
    window.contentScriptInjected = true;
    let draggedNote = null;
    let dragOffset = { x: 0, y: 0 };
    let settings = {
        defaultColor: '#ffd75e',
        syncEnabled: false
    };
    let isInitialized = false;

    let lastRightClickPosition = { x: 0, y: 0 };

    document.addEventListener('mousedown', (event) => {
        if (event.button === 2) {
            lastRightClickPosition = {
                x: event.pageX,
                y: event.pageY
            };
        }
    });

    async function loadSettings() {
        return new Promise((resolve) => {
            chrome.runtime.sendMessage({ type: 'getSettings' }, (response) => {
                settings = { ...settings, ...response };
                resolve();
            });
        });
    }

    function createStickyNote(x, y, content = '', id = null, color = settings.defaultColor) {
        const note = document.createElement('div');
        note.className = 'sticky-note';
        note.dataset.id = id || Date.now().toString();
        note.style.backgroundColor = color;
        const options = { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' };
        const date = new Date(Number(id) || Date.now());

        const info = document.createElement('div');
        info.className = 'info';
        info.innerHTML = '<span class="app_image"></span> '+date.toLocaleString(undefined, options);

        const toolbar = document.createElement('div');
        toolbar.className = 'toolbar';

        const colorBtn = document.createElement('button');
        colorBtn.innerHTML = '🎨';
        colorBtn.onclick = () => showColorPicker(note);

        const boldBtn = document.createElement('button');
        boldBtn.innerHTML = 'B';
        boldBtn.onclick = () => formatText('bold');

        const italicBtn = document.createElement('button');
        italicBtn.innerHTML = 'I';
        italicBtn.onclick = () => formatText('italic');

        const closeButton = document.createElement('button');
        closeButton.innerHTML = '×';
        closeButton.onclick = () => {
            note.remove();
            saveNotes();
        };

        toolbar.appendChild(colorBtn);
        toolbar.appendChild(boldBtn);
        toolbar.appendChild(italicBtn);
        toolbar.appendChild(closeButton);

        const textarea = document.createElement('div');
        textarea.className = 'content';
        textarea.contentEditable = true;
        textarea.innerHTML = content;
        textarea.addEventListener('input', () => {
            saveNotes();
        });


        note.appendChild(toolbar);
        note.appendChild(info);
        note.appendChild(textarea);


        note.style.left = x + 'px';
        note.style.top = y + 'px';

        let isDragging = false;
        let dragStartX = 0;
        let dragStartY = 0;

        note.addEventListener('mousedown', (e) => {
            if (e.target === closeButton || e.target === textarea) return;

            isDragging = true;
            dragStartX = e.clientX - note.offsetLeft;
            dragStartY = e.clientY - note.offsetTop;

            e.preventDefault();
        });

        document.addEventListener('mousemove', (e) => {
            if (!isDragging) return;

            const x = e.clientX - dragStartX;
            const y = e.clientY - dragStartY;

            note.style.left = x + 'px';
            note.style.top = y + 'px';
        });

        document.addEventListener('mouseup', () => {
            if (isDragging) {
                isDragging = false;
                saveNotes();
            }
        });


        document.body.appendChild(note);
        textarea.focus();

        saveNotes();
        return note;
    }

    function formatText(format) {
        document.execCommand(format, false, null);
    }

    function showColorPicker(note) {
        const colors = ['#ffd75e', '#ff7eb9', '#7afcff', '#feff9c', '#fff740'];
        const picker = document.createElement('div');
        picker.className = 'color-picker';
        picker.style.position = 'absolute';
        picker.style.zIndex = '10001';

        colors.forEach(color => {
            const option = document.createElement('div');
            option.className = 'color-option';
            option.style.backgroundColor = color;
            option.onclick = () => {
                note.style.backgroundColor = color;
                picker.remove();
                saveNotes();
            };
            picker.appendChild(option);
        });

        note.appendChild(picker);
    }

    async function saveNotes() {
        const notes = Array.from(document.querySelectorAll('.sticky-note')).map(note => ({
            id: note.dataset.id,
            content: note.querySelector('.content').innerHTML,
            left: note.style.left,
            top: note.style.top,
            color: note.style.backgroundColor,
            url: window.location.href
        }));

        if (settings.syncEnabled) {
            await chrome.storage.sync.set({
                ['notes_' + window.location.href]: notes
            });
        } else {
            await chrome.storage.local.set({
                ['notes_' + window.location.href]: notes
            });
        }
    }

    async function loadNotes() {
        await loadSettings();
        const storage = settings.syncEnabled ? chrome.storage.sync : chrome.storage.local;
        const data = await storage.get('notes_' + window.location.href);
        const notes = data['notes_' + window.location.href] || [];

        notes.forEach(note => {
            createStickyNote(
                parseInt(note.left),
                parseInt(note.top),
                note.content,
                note.id,
                note.color
            );
        });
    }

    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
        if (request.type === 'focusNote') {
            const note = document.querySelector(`.sticky-note[data-id="${request.noteId}"]`);
            if (note) {
                note.scrollIntoView({ behavior: 'smooth', block: 'center' });
                note.querySelector('.content').focus();
            }
        }
    });

    function initialize() {
        if (isInitialized) return;

        chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
            if (request.type === "createNote") {
                const x = request.x || lastRightClickPosition.x;
                const y = request.y || lastRightClickPosition.y;
                createStickyNote(x, y, request.text);
                sendResponse({ success: true });
            }
        });

        loadNotes();
        isInitialized = true;
    }

    initialize();
    chrome.runtime.sendMessage({ type: "contentScriptReady" });
}