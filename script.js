// ===== STORAGE =====
let notes = JSON.parse(localStorage.getItem('hi-chakki-notes') || '[]');
let selectedColor = '#ffb3ba';
let currentNoteId = null; // Tracks note currently opened for reply

function saveNotes() {
  localStorage.setItem('hi-chakki-notes', JSON.stringify(notes));
}

// ===== ELEMENT REFERENCES =====
const modal = document.getElementById('msg-modal');
const replyModal = document.getElementById('reply-modal');
const grid = document.getElementById('msg-grid');
const searchInput = document.getElementById('search-input');

const recipientInput = document.getElementById('recipient-input');
const senderInput = document.getElementById('sender-input');
const moodSelect = document.getElementById('mood-select');
const msgInput = document.getElementById('msg-input');

const previewMood = document.getElementById('preview-mood');
const previewRecipient = document.getElementById('preview-recipient');
const previewText = document.getElementById('preview-text');
const previewSender = document.getElementById('preview-sender');
const previewDate = document.getElementById('preview-date');
const notePreview = document.getElementById('note-preview');

// ===== MODAL OPEN / CLOSE =====
function openModal() {
  modal.classList.add('open');
  updatePreview();
}

function closeModal() {
  modal.classList.remove('open');
  recipientInput.value = '';
  senderInput.value = '';
  msgInput.value = '';
}

function closeReplyModal() {
  replyModal.classList.remove('open');
  currentNoteId = null;
  document.getElementById('reply-sender-input').value = '';
  document.getElementById('reply-text-input').value = '';
}

document.getElementById('add-note-btn').onclick = openModal;
document.getElementById('cancel-btn').onclick = closeModal;
document.getElementById('close-reply-btn').onclick = closeReplyModal;

modal.onclick = (e) => { if (e.target === modal) closeModal(); };
replyModal.onclick = (e) => { if (e.target === replyModal) closeReplyModal(); };

// ===== COLOR PICKER =====
document.querySelectorAll('#color-picker .color-btn').forEach(btn => {
  btn.onclick = () => {
    document.querySelectorAll('#color-picker .color-btn').forEach(b => b.classList.remove('selected'));
    btn.classList.add('selected');
    selectedColor = btn.dataset.color;
    updatePreview();
  };
});

// ===== PREVIEW UPDATE =====
function updatePreview() {
  notePreview.style.background = selectedColor;
  previewMood.textContent = moodSelect.value;
  previewRecipient.textContent = 'To: ' + (recipientInput.value.trim() || 'Chakki');
  previewText.textContent = msgInput.value.trim() || 'Your message will appear here...';
  previewSender.textContent = 'From: ' + (senderInput.value.trim() || 'Anonymous');
  previewDate.textContent = formatDate(Date.now());
}

recipientInput.oninput = updatePreview;
senderInput.oninput = updatePreview;
moodSelect.onchange = updatePreview;
msgInput.oninput = updatePreview;

// ===== ADD A NOTE =====
document.getElementById('submit-btn').onclick = () => {
  const recipient = recipientInput.value.trim() || 'Chakki';
  const sender = senderInput.value.trim() || 'Anonymous';
  const mood = moodSelect.value;
  const text = msgInput.value.trim();

  if (!text) {
    alert('Please write a message before submitting.');
    return;
  }

  notes.unshift({
    id: Date.now(),
    recipient: recipient,
    sender: sender,
    mood: mood,
    text: text,
    color: selectedColor,
    ts: Date.now(),
    replies: []
  });

  saveNotes();
  renderGrid(searchInput.value);
  closeModal();
};

// ===== RENDER GRID OF CARDS =====
function renderGrid(filter = '') {
  grid.innerHTML = '';

  const visible = notes.filter(n =>
    n.recipient.toLowerCase().includes(filter.trim().toLowerCase()) ||
    n.sender.toLowerCase().includes(filter.trim().toLowerCase())
  );

  if (visible.length === 0) {
    grid.innerHTML = notes.length === 0
      ? '<div class="empty">no notes yet — click Leave a Message to write one</div>'
      : '<div class="empty">no notes match that name</div>';
    return;
  }

  visible.forEach(note => {
    const card = document.createElement('div');
    card.className = 'note-card';
    card.style.background = note.color;
    
    const repliesCount = note.replies ? note.replies.length : 0;

    card.innerHTML = `
      <div>
        <div class="mood-flair">${escapeHtml(note.mood || '😊 Happy')}</div>
        <div class="recipient">To: ${escapeHtml(note.recipient)}</div>
        <div class="preview">${escapeHtml(note.text)}</div>
      </div>
      <div>
        ${repliesCount > 0 ? `<div class="reply-count">💬 ${repliesCount} ${repliesCount === 1 ? 'reply' : 'replies'}</div>` : ''}
        <div class="card-footer">
          <span>From: ${escapeHtml(note.sender || 'Anonymous')}</span>
          <span>${formatDate(note.ts)}</span>
        </div>
      </div>
    `;

    // Click card to open reply view
    card.onclick = () => openReplyModal(note.id);

    grid.appendChild(card);
  });
}

// ===== REPLIES SYSTEM =====
function openReplyModal(id) {
  currentNoteId = id;
  const note = notes.find(n => n.id === id);
  if (!note) return;

  const display = document.getElementById('reply-note-display');
  display.className = 'note-card';
  display.style.background = note.color;
  display.innerHTML = `
    <div>
      <div class="mood-flair">${escapeHtml(note.mood || '😊 Happy')}</div>
      <div class="recipient">To: ${escapeHtml(note.recipient)}</div>
      <div class="preview">${escapeHtml(note.text)}</div>
    </div>
    <div class="card-footer">
      <span>From: ${escapeHtml(note.sender || 'Anonymous')}</span>
      <span>${formatDate(note.ts)}</span>
    </div>
  `;

  renderReplies(note);
  replyModal.classList.add('open');
}

function renderReplies(note) {
  const repliesList = document.getElementById('replies-list');
  repliesList.innerHTML = '';

  if (!note.replies || note.replies.length === 0) {
    repliesList.innerHTML = '<div style="color: #888; font-size: 13px;">No replies yet. Be the first to reply!</div>';
    return;
  }

  note.replies.forEach(r => {
    const item = document.createElement('div');
    item.className = 'reply-item';
    item.innerHTML = `
      <div class="reply-header">
        <span>${escapeHtml(r.sender)}</span>
        <span>${formatDate(r.ts)}</span>
      </div>
      <div>${escapeHtml(r.text)}</div>
    `;
    repliesList.appendChild(item);
  });
}

document.getElementById('send-reply-btn').onclick = () => {
  const sender = document.getElementById('reply-sender-input').value.trim() || 'Anonymous';
  const text = document.getElementById('reply-text-input').value.trim();

  if (!text) {
    alert('Please enter a reply.');
    return;
  }

  const note = notes.find(n => n.id === currentNoteId);
  if (note) {
    if (!note.replies) note.replies = [];
    note.replies.push({
      sender: sender,
      text: text,
      ts: Date.now()
    });

    saveNotes();
    renderReplies(note);
    renderGrid(searchInput.value);
    document.getElementById('reply-text-input').value = '';
  }
};

// ===== HELPERS =====
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function formatDate(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

// ===== SEARCH & INIT =====
searchInput.oninput = () => renderGrid(searchInput.value);
document.getElementById('search-btn').onclick = () => renderGrid(searchInput.value);

renderGrid();