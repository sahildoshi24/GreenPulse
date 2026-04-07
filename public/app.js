/* ══════════════════════════════════════════════════════════
   GreenPulse — Frontend Application Logic
   ══════════════════════════════════════════════════════════ */

const API_BASE = '/api/machines';
let allMachines = [];
let currentFilter = 'all';
let deleteTargetId = null;
let deleteTargetPermanent = false;

// Charts instances
let energyChart = null;
let co2PieChart = null;

// ─── INITIALIZATION ──────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  loadDashboard();
  // Set initial theme
  if (localStorage.getItem('theme') === 'light') {
    document.documentElement.classList.add('light');
    document.getElementById('checkbox').checked = false;
  }
});

// ─── THEME TOGGLE ────────────────────────────────────────
function toggleDarkMode() {
  const isChecked = document.getElementById('checkbox').checked;
  if (isChecked) {
    document.documentElement.classList.remove('light');
    localStorage.setItem('theme', 'dark');
  } else {
    document.documentElement.classList.add('light');
    localStorage.setItem('theme', 'light');
  }
  // Redraw charts if analytics is active
  if (document.getElementById('page-analytics').classList.contains('active')) {
    loadAnalytics();
  }
}

// ─── SIGN OUT ───────────────────────────────────────────
function handleSignOut() {
  if (confirm('Are you sure you want to sign out?')) {
    showToast('Signed out successfully', 'success');
    // In a real app, this would clear tokens/sessions
    setTimeout(() => location.reload(), 1000);
  }
}

// ─── NAVIGATION ──────────────────────────────────────────
function navigateTo(page) {
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pageEl = document.getElementById(`page-${page}`);
  const navEl = document.getElementById(`nav-${page}`);

  if (pageEl) pageEl.classList.add('active');
  if (navEl) navEl.classList.add('active');

  // Load page data
  switch (page) {
    case 'dashboard':
      loadDashboard();
      break;
    case 'add-machine':
      if (!document.getElementById('edit-machine-id').value) {
        resetForm();
      }
      break;
    case 'analytics':
      loadAnalytics();
      break;
    case 'deleted':
      loadDeletedMachines();
      break;
  }
}

// Set up nav click handlers
document.querySelectorAll('.nav-item').forEach(item => {
  item.addEventListener('click', (e) => {
    e.preventDefault();
    const page = item.dataset.page;
    if (page) navigateTo(page);
  });
});

// ─── DASHBOARD ───────────────────────────────────────────
async function loadDashboard() {
  try {
    const [dashRes, machinesRes] = await Promise.all([
      fetch(`${API_BASE}/dashboard`),
      fetch(API_BASE)
    ]);

    const dashboard = await dashRes.json();
    allMachines = await machinesRes.json();

    // Update summary cards with animation
    animateNumber('stat-total-machines', dashboard.totalMachines);
    animateNumber('stat-total-co2', dashboard.totalCO2, 1);
    animateNumber('stat-total-elec', dashboard.totalElectricity, 0);
    document.getElementById('stat-cost-loss').textContent = `₹${formatNumber(dashboard.totalCostLoss)}`;
    animateNumber('stat-critical', dashboard.criticalCount);

    renderMachineList(allMachines);
  } catch (err) {
    console.error('Dashboard load error:', err);
    showToast('Failed to load dashboard data', 'error');
  }
}

function animateNumber(elementId, target, decimals = 0) {
  const el = document.getElementById(elementId);
  const start = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
  const duration = 600;
  const startTime = Date.now();

  function tick() {
    const elapsed = Date.now() - startTime;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = start + (target - start) * ease;

    if (elementId === 'stat-cost-loss') {
      el.textContent = `₹${formatNumber(current)}`;
    } else {
      el.textContent = decimals > 0 ? current.toFixed(decimals) : Math.round(current);
    }

    if (progress < 1) requestAnimationFrame(tick);
  }
  tick();
}

