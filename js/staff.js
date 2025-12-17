/* ========================================
   FILE: js/staff.js
   ======================================== */

let currentUser = null;
let masterData = {};

// Initialize staff dashboard
document.addEventListener('DOMContentLoaded', async () => {
  // Check user role
  currentUser = await checkUserRole(['staff', 'admin']);
  if (!currentUser) return;
  
  // Display user info
  if (document.getElementById('userName')) {
    document.getElementById('userName').textContent = `Welcome, ${currentUser.name}`;
  }
  
  if (document.getElementById('branchName') && currentUser.branchName) {
    document.getElementById('branchName').textContent = currentUser.branchName;
  }
  
  // Load master data for dropdowns
  await loadMasterData();
  
  // Load page-specific data
  if (window.location.pathname.includes('dashboard.html')) {
    loadStaffDashboard();
  } else if (window.location.pathname.includes('vehicle-service.html')) {
    loadVehicleServicePage();
  } else if (window.location.pathname.includes('registration.html')) {
    loadRegistrationPage();
  } else if (window.location.pathname.includes('fancy-number.html')) {
    loadFancyNumberPage();
  } else if (window.location.pathname.includes('cash-register.html')) {
    loadCashRegisterPage();
  }
});

// Load master data
async function loadMasterData() {
  try {
    const masterTypes = ['rtoServices', 'agents', 'vehicleClass', 'mvdOffices', 
                        'applicationStatus', 'bankAccounts', 'paymentModes'];
    
    for (const type of masterTypes) {
      const snapshot = await db.collection('masters').doc(type).collection('items').get();
      masterData[type] = {};
      snapshot.forEach(doc => {
        masterData[type][doc.id] = doc.data();
      });
    }
  } catch (error) {
    console.error('Error loading master data:', error);
  }
}

// Load staff dashboard statistics
async function loadStaffDashboard() {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    // Today's applications
    const todayAppsSnapshot = await db.collection('applications')
      .where('branchId', '==', currentUser.branchId)
      .where('createdAt', '>=', firebase.firestore.Timestamp.fromDate(today))
      .get();
    document.getElementById('todayApps').textContent = todayAppsSnapshot.size;
    
    // Pending registrations
    const pendingRegsSnapshot = await db.collection('registrations')
      .where('branchId', '==', currentUser.branchId)
      .where('isAllotted', '==', false)
      .get();
    document.getElementById('pendingRegs').textContent = pendingRegsSnapshot.size;
    
    // Today's cash collection
    let totalCash = 0;
    const cashSnapshot = await db.collection('cashRegister')
      .where('branchId', '==', currentUser.branchId)
      .where('date', '>=', firebase.firestore.Timestamp.fromDate(today))
      .get();
    
    cashSnapshot.forEach(doc => {
      totalCash += parseFloat(doc.data().cashReceived || 0);
    });
    document.getElementById('todayCash').textContent = formatCurrency(totalCash);
    
    // Fancy numbers count
    const fancySnapshot = await db.collection('fancyNumbers')
      .where('branchId', '==', currentUser.branchId)
      .get();
    document.getElementById('fancyCount').textContent = fancySnapshot.size;
    
  } catch (error) {
    console.error('Error loading dashboard stats:', error);
    showError('Error loading dashboard data');
  }
}

// ========================================
// Vehicle Service Application
// ========================================

function loadVehicleServicePage() {
  populateDropdowns();
  loadApplicationsList();
  
  document.getElementById('tvNtv')?.addEventListener('change', toggleTVFields);
}

function populateDropdowns() {
  // Populate agents
  populateSelect('agentId', masterData.agents, 'name');
  
  // Populate MVD offices
  populateSelect('mvdOfficeId', masterData.mvdOffices, 'office');
  
  // Populate vehicle class
  populateSelect('vehicleClassId', masterData.vehicleClass, 'class');
  
  // Populate application status
  populateSelect('statusId', masterData.applicationStatus, 'status');
  
  // Populate RTO services
  populateSelect('rtoServiceId', masterData.rtoServices, 'service');
  
  // Populate payment modes
  populateSelect('paymentMode', masterData.paymentModes, 'method');
}

