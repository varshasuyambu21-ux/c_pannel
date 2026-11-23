/**
 * cPanel Modern Control Panel JavaScript
 */

// State
let selectedFmItem = null;
let currentFmDir = '';
let terminalHistory = [];
let terminalHistoryIndex = -1;
let currentEditingPath = '';

// Initialize on DOM Ready
document.addEventListener('DOMContentLoaded', () => {
  initTheme();
  initSearch();
  initTerminal();
  startStatsPolling();

  // Initial loads for managers
  loadDatabases();
  loadDnsRecords();
  loadEmails();
  loadCronJobs();
  loadDeployments();
  fmLoad('');

  // Quick navigation buttons
  document.getElementById('btnTerminalQuick')?.addEventListener('click', () => {
    openModal('terminalModal');
    focusTerminalInput();
  });

  document.getElementById('btnNotification')?.addEventListener('click', () => {
    showToast('3 Alerts: AutoSSL completed successfully; Backup ready; CSF Firewall active.');
  });
});

/* ==========================================================================
   Modal Controls
   ========================================================================== */

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
    if (modalId === 'fileManagerModal') {
      fmLoad(currentFmDir);
    }
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
  }
}

// Close on clicking backdrop
document.addEventListener('click', (e) => {
  if (e.target.classList.contains('cp-modal-backdrop')) {
    e.target.classList.remove('active');
  }
});

// Close modal on Escape key
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    document.querySelectorAll('.cp-modal-backdrop.active').forEach(m => m.classList.remove('active'));
  }
  // Focus search on '/' or Ctrl+K
  if ((e.key === '/' || (e.ctrlKey && e.key === 'k')) && document.activeElement.tagName !== 'INPUT' && document.activeElement.tagName !== 'TEXTAREA') {
    e.preventDefault();
    document.getElementById('toolSearch')?.focus();
  }
});

/* ==========================================================================
   Theme Management
   ========================================================================== */

function initTheme() {
  const savedTheme = localStorage.getItem('cp_theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.add('light-mode');
    updateThemeIcon(true);
  }

  document.getElementById('btnThemeToggle')?.addEventListener('click', () => {
    const isLight = document.body.classList.toggle('light-mode');
    localStorage.setItem('cp_theme', isLight ? 'light' : 'dark');
    updateThemeIcon(isLight);
    showToast(`Switched to ${isLight ? 'Light' : 'Dark'} theme`);
  });
}

function updateThemeIcon(isLight) {
  const icon = document.getElementById('themeIcon');
  if (icon) {
    icon.className = isLight ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
  }
}

/* ==========================================================================
   Live Stats Polling
   ========================================================================== */

function startStatsPolling() {
  fetchStats();
  setInterval(fetchStats, 3000);
}

async function fetchStats() {
  try {
    const res = await fetch('/api/stats');
    if (!res.ok) return;
    const data = await res.json();

    // Server Info
    if (data.server) {
      document.getElementById('topUsername').innerText = 'cpanel_admin';
      document.getElementById('topServerIp').innerText = data.server.serverIp || '192.168.1.100';
      document.getElementById('infoIp').innerText = data.server.serverIp || '192.168.1.100';
      document.getElementById('infoCpanelVer').innerText = data.server.cpanelVersion || '124.0.18';
      document.getElementById('infoApacheVer').innerText = data.server.apacheVersion || 'Apache/2.4.62';
      document.getElementById('infoPhpVer').innerText = data.server.phpVersion || 'PHP 8.3.14';
      document.getElementById('infoMysqlVer').innerText = data.server.mysqlVersion || 'MySQL 8.0.39';

      const uptimeSec = data.server.uptimeSeconds || 0;
      const days = Math.floor(uptimeSec / 86400);
      const hours = Math.floor((uptimeSec % 86400) / 3600);
      document.getElementById('infoUptime').innerText = `${days} days, ${hours} hours`;
    }

    // CPU
    if (data.resources?.cpu) {
      const cpu = data.resources.cpu;
      const pct = cpu.usagePercent;
      document.getElementById('cpuNumbers').innerText = `${pct}%`;
      const fill = document.getElementById('cpuFill');
      fill.style.width = `${Math.min(pct, 100)}%`;
      fill.style.background = pct > 80 ? 'var(--accent-red)' : (pct > 50 ? 'var(--accent-yellow)' : 'linear-gradient(90deg, #ff6c2c, #f97316)');
      document.getElementById('cpuCores').innerText = `${cpu.cores} Cores &bull; ${cpu.model.slice(0, 28)}`;
    }

    // Memory
    if (data.resources?.memory) {
      const mem = data.resources.memory;
      document.getElementById('memNumbers').innerText = `${mem.usedGB} GB / ${mem.totalGB} GB`;
      document.getElementById('memFill').style.width = `${Math.min(mem.usagePercent, 100)}%`;
      document.getElementById('memPercent').innerText = `${mem.usagePercent}% utilized`;
    }

    // Disk
    if (data.resources?.disk) {
      const disk = data.resources.disk;
      document.getElementById('diskNumbers').innerText = `${disk.usedMB} MB / 50 GB`;
      document.getElementById('diskFill').style.width = `${Math.max(disk.usagePercent, 1.5)}%`;
    }

    // Inodes
    if (data.resources?.inodes) {
      const inodes = data.resources.inodes;
      document.getElementById('inodeNumbers').innerText = `${inodes.used.toLocaleString()} / ${inodes.limit.toLocaleString()}`;
      document.getElementById('inodeFill').style.width = `${Math.max(inodes.usagePercent, 1)}%`;
    }
    // Settings — primary domain, IP, user
    if (data.settings) {
      const domain = data.settings.primaryDomain || 'localhost';
      const ip = data.settings.sharedIp || '';

      // Sidebar info panel
      const infoDomain = document.getElementById('infoDomain');
      if (infoDomain) infoDomain.innerText = domain;
      const infoIp2 = document.getElementById('infoIp');
      if (infoIp2 && ip) infoIp2.innerText = ip;

      // Email suffix (@domain)
      const emailSuffix = document.getElementById('emailDomainSuffix');
      if (emailSuffix) emailSuffix.innerText = `@${domain}`;

      // SSL primary domain label
      const sslLabel = document.getElementById('sslPrimaryDomain');
      if (sslLabel) sslLabel.innerText = domain;

      // Softaculous domain select
      const installDomain = document.getElementById('installDomain');
      if (installDomain && installDomain.options.length === 1) {
        installDomain.options[0].value = `http://${domain}`;
        installDomain.options[0].text = `http://${domain}`;
      }

      // Trigger deploy domain select
      const triggerDomain = document.getElementById('newDeployDomain');
      if (triggerDomain && triggerDomain.options.length === 3) {
        triggerDomain.options[0].value = domain;
        triggerDomain.options[0].text = `${domain} (Root Domain)`;
        triggerDomain.options[1].value = `staging.${domain}`;
        triggerDomain.options[1].text = `staging.${domain} (Staging)`;
        triggerDomain.options[2].value = `api.${domain}`;
        triggerDomain.options[2].text = `api.${domain} (API Service)`;
      }

      // Deploy filter domain select
      const deployFilter = document.getElementById('deployDomainFilter');
      if (deployFilter && deployFilter.options.length === 1) {
        const opt = document.createElement('option');
        opt.value = domain;
        opt.text = `${domain} (Production)`;
        deployFilter.appendChild(opt);
      }
    }
  } catch (err) {
    console.error('Stats poll error:', err);
  }
}

