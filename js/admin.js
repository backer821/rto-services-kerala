/* ========================================
   FILE: js/admin.js
   ======================================== */

let currentUser = null;

// Initialize admin dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Check user role
  currentUser = await checkUserRole(['admin', 'superadmin']);
  if (!currentUser) return;
  
  // Display user info
  if (document.getElementById('userName')) {
    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
  }
  
  if (document.getElementById('userRole')) {
    document.getElementById('userRole').textContent = currentUser.role === 'superadmin' ? 'Super Admin' : 'Administrator';
  }
  
  // Load dashboard data
  if (window.location.pathname.includes('dashboard.html')) {
    loadDashboardStats();
  }
  
  // Load masters page
  if (window.location.pathname.includes('masters.html')) {
    loadMastersPage();
  }
  
  // Load users page
  if (window.location.pathname.includes('users.html')) {
    loadUsersPage();
  }
});

// Load dashboard statistics
async function loadDashboardStats() {
  try {
    // Total applications
    const appsSnapshot = await db.collection('applications').get();
    document.getElementById('totalApps').textContent = appsSnapshot.size;
    
    // Pending applications
    const pendingSnapshot = await db.collection('applications')
      .where('statusId', '==', 'pending')
      .get();
    document.getElementById('pendingApps').textContent = pendingSnapshot.size;
    
    // Total users
    const usersSnapshot = await db.collection('users').get();
    document.getElementById('totalUsers').textContent = usersSnapshot.size;
    
    // Total branches
    if (currentUser.role === 'superadmin') {
      const branchesSnapshot = await db.collection('branches').get();
      document.getElementById('totalBranches').textContent = branchesSnapshot.size;
    } else {
      document.getElementById('totalBranches').textContent = 'N/A';
    }
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showError('Error loading dashboard data');
  }
}

// ========================================
// Masters Management
// ========================================

let currentMasterType = 'rtoServices';

function loadMastersPage() {
  setupMasterTabs();
  loadMasterData('rtoServices');
}

function setupMasterTabs() {
  const masterTypes = [
    { id: 'rtoServices', label: 'RTO Services' },
    { id: 'agents', label: 'Agents' },
    { id: 'vehicleClass', label: 'Vehicle Class' },
    { id: 'mvdOffices', label: 'MVD Offices' },
    { id: 'applicationStatus', label: 'Application Status' },
    { id: 'bankAccounts', label: 'Bank Accounts' },
    { id: 'paymentModes', label: 'Payment Modes' }
  ];
  
  const tabContainer = document.getElementById('masterTabs');
  if (!tabContainer) return;
  
  tabContainer.innerHTML = '';
  masterTypes.forEach(type => {
    const button = document.createElement('button');
    button.className = `tab-btn ${type.id === 'rtoServices' ? 'active' : ''}`;
    button.textContent = type.label;
    button.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      loadMasterData(type.id);
    };
    tabContainer.appendChild(button);
  });
}

async function loadMasterData(masterType) {
  currentMasterType = masterType;
  const tableBody = document.getElementById('masterTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('masters').doc(masterType).collection('items').get();
    
    let html = '';
    snapshot.forEach(doc => {
      const data = doc.data();
      html += createMasterRow(doc.id, data, masterType);
    });
    
    if (html === '') {
      html = '<tr><td colspan="5" style="text-align:center">No records found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading master data:', error);
    tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center">Error loading data</td></tr>';
  }
}

function createMasterRow(id, data, masterType) {
  let fields = '';
  
  switch(masterType) {
    case 'rtoServices':
      fields = `<td>${data.code}</td><td>${data.service}</td><td>${data.description || ''}</td>`;
      break;
    case 'agents':
      fields = `<td>${data.code}</td><td>${data.name}</td><td>${data.contact || ''}</td>`;
      break;
    case 'vehicleClass':
      fields = `<td>${data.code}</td><td>${data.class}</td><td>${data.description || ''}</td>`;
      break;
    case 'mvdOffices':
      fields = `<td>${data.code}</td><td>${data.office}</td><td>${data.address || ''}</td>`;
      break;
    case 'applicationStatus':
      fields = `<td>${data.code}</td><td>${data.status}</td><td></td>`;
      break;
    case 'bankAccounts':
      fields = `<td>${data.code}</td><td>${data.bank}</td><td>${data.accountNumber || ''}</td>`;
      break;
    case 'paymentModes':
      fields = `<td>${data.code}</td><td>${data.method}</td><td>${data.description || ''}</td>`;
      break;
  }
  
  return `
    <tr>
      ${fields}
      <td>
        <button onclick="editMaster('${id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;margin-right:0.5rem">Edit</button>
        <button onclick="deleteMaster('${id}')" class="btn-danger" style="padding:0.4rem 0.8rem">Delete</button>
      </td>
    </tr>
  `;
}

