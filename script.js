/* =============================================
   SakuTrack — script.js
   ============================================= */

'use strict';

// ---- Storage key ----
const STORAGE_KEY = 'sakutrack_transactions';

// ---- DOM refs ----
const form         = document.getElementById('transactionForm');
const editIdInput  = document.getElementById('editId');
const nameInput    = document.getElementById('name');
const amountInput  = document.getElementById('amount');
const categoryInput= document.getElementById('category');
const dateInput    = document.getElementById('date');
const submitBtn    = document.getElementById('submitBtn');
const cancelBtn    = document.getElementById('cancelBtn');
const formTitle    = document.getElementById('formTitle');

const filterCategory = document.getElementById('filterCategory');
const filterMonth    = document.getElementById('filterMonth');
const resetFilterBtn = document.getElementById('resetFilter');

const totalAmountEl  = document.getElementById('totalAmount');
const totalCountEl   = document.getElementById('totalCount');
const topCategoryEl  = document.getElementById('topCategory');
const categoryChart  = document.getElementById('categoryChart');
const transactionList= document.getElementById('transactionList');

// ---- Data ----
let transactions = loadTransactions();

// ---- Persistence ----
function loadTransactions() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveTransactions() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(transactions));
}

// ---- Utilities ----
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  const months = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  return `${parseInt(d, 10)} ${months[parseInt(m, 10) - 1]} ${y}`;
}

// ---- Validation ----
function clearErrors() {
  ['name','amount','category','date'].forEach(id => {
    document.getElementById(id + 'Error').textContent = '';
    document.getElementById(id).classList.remove('invalid');
  });
}

function showError(id, msg) {
  document.getElementById(id + 'Error').textContent = msg;
  document.getElementById(id).classList.add('invalid');
}

function validateForm() {
  clearErrors();
  let valid = true;

  if (!nameInput.value.trim()) {
    showError('name', 'Nama pengeluaran tidak boleh kosong.');
    valid = false;
  }

  const amt = parseFloat(amountInput.value);
  if (!amountInput.value || isNaN(amt) || amt <= 0) {
    showError('amount', 'Nominal harus berupa angka positif.');
    valid = false;
  }

  if (!categoryInput.value) {
    showError('category', 'Pilih salah satu kategori.');
    valid = false;
  }

  if (!dateInput.value) {
    showError('date', 'Tanggal tidak boleh kosong.');
    valid = false;
  }

  return valid;
}

// ---- CRUD ----
function addTransaction(data) {
  transactions.unshift({ id: generateId(), ...data });
  saveTransactions();
}

function updateTransaction(id, data) {
  const idx = transactions.findIndex(t => t.id === id);
  if (idx !== -1) {
    transactions[idx] = { id, ...data };
    saveTransactions();
  }
}

function deleteTransaction(id) {
  transactions = transactions.filter(t => t.id !== id);
  saveTransactions();
}

// ---- Form handling ----
function resetForm() {
  form.reset();
  editIdInput.value = '';
  formTitle.textContent = 'Tambah Transaksi';
  submitBtn.textContent = 'Simpan';
  cancelBtn.hidden = true;
  clearErrors();
}

function populateEditForm(id) {
  const tx = transactions.find(t => t.id === id);
  if (!tx) return;
  editIdInput.value  = tx.id;
  nameInput.value    = tx.name;
  amountInput.value  = tx.amount;
  categoryInput.value= tx.category;
  dateInput.value    = tx.date;
  formTitle.textContent = 'Edit Transaksi';
  submitBtn.textContent = 'Update';
  cancelBtn.hidden = false;
  form.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

form.addEventListener('submit', function (e) {
  e.preventDefault();
  if (!validateForm()) return;

  const data = {
    name    : nameInput.value.trim(),
    amount  : parseFloat(amountInput.value),
    category: categoryInput.value,
    date    : dateInput.value,
  };

  const editId = editIdInput.value;
  if (editId) {
    updateTransaction(editId, data);
  } else {
    addTransaction(data);
  }

  resetForm();
  render();
});

cancelBtn.addEventListener('click', function () {
  resetForm();
});

// ---- Filters ----
function getFilteredTransactions() {
  const cat   = filterCategory.value;
  const month = filterMonth.value; // "YYYY-MM"
  return transactions.filter(t => {
    const catMatch   = !cat   || t.category === cat;
    const monthMatch = !month || t.date.startsWith(month);
    return catMatch && monthMatch;
  });
}

filterCategory.addEventListener('change', render);
filterMonth.addEventListener('change', render);
resetFilterBtn.addEventListener('click', function () {
  filterCategory.value = '';
  filterMonth.value    = '';
  render();
});

// ---- Summary ----
function renderSummary(list) {
  const total = list.reduce((s, t) => s + t.amount, 0);
  totalAmountEl.textContent = formatRupiah(total);
  totalCountEl.textContent  = list.length;

  if (list.length === 0) {
    topCategoryEl.textContent = '—';
    return;
  }

  const catTotals = {};
  list.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });
  const top = Object.entries(catTotals).sort((a, b) => b[1] - a[1])[0];
  topCategoryEl.textContent = top ? top[0] : '—';
}

