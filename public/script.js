// ==================== GLOBALS & CONSTANTS ====================
const STORAGE_KEY = 'ipt_demo_v1';
let currentUser = null;

window.db = {
  accounts: [],
  departments: [],
  employees: [],
  requests: []
};

// Routes that require authentication
const PROTECTED_ROUTES = ['profile', 'requests'];
const ADMIN_ROUTES = ['employees', 'accounts', 'departments'];

// ==================== STORAGE ====================
function loadFromStorage() {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      const parsed = JSON.parse(data);
      window.db.accounts = parsed.accounts || [];
      window.db.departments = parsed.departments || [];
      window.db.employees = parsed.employees || [];
      window.db.requests = parsed.requests || [];
    } else {
      seedData();
    }
  } catch (e) {
    seedData();
  }
}

function seedData() {
  window.db.accounts = [
    {
      id: generateId(),
      firstName: 'Admin',
      lastName: 'User',
      email: 'admin@example.com',
      password: 'Password123!',
      role: 'admin',
      verified: true
    }
  ];
  window.db.departments = [
    { id: generateId(), name: 'Engineering', description: 'Software development' },
    { id: generateId(), name: 'HR', description: 'Human Resources' }
  ];
  window.db.employees = [];
  window.db.requests = [];
  saveToStorage();
}

function saveToStorage() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(window.db));
}

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== AUTH ====================
function setAuthState(isAuth, user = null) {
  currentUser = user;
  const body = document.body;
  body.classList.remove('authenticated', 'not-authenticated', 'is-admin');
  if (isAuth && user) {
    body.classList.add('authenticated');
    const dropdownLabel = document.querySelector('#userDropdown');
    if (dropdownLabel) dropdownLabel.textContent = user.firstName || user.email;
  } else {
    body.classList.add('not-authenticated');
  }
  if (isAuth && user && user.role === 'admin') {
    body.classList.add('is-admin');
  }
}

function getAccountByEmail(email) {
  return window.db.accounts.find(a => a.email.toLowerCase() === email.toLowerCase());
}

// ==================== ROUTING ====================
function navigateTo(hash) {
  window.location.hash = hash || '#/';
}

function handleRouting() {
  let hash = window.location.hash.slice(1) || '/';
  if (!hash.startsWith('/')) hash = '/' + hash;
  const route = hash.slice(1).split('/')[0] || 'home';

  document.querySelectorAll('.page').forEach(p => {
    p.classList.remove('active');
  });

  const pageId = route === 'home' ? 'home-page' : `${route}-page`;
  const page = document.getElementById(pageId);

  if (page) {
    page.classList.add('active');
  } else {
    document.getElementById('home-page').classList.add('active');
  }

  // Redirect unauthenticated users from protected routes
  const isLoggedIn = !!currentUser;
  if (PROTECTED_ROUTES.includes(route) && !isLoggedIn) {
    navigateTo('#/login');
    return;
  }

  // Block non-admins from admin routes
  if (ADMIN_ROUTES.includes(route) && (!isLoggedIn || currentUser.role !== 'admin')) {
    showToast('Access denied. Admin only.', 'danger');
    navigateTo('#/');
    return;
  }

  // Call route renderer
  if (router[route]) {
    router[route]();
  }
}

// ==================== ROUTER (maps routes to renderers) ====================
const router = {
  home: () => {},
  register: () => {},
  'verify-email': renderVerifyEmailPage,
  login: () => {
    document.getElementById('loginError').classList.add('d-none');
  },
  profile: renderProfile,
  employees: renderEmployeesTable,
  departments: renderDepartmentsTable,
  accounts: renderAccountsList,
  requests: renderRequestsTable
};

// ==================== RENDER: Verify Email ====================
function renderVerifyEmailPage() {
  const email = localStorage.getItem('unverified_email') || '[email]';
  const msg = document.getElementById('verifyEmailMessage');
  if (msg) msg.textContent = `Verification sent to ${email}`;
}