/* ==========================================================================
   Domain Settings Prompt
   ========================================================================== */

async function openDomainSettingsPrompt() {
  const current = document.getElementById('infoDomain')?.innerText || 'localhost';
  const newDomain = prompt(`Enter your primary domain name:\n(e.g. mysite.com or yourdomain.net)`, current);
  if (!newDomain || newDomain.trim() === current) return;

  const domain = newDomain.trim().toLowerCase().replace(/^https?:\/\//, '').replace(/\/$/, '');
  if (!domain) return;

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ primaryDomain: domain })
    });
    const data = await res.json();
    if (data.success) {
      showToast(`Primary domain updated to: ${domain}`);
      fetchStats(); // refresh all domain-linked elements
    } else {
      showToast('Failed to update domain', 'error');
    }
  } catch (err) {
    showToast('Error updating domain: ' + err.message, 'error');
  }

}

/* ==========================================================================
   Tool Search & Filter
   ========================================================================== */

function initSearch() {
  const searchInput = document.getElementById('toolSearch');
  if (!searchInput) return;

  searchInput.addEventListener('input', (e) => {
    const term = e.target.value.toLowerCase().trim();
    const categories = document.querySelectorAll('.tool-category-card');

    categories.forEach(cat => {
      const tools = cat.querySelectorAll('.tool-item');
      let visibleCount = 0;

      tools.forEach(tool => {
        const title = tool.querySelector('.tool-title')?.innerText.toLowerCase() || '';
        const desc = tool.querySelector('.tool-desc')?.innerText.toLowerCase() || '';
        if (title.includes(term) || desc.includes(term)) {
          tool.style.display = 'flex';
          visibleCount++;
        } else {
          tool.style.display = 'none';
        }
      });

      cat.style.display = visibleCount > 0 ? 'block' : 'none';
    });
  });
}

/* ==========================================================================
   File Manager Module
   ========================================================================== */