function formatNumber(num) {
  if (num >= 10000000) return (num / 10000000).toFixed(1) + 'Cr';
  if (num >= 100000) return (num / 100000).toFixed(1) + 'L';
  if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
  return Math.round(num).toLocaleString('en-IN');
}

// ─── MACHINE LIST ────────────────────────────────────────
function renderMachineList(machines) {
  const container = document.getElementById('machine-list');

  if (machines.length === 0) {
    container.innerHTML = '';
    container.appendChild(createEmptyState());
    return;
  }

  const filtered = currentFilter === 'all' ? machines : machines.filter(m => m.status === currentFilter);

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No ${currentFilter} machines found</h3>
        <p>Try a different filter</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map((m, i) => `
    <div class="machine-card" onclick="viewMachineDetail('${m._id}')" style="animation-delay: ${i * 50}ms">
      <div class="machine-info">
        <span class="machine-name">${escapeHtml(m.name)}</span>
        <span class="machine-type">
          ${getTypeAbbreviation(m.type)}
          <span class="separator"></span>
          ${m.age} yrs
          <span class="separator"></span>
          ${m.productionOutput} t/day
        </span>
      </div>
      <div class="machine-metric">
        <span class="metric-value">${m.co2Total ? m.co2Total.toFixed(1) : '0'}</span>
        <span class="metric-label">CO₂ kg/day</span>
      </div>
      <div class="machine-metric">
        <span class="metric-value">${m.inefficiencyPercent ? m.inefficiencyPercent.toFixed(1) : '0'}%</span>
        <span class="metric-label">Inefficiency</span>
      </div>
      <span class="status-badge ${m.status}">
        <span class="status-dot ${m.status}"></span>
        ${m.status}
      </span>
      <div class="machine-actions" onclick="event.stopPropagation()">
        <button class="action-btn view" onclick="viewMachineDetail('${m._id}')" title="View Details">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </button>
        <button class="action-btn edit" onclick="editMachine('${m._id}')" title="Edit">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
        </button>
        <button class="action-btn delete" onclick="deleteMachine('${m._id}', '${escapeHtml(m.name)}')" title="Delete">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>
        </button>
      </div>
    </div>
  `).join('');
}

function createEmptyState() {
  const div = document.createElement('div');
  div.className = 'empty-state';
  div.innerHTML = `
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><rect x="2" y="7" width="20" height="14" rx="2"/><path d="M16 7V5a4 4 0 0 0-8 0v2"/></svg>
    <h3>No machines registered</h3>
    <p>Add your first machine to begin AI-powered monitoring</p>
    <button class="btn btn-primary" onclick="navigateTo('add-machine')">Add Machine</button>
  `;
  return div;
}

function filterMachines(filter, btn) {
  currentFilter = filter;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderMachineList(allMachines);
}

function getTypeAbbreviation(type) {
  const map = {
    'Blast Furnace': 'BF',
    'Basic Oxygen Furnace': 'BOF',
    'Electric Arc Furnace': 'EAF',
    'Continuous Casting Machine': 'CCM',
    'Hot Rolling Mill': 'HRM'
  };
  return map[type] || type;
}