// ==================== RENDER: Profile ====================
function renderProfile() {
  const container = document.getElementById('profileContent');
  if (!container || !currentUser) return;
  container.innerHTML = `
    <div class="card" style="max-width: 400px;">
      <div class="card-body">
        <h5 class="card-title">${currentUser.firstName} ${currentUser.lastName}</h5>
        <p class="card-text"><strong>Email:</strong> ${currentUser.email}</p>
        <p class="card-text"><strong>Role:</strong> ${(currentUser.role || 'user').charAt(0).toUpperCase() + (currentUser.role || 'user').slice(1)}</p>
        <button type="button" class="btn btn-outline-primary" id="editProfileBtn">Edit Profile</button>
      </div>
    </div>
  `;
  document.getElementById('editProfileBtn')?.addEventListener('click', () => alert('Edit profile – not implemented'));
}

// ==================== RENDER: Accounts ====================
function renderAccountsList() {
  const container = document.getElementById('accountsTable');
  if (!container) return;
  const accounts = window.db.accounts || [];
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Verified</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${accounts.map(acc => `
            <tr>
              <td>${acc.firstName} ${acc.lastName}</td>
              <td>${acc.email}</td>
              <td>${acc.role || 'user'}</td>
              <td>${acc.verified ? '✓' : '—'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline-primary edit-account-btn" data-id="${acc.id}">Edit</button>
                <button type="button" class="btn btn-sm btn-outline-warning reset-pw-btn" data-id="${acc.id}">Reset PW</button>
                <button type="button" class="btn btn-sm btn-outline-danger delete-account-btn" data-id="${acc.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.querySelectorAll('.edit-account-btn').forEach(btn => {
    btn.addEventListener('click', () => openAccountModal(btn.dataset.id));
  });
  container.querySelectorAll('.reset-pw-btn').forEach(btn => {
    btn.addEventListener('click', () => resetAccountPassword(btn.dataset.id));
  });
  container.querySelectorAll('.delete-account-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteAccount(btn.dataset.id));
  });
}

function openAccountModal(editId = null) {
  const modal = new bootstrap.Modal(document.getElementById('accountModal'));
  const title = document.getElementById('accountModalTitle');
  const form = document.getElementById('accountForm');
  form.reset();
  document.getElementById('accountId').value = editId || '';
  document.getElementById('accPassword').required = !editId;

  if (editId) {
    title.textContent = 'Edit Account';
    const acc = window.db.accounts.find(a => a.id === editId);
    if (acc) {
      document.getElementById('accFirstName').value = acc.firstName;
      document.getElementById('accLastName').value = acc.lastName;
      document.getElementById('accEmail').value = acc.email;
      document.getElementById('accRole').value = acc.role || 'user';
      document.getElementById('accVerified').checked = !!acc.verified;
    }
  } else {
    title.textContent = 'Add Account';
  }
  modal.show();
}

function saveAccount() {
  const id = document.getElementById('accountId').value;
  const firstName = document.getElementById('accFirstName').value.trim();
  const lastName = document.getElementById('accLastName').value.trim();
  const email = document.getElementById('accEmail').value.trim().toLowerCase();
  const password = document.getElementById('accPassword').value;
  const role = document.getElementById('accRole').value;
  const verified = document.getElementById('accVerified').checked;

  if (!firstName || !lastName || !email) {
    showToast('Please fill required fields', 'danger');
    return;
  }

  if (!id && password.length < 6) {
    showToast('Password must be at least 6 characters', 'danger');
    return;
  }

  const existing = window.db.accounts.find(a => a.email === email && a.id !== id);
  if (existing) {
    showToast('Email already exists', 'danger');
    return;
  }

  if (id) {
    const acc = window.db.accounts.find(a => a.id === id);
    if (acc) {
      acc.firstName = firstName;
      acc.lastName = lastName;
      acc.email = email;
      acc.role = role;
      acc.verified = verified;
      if (password) acc.password = password;
    }
  } else {
    window.db.accounts.push({
      id: generateId(),
      firstName,
      lastName,
      email,
      password: password || 'changeme',
      role,
      verified
    });
  }
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('accountModal')).hide();
  showToast('Account saved', 'success');
  renderAccountsList();
}

function resetAccountPassword(id) {
  const newPw = prompt('Enter new password (min 6 chars):');
  if (!newPw || newPw.length < 6) {
    showToast('Password must be at least 6 characters', 'danger');
    return;
  }
  const acc = window.db.accounts.find(a => a.id === id);
  if (acc) {
    acc.password = newPw;
    saveToStorage();
    showToast('Password reset', 'success');
    renderAccountsList();
  }
}

function deleteAccount(id) {
  const acc = window.db.accounts.find(a => a.id === id);
  if (!acc) return;
  if (acc.email === currentUser?.email) {
    showToast('You cannot delete your own account', 'danger');
    return;
  }
  if (!confirm('Delete this account?')) return;
  window.db.accounts = window.db.accounts.filter(a => a.id !== id);
  saveToStorage();
  showToast('Account deleted', 'success');
  renderAccountsList();
}

// ==================== RENDER: Departments ====================
function renderDepartmentsTable() {
  const container = document.getElementById('departmentsTable');
  if (!container) return;
  const depts = window.db.departments || [];
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Name</th>
            <th>Description</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${depts.map(d => `
            <tr>
              <td>${d.name}</td>
              <td>${d.description || '—'}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline-danger delete-dept-btn" data-id="${d.id}">Delete</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.querySelectorAll('.delete-dept-btn').forEach(btn => {
    btn.addEventListener('click', () => deleteDepartment(btn.dataset.id));
  });
}

