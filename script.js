// COLE AQUI A URL DA IMPLANTAÇÃO DO APPS SCRIPT (/exec)
const API_URL = 'https://script.google.com/macros/s/AKfycbyWdg30bk4BsYoNHq3_-em5v0LR5_w0wcEZFUaSLjpbC667RAtoACzR33WJHi2MOD9RcQ/exec';

const state = {
  token: localStorage.getItem('euricca_token') || '',
  user: null,
  products: [],
  users: [],
  dashboard: null,
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => [...document.querySelectorAll(selector)];

function money(value) {
  return Number(value || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(value) {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return String(value);
  return d.toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
}

function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');
}

async function api(action, payload = {}) {
  if (!API_URL || API_URL.includes('COLE_AQUI')) {
    throw new Error('Configure a URL do Apps Script no arquivo script.js.');
  }

  const response = await fetch(API_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ action, token: state.token, ...payload }),
  });

  const data = await response.json();
  if (!data.ok) {
    if (data.code === 'UNAUTHORIZED') logout(false);
    throw new Error(data.error || 'Erro ao comunicar com o servidor.');
  }
  return data.data;
}

function setButtonLoading(button, loading, loadingText = 'Aguarde...') {
  if (!button) return;
  if (loading) {
    button.dataset.originalText = button.textContent;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    button.textContent = button.dataset.originalText || button.textContent;
    button.disabled = false;
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  setTimeout(() => toast.classList.add('hidden'), 3200);
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}

function clearError(element) {
  element.textContent = '';
  element.classList.add('hidden');
}

function openModal(id) { $(`#${id}`).classList.remove('hidden'); }
function closeModal(id) { $(`#${id}`).classList.add('hidden'); }

function showApp() {
  $('#loginView').classList.add('hidden');
  $('#appView').classList.remove('hidden');
  $('#userName').textContent = state.user.nome;
  $('#userRole').textContent = state.user.perfil === 'ADMIN' ? 'Administrador' : 'Equipe';
  $('#userInitial').textContent = state.user.nome.slice(0, 1).toUpperCase();
  $('#usersNav').classList.toggle('hidden', state.user.perfil !== 'ADMIN');
}

function showLogin() {
  $('#appView').classList.add('hidden');
  $('#loginView').classList.remove('hidden');
}

async function login(event) {
  event.preventDefault();
  const button = $('#loginButton');
  const error = $('#loginError');
  clearError(error);
  setButtonLoading(button, true, 'Entrando...');

  try {
    const data = await api('login', {
      email: $('#loginEmail').value.trim(),
      password: $('#loginPassword').value,
    });
    state.token = data.token;
    state.user = data.user;
    localStorage.setItem('euricca_token', state.token);
    showApp();
    await loadAll();
  } catch (err) {
    showError(error, err.message);
  } finally {
    setButtonLoading(button, false);
  }
}

async function restoreSession() {
  if (!state.token) {
    showLogin();
    return;
  }
  try {
    state.user = await api('me');
    showApp();
    await loadAll();
  } catch (_) {
    logout(false);
  }
}

async function logout(callApi = true) {
  if (callApi && state.token) {
    try { await api('logout'); } catch (_) {}
  }
  state.token = '';
  state.user = null;
  state.products = [];
  state.users = [];
  localStorage.removeItem('euricca_token');
  showLogin();
}

async function loadAll() {
  await Promise.all([loadDashboard(), loadProducts()]);
  if (state.user.perfil === 'ADMIN') await loadUsers();
}

async function loadDashboard() {
  state.dashboard = await api('dashboard');
  renderDashboard();
}

function renderDashboard() {
  const d = state.dashboard || {};
  $('#metricProducts').textContent = d.totalProdutos || 0;
  $('#metricUnits').textContent = Number(d.totalPecas || 0).toLocaleString('pt-BR');
  $('#metricValue').textContent = money(d.valorTotal || 0);
  $('#metricCategories').textContent = d.totalCategorias || 0;

  const categorySummary = $('#categorySummary');
  const categories = d.porCategoria || [];
  if (!categories.length) {
    categorySummary.className = 'category-list empty-state';
    categorySummary.textContent = 'Nenhum produto cadastrado ainda.';
  } else {
    categorySummary.className = 'category-list';
    categorySummary.innerHTML = categories.map(item => `
      <div class="category-row">
        <strong>${escapeHtml(item.categoria)}</strong>
        <span>${Number(item.quantidade || 0).toLocaleString('pt-BR')} peças</span>
        <b>${money(item.valor || 0)}</b>
      </div>
    `).join('');
  }

  const recent = $('#recentProducts');
  const items = d.recentes || [];
  if (!items.length) {
    recent.className = 'recent-list empty-state';
    recent.textContent = 'Nenhum produto cadastrado ainda.';
  } else {
    recent.className = 'recent-list';
    recent.innerHTML = items.map(item => `
      <div class="recent-row">
        <div>
          <strong>${escapeHtml(item.produto)}</strong>
          <span>${escapeHtml(item.codigo)} · ${escapeHtml(item.categoria)}</span>
        </div>
        <b>${money(item.valorTotal)}</b>
      </div>
    `).join('');
  }
}

async function loadProducts() {
  state.products = await api('listProducts');
  renderProducts();
  renderCategoryOptions();
}

function renderProducts() {
  const search = $('#productSearch').value.trim().toLowerCase();
  const category = $('#categoryFilter').value;
  const filtered = state.products.filter(p => {
    const matchesSearch = !search || p.produto.toLowerCase().includes(search) || p.codigo.toLowerCase().includes(search);
    const matchesCategory = !category || p.categoria === category;
    return matchesSearch && matchesCategory;
  });

  const body = $('#productsTableBody');
  const empty = $('#productsEmpty');
  body.innerHTML = filtered.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.codigo)}</strong></td>
      <td>${escapeHtml(p.produto)}</td>
      <td>${escapeHtml(p.categoria)}</td>
      <td>${Number(p.quantidade).toLocaleString('pt-BR')}</td>
      <td>${money(p.valorUnitario)}</td>
      <td><strong>${money(p.valorTotal)}</strong></td>
      <td>${escapeHtml(p.criadoPor || '—')}</td>
      <td>
        <div class="row-actions">
          <button class="action-btn" onclick="editProduct('${p.id}')">Editar</button>
          <button class="action-btn danger" onclick="removeProduct('${p.id}')">Excluir</button>
        </div>
      </td>
    </tr>
  `).join('');
  empty.classList.toggle('hidden', filtered.length > 0);
}

function renderCategoryOptions() {
  const categories = [...new Set(state.products.map(p => p.categoria).filter(Boolean))].sort((a,b) => a.localeCompare(b));
  const filter = $('#categoryFilter');
  const current = filter.value;
  filter.innerHTML = '<option value="">Todas as categorias</option>' + categories.map(c => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join('');
  filter.value = current;
  $('#categoryOptions').innerHTML = categories.map(c => `<option value="${escapeHtml(c)}"></option>`).join('');
}

function resetProductForm() {
  $('#productForm').reset();
  $('#productId').value = '';
  $('#productQuantity').value = 1;
  $('#productModalTitle').textContent = 'Novo produto';
  clearError($('#productFormError'));
}

function newProduct() {
  resetProductForm();
  openModal('productModal');
}

window.editProduct = function (id) {
  const p = state.products.find(item => item.id === id);
  if (!p) return;
  $('#productId').value = p.id;
  $('#productCode').value = p.codigo;
  $('#productName').value = p.produto;
  $('#productCategory').value = p.categoria;
  $('#productQuantity').value = p.quantidade;
  $('#productUnitValue').value = p.valorUnitario;
  $('#productObservation').value = p.observacao || '';
  $('#productModalTitle').textContent = 'Editar produto';
  clearError($('#productFormError'));
  openModal('productModal');
};

async function saveProduct(event) {
  event.preventDefault();
  const button = $('#saveProductButton');
  const error = $('#productFormError');
  clearError(error);
  setButtonLoading(button, true, 'Salvando...');

  const payload = {
    id: $('#productId').value || undefined,
    codigo: $('#productCode').value.trim(),
    produto: $('#productName').value.trim(),
    categoria: $('#productCategory').value.trim(),
    quantidade: Number($('#productQuantity').value),
    valorUnitario: Number($('#productUnitValue').value),
    observacao: $('#productObservation').value.trim(),
  };

  try {
    await api(payload.id ? 'updateProduct' : 'createProduct', { product: payload });
    closeModal('productModal');
    showToast(payload.id ? 'Produto atualizado.' : 'Produto cadastrado.');
    await Promise.all([loadProducts(), loadDashboard()]);
  } catch (err) {
    showError(error, err.message);
  } finally {
    setButtonLoading(button, false);
  }
}

window.removeProduct = async function (id) {
  const p = state.products.find(item => item.id === id);
  if (!p) return;
  const confirmed = confirm(`Excluir o produto “${p.produto}”?`);
  if (!confirmed) return;
  try {
    await api('deleteProduct', { id });
    showToast('Produto excluído.');
    await Promise.all([loadProducts(), loadDashboard()]);
  } catch (err) {
    alert(err.message);
  }
};

async function loadUsers() {
  state.users = await api('listUsers');
  renderUsers();
}

function renderUsers() {
  const body = $('#usersTableBody');
  const empty = $('#usersEmpty');
  body.innerHTML = state.users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.nome)}</strong></td>
      <td>${escapeHtml(u.email)}</td>
      <td>${u.perfil === 'ADMIN' ? 'Administrador' : 'Equipe'}</td>
      <td><span class="status-pill ${u.ativo ? '' : 'off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>${formatDate(u.ultimoLogin)}</td>
      <td>
        <div class="row-actions">
          <button class="action-btn ${u.ativo ? 'danger' : ''}" onclick="toggleUser('${u.id}', ${!u.ativo})">
            ${u.ativo ? 'Desativar' : 'Ativar'}
          </button>
        </div>
      </td>
    </tr>
  `).join('');
  empty.classList.toggle('hidden', state.users.length > 0);
}