function populateSelect(selectId, data, labelField) {
  const select = document.getElementById(selectId);
  if (!select) return;
  
  select.innerHTML = '<option value="">Select...</option>';
  Object.keys(data).forEach(key => {
    const option = document.createElement('option');
    option.value = key;
    option.textContent = data[key][labelField];
    select.appendChild(option);
  });
}

function toggleTVFields() {
  const tvNtv = document.getElementById('tvNtv').value;
  const tvFields = document.getElementById('tvFields');
  
  if (tvFields) {
    tvFields.style.display = tvNtv === 'TV' ? 'block' : 'none';
  }
}

async function loadApplicationsList() {
  const tableBody = document.getElementById('applicationsTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('applications')
      .where('branchId', '==', currentUser.branchId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    let html = '';
    snapshot.forEach(doc => {
      const app = doc.data();
      html += `
        <tr>
          <td>${app.vehicleNumber}</td>
          <td>${app.applicationNo}</td>
          <td>${app.date ? formatDate(app.date) : ''}</td>
          <td>${masterData.agents[app.agentId]?.name || ''}</td>
          <td>${masterData.applicationStatus[app.statusId]?.status || ''}</td>
          <td>${masterData.rtoServices[app.rtoServiceId]?.service || ''}</td>
          <td>${formatCurrency(app.serviceFee)}</td>
          <td>
            <button onclick="editApplication('${doc.id}')" class="btn-secondary" style="padding:0.4rem 0.8rem;margin-right:0.5rem">Edit</button>
            <button onclick="viewApplication('${doc.id}')" class="btn-primary" style="padding:0.4rem 0.8rem">View</button>
          </td>
        </tr>
      `;
    });
    
    if (html === '') {
      html = '<tr><td colspan="8" style="text-align:center">No applications found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading applications:', error);
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Error loading data</td></tr>';
  }
}

async function saveApplication(event) {
  event.preventDefault();
  
  const formData = {
    vehicleNumber: document.getElementById('vehicleNumber').value,
    chassisNo: document.getElementById('chassisNo').value,
    date: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('date').value)),
    applicationNo: document.getElementById('applicationNo').value,
    agentId: document.getElementById('agentId').value,
    contactNo: document.getElementById('contactNo').value,
    mvdOfficeId: document.getElementById('mvdOfficeId').value,
    vehicleClassId: document.getElementById('vehicleClassId').value,
    statusId: document.getElementById('statusId').value,
    rtoServiceId: document.getElementById('rtoServiceId').value,
    tvNtv: document.getElementById('tvNtv').value,
    serviceFee: parseFloat(document.getElementById('serviceFee').value || 0),
    advance: parseFloat(document.getElementById('advance').value || 0),
    vahanFee: parseFloat(document.getElementById('vahanFee').value || 0),
    officeExp: parseFloat(document.getElementById('officeExp').value || 0),
    paymentMode: document.getElementById('paymentMode').value,
    paymentDate: document.getElementById('paymentDate').value ? 
      firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('paymentDate').value)) : null,
    branchId: currentUser.branchId,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  // Add TV fields if applicable
  if (formData.tvNtv === 'TV') {
    formData.cfExpiryDate = document.getElementById('cfExpiryDate').value ?
      firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('cfExpiryDate').value)) : null;
    formData.taxExpDate = document.getElementById('taxExpDate').value ?
      firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('taxExpDate').value)) : null;
    formData.permitExpDate = document.getElementById('permitExpDate').value ?
      firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('permitExpDate').value)) : null;
  }
  
  try {
    const docRef = await db.collection('applications').add(formData);
    await logActivity('create', 'applications', docRef.id, formData);
    
    showSuccess('Application saved successfully');
    document.getElementById('applicationForm').reset();
    loadApplicationsList();
  } catch (error) {
    console.error('Error saving application:', error);
    showError('Error saving application');
  }
}

// ========================================
// Vehicle Registration
// ========================================

function loadRegistrationPage() {
  loadRegistrationsList();
}