async function fmLoad(dir = '') {
  currentFmDir = dir;
  selectedFmItem = null;
  updateFmToolbarState();

  const tbody = document.getElementById('fmTableBody');
  const pathLabel = document.getElementById('fmCurrentPath');
  if (tbody) tbody.innerHTML = '<tr><td colspan="5" class="loading-cell">Loading files...</td></tr>';

  try {
    const res = await fetch(`/api/files?dir=${encodeURIComponent(dir)}`);
    const data = await res.json();

    if (pathLabel) {
      pathLabel.innerText = data.currentPath || '/public_html';
    }

    if (!data.files || data.files.length === 0) {
      tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 2rem; color: var(--text-muted);">Directory is empty</td></tr>';
      return;
    }

    tbody.innerHTML = '';
    data.files.forEach(file => {
      const tr = document.createElement('tr');
      tr.dataset.name = file.name;
      tr.dataset.isDir = file.isDirectory;

      const iconClass = getFileIcon(file.name, file.isDirectory);
      const formattedSize = file.isDirectory ? '--' : formatBytes(file.size);
      const modDate = new Date(file.mtime).toLocaleString();

      tr.innerHTML = `
        <td>
          <div class="fm-item-name">
            <i class="${iconClass}"></i>
            <span>${escapeHtml(file.name)}</span>
          </div>
        </td>
        <td>${formattedSize}</td>
        <td>${file.isDirectory ? 'Directory' : getFileExtension(file.name).toUpperCase() + ' File'}</td>
        <td>${modDate}</td>
        <td class="code-font">${file.permissions}</td>
      `;

      // Click to select
      tr.addEventListener('click', (e) => {
        document.querySelectorAll('#fmTableBody tr').forEach(r => r.classList.remove('selected'));
        tr.classList.add('selected');
        selectedFmItem = file;
        updateFmToolbarState();
      });

      // Double-click to open folder or edit file
      tr.addEventListener('dblclick', () => {
        if (file.isDirectory) {
          const nextDir = currentFmDir ? `${currentFmDir}/${file.name}` : file.name;
          fmLoad(nextDir);
        } else {
          openCodeEditor(file.name);
        }
      });

      tbody.appendChild(tr);
    });
  } catch (err) {
    tbody.innerHTML = `<tr><td colspan="5" style="color: var(--accent-red); padding: 1rem;">Failed to load files: ${err.message}</td></tr>`;
  }
}

function updateFmToolbarState() {
  const btnEdit = document.getElementById('fmBtnEdit');
  const btnRename = document.getElementById('fmBtnRename');
  const btnDelete = document.getElementById('fmBtnDelete');
  const statusMsg = document.getElementById('fmStatusMsg');

  if (selectedFmItem) {
    btnEdit.disabled = selectedFmItem.isDirectory;
    btnRename.disabled = false;
    btnDelete.disabled = false;
    statusMsg.innerText = `Selected: ${selectedFmItem.name} (${selectedFmItem.isDirectory ? 'Directory' : formatBytes(selectedFmItem.size)})`;
  } else {
    btnEdit.disabled = true;
    btnRename.disabled = true;
    btnDelete.disabled = true;
    statusMsg.innerText = 'Selected: None';
  }
}

function fmGoUp() {
  if (!currentFmDir) return;
  const parts = currentFmDir.split('/').filter(Boolean);
  parts.pop();
  fmLoad(parts.join('/'));
}

function fmRefresh() {
  fmLoad(currentFmDir);
  showToast('File Manager reloaded');
}

function openFmNewFile() {
  const name = prompt('Enter new file name (e.g. script.js, about.html):');
  if (!name) return;
  const filePath = currentFmDir ? `${currentFmDir}/${name}` : name;

  fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, isDirectory: false, content: '' })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) showToast(data.error, 'error');
    else {
      showToast(`Created file: ${name}`);
      fmLoad(currentFmDir);
    }
  });
}

function openFmNewFolder() {
  const name = prompt('Enter new directory name:');
  if (!name) return;
  const dirPath = currentFmDir ? `${currentFmDir}/${name}` : name;

  fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: dirPath, isDirectory: true })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) showToast(data.error, 'error');
    else {
      showToast(`Created folder: ${name}`);
      fmLoad(currentFmDir);
    }
  });
}

function openFmUpload() {
  const name = prompt('Enter name of file to simulate upload (e.g., config.json):', 'config.json');
  if (!name) return;
  const filePath = currentFmDir ? `${currentFmDir}/${name}` : name;
  const content = `{\n  "appName": "Hosted App",\n  "status": "ready",\n  "timestamp": "${new Date().toISOString()}"\n}`;

  fetch('/api/files/create', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: filePath, isDirectory: false, content })
  })
  .then(res => res.json())
  .then(() => {
    showToast(`Uploaded ${name} successfully!`);
    fmLoad(currentFmDir);
  });
}

function fmEditSelected() {
  if (selectedFmItem && !selectedFmItem.isDirectory) {
    openCodeEditor(selectedFmItem.name);
  }
}

function openCodeEditor(fileName) {
  currentEditingPath = currentFmDir ? `${currentFmDir}/${fileName}` : fileName;
  document.getElementById('editorFileName').innerText = fileName;
  const textarea = document.getElementById('editorTextarea');
  textarea.value = 'Loading file contents...';

  fetch('/api/files/read', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentEditingPath })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      textarea.value = data.content;
      openModal('codeEditorModal');
    }
  });
}

function saveCodeEditor() {
  const textarea = document.getElementById('editorTextarea');
  fetch('/api/files/write', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: currentEditingPath, content: textarea.value })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) {
      showToast(data.error, 'error');
    } else {
      showToast('File saved successfully!');
      closeModal('codeEditorModal');
      fmLoad(currentFmDir);
    }
  });
}

