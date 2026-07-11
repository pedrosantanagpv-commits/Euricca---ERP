const API_URL = 'https://script.google.com/macros/s/AKfycbyWdg30bk4BsYoNHq3_-em5v0LR5_w0wcEZFUaSLjpbC667RAtoACzR33WJHi2MOD9RcQ/exec';

const CATEGORIES = [
  { id: 'AN', name: 'Anel', icon: 'ring' },
  { id: 'BLT', name: 'Bracelete', icon: 'bracelet' },
  { id: 'BR', name: 'Brinco', icon: 'earring' },
  { id: 'CHO', name: 'Choker', icon: 'choker' },
  { id: 'CL', name: 'Colar', icon: 'necklace' },
  { id: 'CON', name: 'Conjunto', icon: 'set' },
  { id: 'COR', name: 'Corrente', icon: 'chain' },
  { id: 'ELO', name: 'Elo', icon: 'link' },
  { id: 'ESC', name: 'Escapulário', icon: 'cross' },
  { id: 'GAR', name: 'Gargantilha', icon: 'gargantilha' },
  { id: 'PIE', name: 'Piercing', icon: 'piercing' },
  { id: 'PIN', name: 'Pingente', icon: 'pendant' },
  { id: 'PUL', name: 'Pulseira', icon: 'pulseira' },
  { id: 'TOR', name: 'Tornozeleira', icon: 'anklet' },
];

const FINISHES = ['Ródio', 'Ouro', 'Prata'];

const state = {
  token: localStorage.getItem('euricca_token') || '',
  user: null,
  products: [],
  users: [],
  dashboard: null,
  saveMode: 'close',
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

function categoryMeta(name) {
  return CATEGORIES.find(c => c.name === name || c.id === name) || { id: '', name: name || 'Sem categoria', icon: 'default' };
}

function iconSvg(icon) {
  const common = 'viewBox="0 0 24 24" aria-hidden="true"';
  const paths = {
    ring: '<path d="M7 9h10l-2.3-4H9.3L7 9Z"/><circle cx="12" cy="15" r="5"/>',
    bracelet: '<circle cx="12" cy="12" r="7"/><path d="M8 6.3 7 4.5M16 6.3 17 4.5"/>',
    earring: '<path d="M12 3c3.2 4 5 6.5 5 9a5 5 0 0 1-10 0c0-2.5 1.8-5 5-9Z"/><circle cx="12" cy="17.5" r="1.5"/>',
    choker: '<path d="M4 8c2.8 5.5 5.5 8 8 8s5.2-2.5 8-8"/><path d="M7 10h10"/>',
    necklace: '<path d="M4 6c1.8 7 4.8 11 8 11s6.2-4 8-11"/><path d="m12 17 2 2-2 2-2-2 2-2Z"/>',
    set: '<path d="m8 4 3 3-3 3-3-3 3-3ZM16 10l3 3-3 3-3-3 3-3Z"/><circle cx="9" cy="17" r="2.5"/>',
    chain: '<path d="M8.5 14.5 6 17a3 3 0 0 1-4-4l3.5-3.5a3 3 0 0 1 4 0"/><path d="m15.5 9.5 2.5-2.5a3 3 0 0 1 4 4l-3.5 3.5a3 3 0 0 1-4 0"/><path d="m8 16 8-8"/>',
    link: '<path d="M10 13a4 4 0 0 0 5.7.3l2-2a4 4 0 0 0-5.7-5.6l-1.1 1.1"/><path d="M14 11a4 4 0 0 0-5.7-.3l-2 2A4 4 0 0 0 12 18.3l1.1-1.1"/>',
    cross: '<path d="M12 4v16M7 9h10"/><path d="M5 3c2 2 4 3 7 3s5-1 7-3"/>',
    gargantilha: '<path d="M3 8c3 4.5 6 6.5 9 6.5S18 12.5 21 8"/><circle cx="12" cy="17" r="1.5"/>',
    piercing: '<path d="M17 7a7 7 0 1 0 0 10"/><circle cx="18.5" cy="6.5" r="1.5"/><circle cx="18.5" cy="17.5" r="1.5"/>',
    pendant: '<path d="M5 4c2 2 4.5 3 7 3s5-1 7-3"/><path d="m12 8 4 5-4 6-4-6 4-5Z"/>',
    pulseira: '<path d="M5 8c1.5-2 4-3 7-3s5.5 1 7 3v8c-1.5 2-4 3-7 3s-5.5-1-7-3V8Z"/><path d="M5 12h14"/>',
    anklet: '<path d="M3 12c3-2 5-2 8 0s5 2 10 0"/><path d="m15 14 1.5 2 1.5-2"/><circle cx="7" cy="10" r="1"/>',
    default: '<circle cx="12" cy="12" r="7"/><path d="m12 8 4 4-4 4-4-4 4-4Z"/>',
  };
  return `<svg ${common}>${paths[icon] || paths.default}</svg>`;
}

function categoryIcon(name) {
  const meta = categoryMeta(name);
  return `<span class="category-icon" title="${escapeHtml(meta.name)}">${iconSvg(meta.icon)}</span>`;
}

async function api(action, payload = {}) {
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
    button.dataset.originalHtml = button.innerHTML;
    button.textContent = loadingText;
    button.disabled = true;
  } else {
    if (button.dataset.originalHtml) {
      button.innerHTML = button.dataset.originalHtml;
      delete button.dataset.originalHtml;
    }
    button.disabled = false;
  }
}