// ─── ADD / EDIT MACHINE FORM ─────────────────────────────
async function handleFormSubmit(event) {
  event.preventDefault();

  const editId = document.getElementById('edit-machine-id').value;
  const data = {
    name: document.getElementById('machine-name').value,
    type: document.getElementById('machine-type').value,
    age: parseFloat(document.getElementById('machine-age').value),
    productionOutput: parseFloat(document.getElementById('production-output').value),
    electricityConsumption: parseFloat(document.getElementById('electricity-consumption').value),
    fuelConsumption: parseFloat(document.getElementById('fuel-consumption').value),
    operatingTemperature: parseFloat(document.getElementById('operating-temperature').value),
    current: parseFloat(document.getElementById('machine-current').value),
    voltage: parseFloat(document.getElementById('machine-voltage').value),
    vibrationLevel: parseFloat(document.getElementById('vibration-level').value)
  };

  const submitBtn = document.getElementById('form-submit-btn');
  submitBtn.disabled = true;
  submitBtn.innerHTML = '<span class="spinner"></span> Analyzing...';

  try {
    let res;
    if (editId) {
      res = await fetch(`${API_BASE}/${editId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } else {
      res = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    }

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || 'Failed to save machine');
    }

    const machine = await res.json();
    showToast(`${machine.name} ${editId ? 'updated' : 'added'} successfully — Status: ${machine.status}`, 'success');
    resetForm();
    navigateTo('dashboard');
  } catch (err) {
    showToast(err.message, 'error');
  } finally {
    submitBtn.disabled = false;
    submitBtn.innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
      ${document.getElementById('edit-machine-id').value ? 'Update & Re-Analyze' : 'Add & Analyze Machine'}
    `;
  }
}

async function editMachine(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const machine = await res.json();

    document.getElementById('edit-machine-id').value = id;
    document.getElementById('machine-name').value = machine.name;
    document.getElementById('machine-type').value = machine.type;
    document.getElementById('machine-age').value = machine.age;
    document.getElementById('production-output').value = machine.productionOutput;
    document.getElementById('electricity-consumption').value = machine.electricityConsumption;
    document.getElementById('fuel-consumption').value = machine.fuelConsumption;
    document.getElementById('operating-temperature').value = machine.operatingTemperature;
    document.getElementById('machine-current').value = machine.current;
    document.getElementById('machine-voltage').value = machine.voltage;
    document.getElementById('vibration-level').value = machine.vibrationLevel;

    document.getElementById('form-page-title').textContent = `Edit: ${machine.name}`;
    document.getElementById('form-page-subtitle').textContent = 'Update parameters and re-analyze';
    document.getElementById('form-submit-btn').innerHTML = `
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
      Update & Re-Analyze
    `;

    navigateTo('add-machine');
  } catch (err) {
    showToast('Failed to load machine data', 'error');
  }
}

function resetForm() {
  document.getElementById('machine-form').reset();
  document.getElementById('edit-machine-id').value = '';
  document.getElementById('form-page-title').textContent = 'Add Machine';
  document.getElementById('form-page-subtitle').textContent = 'Register a new machine for AI analysis';
  document.getElementById('form-submit-btn').innerHTML = `
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13,2 3,14 12,14 11,22 21,10 12,10"/></svg>
    Add & Analyze Machine
  `;
}

// ─── DELETE MACHINE ──────────────────────────────────────
function deleteMachine(id, name) {
  deleteTargetId = id;
  deleteTargetPermanent = false;
  document.getElementById('delete-modal-text').textContent = 
    `Are you sure you want to delete "${name}"? It will be moved to Recently Deleted.`;
  document.getElementById('confirm-delete-btn').textContent = 'Delete';
  document.getElementById('confirm-delete-btn').className = 'btn btn-danger';
  document.getElementById('delete-modal-overlay').classList.add('active');
}

function deleteMachinePermanent(id, name) {
  deleteTargetId = id;
  deleteTargetPermanent = true;
  document.getElementById('delete-modal-text').textContent = 
    `PERMANENTLY delete "${name}"? This action cannot be undone.`;
  document.getElementById('confirm-delete-btn').textContent = 'Delete Permanently';
  document.getElementById('confirm-delete-btn').className = 'btn btn-danger';
  document.getElementById('delete-modal-overlay').classList.add('active');
}

async function confirmDelete() {
  if (!deleteTargetId) return;

  try {
    const url = deleteTargetPermanent 
      ? `${API_BASE}/${deleteTargetId}/permanent` 
      : `${API_BASE}/${deleteTargetId}`;

    const res = await fetch(url, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');

    showToast(deleteTargetPermanent ? 'Machine permanently deleted' : 'Machine moved to Recently Deleted', 'success');
    closeDeleteModal();

    if (deleteTargetPermanent) {
      loadDeletedMachines();
    } else {
      loadDashboard();
    }
  } catch (err) {
    showToast('Failed to delete machine', 'error');
  }
}

function closeDeleteModal() {
  document.getElementById('delete-modal-overlay').classList.remove('active');
  deleteTargetId = null;
}

// ─── RESTORE MACHINE ────────────────────────────────────
async function restoreMachine(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}/restore`, { method: 'PATCH' });
    if (!res.ok) throw new Error('Restore failed');
    showToast('Machine restored successfully', 'success');
    loadDeletedMachines();
  } catch (err) {
    showToast('Failed to restore machine', 'error');
  }
}

// ─── DELETED MACHINES ────────────────────────────────────
async function loadDeletedMachines() {
  try {
    const res = await fetch(`${API_BASE}/deleted/all`);
    const machines = await res.json();
    const container = document.getElementById('deleted-list');

    if (machines.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" opacity="0.3"><polyline points="3,6 5,6 21,6"/><path d="M19,6v14a2,2,0,0,1-2,2H7a2,2,0,0,1-2-2V6m3,0V4a2,2,0,0,1,2-2h4a2,2,0,0,1,2,2v2"/></svg>
          <h3>No deleted machines</h3>
          <p>Deleted machines will appear here for recovery</p>
        </div>
      `;
      return;
    }

    container.innerHTML = machines.map(m => `
      <div class="deleted-card">
        <div class="deleted-info">
          <h4>${escapeHtml(m.name)} <span style="color: var(--text-muted); font-weight: 400; font-size: 0.82rem;">(${m.type})</span></h4>
          <p>Deleted ${m.deletedAt ? new Date(m.deletedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Unknown'}</p>
        </div>
        <div class="deleted-actions">
          <button class="btn btn-sm btn-primary" onclick="restoreMachine('${m._id}')">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="1,4 1,10 7,10"/><path d="M3.51,15a9,9,0,1,0,2.13-9.36L1,10"/></svg>
            Restore
          </button>
          <button class="btn btn-sm btn-danger" onclick="deleteMachinePermanent('${m._id}', '${escapeHtml(m.name)}')">
            Permanent Delete
          </button>
        </div>
      </div>
    `).join('');
  } catch (err) {
    showToast('Failed to load deleted machines', 'error');
  }
}