function fmDeleteSelected() {
  if (!selectedFmItem) return;
  if (!confirm(`Are you sure you want to permanently delete "${selectedFmItem.name}"?`)) return;

  const targetPath = currentFmDir ? `${currentFmDir}/${selectedFmItem.name}` : selectedFmItem.name;
  fetch('/api/files/delete', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ path: targetPath })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) showToast(data.error, 'error');
    else {
      showToast(`Deleted ${selectedFmItem.name}`);
      fmLoad(currentFmDir);
    }
  });
}

function fmRenameSelected() {
  if (!selectedFmItem) return;
  const newName = prompt('Enter new name:', selectedFmItem.name);
  if (!newName || newName === selectedFmItem.name) return;

  const oldPath = currentFmDir ? `${currentFmDir}/${selectedFmItem.name}` : selectedFmItem.name;
  const newPath = currentFmDir ? `${currentFmDir}/${newName}` : newName;

  fetch('/api/files/rename', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ oldPath, newPath })
  })
  .then(res => res.json())
  .then(data => {
    if (data.error) showToast(data.error, 'error');
    else {
      showToast(`Renamed to ${newName}`);
      fmLoad(currentFmDir);
    }
  });
}

/* ==========================================================================
   MySQL Databases Module
   ========================================================================== */