function showToast(message) {
  const toast = $('#toast');
  toast.textContent = message;
  toast.classList.remove('hidden');
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => toast.classList.add('hidden'), 3000);
}

function showError(element, message) {
  element.textContent = message;
  element.classList.remove('hidden');
}
function clearError(element) { element.textContent = ''; element.classList.add('hidden'); }
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
function showLogin() { $('#appView').classList.add('hidden'); $('#loginView').classList.remove('hidden'); }

async function login(event) {
  event.preventDefault();
  const button = $('#loginButton');
  const error = $('#loginError');
  clearError(error);
  setButtonLoading(button, true, 'Entrando...');
  try {
    const data = await api('login', { email: $('#loginEmail').value.trim(), password: $('#loginPassword').value });
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
  if (!state.token) return showLogin();
  try {
    state.user = await api('me');
    showApp();
    await loadAll();
  } catch (_) { logout(false); }
}

async function logout(callApi = true) {
  if (callApi && state.token) { try { await api('logout'); } catch (_) {} }
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
  $('#metricProducts').textContent = Number(d.totalProdutos || 0).toLocaleString('pt-BR');
  $('#metricUnits').textContent = Number(d.totalPecas || 0).toLocaleString('pt-BR');
  $('#metricValue').textContent = money(d.valorTotal || 0);
  $('#metricCategories').textContent = Number(d.totalCategorias || 0).toLocaleString('pt-BR');

  const categorySummary = $('#categorySummary');
  const categories = d.porCategoria || [];
  if (!categories.length) {
    categorySummary.className = 'category-list empty-state';
    categorySummary.textContent = 'Nenhum produto cadastrado ainda.';
  } else {
    categorySummary.className = 'category-list';
    categorySummary.innerHTML = categories.map(item => `
      <div class="category-row">
        <div class="category-cell">${categoryIcon(item.categoria)}<strong>${escapeHtml(item.categoria)}</strong></div>
        <span>${Number(item.quantidade || 0).toLocaleString('pt-BR')} peças</span>
        <b>${money(item.valor || 0)}</b>
      </div>
    `).join('');
  }

  const finishSummary = $('#finishSummary');
  const finishes = d.porAcabamento || [];
  if (!finishes.length) {
    finishSummary.className = 'finish-list empty-state';
    finishSummary.textContent = 'Nenhum produto cadastrado ainda.';
  } else {
    finishSummary.className = 'finish-list';
    finishSummary.innerHTML = FINISHES.map(name => {
      const item = finishes.find(f => f.acabamento === name) || { quantidade: 0, valor: 0 };
      return `<div class="finish-row"><div class="finish-row-head"><span class="finish-chip"><i class="finish-dot"></i>${name}</span><b>${Number(item.quantidade || 0).toLocaleString('pt-BR')} peças</b></div><small>${money(item.valor || 0)} em estoque</small></div>`;
    }).join('');
  }

  const recent = $('#recentProducts');
  const items = d.recentes || [];
  if (!items.length) {
    recent.className = 'recent-grid empty-state';
    recent.textContent = 'Nenhum produto cadastrado ainda.';
  } else {
    recent.className = 'recent-grid';
    recent.innerHTML = items.map(item => `
      <div class="recent-card">
        <div class="recent-card-top">
          ${categoryIcon(item.categoria)}
          <div><strong>${escapeHtml(item.produto)}</strong><span>${escapeHtml(item.codigo)} · ${escapeHtml(item.categoria)} · ${escapeHtml(item.acabamento || '—')}</span></div>
        </div>
        <div class="recent-card-footer"><small>${Number(item.quantidade || 0).toLocaleString('pt-BR')} un.</small><b>${money(item.valorTotal)}</b></div>
      </div>
    `).join('');
  }
}

async function loadProducts() {
  state.products = await api('listProducts');
  renderProducts();
  renderCategoryFilter();
}

function renderProducts() {
  const search = $('#productSearch').value.trim().toLowerCase();
  const category = $('#categoryFilter').value;
  const finish = $('#finishFilter').value;
  const filtered = state.products.filter(p => {
    const name = String(p.produto || '').toLowerCase();
    const code = String(p.codigo || '').toLowerCase();
    return (!search || name.includes(search) || code.includes(search)) && (!category || p.categoria === category) && (!finish || p.acabamento === finish);
  });
  const body = $('#productsTableBody');
  body.innerHTML = filtered.map(p => `
    <tr>
      <td><strong>${escapeHtml(p.codigo)}</strong></td>
      <td>${escapeHtml(p.produto)}</td>
      <td><span class="table-category">${categoryIcon(p.categoria)}<span>${escapeHtml(p.categoria)}</span></span></td>
      <td><span class="finish-badge">${escapeHtml(p.acabamento || '—')}</span></td>
      <td>${Number(p.quantidade || 0).toLocaleString('pt-BR')}</td>
      <td>${money(p.valorUnitario)}</td>
      <td><strong>${money(p.valorTotal)}</strong></td>
      <td>${escapeHtml(p.criadoPor || '—')}</td>
      <td><div class="row-actions"><button class="action-btn" onclick="editProduct('${p.id}')">Editar</button><button class="action-btn danger" onclick="removeProduct('${p.id}')">Excluir</button></div></td>
    </tr>
  `).join('');
  $('#productsEmpty').classList.toggle('hidden', filtered.length > 0);
}

function renderCategoryFilter() {
  const filter = $('#categoryFilter');
  const current = filter.value;
  filter.innerHTML = '<option value="">Todas as categorias</option>' + CATEGORIES.map(c => `<option value="${c.name}">${c.id} · ${c.name}</option>`).join('');
  filter.value = current;
}

function renderCategoryPicker() {
  $('#categoryPicker').innerHTML = CATEGORIES.map(c => `<button class="category-choice" type="button" data-category="${c.name}" title="${c.id} · ${c.name}">${categoryIcon(c.name)}<span>${c.name}</span></button>`).join('');
  $$('.category-choice').forEach(btn => btn.addEventListener('click', () => selectCategory(btn.dataset.category)));
  $$('.segment-btn').forEach(btn => btn.addEventListener('click', () => selectFinish(btn.dataset.finish)));
}

function selectCategory(name) {
  $('#productCategory').value = name;
  $$('.category-choice').forEach(btn => btn.classList.toggle('active', btn.dataset.category === name));
}
function selectFinish(name) {
  $('#productFinish').value = name;
  $$('.segment-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.finish === name));
}

function updateTotalPreview() {
  const qty = Number($('#productQuantity').value || 0);
  const unit = Number($('#productUnitValue').value || 0);
  $('#productTotalPreview').textContent = money(qty * unit);
}

function resetProductForm({ keepSelections = false } = {}) {
  const category = keepSelections ? $('#productCategory').value : '';
  const finish = keepSelections ? $('#productFinish').value : '';
  $('#productForm').reset();
  $('#productId').value = '';
  $('#productQuantity').value = 1;
  $('#productModalTitle').textContent = 'Novo produto';
  $('#saveAndNextButton').classList.remove('hidden');
  $('#productCategory').value = '';
  $('#productFinish').value = '';
  selectCategory(category);
  selectFinish(finish);
  updateTotalPreview();
  clearError($('#productFormError'));
}

function newProduct() {
  resetProductForm();
  openModal('productModal');
  setTimeout(() => $('#productName').focus(), 80);
}

window.editProduct = function (id) {
  const p = state.products.find(item => item.id === id);
  if (!p) return;
  resetProductForm();
  $('#productId').value = p.id;
  $('#productCode').value = p.codigo;
  $('#productName').value = p.produto;
  $('#productQuantity').value = p.quantidade;
  $('#productUnitValue').value = p.valorUnitario;
  $('#productBuyValue').value = p.valorCompraUnitario || 0;
  $('#productObservation').value = p.observacao || '';
  selectCategory(p.categoria);
  selectFinish(p.acabamento || '');
  updateTotalPreview();
  $('#productModalTitle').textContent = 'Editar produto';
  $('#saveAndNextButton').classList.add('hidden');
  openModal('productModal');
};

async function persistProduct(mode = 'close') {
  const error = $('#productFormError');
  const submitButton = $('#saveProductButton');
  const nextButton = $('#saveAndNextButton');
  clearError(error);

  if (!$('#productCategory').value) return showError(error, 'Selecione uma categoria.');
  if (!$('#productFinish').value) return showError(error, 'Selecione um acabamento.');
  if (!$('#productForm').reportValidity()) return;

  const payload = {
    id: $('#productId').value || undefined,
    codigo: $('#productCode').value.trim(),
    produto: $('#productName').value.trim(),
    categoria: $('#productCategory').value,
    acabamento: $('#productFinish').value,
    quantidade: Number($('#productQuantity').value),
    valorUnitario: Number($('#productUnitValue').value),
    valorCompraUnitario: Number($('#productBuyValue').value || 0),
    observacao: $('#productObservation').value.trim(),
  };

  setButtonLoading(submitButton, true, 'Salvando...');
  nextButton.disabled = true;
  try {
    await api(payload.id ? 'updateProduct' : 'createProduct', { product: payload });
    showToast(payload.id ? 'Produto atualizado.' : 'Produto cadastrado.');
    await Promise.all([loadProducts(), loadDashboard()]);
    if (mode === 'next' && !payload.id) {
      resetProductForm({ keepSelections: true });
      setTimeout(() => $('#productName').focus(), 60);
    } else {
      closeModal('productModal');
    }
  } catch (err) {
    showError(error, err.message);
  } finally {
    setButtonLoading(submitButton, false);
    nextButton.disabled = false;
  }
}

async function saveProduct(event) { event.preventDefault(); await persistProduct('close'); }

window.removeProduct = async function (id) {
  const p = state.products.find(item => item.id === id);
  if (!p || !confirm(`Excluir o produto “${p.produto}”?`)) return;
  try {
    await api('deleteProduct', { id });
    showToast('Produto excluído.');
    await Promise.all([loadProducts(), loadDashboard()]);
  } catch (err) { alert(err.message); }
};

async function loadUsers() { state.users = await api('listUsers'); renderUsers(); }
function renderUsers() {
  $('#usersTableBody').innerHTML = state.users.map(u => `
    <tr>
      <td><strong>${escapeHtml(u.nome)}</strong></td><td>${escapeHtml(u.email)}</td>
      <td>${u.perfil === 'ADMIN' ? 'Administrador' : 'Equipe'}</td>
      <td><span class="status-pill ${u.ativo ? '' : 'off'}">${u.ativo ? 'Ativo' : 'Inativo'}</span></td>
      <td>${formatDate(u.ultimoLogin)}</td>
      <td><div class="row-actions"><button class="action-btn ${u.ativo ? 'danger' : ''}" onclick="toggleUser('${u.id}', ${!u.ativo})">${u.ativo ? 'Desativar' : 'Ativar'}</button></div></td>
    </tr>`).join('');
  $('#usersEmpty').classList.toggle('hidden', state.users.length > 0);
}

async function saveUser(event) {
  event.preventDefault();
  const button = $('#saveUserButton');
  const error = $('#userFormError');
  clearError(error);
  setButtonLoading(button, true, 'Criando...');
  try {
    await api('createUser', { user: { nome: $('#newUserName').value.trim(), email: $('#newUserEmail').value.trim(), password: $('#newUserPassword').value, perfil: $('#newUserRole').value } });
    $('#userForm').reset();
    closeModal('userModal');
    showToast('Usuário criado.');
    await loadUsers();
  } catch (err) { showError(error, err.message); }
  finally { setButtonLoading(button, false); }
}

window.toggleUser = async function (id, ativo) {
  if (!confirm(`${ativo ? 'Ativar' : 'Desativar'} este usuário?`)) return;
  try { await api('toggleUser', { id, ativo }); showToast(ativo ? 'Usuário ativado.' : 'Usuário desativado.'); await loadUsers(); }
  catch (err) { alert(err.message); }
};

async function exportReport() {
  const button = $('#exportReportButton');
  setButtonLoading(button, true, 'Gerando Excel...');
  try {
    const report = await api('exportReport');
    if (!report || !report.base64) throw new Error('O arquivo não foi gerado corretamente.');

    const binary = atob(report.base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);

    const blob = new Blob([bytes], {
      type: report.mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = report.fileName || 'Euricca-Balanco.xlsx';
    document.body.appendChild(link);
    link.click();
    link.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    showToast('Relatório Excel exportado.');
  } catch (err) {
    alert(err.message || 'Não foi possível exportar o relatório.');
  } finally {
    setButtonLoading(button, false);
  }
}

function switchView(viewName) {
  const map = { dashboard: ['dashboardView', 'Dashboard'], products: ['productsView', 'Produtos'], users: ['usersView', 'Usuários'] };
  const target = map[viewName];
  if (!target) return;
  $$('.view-section').forEach(section => section.classList.add('hidden'));
  $(`#${target[0]}`).classList.remove('hidden');
  $('#pageTitle').textContent = target[1];
  $$('.nav-item').forEach(item => item.classList.toggle('active', item.dataset.view === viewName));
  $('#newProductTop').classList.toggle('hidden', viewName === 'users');
}

renderCategoryPicker();
$('#loginForm').addEventListener('submit', login);
$('#logoutButton').addEventListener('click', () => logout(true));
$('#newProductTop').addEventListener('click', newProduct);
$('#exportReportButton').addEventListener('click', exportReport);
$('#newProductButton').addEventListener('click', newProduct);
$('#productForm').addEventListener('submit', saveProduct);
$('#saveAndNextButton').addEventListener('click', () => persistProduct('next'));
$('#productQuantity').addEventListener('input', updateTotalPreview);
$('#productUnitValue').addEventListener('input', updateTotalPreview);
$('#newUserButton').addEventListener('click', () => { $('#userForm').reset(); clearError($('#userFormError')); openModal('userModal'); });
$('#userForm').addEventListener('submit', saveUser);
$('#productSearch').addEventListener('input', renderProducts);
$('#categoryFilter').addEventListener('change', renderProducts);
$('#finishFilter').addEventListener('change', renderProducts);
$$('.nav-item').forEach(item => item.addEventListener('click', () => switchView(item.dataset.view)));
$$('[data-view-link]').forEach(item => item.addEventListener('click', () => switchView(item.dataset.viewLink)));
$$('[data-close]').forEach(button => button.addEventListener('click', () => closeModal(button.dataset.close)));
$$('.modal-backdrop').forEach(backdrop => backdrop.addEventListener('click', event => { if (event.target === backdrop) backdrop.classList.add('hidden'); }));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && !$('#productModal').classList.contains('hidden')) closeModal('productModal');
  if (event.ctrlKey && event.key === 'Enter' && !$('#productModal').classList.contains('hidden')) { event.preventDefault(); persistProduct('next'); }
});

restoreSession();
