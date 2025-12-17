
/* ========================================
   FILE: js/auth.js
   ======================================== */

// Check if user is already logged in
auth.onAuthStateChanged(async (user) => {
  if (user) {
    try {
      const userDoc = await db.collection('users').doc(user.uid).get();
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Update last login
        await db.collection('users').doc(user.uid).update({
          lastLogin: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirect based on role
        if (window.location.pathname.includes('index.html') || window.location.pathname === '/') {
          if (userData.role === 'superadmin' || userData.role === 'admin') {
            window.location.href = 'admin/dashboard.html';
          } else {
            window.location.href = 'staff/dashboard.html';
          }
        }
      }
    } catch (error) {
      console.error('Error checking user:', error);
    }
  } else {
    // User is not logged in
    if (!window.location.pathname.includes('index.html') && window.location.pathname !== '/') {
      window.location.href = '../index.html';
    }
  }
});

// Login form handler
if (document.getElementById('loginForm')) {
  document.getElementById('loginForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorDiv = document.getElementById('loginError');
    
    try {
      // Sign in with email and password
      const userCredential = await auth.signInWithEmailAndPassword(email, password);
      const user = userCredential.user;
      
      // Get user data
      const userDoc = await db.collection('users').doc(user.uid).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        
        // Log activity
        await db.collection('activityLogs').add({
          userId: user.uid,
          userName: userData.name,
          action: 'login',
          timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        
        // Redirect will happen automatically through onAuthStateChanged
      } else {
        errorDiv.textContent = 'User data not found. Please contact administrator.';
        errorDiv.classList.add('show');
        await auth.signOut();
      }
    } catch (error) {
      console.error('Login error:', error);
      errorDiv.textContent = getErrorMessage(error.code);
      errorDiv.classList.add('show');
    }
  });
}

// Logout handler
if (document.getElementById('logoutBtn')) {
  document.getElementById('logoutBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    try {
      await auth.signOut();
      window.location.href = '../index.html';
    } catch (error) {
      console.error('Logout error:', error);
      alert('Error logging out. Please try again.');
    }
  });
}

// Change password handler
if (document.getElementById('changePasswordBtn')) {
  document.getElementById('changePasswordBtn').addEventListener('click', async (e) => {
    e.preventDefault();
    
    const currentPassword = prompt('Enter current password:');
    if (!currentPassword) return;
    
    const newPassword = prompt('Enter new password (min 6 characters):');
    if (!newPassword || newPassword.length < 6) {
      alert('Password must be at least 6 characters long.');
      return;
    }
    
    const confirmPassword = prompt('Confirm new password:');
    if (newPassword !== confirmPassword) {
      alert('Passwords do not match.');
      return;
    }
    
    try {
      const user = auth.currentUser;
      const credential = firebase.auth.EmailAuthProvider.credential(
        user.email,
        currentPassword
      );
      
      // Reauthenticate user
      await user.reauthenticateWithCredential(credential);
      
      // Update password
      await user.updatePassword(newPassword);
      
      alert('Password changed successfully!');
    } catch (error) {
      console.error('Password change error:', error);
      alert(getErrorMessage(error.code));
    }
  });
}

// Get user friendly error messages
function getErrorMessage(code) {
  const messages = {
    'auth/invalid-email': 'Invalid email address.',
    'auth/user-disabled': 'This account has been disabled.',
    'auth/user-not-found': 'No account found with this email.',
    'auth/wrong-password': 'Incorrect password.',
    'auth/invalid-credential': 'Invalid email or password.',
    'auth/weak-password': 'Password should be at least 6 characters.',
    'auth/email-already-in-use': 'Email already in use.',
    'auth/requires-recent-login': 'Please log out and log in again to perform this action.',
  };
  return messages[code] || 'An error occurred. Please try again.';
}

// Get current user data
async function getCurrentUser() {
  const user = auth.currentUser;
  if (!user) return null;
  
  const userDoc = await db.collection('users').doc(user.uid).get();
  if (userDoc.exists) {
    return {
      uid: user.uid,
      email: user.email,
      ...userDoc.data()
    };
  }
  return null;
}

// Check user role
async function checkUserRole(allowedRoles) {
  const userData = await getCurrentUser();
  if (!userData) {
    window.location.href = '../index.html';
    return false;
  }
  
  if (!allowedRoles.includes(userData.role)) {
    alert('You do not have permission to access this page.');
    window.location.href = '../index.html';
    return false;
  }
  
  return userData;
}

// Log activity
async function logActivity(action, collection, documentId, changes = {}) {
  try {
    const userData = await getCurrentUser();
    if (!userData) return;
    
    await db.collection('activityLogs').add({
      userId: userData.uid,
      userName: userData.name,
      action: action,
      collection: collection,
      documentId: documentId,
      changes: changes,
      timestamp: firebase.firestore.FieldValue.serverTimestamp(),
      branchId: userData.branchId || null
    });
  } catch (error) {
    console.error('Error logging activity:', error);
  }
}

// Format date for display
function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleDateString('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
}

// Format date for input field
function formatDateForInput(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toISOString().split('T')[0];
}

// Format currency
function formatCurrency(amount) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  }).format(amount || 0);
}

// Show loading indicator
function showLoading(element) {
  if (element) {
    element.innerHTML = '<div class="loading show"><div class="spinner"></div></div>';
  }
}

// Hide loading indicator
function hideLoading(element) {
  if (element) {
    const loadingDiv = element.querySelector('.loading');
    if (loadingDiv) {
      loadingDiv.remove();
    }
  }
}

// Show success message
function showSuccess(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-success';
  alertDiv.textContent = message;
  
  const container = document.querySelector('.main-content') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Show error message
function showError(message) {
  const alertDiv = document.createElement('div');
  alertDiv.className = 'alert alert-error';
  alertDiv.textContent = message;
  
  const container = document.querySelector('.main-content') || document.body;
  container.insertBefore(alertDiv, container.firstChild);
  
  setTimeout(() => {
    alertDiv.remove();
  }, 5000);
}

// Confirm dialog
function confirmAction(message) {
  return confirm(message);
}