// ===== FIREBASE SETUP =====
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import {
  getDatabase,
  ref,
  push,
  set,
  onValue
} from "https://www.gstatic.com/firebasejs/12.16.0/firebase-database.js";

const firebaseConfig = {
  apiKey: "AIzaSyAyzziTvvEJISnG0R-3UAsG0_03UNxMcMk",
  authDomain: "hi-chakki.firebaseapp.com",
  databaseURL: "https://hi-chakki-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "hi-chakki",
  storageBucket: "hi-chakki.firebasestorage.app",
  messagingSenderId: "255831399051",
  appId: "1:255831399051:web:e9c66c5946ce07ec20928e"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);
const notesRef = ref(db, 'notes');

// ===== STORAGE =====
// `notes` is now populated live from Firebase (see onValue listener near the
// bottom of this file) instead of localStorage. It stays in sync across
// every device automatically.
let notes = [];
let selectedColor = '#ffb3ba';
let currentNoteId = null; // Tracks note currently opened for reply

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

  const newNoteRef = push(notesRef);
  set(newNoteRef, {
    recipient: recipient,
    sender: sender,
    mood: mood,
    text: text,
    color: selectedColor,
    ts: Date.now(),
    replies: []
  });

  // No need to manually re-render — the onValue listener below will
  // pick up this new note (on this device AND every other device) and
  // re-render automatically.
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
    const existingReplies = note.replies || [];
    const updatedReplies = [...existingReplies, {
      sender: sender,
      text: text,
      ts: Date.now()
    }];

    // Write straight to this note's replies path in Firebase.
    set(ref(db, `notes/${currentNoteId}/replies`), updatedReplies);

    // The onValue listener will re-render everything shortly, but we
    // also clear the input right away for a snappy feel.
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

// ===== LIVE SYNC FROM FIREBASE =====
// This fires immediately with current data, then again any time the data
// changes — on this device or any other. This is what makes notes show up
// on every device instead of just the one that created them.
onValue(notesRef, (snapshot) => {
  const data = snapshot.val() || {};

  notes = Object.keys(data)
    .map(id => ({ id, ...data[id] }))
    .sort((a, b) => b.ts - a.ts);

  renderGrid(searchInput.value);

  // If the reply modal is open, keep it up to date too
  if (currentNoteId) {
    const openNote = notes.find(n => n.id === currentNoteId);
    if (openNote) renderReplies(openNote);
  }
});