// ─── MACHINE DETAIL MODAL ────────────────────────────────
async function viewMachineDetail(id) {
  try {
    const res = await fetch(`${API_BASE}/${id}`);
    const m = await res.json();

    document.getElementById('modal-title').textContent = m.name;
    
    const statusColor = m.status === 'Efficient' ? 'var(--status-efficient)' : m.status === 'Warning' ? 'var(--status-warning)' : 'var(--status-critical)';

    document.getElementById('modal-body').innerHTML = `
      <div style="display:flex;align-items:center;gap:12px;margin-bottom:20px;">
        <span class="status-badge ${m.status}">
          <span class="status-dot ${m.status}"></span>
          ${m.status}
        </span>
        <span style="color:var(--text-muted);font-size:0.82rem;">${m.type} • ${m.age} years old</span>
      </div>

      <div class="detail-section-title">📊 Performance Metrics</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Production Output</div>
          <div class="detail-value">${m.productionOutput} t/day</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Electricity</div>
          <div class="detail-value">${m.electricityConsumption.toLocaleString()} kWh/day</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Expected Energy</div>
          <div class="detail-value">${m.expectedEnergy ? m.expectedEnergy.toLocaleString() : 'N/A'} kWh</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Extra Energy</div>
          <div class="detail-value" style="color:${m.extraEnergy > 0 ? 'var(--status-critical)' : 'var(--status-efficient)'}">${m.extraEnergy ? m.extraEnergy.toLocaleString() : '0'} kWh</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Inefficiency</div>
          <div class="detail-value" style="color:${statusColor}">${m.inefficiencyPercent ? m.inefficiencyPercent.toFixed(1) : '0'}%</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Temperature</div>
          <div class="detail-value">${m.operatingTemperature}°C</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Vibration</div>
          <div class="detail-value">${m.vibrationLevel}/20</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Power</div>
          <div class="detail-value">${m.current}A × ${m.voltage}V</div>
        </div>
      </div>

      <div class="detail-section-title">🌍 Environmental & Financial Impact</div>
      <div class="detail-grid">
        <div class="detail-item">
          <div class="detail-label">Total CO₂</div>
          <div class="detail-value">${m.co2Total ? m.co2Total.toFixed(1) : '0'} kg/day</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Excess CO₂</div>
          <div class="detail-value" style="color:var(--status-critical)">${m.co2Excess ? m.co2Excess.toFixed(1) : '0'} kg/day</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Cost Loss / Day</div>
          <div class="detail-value" style="color:var(--status-warning)">₹${m.costLossDay ? Math.round(m.costLossDay).toLocaleString('en-IN') : '0'}</div>
        </div>
        <div class="detail-item">
          <div class="detail-label">Cost Loss / Year</div>
          <div class="detail-value" style="color:var(--status-critical)">₹${m.costLossYear ? Math.round(m.costLossYear).toLocaleString('en-IN') : '0'}</div>
        </div>
      </div>

      ${m.xaiExplanation && m.xaiExplanation.length > 0 ? `
        <div class="detail-section-title">🔍 XAI — Root Cause Analysis</div>
        ${m.xaiExplanation.map(x => `
          <div class="xai-block">
            <div class="xai-cause">
              ${x.cause}
              <span class="xai-impact">+${x.impact}%</span>
            </div>
            <div class="xai-detail">${x.detail}</div>
          </div>
        `).join('')}
      ` : ''}

      ${m.recommendations && m.recommendations.length > 0 ? `
        <div class="detail-section-title">🧠 AI Recommendations</div>
        ${m.recommendations.map(r => `
          <div class="rec-item">${r}</div>
        `).join('')}
      ` : ''}

      <div style="display:flex;gap:10px;margin-top:24px;justify-content:flex-end;">
        <button class="btn btn-outline" onclick="editMachine('${m._id}'); closeModal();">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
          Edit Machine
        </button>
        <button class="btn btn-danger" onclick="closeModal(); deleteMachine('${m._id}', '${escapeHtml(m.name)}');">
          Delete
        </button>
      </div>
    `;

    document.getElementById('modal-overlay').classList.add('active');
  } catch (err) {
    showToast('Failed to load machine details', 'error');
  }
}