function saveDepartment() {
  const name = document.getElementById('deptName').value.trim();
  const description = document.getElementById('deptDescription').value.trim();
  if (!name) {
    showToast('Name is required', 'danger');
    return;
  }
  window.db.departments.push({
    id: generateId(),
    name,
    description
  });
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('departmentModal')).hide();
  document.getElementById('departmentForm').reset();
  showToast('Department added', 'success');
  renderDepartmentsTable();
}

function deleteDepartment(id) {
  if (!confirm('Delete this department?')) return;
  const hasEmployees = window.db.employees.some(e => e.departmentId === id);
  if (hasEmployees) {
    showToast('Cannot delete: department has employees', 'danger');
    return;
  }
  window.db.departments = window.db.departments.filter(d => d.id !== id);
  saveToStorage();
  showToast('Department deleted', 'success');
  renderDepartmentsTable();
}

// ==================== RENDER: Employees ====================
function renderEmployeesTable() {
  const container = document.getElementById('employeesTable');
  if (!container) return;
  const employees = window.db.employees || [];
  const getDeptName = (deptId) => {
    const d = window.db.departments.find(x => x.id === deptId);
    return d ? d.name : '—';
  };
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>ID</th>
            <th>User</th>
            <th>Position</th>
            <th>Dept</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${employees.map(emp => `
            <tr>
              <td>${emp.employeeId || emp.id}</td>
              <td>${emp.userEmail || '—'}</td>
              <td>${emp.position || '—'}</td>
              <td>${getDeptName(emp.departmentId)}</td>
              <td>
                <button type="button" class="btn btn-sm btn-outline-primary edit-emp-btn" data-id="${emp.id}">Edit</button>
              </td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    </div>
  `;
  container.querySelectorAll('.edit-emp-btn').forEach(btn => {
    btn.addEventListener('click', () => openEmployeeModal(btn.dataset.id));
  });
}

function openEmployeeModal(editId = null) {
  const modal = new bootstrap.Modal(document.getElementById('employeeModal'));
  const form = document.getElementById('employeeForm');
  form.reset();
  document.getElementById('employeeId').value = editId || '';

  const deptSelect = document.getElementById('empDepartment');
  deptSelect.innerHTML = window.db.departments.map(d =>
    `<option value="${d.id}">${d.name}</option>`
  ).join('');

  if (editId) {
    document.getElementById('employeeModalTitle').textContent = 'Edit Employee';
    const emp = window.db.employees.find(e => e.id === editId);
    if (emp) {
      document.getElementById('empEmployeeId').value = emp.employeeId || '';
      document.getElementById('empUserEmail').value = emp.userEmail || '';
      document.getElementById('empPosition').value = emp.position || '';
      document.getElementById('empDepartment').value = emp.departmentId || '';
      document.getElementById('empHireDate').value = emp.hireDate || '';
    }
  } else {
    document.getElementById('employeeModalTitle').textContent = 'Add Employee';
  }
  modal.show();
}

function saveEmployee() {
  const id = document.getElementById('employeeId').value;
  const employeeId = document.getElementById('empEmployeeId').value.trim();
  const userEmail = document.getElementById('empUserEmail').value.trim().toLowerCase();
  const position = document.getElementById('empPosition').value.trim();
  const departmentId = document.getElementById('empDepartment').value;
  const hireDate = document.getElementById('empHireDate').value;

  const accountExists = window.db.accounts.some(a => a.email.toLowerCase() === userEmail);
  if (!accountExists) {
    showToast('User email must match an existing account', 'danger');
    return;
  }

  if (id) {
    const emp = window.db.employees.find(e => e.id === id);
    if (emp) {
      emp.employeeId = employeeId;
      emp.userEmail = userEmail;
      emp.position = position;
      emp.departmentId = departmentId;
      emp.hireDate = hireDate;
    }
  } else {
    window.db.employees.push({
      id: generateId(),
      employeeId,
      userEmail,
      position,
      departmentId,
      hireDate
    });
  }
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('employeeModal')).hide();
  showToast('Employee saved', 'success');
  renderEmployeesTable();
}

// ==================== RENDER: Requests ====================
function renderRequestsTable() {
  const container = document.getElementById('requestsTable');
  if (!container) return;
  const userEmail = currentUser?.email?.toLowerCase();
  const requests = (window.db.requests || []).filter(r =>
    r.employeeEmail?.toLowerCase() === userEmail
  );
  const badge = (status) => {
    const c = status === 'Approved' ? 'success' : status === 'Rejected' ? 'danger' : 'warning';
    return `<span class="badge bg-${c}">${status || 'Pending'}</span>`;
  };
  container.innerHTML = `
    <div class="table-responsive">
      <table class="table table-striped">
        <thead>
          <tr>
            <th>Type</th>
            <th>Items</th>
            <th>Date</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          ${requests.length ? requests.map(r => `
            <tr>
              <td>${r.type || '—'}</td>
              <td>${(r.items || []).map(i => `${i.name} (${i.qty})`).join(', ') || '—'}</td>
              <td>${r.date || '—'}</td>
              <td>${badge(r.status)}</td>
            </tr>
          `).join('') : '<tr><td colspan="4">No requests yet.</td></tr>'}
        </tbody>
      </table>
    </div>
  `;
}

function openRequestModal() {
  const modal = new bootstrap.Modal(document.getElementById('requestModal'));
  const container = document.getElementById('requestItemsContainer');
  container.innerHTML = `
    <div class="request-item row g-2 mb-2">
      <div class="col">
        <input type="text" class="form-control item-name" placeholder="Item name">
      </div>
      <div class="col-3">
        <input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1">
      </div>
      <div class="col-auto">
        <button type="button" class="btn btn-outline-danger remove-item-btn">×</button>
      </div>
    </div>
  `;
  modal.show();
}

function addRequestItem() {
  const container = document.getElementById('requestItemsContainer');
  const div = document.createElement('div');
  div.className = 'request-item row g-2 mb-2';
  div.innerHTML = `
    <div class="col">
      <input type="text" class="form-control item-name" placeholder="Item name">
    </div>
    <div class="col-3">
      <input type="number" class="form-control item-qty" placeholder="Qty" min="1" value="1">
    </div>
    <div class="col-auto">
      <button type="button" class="btn btn-outline-danger remove-item-btn">×</button>
    </div>
  `;
  div.querySelector('.remove-item-btn').addEventListener('click', () => div.remove());
  container.appendChild(div);
}

function submitRequest() {
  const type = document.getElementById('reqType').value;
  const itemRows = document.querySelectorAll('#requestItemsContainer .request-item');
  const items = [];
  itemRows.forEach(row => {
    const name = row.querySelector('.item-name')?.value?.trim();
    const qty = parseInt(row.querySelector('.item-qty')?.value, 10) || 1;
    if (name) items.push({ name, qty });
  });
  if (items.length === 0) {
    showToast('Add at least one item', 'danger');
    return;
  }
  window.db.requests.push({
    id: generateId(),
    type,
    items,
    status: 'Pending',
    date: new Date().toISOString().slice(0, 10),
    employeeEmail: currentUser?.email
  });
  saveToStorage();
  bootstrap.Modal.getInstance(document.getElementById('requestModal')).hide();
  showToast('Request submitted', 'success');
  renderRequestsTable();
}

// ==================== TOAST ====================
function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  const id = 'toast-' + Date.now();
  const bg = type === 'success' ? 'success' : type === 'danger' ? 'danger' : 'info';
  const toastEl = document.createElement('div');
  toastEl.id = id;
  toastEl.className = `toast toast-custom align-items-center text-bg-${bg} border-0`;
  toastEl.setAttribute('role', 'alert');
  toastEl.innerHTML = `
    <div class="d-flex">
      <div class="toast-body">${message}</div>
      <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
    </div>
  `;
  container.appendChild(toastEl);
  const toast = new bootstrap.Toast(toastEl);
  toast.show();
  toastEl.addEventListener('hidden.bs.toast', () => toastEl.remove());
}