async function saveUser(event) {
  event.preventDefault();
  const button = $('#saveUserButton');
  const error = $('#userFormError');
  clearError(error);
  setButtonLoading(button, true, 'Criando...');

  try {
    await api('createUser', {
      user: {
        nome: $('#newUserName').value.trim(),
        email: $('#newUserEmail').value.trim(),
        password: $('#newUserPassword').value,
        perfil: $('#newUserRole').value,
      },
    });
    $('#userForm').reset();
    closeModal('userModal');
    showToast('Usuário criado.');
    await loadUsers();
  } catch (err) {
    showError(error, err.message);
  } finally {
    setButtonLoading(button, false);
  }
}

window.toggleUser = async function (id, ativo) {
  const confirmed = confirm(`${ativo ? 'Ativar' : 'Desativar'} este usuário?`);
  if (!confirmed) return;
  try {
    await api('toggleUser', { id, ativo });
    showToast(ativo ? 'Usuário ativado.' : 'Usuário desativado.');
    await loadUsers();
  } catch (err) {
    alert(err.message);
  }
};

function switchView(viewName) {
  const map = {
    dashboard: ['dashboardView', 'Dashboard'],
    products: ['productsView', 'Produtos'],
    users: ['usersView', 'Usuários'],
  };
  const target = map[viewName];
  if (!target) return;
  $$('.view-section').forEach(section => section.classList.add('hidden'));
  $(`#${target[0]}`).classList.remove('hidden');
  $('#pageTitle').textContent = target[1];
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
  $('#newProductTop').classList.toggle('hidden', viewName === 'users');
}

$('#loginForm').addEventListener('submit', login);
$('#logoutButton').addEventListener('click', () => logout(true));
$('#newProductTop').addEventListener('click', newProduct);
$('#newProductButton').addEventListener('click', newProduct);
$('#productForm').addEventListener('submit', saveProduct);
$('#newUserButton').addEventListener('click', () => { $('#userForm').reset(); clearError($('#userFormError')); openModal('userModal'); });
$('#userForm').addEventListener('submit', saveUser);
$('#productSearch').addEventListener('input', renderProducts);
$('#categoryFilter').addEventListener('change', renderProducts);
$$('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => {
  if (event.target === backdrop) backdrop.classList.add('hidden');
}));

restoreSession();