function closeModal() {
  document.getElementById('modal-overlay').classList.remove('active');
}

// ─── ANALYTICS ───────────────────────────────────────────
async function loadAnalytics() {
  try {
    const res = await fetch(`${API_BASE}/analysis/data`);
    const data = await res.json();
    const container = document.getElementById('analytics-grid');

    if (data.comparison.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <h3>No data to analyze</h3>
          <p>Add machines to see analytics</p>
        </div>
      `;
      return;
    }

    renderCharts(data);

    const maxInefficiency = Math.max(...data.comparison.map(m => m.inefficiency), 1);
    const maxCO2 = Math.max(...data.comparison.map(m => m.co2), 1);
    const maxEnergy = Math.max(...data.comparison.map(m => m.electricity), 1);

    container.innerHTML = `
      <!-- Inefficiency Ranking -->
      <div class="analytics-card">
        <h3>🏆 Inefficiency Ranking</h3>
        <div class="bar-chart">
          ${data.rankByInefficiency.map(m => `
            <div class="bar-row">
              <span class="bar-label">${escapeHtml(m.name)}</span>
              <div class="bar-track">
                <div class="bar-fill ${m.status === 'Efficient' ? 'efficient' : m.status === 'Warning' ? 'warning' : 'critical'}" 
                     style="width: ${Math.max((m.inefficiency / maxInefficiency) * 100, 5)}%">
                </div>
              </div>
              <span class="bar-value">${m.inefficiency.toFixed(1)}%</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- CO₂ Distribution -->
      <div class="analytics-card">
        <h3>🌍 CO₂ Emissions by Machine</h3>
        <div class="bar-chart">
          ${data.rankByCO2.map(m => `
            <div class="bar-row">
              <span class="bar-label">${escapeHtml(m.name)}</span>
              <div class="bar-track">
                <div class="bar-fill efficient" style="width: ${Math.max((m.co2 / maxCO2) * 100, 5)}%"></div>
              </div>
              <span class="bar-value">${m.co2.toFixed(1)} kg</span>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- Full Ranking Table -->
      <div class="analytics-card" style="grid-column: 1 / -1">
        <h3>📊 Complete Machine Comparison</h3>
        <div style="overflow-x:auto;">
          <table class="ranking-table">
            <thead>
              <tr>
                <th>#</th>
                <th>Machine</th>
                <th>Type</th>
                <th>Inefficiency</th>
                <th>CO₂/day</th>
                <th>Cost Loss/day</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              ${data.rankByInefficiency.map((m, i) => `
                <tr>
                  <td><span class="rank-number ${i < 3 ? 'top' : ''}">${i + 1}</span></td>
                  <td style="font-weight:600;">${escapeHtml(m.name)}</td>
                  <td style="color:var(--text-secondary)">${getTypeAbbreviation(m.type)}</td>
                  <td style="font-weight:700;">${m.inefficiency.toFixed(1)}%</td>
                  <td>${m.co2.toFixed(1)} kg</td>
                  <td>₹${Math.round(m.costLoss).toLocaleString('en-IN')}</td>
                  <td><span class="status-badge ${m.status}"><span class="status-dot ${m.status}"></span>${m.status}</span></td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    `;
  } catch (err) {
    console.error('Analytics load error:', err);
    showToast('Failed to load analytics', 'error');
  }
}

function renderCharts(data) {
  const isDark = !document.documentElement.classList.contains('light');
  const textColor = isDark ? '#e6edf3' : '#1a202c';
  const gridColor = isDark ? '#21262d' : '#e2e8f0';

  if (energyChart) energyChart.destroy();
  if (co2PieChart) co2PieChart.destroy();

  const names = data.comparison.map(m => m.name);
  const electricity = data.comparison.map(m => m.electricity);
  const expected = data.comparison.map(m => m.expectedEnergy);

  const ctxEnergy = document.getElementById('energyChart').getContext('2d');
  energyChart = new Chart(ctxEnergy, {
    type: 'bar',
    data: {
      labels: names,
      datasets: [
        {
          label: 'Actual Energy (kWh)',
          data: electricity,
          backgroundColor: '#3fb950',
          borderRadius: 4
        },
        {
          label: 'Optimal Energy (kWh)',
          data: expected,
          backgroundColor: '#1a2230',
          borderColor: '#3fb950',
          borderWidth: 1,
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { labels: { color: textColor } }
      },
      scales: {
        x: { ticks: { color: textColor }, grid: { color: gridColor } },
        y: { ticks: { color: textColor }, grid: { color: gridColor } }
      }
    }
  });

  const co2Data = data.comparison.map(m => m.co2);
  const ctxPie = document.getElementById('co2PieChart').getContext('2d');
  co2PieChart = new Chart(ctxPie, {
    type: 'doughnut',
    data: {
      labels: names,
      datasets: [{
        data: co2Data,
        backgroundColor: [
          '#3fb950', '#2dd4bf', '#38bdf8', '#8884d8', '#f85149', '#d29922'
        ],
        borderWidth: 0,
        hoverOffset: 10
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: 'right',
          labels: { color: textColor, padding: 20 }
        }
      },
      cutout: '70%'
    }
  });
}

// ─── PDF REPORT GENERATION ──────────────────────────────
async function downloadPDFReport() {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF('p', 'mm', 'a4');
  const toast = showToast('Generating PDF report...', 'info');

  try {
    const dashboard = document.getElementById('page-dashboard');
    const originalActive = document.querySelector('.page.active');
    
    // Switch to dashboard temporarily for capture if not active
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    dashboard.classList.add('active');

    const canvas = await html2canvas(dashboard, {
      backgroundColor: document.documentElement.classList.contains('light') ? '#f0f2f5' : '#0a0e14',
      scale: 2,
      logging: false,
      useCORS: true
    });

    const imgData = canvas.toDataURL('image/png');
    const imgProps = doc.getImageProperties(imgData);
    const pdfWidth = doc.internal.pageSize.getWidth();
    const pdfHeight = (imgProps.height * pdfWidth) / imgProps.width;

    doc.setFontSize(22);
    doc.setTextColor(63, 185, 80);
    doc.text('GreenPulse — AI Monitoring Report', 15, 20);
    doc.setFontSize(10);
    doc.setTextColor(128, 128, 128);
    doc.text(`Generated on: ${new Date().toLocaleString()}`, 15, 28);
    
    doc.addImage(imgData, 'PNG', 0, 35, pdfWidth, pdfHeight);
    
    doc.save(`GreenPulse_Report_${Date.now()}.pdf`);
    showToast('Report downloaded successfully', 'success');

    // Restore original page
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    originalActive.classList.add('active');
  } catch (err) {
    console.error('PDF error:', err);
    showToast('Failed to generate PDF', 'error');
  }
}

// ─── CHATBOT ─────────────────────────────────────────────
function toggleChatbot() {
  const panel = document.getElementById('chatbot-panel');
  panel.classList.toggle('active');
}

async function sendChat() {
  const input = document.getElementById('chat-input');
  const query = input.value.trim();
  if (!query) return;

  addChatMessage(query, 'user');
  input.value = '';

  // Show typing indicator
  const typingId = addChatMessage('Analyzing operations...', 'bot typing');

  try {
    const res = await fetch(`${API_BASE}/chat/ask`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query })
    });
    const data = await res.json();

    // Remove typing indicator
    const typingMsg = document.getElementById(typingId);
    if (typingMsg) typingMsg.remove();

    let formattedAnswer = data.answer
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\n/g, '<br>')
      .replace(/• /g, '&bull; ');

    addChatMessage(formattedAnswer, 'bot', data.suggestions);
  } catch (err) {
    const typingMsg = document.getElementById(typingId);
    if (typingMsg) typingMsg.remove();
    addChatMessage('I\'m having trouble connecting to the analysis engine. Please check if the server is running.', 'bot');
  }
}

function askChat(question) {
  document.getElementById('chat-input').value = question;
  sendChat();
}

function addChatMessage(content, sender, suggestions = []) {
  const container = document.getElementById('chatbot-messages');
  const msgDiv = document.createElement('div');
  const id = 'msg-' + Date.now();
  msgDiv.id = id;
  msgDiv.className = `chat-message ${sender}`;

  const avatarIcon = sender.includes('bot') 
    ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2m-9-11h2m18 0h2"/></svg>'
    : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

  let suggestionsHtml = '';
  if (suggestions && suggestions.length > 0) {
    suggestionsHtml = `<div class="chat-suggestions">${suggestions.map(s => 
      `<button onclick="askChat('${s}')">${s}</button>`
    ).join('')}</div>`;
  }

  msgDiv.innerHTML = `
    <div class="chat-avatar">${avatarIcon}</div>
    <div class="chat-bubble">
      <p>${content}</p>
      ${suggestionsHtml}
    </div>
  `;

  container.appendChild(msgDiv);
  container.scrollTop = container.scrollHeight;
  return id;
}

// ─── TOAST NOTIFICATIONS ─────────────────────────────────
function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;

  const icons = {
    success: '✓',
    error: '✕',
    info: 'ℹ'
  };

  toast.innerHTML = `<span style="font-weight:700;font-size:1.1rem;">${icons[type] || 'ℹ'}</span> ${message}`;
  container.appendChild(toast);

  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(10px)';
      setTimeout(() => toast.remove(), 300);
    }
  }, 3200);
  return toast;
}

// ─── UTILITIES ───────────────────────────────────────────
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
