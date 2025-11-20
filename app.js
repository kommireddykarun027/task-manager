/* Task Manager (Frontend only) - localStorage persistence
 Features:
  - Add/Edit/Delete tasks
  - View/Preview
  - Toggle status
  - Filter, Search, Sort, Pagination
  - Basic validation
*/

const KEY = 'tm_tasks_v1';
const perPage = 6; // pagination

// Elements
const tasksContainer = document.getElementById('tasksContainer');
const previewBox = document.getElementById('previewBox');
const statTotal = document.getElementById('statTotal');
const statPending = document.getElementById('statPending');
const statDone = document.getElementById('statDone');

const btnAddTask = document.getElementById('btnAddTask');
const taskModalEl = document.getElementById('taskModal');
const bsModal = new bootstrap.Modal(taskModalEl);
const taskForm = document.getElementById('taskForm');
const taskIdInput = document.getElementById('taskId');
const titleInput = document.getElementById('taskTitle');
const descInput = document.getElementById('taskDesc');
const statusInput = document.getElementById('taskStatus');
const modalTitle = document.getElementById('modalTitle');
const formError = document.getElementById('formError');

const searchInput = document.getElementById('searchInput');
const filterStatus = document.getElementById('filterStatus');
const sortSelect = document.getElementById('sortSelect');
const paginationEl = document.getElementById('pagination');

// state
let tasks = loadTasks();
let currentPage = 1;

// initial render
render();

// helpers
function loadTasks() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || [];
  } catch (e) {
    console.error(e);
    return [];
  }
}
function saveTasks() {
  localStorage.setItem(KEY, JSON.stringify(tasks));
}
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2,7);
}
function formatDate(ts) {
  const d = new Date(ts);
  return d.toLocaleString();
}

// rendering
function render() {
  // apply filters & search & sort
  const q = (searchInput.value || '').trim().toLowerCase();
  const status = filterStatus.value;
  const sortBy = sortSelect.value;

  let list = tasks.slice();

  if (status !== 'all') list = list.filter(t => t.status === status);
  if (q) list = list.filter(t => (t.title + ' ' + (t.description||'')).toLowerCase().includes(q));

  list.sort((a,b) => {
    if (sortBy === 'newest') return b.createdAt - a.createdAt;
    return a.createdAt - b.createdAt;
  });

  // pagination
  const total = list.length;
  const pages = Math.max(1, Math.ceil(total / perPage));
  if (currentPage > pages) currentPage = pages;
  const start = (currentPage - 1) * perPage;
  const pageItems = list.slice(start, start + perPage);

  // render list
  tasksContainer.innerHTML = '';
  if (pageItems.length === 0) {
    tasksContainer.innerHTML = `<div class="text-center text-muted p-4">No tasks found.</div>`;
  } else {
    for (const t of pageItems) {
      const item = document.createElement('div');
      item.className = 'list-group-item d-flex justify-content-between align-items-start';
      item.innerHTML = `
        <div class="ms-2 me-auto">
          <div class="fw-bold task-title">${escapeHtml(t.title)}</div>
          <div class="task-meta">${escapeHtml(truncate(t.description, 120))}</div>
          <div class="mt-2 small text-muted">Created: ${formatDate(t.createdAt)}</div>
        </div>
        <div class="d-flex flex-column align-items-end gap-2">
          <div>
            <span class="badge bg-${t.status === 'done' ? 'success' : 'secondary'} badge-status">${t.status}</span>
          </div>
          <div class="btn-group">
            <button class="btn btn-sm btn-outline-primary" data-action="view" data-id="${t.id}"><i class="fa-solid fa-eye"></i></button>
            <button class="btn btn-sm btn-outline-secondary" data-action="edit" data-id="${t.id}"><i class="fa-solid fa-pen-to-square"></i></button>
            <button class="btn btn-sm btn-outline-danger" data-action="delete" data-id="${t.id}"><i class="fa-solid fa-trash"></i></button>
            <button class="btn btn-sm btn-outline-success" data-action="toggle" data-id="${t.id}" title="Toggle status"><i class="fa-solid fa-toggle-on"></i></button>
          </div>
        </div>
      `;
      tasksContainer.appendChild(item);
    }
  }

  renderPagination(pages);
  renderStats();
}

function renderPagination(pages) {
  paginationEl.innerHTML = '';
  // previous
  const prevLi = document.createElement('li');
  prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
  prevLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage-1}">Prev</a>`;
  paginationEl.appendChild(prevLi);

  // pages (show small range)
  const maxShown = 5;
  let start = Math.max(1, currentPage - Math.floor(maxShown/2));
  let end = Math.min(pages, start + maxShown - 1);
  if (end - start < maxShown - 1) start = Math.max(1, end - maxShown + 1);

  for (let i = start; i <= end; i++) {
    const li = document.createElement('li');
    li.className = `page-item ${i === currentPage ? 'active' : ''}`;
    li.innerHTML = `<a class="page-link" href="#" data-page="${i}">${i}</a>`;
    paginationEl.appendChild(li);
  }

  // next
  const nextLi = document.createElement('li');
  nextLi.className = `page-item ${currentPage === pages ? 'disabled' : ''}`;
  nextLi.innerHTML = `<a class="page-link" href="#" data-page="${currentPage+1}">Next</a>`;
  paginationEl.appendChild(nextLi);
}