async function loadRegistrationsList() {
  const tableBody = document.getElementById('registrationsTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('registrations')
      .where('branchId', '==', currentUser.branchId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    let html = '';
    snapshot.forEach(doc => {
      const reg = doc.data();
      html += `
        <tr>
          <td>${reg.applicationNumber}</td>
          <td>${reg.vehicleType}</td>
          <td>${reg.allottedNumber || 'Not Allotted'}</td>
          <td>${reg.isAllotted ? 'Yes' : 'No'}</td>
          <td>${reg.contactNumber}</td>
          <td>
            ${!reg.isAllotted ? 
              `<button onclick="allotNumber('${doc.id}')" class="btn-success" style="padding:0.4rem 0.8rem">Allot Number</button>` : 
              '<span style="color:green">Completed</span>'}
          </td>
        </tr>
      `;
    });
    
    if (html === '') {
      html = '<tr><td colspan="6" style="text-align:center">No registrations found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading registrations:', error);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading data</td></tr>';
  }
}

async function saveRegistration(event) {
  event.preventDefault();
  
  const formData = {
    applicationNumber: document.getElementById('applicationNumber').value,
    vehicleType: document.getElementById('vehicleType').value,
    isAllotted: document.getElementById('isAllotted').checked,
    allottedNumber: document.getElementById('allottedNumber').value || null,
    contactNumber: document.getElementById('contactNumber').value,
    branchId: currentUser.branchId,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const docRef = await db.collection('registrations').add(formData);
    await logActivity('create', 'registrations', docRef.id, formData);
    
    showSuccess('Registration saved successfully');
    document.getElementById('registrationForm').reset();
    loadRegistrationsList();
  } catch (error) {
    console.error('Error saving registration:', error);
    showError('Error saving registration');
  }
}

async function allotNumber(regId) {
  const number = prompt('Enter the allotted number:');
  if (!number) return;
  
  try {
    await db.collection('registrations').doc(regId).update({
      allottedNumber: number,
      isAllotted: true,
      updatedBy: currentUser.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await logActivity('update', 'registrations', regId, { allottedNumber: number, isAllotted: true });
    
    showSuccess('Number allotted successfully');
    loadRegistrationsList();
  } catch (error) {
    console.error('Error allotting number:', error);
    showError('Error allotting number');
  }
}

// ========================================
// Fancy Numbers
// ========================================

function loadFancyNumberPage() {
  loadFancyNumbersList();
}

async function loadFancyNumbersList() {
  const tableBody = document.getElementById('fancyNumbersTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('fancyNumbers')
      .where('branchId', '==', currentUser.branchId)
      .orderBy('createdAt', 'desc')
      .limit(50)
      .get();
    
    let html = '';
    snapshot.forEach(doc => {
      const fancy = doc.data();
      html += `
        <tr>
          <td>${fancy.fancyNumber}</td>
          <td>${fancy.isForAuction ? 'Yes' : 'No'}</td>
          <td>${fancy.applicationNumber}</td>
          <td>${fancy.contactPerson}</td>
          <td>${fancy.status || 'Pending'}</td>
          <td>
            ${fancy.isForAuction && fancy.status === 'Pending' ? 
              `<button onclick="updateAuctionResult('${doc.id}')" class="btn-primary" style="padding:0.4rem 0.8rem">Update Result</button>` : 
              '<span>-</span>'}
          </td>
        </tr>
      `;
    });
    
    if (html === '') {
      html = '<tr><td colspan="6" style="text-align:center">No fancy numbers found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading fancy numbers:', error);
    tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center">Error loading data</td></tr>';
  }
}

async function saveFancyNumber(event) {
  event.preventDefault();
  
  const formData = {
    fancyNumber: document.getElementById('fancyNumber').value,
    isForAuction: document.getElementById('isForAuction').checked,
    applicationNumber: document.getElementById('applicationNumber').value,
    tempExpiryDate: document.getElementById('tempExpiryDate').value ?
      firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('tempExpiryDate').value)) : null,
    contactNumber: document.getElementById('contactNumber').value,
    contactPerson: document.getElementById('contactPerson').value,
    remarks: document.getElementById('remarks').value,
    status: document.getElementById('isForAuction').checked ? 'Pending' : 'Confirmed',
    branchId: currentUser.branchId,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    const docRef = await db.collection('fancyNumbers').add(formData);
    await logActivity('create', 'fancyNumbers', docRef.id, formData);
    
    showSuccess('Fancy number booking saved successfully');
    document.getElementById('fancyNumberForm').reset();
    loadFancyNumbersList();
  } catch (error) {
    console.error('Error saving fancy number:', error);
    showError('Error saving fancy number booking');
  }
}

async function updateAuctionResult(fancyId) {
  const result = confirm('Was this number allotted in the auction?');
  const status = result ? 'Allotted' : 'Not Allotted';
  
  try {
    await db.collection('fancyNumbers').doc(fancyId).update({
      status: status,
      auctionResult: status,
      updatedBy: currentUser.uid,
      updatedAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    await logActivity('update', 'fancyNumbers', fancyId, { status });
    
    showSuccess('Auction result updated successfully');
    loadFancyNumbersList();
  } catch (error) {
    console.error('Error updating auction result:', error);
    showError('Error updating auction result');
  }
}

// ========================================
// Cash Register
// ========================================

function loadCashRegisterPage() {
  populateSelect('bankAccountId', masterData.bankAccounts, 'bank');
  loadCashRegisterList();
}

async function loadCashRegisterList() {
  const tableBody = document.getElementById('cashRegisterTableBody');
  if (!tableBody) return;
  
  showLoading(tableBody.parentElement);
  
  try {
    const snapshot = await db.collection('cashRegister')
      .where('branchId', '==', currentUser.branchId)
      .orderBy('date', 'desc')
      .limit(50)
      .get();
    
    let html = '';
    snapshot.forEach(doc => {
      const cash = doc.data();
      html += `
        <tr>
          <td>${formatDate(cash.date)}</td>
          <td>${cash.vehicleNumber}</td>
          <td>${cash.customerName}</td>
          <td>${cash.purpose}</td>
          <td>${formatCurrency(cash.fees)}</td>
          <td>${formatCurrency(cash.cashReceived)}</td>
          <td>${cash.paymentMode}</td>
          <td>${cash.remarks || ''}</td>
        </tr>
      `;
    });
    
    if (html === '') {
      html = '<tr><td colspan="8" style="text-align:center">No cash register entries found</td></tr>';
    }
    
    tableBody.innerHTML = html;
  } catch (error) {
    console.error('Error loading cash register:', error);
    tableBody.innerHTML = '<tr><td colspan="8" style="text-align:center">Error loading data</td></tr>';
  }
}

async function saveCashRegister(event) {
  event.preventDefault();
  
  const formData = {
    vehicleNumber: document.getElementById('vehicleNumber').value,
    date: firebase.firestore.Timestamp.fromDate(new Date(document.getElementById('date').value)),
    purpose: document.getElementById('purpose').value,
    customerName: document.getElementById('customerName').value,
    fees: parseFloat(document.getElementById('fees').value || 0),
    cashReceived: parseFloat(document.getElementById('cashReceived').value || 0),
    paymentMode: document.getElementById('paymentMode').value,
    bankAccountId: document.getElementById('bankAccountId')?.value || null,
    remarks: document.getElementById('remarks').value,
    branchId: currentUser.branchId,
    createdBy: currentUser.uid,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  };
  
  try {
    // Save cash register entry
    const docRef = await db.collection('cashRegister').add(formData);
    
    // Update application if exists
    const appSnapshot = await db.collection('applications')
      .where('vehicleNumber', '==', formData.vehicleNumber)
      .where('branchId', '==', currentUser.branchId)
      .get();
    
    if (!appSnapshot.empty) {
      const appDoc = appSnapshot.docs[0];
      const appData = appDoc.data();
      
      await db.collection('applications').doc(appDoc.id).update({
        advance: (appData.advance || 0) + formData.cashReceived,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      });
    }
    
    await logActivity('create', 'cashRegister', docRef.id, formData);
    
    showSuccess('Cash register entry saved successfully');
    document.getElementById('cashRegisterForm').reset();
    loadCashRegisterList();
  } catch (error) {
    console.error('Error saving cash register:', error);
    showError('Error saving cash register entry');
  }
}