async function loadDatabases() {
  try {
    const res = await fetch('/api/data/databases');
    const data = await res.json();
    const tbody = document.getElementById('dbTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const dbs = data.databases || [];

    if (dbs.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-database" style="font-size:2rem; margin-bottom:0.5rem; display:block; opacity:0.3;"></i>
          <strong style="display:block; margin-bottom:0.25rem;">No Databases Yet</strong>
          <span style="font-size:0.82rem;">Create your first MySQL database using the form below.</span>
        </td></tr>`;
      return;
    }

    dbs.forEach(db => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(db.name)}</strong></td>
        <td>${escapeHtml(db.size)}</td>
        <td><span class="code-font">${escapeHtml(db.user)}</span></td>
        <td>${escapeHtml(db.collation)}</td>
        <td>
          <button class="btn-sm btn-outline" onclick="openPhpMyAdmin()"><i class="fa-solid fa-table-cells"></i> Inspect</button>
          <button class="btn-sm btn-outline danger" onclick="deleteDatabase('${escapeHtml(db.name)}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Error loading DBs:', e);
  }
}

async function createDatabase() {
  const input = document.getElementById('newDbName');
  const rawName = input.value.trim().toLowerCase().replace(/[^a-z0-9_]/g, '');
  if (!rawName) {
    showToast('Please enter a valid database name', 'error');
    return;
  }
  const dbName = `cpanel_${rawName}`;

  try {
    await fetch('/api/data/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'create',
        item: {
          name: dbName,
          user: `cpanel_user_${rawName.slice(0, 5)}`,
          size: '0.00 MB',
          collation: 'utf8mb4_unicode_ci'
        }
      })
    });
    input.value = '';
    showToast(`Created database: ${dbName}`);
    loadDatabases();
  } catch (e) {
    showToast('Failed to create database', 'error');
  }
}

async function deleteDatabase(name) {
  if (!confirm(`Are you sure you want to delete database "${name}"? All tables and data will be permanently removed.`)) return;
  try {
    await fetch('/api/data/databases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'delete', name })
    });
    showToast(`Deleted database ${name}`);
    loadDatabases();
  } catch (e) {
    showToast('Failed to delete database', 'error');
  }
}

/* ==========================================================================
   phpMyAdmin Simulation & SQL Console
   ========================================================================== */

function openPhpMyAdmin() {
  openModal('phpmyadminModal');
}

function executeSqlQuery() {
  const sql = document.getElementById('sqlQueryInput').value.trim();
  const resWrap = document.getElementById('sqlResults');
  if (!sql) return;

  const upper = sql.toUpperCase().replace(/\s+/g, ' ');
  let resultHtml = '';

  if (upper.startsWith('SHOW DATABASES')) {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query OK — 0.0003 sec</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <strong>Databases</strong>
        <div style="margin-top:0.5rem; color:var(--accent-green);">information_schema<br>performance_schema<br>mysql<br><em style="color:var(--text-muted);">(No user databases yet — create one below)</em></div>
      </div>`;
  } else if (upper.startsWith('SHOW TABLES')) {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query OK — 0.0004 sec</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <strong>Tables</strong><br>
        <em style="color:var(--text-muted);">No tables found in this database.</em>
      </div>`;
  } else if (upper.startsWith('SELECT')) {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query OK — 0.0012 sec | 0 rows returned</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <code style="color:var(--accent-cp);">${escapeHtml(sql)}</code>
        <div style="margin-top:0.75rem; color:var(--text-muted);">Empty set (0 rows)</div>
      </div>`;
  } else if (upper.startsWith('INSERT') || upper.startsWith('UPDATE') || upper.startsWith('DELETE')) {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query OK — 1 row affected — 0.0008 sec</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <code style="color:var(--accent-cp);">${escapeHtml(sql)}</code>
        <div style="margin-top:0.75rem; color:var(--accent-green);">Query OK, 1 row affected.</div>
      </div>`;
  } else if (upper.startsWith('CREATE') || upper.startsWith('DROP') || upper.startsWith('ALTER')) {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query OK — 0.0021 sec</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <code style="color:var(--accent-cp);">${escapeHtml(sql)}</code>
        <div style="margin-top:0.75rem; color:var(--accent-green);">Query OK, 0 rows affected.</div>
      </div>`;
  } else {
    resultHtml = `
      <div class="query-success-msg"><i class="fa-solid fa-check"></i> Query executed — 0.0008 sec</div>
      <div style="padding:1rem; background:var(--bg-input); border-radius:6px; font-family:var(--font-mono); font-size:0.85rem;">
        <strong>Executed Statement:</strong><br>
        <code style="color:var(--accent-cp);">${escapeHtml(sql)}</code>
        <div style="margin-top:0.75rem; color:var(--accent-green);">Query OK.</div>
      </div>`;
  }

  resWrap.innerHTML = resultHtml;
}

/* ==========================================================================
   DNS Zone Editor Module
   ========================================================================== */

async function loadDnsRecords() {
  try {
    const res = await fetch('/api/data/dns_records');
    const data = await res.json();
    const tbody = document.getElementById('dnsTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const records = data.dns_records || [];

    if (records.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="5" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-globe" style="font-size:2rem; margin-bottom:0.5rem; display:block; opacity:0.3;"></i>
          <strong style="display:block; margin-bottom:0.25rem;">No DNS Records</strong>
          <span style="font-size:0.82rem;">Add A, CNAME, MX or TXT records using the form below.</span>
        </td></tr>`;
      return;
    }

    records.forEach(record => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(record.name)}</strong></td>
        <td>${record.ttl}</td>
        <td><span class="badge-success">${escapeHtml(record.type)}</span></td>
        <td class="code-font">${escapeHtml(record.record)}</td>
        <td>
          <button class="btn-sm btn-outline danger" onclick="deleteDnsRecord('${escapeHtml(record.name)}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Error loading DNS:', e);
  }
}

async function createDnsRecord() {
  const name = document.getElementById('dnsName').value.trim();
  const ttl = parseInt(document.getElementById('dnsTtl').value) || 14400;
  const type = document.getElementById('dnsType').value;
  const record = document.getElementById('dnsRecord').value.trim();

  if (!name || !record) {
    showToast('Name and Record values are required', 'error');
    return;
  }

  await fetch('/api/data/dns_records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      item: { name, ttl, type, record }
    })
  });

  document.getElementById('dnsName').value = '';
  document.getElementById('dnsRecord').value = '';
  showToast(`Added DNS ${type} record for ${name}`);
  loadDnsRecords();
}

async function deleteDnsRecord(name) {
  if (!confirm(`Delete DNS record for "${name}"?`)) return;
  await fetch('/api/data/dns_records', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', name })
  });
  showToast(`Deleted DNS record for ${name}`);
  loadDnsRecords();
}

/* ==========================================================================
   Email Accounts Module
   ========================================================================== */

async function loadEmails() {
  try {
    const res = await fetch('/api/data/email_accounts');
    const data = await res.json();
    const tbody = document.getElementById('emailTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const accounts = data.email_accounts || [];

    if (accounts.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="4" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-envelope" style="font-size:2rem; margin-bottom:0.5rem; display:block; opacity:0.3;"></i>
          <strong style="display:block; margin-bottom:0.25rem;">No Email Accounts</strong>
          <span style="font-size:0.82rem;">Create your first mailbox using the form below.</span>
        </td></tr>`;
      return;
    }

    accounts.forEach(acc => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td><strong>${escapeHtml(acc.email)}</strong></td>
        <td>${escapeHtml(acc.usage)} / ${escapeHtml(acc.quota)}</td>
        <td>${escapeHtml(acc.lastAccess)}</td>
        <td>
          <button class="btn-sm btn-outline" onclick="openModal('webmailModal')"><i class="fa-solid fa-inbox"></i> Webmail</button>
          <button class="btn-sm btn-outline danger" onclick="deleteEmailAccount('${escapeHtml(acc.email)}')"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Error loading Emails:', e);
  }
}

async function createEmailAccount() {
  const user = document.getElementById('emailUser').value.trim().toLowerCase();
  const pass = document.getElementById('emailPass').value;
  const quota = document.getElementById('emailQuota').value;

  if (!user || !pass) {
    showToast('Please specify a username and password', 'error');
    return;
  }

  // Use the domain suffix element for the current primary domain
  const domainSuffix = document.getElementById('emailDomainSuffix')?.innerText?.replace('@','') || 'localhost';
  const fullEmail = `${user}@${domainSuffix}`;

  await fetch('/api/data/email_accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      item: {
        email: fullEmail,
        usage: '0 MB',
        quota: quota,
        lastAccess: 'Never'
      }
    })
  });

  document.getElementById('emailUser').value = '';
  document.getElementById('emailPass').value = '';
  showToast(`Created email account: ${fullEmail}`);
  loadEmails();
}

async function deleteEmailAccount(email) {
  if (!confirm(`Delete mailbox for ${email}? All emails will be permanently removed.`)) return;
  await fetch('/api/data/email_accounts', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', email })
  });
  showToast(`Deleted ${email}`);
  loadEmails();
}