// ---- Bar Chart ----
function renderChart(list) {
  categoryChart.innerHTML = '';

  if (list.length === 0) {
    const p = document.createElement('p');
    p.className = 'chart-empty';
    p.textContent = 'Belum ada data untuk ditampilkan.';
    categoryChart.appendChild(p);
    return;
  }

  const catTotals = {};
  list.forEach(t => {
    catTotals[t.category] = (catTotals[t.category] || 0) + t.amount;
  });

  const sorted = Object.entries(catTotals).sort((a, b) => b[1] - a[1]);
  const max    = sorted[0][1];

  sorted.forEach(([cat, amt]) => {
    const pct = max > 0 ? (amt / max) * 100 : 0;

    const row      = document.createElement('div');
    row.className  = 'chart-row';

    const label    = document.createElement('span');
    label.className= 'chart-label';
    label.textContent = cat;

    const wrap     = document.createElement('div');
    wrap.className = 'chart-bar-wrap';

    const bar      = document.createElement('div');
    bar.className  = 'chart-bar';
    bar.style.width= pct + '%';

    const amountEl = document.createElement('span');
    amountEl.className = 'chart-amount';
    amountEl.textContent = formatRupiah(amt);

    wrap.appendChild(bar);
    row.appendChild(label);
    row.appendChild(wrap);
    row.appendChild(amountEl);
    categoryChart.appendChild(row);
  });
}

// ---- Transaction List ----
function renderList(list) {
  transactionList.innerHTML = '';

  if (list.length === 0) {
    const div = document.createElement('div');
    div.className = 'empty-state';
    const icon = document.createElement('span');
    icon.className = 'empty-icon';
    icon.textContent = '📋';
    const msg = document.createElement('p');
    msg.textContent = 'Belum ada transaksi. Tambahkan pengeluaran pertama Anda!';
    div.appendChild(icon);
    div.appendChild(msg);
    transactionList.appendChild(div);
    return;
  }

  list.forEach(tx => {
    const item = document.createElement('div');
    item.className = 'transaction-item';

    const info = document.createElement('div');
    info.className = 'tx-info';

    const txName = document.createElement('div');
    txName.className = 'tx-name';
    txName.textContent = tx.name;

    const meta = document.createElement('div');
    meta.className = 'tx-meta';

    const badge = document.createElement('span');
    badge.className = 'tx-badge';
    badge.textContent = tx.category;

    const dateSpan = document.createElement('span');
    dateSpan.textContent = formatDate(tx.date);

    meta.appendChild(badge);
    meta.appendChild(dateSpan);
    info.appendChild(txName);
    info.appendChild(meta);

    const amount = document.createElement('div');
    amount.className = 'tx-amount';
    amount.textContent = formatRupiah(tx.amount);

    const actions = document.createElement('div');
    actions.className = 'tx-actions';

    const editBtn = document.createElement('button');
    editBtn.className = 'btn-icon btn-edit';
    editBtn.type = 'button';
    editBtn.title = 'Edit';
    editBtn.textContent = '✏️';
    editBtn.addEventListener('click', function () {
      populateEditForm(tx.id);
    });

    const delBtn = document.createElement('button');
    delBtn.className = 'btn-icon btn-delete';
    delBtn.type = 'button';
    delBtn.title = 'Hapus';
    delBtn.textContent = '🗑️';
    delBtn.addEventListener('click', function () {
      if (window.confirm('Hapus transaksi "' + tx.name + '"?')) {
        deleteTransaction(tx.id);
        render();
      }
    });

    actions.appendChild(editBtn);
    actions.appendChild(delBtn);

    item.appendChild(info);
    item.appendChild(amount);
    item.appendChild(actions);
    transactionList.appendChild(item);
  });
}

// ---- Main render ----
function render() {
  const filtered = getFilteredTransactions();
  renderSummary(filtered);
  renderChart(filtered);
  renderList(filtered);
}

// ---- Init ----
render();