// ==================== EVENT HANDLERS ====================
function init() {
  loadFromStorage();

  // Restore auth from localStorage
  const token = localStorage.getItem('auth_token');
  if (token) {
    const acc = getAccountByEmail(token);
    if (acc && acc.verified) {
      setAuthState(true, acc);
    } else {
      localStorage.removeItem('auth_token');
    }
  }

  // Hash routing
  if (!window.location.hash) navigateTo('#/');
  handleRouting();
  window.addEventListener('hashchange', handleRouting);

  // Register form
  document.getElementById('registerForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const email = document.getElementById('regEmail').value.trim().toLowerCase();
    const password = document.getElementById('regPassword').value;
    if (password.length < 6) {
      showToast('Password must be at least 6 characters', 'danger');
      return;
    }
    if (getAccountByEmail(email)) {
      showToast('Email already registered', 'danger');
      return;
    }
    window.db.accounts.push({
      id: generateId(),
      firstName,
      lastName,
      email,
      password,
      role: 'user',
      verified: false
    });
    saveToStorage();
    localStorage.setItem('unverified_email', email);
    showToast('Registration complete. Verify your email.', 'success');
    navigateTo('#/verify-email');
  });

  // Simulate verify
  document.getElementById('simulateVerifyBtn').addEventListener('click', () => {
    const email = localStorage.getItem('unverified_email');
    const acc = getAccountByEmail(email);
    if (acc) {
      acc.verified = true;
      saveToStorage();
      localStorage.removeItem('unverified_email');
      showToast('Email verified! You can log in.', 'success');
      navigateTo('#/login');
    }
  });

  // Login form
  document.getElementById('loginForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim().toLowerCase();
    const password = document.getElementById('loginPassword').value;
    const acc = getAccountByEmail(email);
    const err = document.getElementById('loginError');
    if (!acc || acc.password !== password) {
      err.textContent = 'Invalid email or password.';
      err.classList.remove('d-none');
      return;
    }
    if (!acc.verified) {
      err.textContent = 'Please verify your email first.';
      err.classList.remove('d-none');
      return;
    }
    localStorage.setItem('auth_token', email);
    setAuthState(true, acc);
    err.classList.add('d-none');
    showToast('Welcome back!', 'success');
    navigateTo('#/profile');
  });

  // Logout
  document.getElementById('logoutBtn').addEventListener('click', (e) => {
    e.preventDefault();
    localStorage.removeItem('auth_token');
    setAuthState(false);
    navigateTo('#/');
    showToast('Logged out', 'info');
  });

  // Add Account
  document.getElementById('addAccountBtn').addEventListener('click', () => openAccountModal());
  document.getElementById('saveAccountBtn').addEventListener('click', saveAccount);

  // Add Department
  document.getElementById('addDepartmentBtn').addEventListener('click', () => {
    document.getElementById('departmentForm').reset();
    new bootstrap.Modal(document.getElementById('departmentModal')).show();
  });
  document.getElementById('saveDepartmentBtn').addEventListener('click', saveDepartment);

  // Add Employee
  document.getElementById('addEmployeeBtn').addEventListener('click', () => openEmployeeModal());
  document.getElementById('saveEmployeeBtn').addEventListener('click', saveEmployee);

  // Requests
  document.getElementById('newRequestBtn').addEventListener('click', openRequestModal);
  document.getElementById('addItemBtn').addEventListener('click', addRequestItem);
  document.getElementById('saveRequestBtn').addEventListener('click', submitRequest);

  // Remove item buttons (delegate)
  document.getElementById('requestItemsContainer')?.addEventListener('click', (e) => {
    if (e.target.classList.contains('remove-item-btn')) {
      e.target.closest('.request-item')?.remove();
    }
  });
}

document.addEventListener('DOMContentLoaded', init);
document.getElementById("cancelRegisterBtn").addEventListener("click", () => {
    // clear form
    document.getElementById("registerForm").reset();

    // go back to home (or change to #/login if you want)   
    navigateTo("#/");
});
document.getElementById("goToLoginBtn").addEventListener("click", () => {
    navigateTo("#/login");
});