/* ==========================================================================
   Cron Jobs Module
   ========================================================================== */

async function loadCronJobs() {
  try {
    const res = await fetch('/api/data/cron_jobs');
    const data = await res.json();
    const tbody = document.getElementById('cronTableBody');
    if (!tbody) return;

    tbody.innerHTML = '';
    const jobs = data.cron_jobs || [];

    if (jobs.length === 0) {
      tbody.innerHTML = `
        <tr><td colspan="4" style="text-align:center; padding: 2.5rem 1rem; color: var(--text-muted);">
          <i class="fa-solid fa-clock" style="font-size:2rem; margin-bottom:0.5rem; display:block; opacity:0.3;"></i>
          <strong style="display:block; margin-bottom:0.25rem;">No Scheduled Jobs</strong>
          <span style="font-size:0.82rem;">Add cron expressions and commands using the form below.</span>
        </td></tr>`;
      return;
    }

    jobs.forEach(job => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td class="code-font highlight-text">${escapeHtml(job.schedule)}</td>
        <td class="code-font" style="max-width: 300px; word-break: break-all;">${escapeHtml(job.command)}</td>
        <td>${escapeHtml(job.description || 'Custom Scheduled Task')}</td>
        <td>
          <button class="btn-sm btn-outline danger" onclick="deleteCronJob(${job.id})"><i class="fa-solid fa-trash"></i></button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  } catch (e) {
    console.error('Error loading Cron Jobs:', e);
  }
}

function applyCronPreset() {
  const preset = document.getElementById('cronPreset').value;
  if (preset !== 'custom') {
    document.getElementById('cronSchedule').value = preset;
  }
}

async function createCronJob() {
  const schedule = document.getElementById('cronSchedule').value.trim();
  const command = document.getElementById('cronCmd').value.trim();

  if (!schedule || !command) {
    showToast('Schedule expression and command are required', 'error');
    return;
  }

  await fetch('/api/data/cron_jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'create',
      item: {
        id: Date.now(),
        schedule,
        command,
        description: 'User Scheduled Cron'
      }
    })
  });

  document.getElementById('cronCmd').value = '';
  showToast('Created cron job successfully');
  loadCronJobs();
}

async function deleteCronJob(id) {
  if (!confirm('Remove this scheduled cron job?')) return;
  await fetch('/api/data/cron_jobs', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'delete', id })
  });
  showToast('Removed cron job');
  loadCronJobs();
}

/* ==========================================================================
   Web Terminal Module
   ========================================================================== */

function initTerminal() {
  const input = document.getElementById('terminalInput');
  if (!input) return;

  input.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      const cmd = input.value.trim();
      input.value = '';
      if (!cmd) return;

      terminalHistory.push(cmd);
      terminalHistoryIndex = terminalHistory.length;

      appendTerminalLine(`cpanel_admin@server:~/public_html$ ${cmd}`);

      if (cmd.toLowerCase() === 'clear') {
        document.getElementById('terminalLog').innerHTML = '';
        return;
      }

      try {
        const res = await fetch('/api/terminal', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ command: cmd })
        });
        const data = await res.json();
        if (data.output) {
          appendTerminalLine(data.output, 'term-cmd-output');
        }
      } catch (err) {
        appendTerminalLine(`Error executing command: ${err.message}`, 'term-cmd-error');
      }

      scrollTerminalBottom();
    } else if (e.key === 'ArrowUp') {
      if (terminalHistoryIndex > 0) {
        terminalHistoryIndex--;
        input.value = terminalHistory[terminalHistoryIndex];
      }
      e.preventDefault();
    } else if (e.key === 'ArrowDown') {
      if (terminalHistoryIndex < terminalHistory.length - 1) {
        terminalHistoryIndex++;
        input.value = terminalHistory[terminalHistoryIndex];
      } else {
        terminalHistoryIndex = terminalHistory.length;
        input.value = '';
      }
      e.preventDefault();
    }
  });
}

function appendTerminalLine(text, customClass = '') {
  const log = document.getElementById('terminalLog');
  const line = document.createElement('div');
  line.className = `term-line ${customClass}`;
  line.innerText = text;
  log.appendChild(line);
}

function scrollTerminalBottom() {
  const screen = document.getElementById('terminalScreen');
  screen.scrollTop = screen.scrollHeight;
}

function focusTerminalInput() {
  setTimeout(() => {
    document.getElementById('terminalInput')?.focus();
  }, 100);
}

/* ==========================================================================
   Softaculous 1-Click Installer Simulation
   ========================================================================== */

let selectedAppInstall = null;
function selectAppToInstall(name, version, description) {
  selectedAppInstall = { name, version };
  const section = document.getElementById('appInstallSection');
  const title = document.getElementById('installAppNameTitle');
  section.style.display = 'block';
  title.innerHTML = `<i class="fa-solid fa-cog"></i> Install ${name} (v${version})`;
  section.scrollIntoView({ behavior: 'smooth' });
}