function showAddMasterModal() {
  const modal = document.getElementById('masterModal');
  if (!modal) return;
  
  document.getElementById('masterModalTitle').textContent = `Add ${getMasterLabel()}`;
  document.getElementById('masterForm').reset();
  document.getElementById('masterId').value = '';
  
  setupMasterForm();
  modal.classList.add('show');
}

function setupMasterForm() {
  const formFields = document.getElementById('masterFormFields');
  if (!formFields) return;
  
  let fields = '';
  
  switch(currentMasterType) {
    case 'rtoServices':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Service Name *</label>
          <input type="text" id="service" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="description" rows="3"></textarea>
        </div>
      `;
      break;
    case 'agents':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Agent Name *</label>
          <input type="text" id="name" required>
        </div>
        <div class="form-group">
          <label>Contact Number</label>
          <input type="tel" id="contact">
        </div>
        <div class="form-group">
          <label>Address</label>
          <textarea id="address" rows="3"></textarea>
        </div>
      `;
      break;
    case 'vehicleClass':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Class Name *</label>
          <input type="text" id="class" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="description" rows="3"></textarea>
        </div>
      `;
      break;
    case 'mvdOffices':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Office Name *</label>
          <input type="text" id="office" required>
        </div>
        <div class="form-group">
          <label>Address</label>
          <textarea id="address" rows="3"></textarea>
        </div>
      `;
      break;
    case 'applicationStatus':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Status Name *</label>
          <input type="text" id="status" required>
        </div>
      `;
      break;
    case 'bankAccounts':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Bank Name *</label>
          <input type="text" id="bank" required>
        </div>
        <div class="form-group">
          <label>Branch</label>
          <input type="text" id="branch">
        </div>
        <div class="form-group">
          <label>Account Number</label>
          <input type="text" id="accountNumber">
        </div>
      `;
      break;
    case 'paymentModes':
      fields = `
        <div class="form-group">
          <label>Code *</label>
          <input type="text" id="code" required>
        </div>
        <div class="form-group">
          <label>Method Name *</label>
          <input type="text" id="method" required>
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea id="description" rows="3"></textarea>
        </div>
      `;
      break;
  }
  
  formFields.innerHTML = fields;
}

async function saveMaster(event) {
  event.preventDefault();
  
  const masterId = document.getElementById('masterId').value;
  const data = getMasterFormData();
  
  try {
    if (masterId) {
      // Update existing
      await db.collection('masters').doc(currentMasterType).collection('items').doc(masterId).update(data);
      await logActivity('update', `masters/${currentMasterType}`, masterId, data);
      showSuccess('Master data updated successfully');
    } else {
      // Add new
      const docRef = await db.collection('masters').doc(currentMasterType).collection('items').add(data);
      await logActivity('create', `masters/${currentMasterType}`, docRef.id, data);
      showSuccess('Master data added successfully');
    }
    
    closeMasterModal();
    loadMasterData(currentMasterType);
  } catch (error) {
    console.error('Error saving master:', error);
    showError('Error saving data');
  }
}

function getMasterFormData() {
  const data = {};
  const inputs = document.getElementById('masterFormFields').querySelectorAll('input, textarea');
  inputs.forEach(input => {
    if (input.id) {
      data[input.id] = input.value;
    }
  });
  return data;
}