function renderStats() {
  statTotal.textContent = tasks.length;
  statPending.textContent = tasks.filter(t => t.status === 'pending').length;
  statDone.textContent = tasks.filter(t => t.status === 'done').length;
}

function truncate(s, n) {
  if (!s) return '';
  if (s.length <= n) return s;
  return s.slice(0,n-1) + '…';
}
function escapeHtml(s) {
  if (!s) return '';
  return String(s).replace(/[&<>"']/g, c=>({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":"&#39;"}[c]));
}

// events
btnAddTask.addEventListener('click', () => {
  openModalForNew();
});

tasksContainer.addEventListener('click', (e) => {
  const btn = e.target.closest('button');
  if (!btn) return;
  const action = btn.dataset.action;
  const id = btn.dataset.id;
  if (!action) return;

  if (action === 'view') {
    const t = tasks.find(x => x.id === id);
    if (t) showPreview(t);
  } else if (action === 'edit') {
    const t = tasks.find(x => x.id === id);
    if (t) openModalForEdit(t);
  } else if (action === 'delete') {
    if (confirm('Delete this task?')) {
      tasks = tasks.filter(x => x.id !== id);
      saveTasks();
      render();
      previewBox.textContent = 'Select a task to preview details.';
    }
  } else if (action === 'toggle') {
    tasks = tasks.map(x => x.id === id ? {...x, status: x.status === 'pending' ? 'done' : 'pending', updatedAt: Date.now()} : x);
    saveTasks();
    render();
  }
});

paginationEl.addEventListener('click', (e) => {
  const a = e.target.closest('a');
  if (!a) return;
  e.preventDefault();
  const p = Number(a.dataset.page);
  if (!isNaN(p) && p >= 1) {
    currentPage = p;
    render();
    window.scrollTo({top: 0, behavior: 'smooth'});
  }
});

searchInput.addEventListener('input', () => { currentPage = 1; render(); });
filterStatus.addEventListener('change', () => { currentPage = 1; render(); });
sortSelect.addEventListener('change', () => { render(); });

// modal & form handling
taskForm.addEventListener('submit', (e) => {
  e.preventDefault();
  // basic validation
  if (!titleInput.value.trim()) {
    titleInput.classList.add('is-invalid');
    return;
  } else {
    titleInput.classList.remove('is-invalid');
  }

  const id = taskIdInput.value;
  const data = {
    title: titleInput.value.trim(),
    description: descInput.value.trim(),
    status: statusInput.value,
    updatedAt: Date.now()
  };

  if (id) {
    // update
    tasks = tasks.map(t => t.id === id ? {...t, ...data} : t);
  } else {
    // create
    const now = Date.now();
    const newTask = {
      id: uid(),
      createdAt: now,
      updatedAt: now,
      ...data
    };
    tasks.unshift(newTask);
  }

  saveTasks();
  bsModal.hide();
  taskForm.reset();
  render();
});

taskModalEl.addEventListener('hidden.bs.modal', () => {
  taskForm.reset();
  taskIdInput.value = '';
  titleInput.classList.remove('is-invalid');
  formError.classList.add('d-none');
});

function openModalForNew() {
  modalTitle.textContent = 'Add Task';
  taskIdInput.value = '';
  titleInput.value = '';
  descInput.value = '';
  statusInput.value = 'pending';
  formError.classList.add('d-none');
  bsModal.show();
}
function openModalForEdit(t) {
  modalTitle.textContent = 'Edit Task';
  taskIdInput.value = t.id;
  titleInput.value = t.title;
  descInput.value = t.description || '';
  statusInput.value = t.status || 'pending';
  formError.classList.add('d-none');
  bsModal.show();
}

function showPreview(t) {
  previewBox.innerHTML = `
    <h5>${escapeHtml(t.title)}</h5>
    <p class="text-muted small mb-1">Created: ${formatDate(t.createdAt)}</p>
    <p class="mb-2">${escapeHtml(t.description || '(no description)')}</p>
    <p><strong>Status:</strong> ${t.status}</p>
  `;
}

// initial seed (optional): add demo tasks if no tasks
(function seedIfEmpty() {
  if (tasks.length === 0) {
    const demo = [
      { id: uid(), title: 'Welcome to Task Manager', description: 'This is a demo task. Use "Add Task" to create your own tasks.', status: 'pending', createdAt: Date.now(), updatedAt: Date.now() },
      { id: uid(), title: 'Read assignment', description: 'Complete the MERN assignment steps and later connect this UI to backend.', status: 'done', createdAt: Date.now() - 1000*60*60*24, updatedAt: Date.now() - 1000*60*60*24 }
    ];
    tasks = demo;
    saveTasks();
  }
})();