function executeAppInstall() {
  if (!selectedAppInstall) return;
  const btn = document.getElementById('btnRunInstall');
  const progressWrap = document.getElementById('installProgressWrap');
  const fill = document.getElementById('installProgressFill');
  const text = document.getElementById('installProgressText');

  btn.disabled = true;
  progressWrap.style.display = 'block';

  let progress = 10;
  fill.style.width = '10%';
  text.innerText = `Downloading package for ${selectedAppInstall.name}...`;

  const timer = setInterval(() => {
    progress += 25;
    if (progress === 35) {
      fill.style.width = '35%';
      text.innerText = 'Creating MySQL Database and setting user privileges...';
    } else if (progress === 60) {
      fill.style.width = '60%';
      text.innerText = 'Extracting core files into /public_html...';
    } else if (progress === 85) {
      fill.style.width = '85%';
      text.innerText = 'Running setup configuration scripts...';
    } else if (progress >= 100) {
      clearInterval(timer);
      fill.style.width = '100%';
      text.innerText = `Installation completed! ${selectedAppInstall.name} is now live at https://example.com`;
      btn.disabled = false;
      showToast(`Successfully installed ${selectedAppInstall.name}!`);

      // Create a marker file in File Manager
      fetch('/api/files/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          path: `${selectedAppInstall.name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_installed.txt`,
          isDirectory: false,
          content: `Installed ${selectedAppInstall.name} v${selectedAppInstall.version} on ${new Date().toISOString()}`
        })
      });
    }
  }, 700);
}

/* ==========================================================================
   AutoSSL & Backup Simulations
   ========================================================================== */

function runAutoSslSimulation() {
  const btn = document.getElementById('btnRunAutoSSL');
  btn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Checking DNS &amp; DCV...';
  btn.disabled = true;

  setTimeout(() => {
    btn.innerHTML = '<i class="fa-solid fa-check"></i> AutoSSL Complete!';
    showToast('AutoSSL has inspected all domains: 100% covered with Let\'s Encrypt certificates!');
    setTimeout(() => {
      btn.innerHTML = '<i class="fa-solid fa-rotate"></i> Run AutoSSL';
      btn.disabled = false;
    }, 2500);
  }, 2000);
}