function getMasterLabel() {
  const labels = {
    'rtoServices': 'RTO Service',
    'agents': 'Agent',
    'vehicleClass': 'Vehicle Class',
    'mvdOffices': 'MVD Office',
    'applicationStatus': 'Application Status',
    'bankAccounts': 'Bank Account',
    'paymentModes': 'Payment Mode'
  };
  return labels[currentMasterType] || 'Master';
}

async function editMaster(id) {
  try {
    const doc = await db.collection('masters').doc(currentMasterType).collection('items').doc(id).get();
    if (!doc.exists) return;
    
    const data = doc.data();
    
    document.getElementById('masterModalTitle').textContent = `Edit ${getMasterLabel()}`;
    document.getElementById('masterId').value = id;
    
    setupMasterForm();
    
    // Populate form fields
    Object.keys(data).forEach(key => {
      const input = document.getElementById(key);
      if (input) {
        input.value = data[key] || '';
      }
    });
    
    document.getElementById('masterModal').classList.add('show');
  } catch (error) {
    console.error('Error loading master:', error);
    showError('Error loading data');
  }
}

async function deleteMaster(id) {
  if (!confirmAction('Are you sure you want to delete this record?')) return;
  
  try {
    await db.collection('masters').doc(currentMasterType).collection('items').doc(id).delete();
    await logActivity('delete', `masters/${currentMasterType}`, id);
    showSuccess('Master data deleted successfully');
    loadMasterData(currentMasterType);
  } catch (error) {
    console.error('Error deleting master:', error);
    showError('Error deleting data');
  }
}

function closeMasterModal() {
  document.getElementById('masterModal').classList.remove('show');
}

// ========================================
// User Management
// ========================================

async function loadUsersPage() {
  loadBranchesForSelect();
  loadUsersList();
}

async function loadBranchesForSelect() {
  if (currentUser.role !== 'superadmin') return;
  
  try {
    const snapshot = await db.collection('branches').get();
    const select = document.getElementById('branchSelect');
    if (!select) return;
    
    select.innerHTML = '<option value="">Select Branch</option>';
    snapshot.forEach(doc => {
      const branch = doc.data();
      const option = document.createElement('option');
      option.value = doc.id;
      option.textContent = branch.branchName;
      select.appendChild(option);
    });
  } catch (error) {
    console.error('Error loading branches:', error);
  }
}

async function loadUsersList() {
  const tableBody = document.getElementById('usersTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('users').get();
    
    let html = '';
    snapshot.forEach(doc => {
      const user = doc.data();
      html += `
        <tr>
          <td>${user.name}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>${user.branchName || 'N/A'}</td>
          <td>${user.lastLogin ? formatDate(user.lastLogin) : 'Never'}</td>
          <td>
            <button onclick="editUser('${doc.id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;margin-right:0.5rem">Edit</button>
            <button onclick="deleteUser('${doc.id}')" class="btn-danger" style="padding:0.4rem 0.8rem">Delete</button>
          </td>
        </tr>
      `;
    });
    
    if (html === '') {
      html = '<tr><td colspan="6" style="text-align:center">No users found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading users:', error);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading users</td></tr>';
  }
}

async function createUser(event) {
  event.preventDefault();
  
  const name = document.getElementById('userName').value;
  const email = document.getElementById('userEmail').value;
  const password = document.getElementById('userPassword').value;
  const role = document.getElementById('userRole').value;
  const branchId = document.getElementById('branchSelect')?.value || null;
  
  try {
    // Create auth user
    const userCredential = await auth.createUserWithEmailAndPassword(email, password);
    const user = userCredential.user;
    
    // Get branch name
    let branchName = null;
    if (branchId) {
      const branchDoc = await db.collection('branches').doc(branchId).get();
      if (branchDoc.exists) {
        branchName = branchDoc.data().branchName;
      }
    }
    
    // Create user document
    await db.collection('users').doc(user.uid).set({
      name: name,
      email: email,
      role: role,
      branchId: branchId,
      branchName: branchName,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      createdBy: currentUser.uid
    });
    
    await logActivity('create', 'users', user.uid, { name, email, role });
    
    showSuccess('User created successfully');
    document.getElementById('userForm').reset();
    loadUsersList();
  } catch (error) {
    console.error('Error creating user:', error);
    showError(getErrorMessage(error.code));
  }
}