function simulateBackupDownload(filename) {
  showToast(`Generating ${filename}... Download will begin shortly.`);
  setTimeout(() => {
    // Trigger dummy download
    const blob = new Blob(['cPanel Full Archive Dump\nVersion: 124.0.18\nDate: ' + new Date()], { type: 'application/gzip' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    showToast(`Downloaded ${filename} successfully!`);
    closeModal('backupModal');
  }, 1200);
}

/* ==========================================================================
   Utilities & Toast
   ========================================================================== */

function showToast(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type === 'error' ? 'toast-error' : ''}`;
  toast.innerHTML = `
    <i class="${type === 'error' ? 'fa-solid fa-circle-exclamation' : 'fa-solid fa-circle-check'}"></i>
    <span>${escapeHtml(message)}</span>
  `;

  container.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function getFileIcon(name, isDir) {
  if (isDir) return 'fa-solid fa-folder fm-icon-folder';
  const ext = getFileExtension(name).toLowerCase();
  switch (ext) {
    case 'html': case 'htm': return 'fa-brands fa-html5 fm-icon-html';
    case 'css': return 'fa-brands fa-css3-alt fm-icon-css';
    case 'js': case 'json': return 'fa-brands fa-js fm-icon-js';
    case 'php': return 'fa-brands fa-php fm-icon-php';
    case 'svg': case 'png': case 'jpg': case 'jpeg': return 'fa-solid fa-image fm-icon-file';
    default: return 'fa-solid fa-file-lines fm-icon-file';
  }
}

function getFileExtension(name) {
  const idx = name.lastIndexOf('.');
  return idx > 0 ? name.slice(idx + 1) : '';
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/* ==========================================================================
   AWS DevOps & Deployment Tracking Module
   ========================================================================== */

let allDeployments = [];

async function loadDeployments() {
  try {
    const res = await fetch('/api/deployments');
    const data = await res.json();
    allDeployments = data.deployments || [];
    renderDeployments(allDeployments);
  } catch (err) {
    console.error('Failed to load deployments:', err);
  }
}

function openDeploymentsModal() {
  openModal('deploymentsModal');
  loadDeployments();
}

function renderDeployments(list) {
  const tbody = document.getElementById('deploymentsTableBody');
  const countLabel = document.getElementById('statTotalDeploys');
  if (countLabel) countLabel.innerText = list.length;
  if (!tbody) return;

  if (list.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 2rem; color: var(--text-muted);">No deployment records found</td></tr>';
    return;
  }

  tbody.innerHTML = '';
  list.forEach(dep => {
    const tr = document.createElement('tr');

    let badgeClass = 'badge-status-success';
    let badgeText = dep.status;
    let badgeIcon = 'fa-solid fa-check';

    if (dep.status === 'ROLLED_BACK') {
      badgeClass = 'badge-status-rollback';
      badgeText = 'ROLLED BACK';
      badgeIcon = 'fa-solid fa-rotate-left';
    } else if (dep.status === 'IN_PROGRESS') {
      badgeClass = 'badge-status-inprogress';
      badgeText = 'IN PROGRESS';
      badgeIcon = 'fa-solid fa-spinner fa-spin';
    } else if (dep.status === 'FAILED') {
      badgeClass = 'badge-status-failed';
      badgeText = 'FAILED';
      badgeIcon = 'fa-solid fa-triangle-exclamation';
    }

    tr.innerHTML = `
      <td>
        <span class="code-font" style="font-weight: 700; color: var(--accent-cp);">${escapeHtml(dep.id)}</span>
      </td>
      <td>
        <strong>${escapeHtml(dep.domain)}</strong>
        <span style="display: block; font-size: 0.72rem; color: var(--text-muted);">${escapeHtml(dep.environment)}</span>
      </td>
      <td>
        <span style="font-size: 0.8rem; font-weight: 500; color: #ff9900;"><i class="fa-brands fa-aws"></i> ${escapeHtml(dep.target)}</span>
      </td>
      <td>
        <div style="font-size: 0.82rem; font-weight: 500; color: var(--text-primary);">${escapeHtml(dep.commitMsg)}</div>
        <div style="font-size: 0.72rem; color: var(--text-muted);" class="code-font">
          <i class="fa-solid fa-code-branch"></i> ${escapeHtml(dep.branch)} &bull; 
          <a href="https://github.com/jeshikoJ/cpannel/commit/${dep.commit}" target="_blank" style="color: var(--accent-blue); text-decoration: none;">${escapeHtml(dep.commit.slice(0, 7))}</a> by ${escapeHtml(dep.author)}
        </div>
      </td>
      <td>
        <span class="${badgeClass}"><i class="${badgeIcon}"></i> ${badgeText}</span>
      </td>
      <td>
        <div style="font-size: 0.8rem;">${escapeHtml(dep.timestamp)}</div>
        <span style="font-size: 0.72rem; color: var(--text-muted);">Duration: ${escapeHtml(dep.duration)}</span>
      </td>
      <td>
        <div style="display: flex; gap: 0.35rem;">
          <button class="btn-sm btn-outline" onclick="viewDeploymentLogs('${escapeHtml(dep.id)}')" title="View Build Logs"><i class="fa-solid fa-file-lines"></i> Logs</button>
          ${dep.status !== 'ROLLED_BACK' ? `<button class="btn-sm btn-outline danger" onclick="rollbackDeployment('${escapeHtml(dep.id)}')" title="Rollback this version"><i class="fa-solid fa-rotate-left"></i></button>` : ''}
        </div>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function filterDeployments() {
  const filter = document.getElementById('deployDomainFilter').value;
  if (filter === 'all') {
    renderDeployments(allDeployments);
  } else {
    renderDeployments(allDeployments.filter(d => d.domain === filter));
  }
}

function viewDeploymentLogs(depId) {
  const dep = allDeployments.find(d => d.id === depId);
  if (!dep) return;

  document.getElementById('deployLogsTitle').innerText = `${dep.id} (${dep.domain} - ${dep.target})`;
  const logContainer = document.getElementById('deployLogsOutput');

  const logLines = (dep.logs || [
    `[AWS-DevOps] Log stream recorded for ${dep.id}`,
    `[AWS-CodeBuild] Completed with status ${dep.status}`
  ]).map(line => {
    return `<div class="log-line"><span class="log-tag">${line.split(' ')[0]}</span> <span>${escapeHtml(line.slice(line.indexOf(' ') + 1))}</span></div>`;
  }).join('');

  logContainer.innerHTML = logLines;
  openModal('deployLogsModal');
}

async function submitNewDeployment() {
  const domain = document.getElementById('newDeployDomain').value;
  const branch = document.getElementById('newDeployBranch').value.trim() || 'main';
  const target = document.getElementById('newDeployTarget').value;
  const msg = document.getElementById('newDeployMsg').value.trim() || `Production deployment of ${branch}`;

  closeModal('triggerDeployModal');
  showToast(`Initiating AWS DevOps deployment for ${domain}...`);

  try {
    const res = await fetch('/api/deployments/trigger', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        domain,
        branch,
        target,
        commitMsg: msg,
        author: 'jeshikoJ',
        environment: domain.startsWith('staging') ? 'Staging' : 'Production'
      })
    });
    const data = await res.json();
    if (data.success) {
      allDeployments = data.deployments;
      renderDeployments(allDeployments);
      showToast(`Deployment ${data.deployment.id} to ${target} succeeded!`);
      viewDeploymentLogs(data.deployment.id);
    }
  } catch (err) {
    showToast('Failed to trigger deployment: ' + err.message, 'error');
  }
}

async function rollbackDeployment(depId) {
  if (!confirm(`Are you sure you want to rollback to deployment ${depId}? This will immediately point live AWS traffic back to that release.`)) return;

  showToast(`Executing rollback to ${depId}...`);
  try {
    const res = await fetch('/api/deployments/rollback', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: depId })
    });
    const data = await res.json();
    if (data.success) {
      allDeployments = data.deployments;
      renderDeployments(allDeployments);
      showToast(`Successfully rolled back to ${depId}!`);
    } else {
      showToast(data.error || 'Rollback failed', 'error');
    }
  } catch (err) {
    showToast('Rollback failed: ' + err.message, 'error');
  }
}

