export function renderAdminSupportDashboardHtml(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Kings Taxi — Super Admin Support Portal</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
  <style>
    :root {
      --primary-gold: #A36B31;
      --secondary-gold: #C28B47;
      --deep-chocolate: #502D0A;
      --dark-chocolate: #341D06;
      --champagne-gold: #EDD987;
      --ivory-white: #FFFCF3;
      --bg-surface: #FFFFFF;
      --bg-cream: #FAF6ED;
      --text-primary: #1F2937;
      --text-secondary: #6B7280;
      --text-muted: #9CA3AF;
      --border-color: #EBDCB9;
      --border-light: #F3EAD3;
      --success: #15803D;
      --warning: #B45309;
      --danger: #B91C1C;
      --info: #1D4ED8;
    }
    * {
      box-sizing: border-box;
      margin: 0;
      padding: 0;
      font-family: 'Plus Jakarta Sans', sans-serif;
    }
    body {
      background-color: var(--bg-cream);
      color: var(--text-primary);
      min-height: 100vh;
      display: flex;
      flex-direction: column;
    }
    header {
      background: linear-gradient(135deg, var(--deep-chocolate) 0%, var(--dark-chocolate) 100%);
      color: var(--champagne-gold);
      padding: 16px 32px;
      display: flex;
      justify-content: space-between;
      align-items: center;
      box-shadow: 0 4px 16px rgba(50, 45, 10, 0.2);
    }
    .header-branding {
      display: flex;
      align-items: center;
      gap: 14px;
    }
    .crown-logo {
      width: 40px;
      height: 40px;
      background: linear-gradient(135deg, var(--champagne-gold), var(--primary-gold));
      border-radius: 10px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 800;
      color: var(--deep-chocolate);
      font-size: 20px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.25);
    }
    .header-title {
      font-family: 'Playfair Display', serif;
      font-size: 22px;
      letter-spacing: 0.5px;
      color: #FFFFFF;
    }
    .header-subtitle {
      font-size: 12px;
      color: var(--champagne-gold);
      text-transform: uppercase;
      letter-spacing: 1.5px;
    }
    .header-actions {
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .btn {
      padding: 8px 16px;
      border-radius: 8px;
      font-size: 13px;
      font-weight: 600;
      cursor: pointer;
      border: none;
      transition: all 0.2s;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn-gold {
      background: linear-gradient(135deg, var(--secondary-gold), var(--primary-gold));
      color: #FFFFFF;
    }
    .btn-gold:hover {
      background: linear-gradient(135deg, var(--primary-gold), var(--deep-chocolate));
    }
    .btn-outline {
      background: transparent;
      border: 1px solid var(--champagne-gold);
      color: var(--champagne-gold);
    }
    .btn-outline:hover {
      background: rgba(237, 217, 135, 0.15);
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
      padding: 24px;
      flex: 1;
      width: 100%;
    }
    /* Stats banner */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
      gap: 16px;
      margin-bottom: 24px;
    }
    .stat-card {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px 20px;
      box-shadow: 0 2px 6px rgba(0,0,0,0.03);
      cursor: pointer;
      transition: transform 0.15s, border-color 0.15s;
    }
    .stat-card:hover {
      transform: translateY(-2px);
      border-color: var(--primary-gold);
    }
    .stat-label {
      font-size: 12px;
      color: var(--text-secondary);
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .stat-value {
      font-size: 28px;
      font-weight: 800;
      color: var(--deep-chocolate);
      margin-top: 4px;
    }
    /* Filters and toolbar */
    .toolbar {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 16px 20px;
      display: flex;
      flex-wrap: wrap;
      gap: 14px;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 20px;
    }
    .filter-group {
      display: flex;
      flex-wrap: wrap;
      gap: 10px;
      align-items: center;
    }
    .search-input {
      padding: 8px 14px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 13px;
      min-width: 260px;
      outline: none;
    }
    .search-input:focus {
      border-color: var(--primary-gold);
      box-shadow: 0 0 0 2px rgba(163, 107, 49, 0.2);
    }
    select.filter-select {
      padding: 8px 12px;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      font-size: 13px;
      background-color: #FFFFFF;
      outline: none;
      color: var(--text-primary);
    }
    /* Table layout */
    .table-container {
      background: var(--bg-surface);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      overflow: hidden;
      box-shadow: 0 2px 8px rgba(0,0,0,0.03);
    }
    table {
      width: 100%;
      border-collapse: collapse;
      text-align: left;
    }
    thead {
      background: var(--ivory-white);
      border-bottom: 2px solid var(--border-color);
    }
    th {
      padding: 14px 18px;
      font-size: 12px;
      font-weight: 700;
      color: var(--deep-chocolate);
      text-transform: uppercase;
      letter-spacing: 0.6px;
    }
    td {
      padding: 14px 18px;
      font-size: 13px;
      border-bottom: 1px solid var(--border-light);
      vertical-align: middle;
    }
    tbody tr:hover {
      background-color: #FDF9F0;
    }
    .badge {
      display: inline-block;
      padding: 4px 8px;
      border-radius: 6px;
      font-size: 11px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.4px;
    }
    .badge-OPEN { background-color: #DBEAFE; color: #1E40AF; }
    .badge-IN_PROGRESS { background-color: #FEF3C7; color: #92400E; }
    .badge-WAITING_FOR_PASSENGER { background-color: #FFEDD5; color: #9A3412; }
    .badge-RESOLVED { background-color: #DCFCE7; color: #166534; }
    .badge-CLOSED { background-color: #F3F4F6; color: #4B5563; }

    .badge-URGENT { background-color: #FEE2E2; color: #991B1B; font-weight: 800; }
    .badge-HIGH { background-color: #FFEDD5; color: #C2410C; }
    .badge-MEDIUM { background-color: #FEF3C7; color: #B45309; }
    .badge-LOW { background-color: #F3F4F6; color: #6B7280; }

    /* Modal / Drawer for Conversation Details */
    .drawer-overlay {
      position: fixed;
      inset: 0;
      background: rgba(50, 45, 10, 0.4);
      backdrop-filter: blur(3px);
      display: none;
      justify-content: flex-end;
      z-index: 1000;
    }
    .drawer {
      background: #FFFFFF;
      width: 100%;
      max-width: 680px;
      height: 100%;
      box-shadow: -4px 0 24px rgba(0,0,0,0.15);
      display: flex;
      flex-direction: column;
      animation: slideIn 0.25s ease-out;
    }
    @keyframes slideIn {
      from { transform: translateX(100%); }
      to { transform: translateX(0); }
    }
    .drawer-header {
      background: var(--ivory-white);
      border-bottom: 1px solid var(--border-color);
      padding: 20px 24px;
      display: flex;
      justify-content: space-between;
      align-items: flex-start;
    }
    .drawer-close {
      background: transparent;
      border: none;
      font-size: 24px;
      cursor: pointer;
      color: var(--text-secondary);
    }
    .drawer-body {
      flex: 1;
      overflow-y: auto;
      padding: 24px;
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .ticket-meta-box {
      background: var(--bg-cream);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 14px;
      font-size: 13px;
      display: grid;
      grid-template-columns: repeat(2, 1fr);
      gap: 10px;
    }
    .message-thread {
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-top: 10px;
    }
    .msg-bubble {
      max-width: 85%;
      padding: 12px 16px;
      border-radius: 12px;
      font-size: 13px;
      line-height: 1.5;
      position: relative;
    }
    .msg-passenger {
      align-self: flex-start;
      background: #F3F4F6;
      border: 1px solid #E5E7EB;
      color: var(--text-primary);
      border-bottom-left-radius: 2px;
    }
    .msg-admin {
      align-self: flex-end;
      background: linear-gradient(135deg, #FAF4E5, #F5E8C8);
      border: 1px solid var(--border-color);
      color: var(--dark-chocolate);
      border-bottom-right-radius: 2px;
    }
    .msg-header {
      display: flex;
      justify-content: space-between;
      font-size: 11px;
      font-weight: 700;
      margin-bottom: 4px;
      color: var(--primary-gold);
    }
    .msg-passenger .msg-header {
      color: #4B5563;
    }
    .drawer-footer {
      border-top: 1px solid var(--border-color);
      padding: 16px 24px;
      background: var(--ivory-white);
      display: flex;
      flex-direction: column;
      gap: 12px;
    }
    .reply-textarea {
      width: 100%;
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 10px 12px;
      font-size: 13px;
      min-height: 80px;
      resize: vertical;
      outline: none;
    }
    .reply-textarea:focus {
      border-color: var(--primary-gold);
    }
    .status-actions-bar {
      display: flex;
      gap: 10px;
      align-items: center;
      justify-content: space-between;
    }
    /* Token auth banner modal */
    #authBanner {
      display: none;
      background: #FEF2F2;
      border: 1px solid #FCA5A5;
      padding: 12px 20px;
      margin-bottom: 20px;
      border-radius: 8px;
      color: #991B1B;
      font-size: 13px;
      display: flex;
      align-items: center;
      justify-content: space-between;
    }
    .empty-state {
      padding: 60px 20px;
      text-align: center;
      color: var(--text-secondary);
    }
    .pulse-dot {
      width: 8px;
      height: 8px;
      border-radius: 50%;
      background: #10B981;
      display: inline-block;
      margin-right: 6px;
      animation: pulse 1.5s infinite;
    }
    @keyframes pulse {
      0% { opacity: 0.4; }
      50% { opacity: 1; }
      100% { opacity: 0.4; }
    }
  </style>
</head>
<body>
  <header>
    <div class="header-branding">
      <div class="crown-logo">KT</div>
      <div>
        <div class="header-title">Kings Taxi Support Center</div>
        <div class="header-subtitle">Super Admin Ticket Management & Dispatch</div>
      </div>
    </div>
    <div class="header-actions">
      <button class="btn btn-outline" onclick="promptTokenModal()">
        🔑 Set Admin Token
      </button>
      <button class="btn btn-gold" onclick="loadDashboardData()">
        🔄 Refresh
      </button>
    </div>
  </header>

  <div class="container">
    <div id="authBanner" style="display: none;">
      <div>
        <strong>Authentication Notice:</strong> An authorized Super Admin Bearer token is required to reply or update tickets.
      </div>
      <button class="btn btn-outline" style="border-color:#991B1B; color:#991B1B;" onclick="promptTokenModal()">
        Set Token
      </button>
    </div>

    <!-- Stats Banner -->
    <div class="stats-grid">
      <div class="stat-card" onclick="setFilterStatus('')">
        <div class="stat-label">Total Tickets</div>
        <div class="stat-value" id="statTotal">-</div>
      </div>
      <div class="stat-card" onclick="setFilterStatus('OPEN')">
        <div class="stat-label">Open</div>
        <div class="stat-value" id="statOpen" style="color: #1D4ED8;">-</div>
      </div>
      <div class="stat-card" onclick="setFilterStatus('IN_PROGRESS')">
        <div class="stat-label">In Progress</div>
        <div class="stat-value" id="statInProgress" style="color: #B45309;">-</div>
      </div>
      <div class="stat-card" onclick="setFilterStatus('WAITING_FOR_PASSENGER')">
        <div class="stat-label">Waiting for Passenger</div>
        <div class="stat-value" id="statWaiting" style="color: #EA580C;">-</div>
      </div>
      <div class="stat-card" onclick="setFilterStatus('RESOLVED')">
        <div class="stat-label">Resolved</div>
        <div class="stat-value" id="statResolved" style="color: #15803D;">-</div>
      </div>
      <div class="stat-card">
        <div class="stat-label">Unread Passenger Msgs</div>
        <div class="stat-value" id="statUnread" style="color: #991B1B;">-</div>
      </div>
    </div>

    <!-- Toolbar Filters -->
    <div class="toolbar">
      <div class="filter-group">
        <input type="text" id="searchInput" class="search-input" placeholder="Search ticket #, subject, passenger..." oninput="debounceSearch()">
        <select id="statusFilter" class="filter-select" onchange="loadDashboardData()">
          <option value="">All Statuses</option>
          <option value="OPEN">Open</option>
          <option value="IN_PROGRESS">In Progress</option>
          <option value="WAITING_FOR_PASSENGER">Waiting for Passenger</option>
          <option value="RESOLVED">Resolved</option>
          <option value="CLOSED">Closed</option>
        </select>
        <select id="categoryFilter" class="filter-select" onchange="loadDashboardData()">
          <option value="">All Categories</option>
          <option value="RIDE_ISSUE">Ride Issue</option>
          <option value="BOOKING_ISSUE">Booking Issue</option>
          <option value="PAYMENT_ISSUE">Payment Issue</option>
          <option value="ACCOUNT_ISSUE">Account Issue</option>
          <option value="DRIVER_BEHAVIOR">Driver Behavior</option>
          <option value="SAFETY_CONCERN">Safety Concern</option>
          <option value="APP_TECHNICAL_ISSUE">App Technical Issue</option>
          <option value="OTHER">Other</option>
        </select>
      </div>
      <div>
        <span class="pulse-dot"></span>
        <span style="font-size: 12px; color: var(--text-secondary);">Auto-sync: Active (30s)</span>
      </div>
    </div>

    <!-- Tickets Table -->
    <div class="table-container">
      <table>
        <thead>
          <tr>
            <th>Ticket #</th>
            <th>Passenger</th>
            <th>Category</th>
            <th>Subject</th>
            <th>Priority</th>
            <th>Status</th>
            <th>Last Update</th>
            <th style="text-align: right;">Action</th>
          </tr>
        </thead>
        <tbody id="ticketsTableBody">
          <tr>
            <td colspan="8" class="empty-state">Loading tickets from database...</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>

  <!-- Detail & Conversation Drawer -->
  <div id="drawerOverlay" class="drawer-overlay" onclick="closeDrawer(event)">
    <div class="drawer" onclick="event.stopPropagation()">
      <div class="drawer-header">
        <div>
          <div style="display: flex; align-items: center; gap: 8px;">
            <h2 id="drawerTicketNumber" style="font-size: 18px; color: var(--deep-chocolate); font-family: 'Playfair Display', serif;">-</h2>
            <span id="drawerStatusBadge" class="badge badge-OPEN">OPEN</span>
            <span id="drawerPriorityBadge" class="badge badge-MEDIUM">MEDIUM</span>
          </div>
          <div id="drawerSubject" style="font-size: 14px; font-weight: 600; color: var(--text-primary); margin-top: 4px;">-</div>
        </div>
        <button class="drawer-close" onclick="closeDrawer()">&times;</button>
      </div>

      <div class="drawer-body">
        <div class="ticket-meta-box">
          <div><strong>Passenger:</strong> <span id="drawerPassengerName">-</span></div>
          <div><strong>Phone:</strong> <span id="drawerPassengerPhone">-</span></div>
          <div><strong>Category:</strong> <span id="drawerCategory">-</span></div>
          <div><strong>Created:</strong> <span id="drawerCreatedAt">-</span></div>
          <div><strong>Assigned Admin:</strong> <span id="drawerAdminName">Unassigned</span></div>
          <div><strong>Booking Ref:</strong> <span id="drawerBookingRef">N/A</span></div>
        </div>

        <h4 style="font-size: 13px; text-transform: uppercase; letter-spacing: 0.5px; color: var(--deep-chocolate);">
          Conversation History
        </h4>
        <div id="drawerMessageThread" class="message-thread">
          <!-- Chat bubbles injected here -->
        </div>
      </div>

      <div class="drawer-footer">
        <div class="status-actions-bar">
          <div style="display: flex; align-items: center; gap: 8px;">
            <label style="font-size: 12px; font-weight: 600;">Status:</label>
            <select id="updateStatusSelect" class="filter-select">
              <option value="OPEN">Open</option>
              <option value="IN_PROGRESS">In Progress</option>
              <option value="WAITING_FOR_PASSENGER">Waiting for Passenger</option>
              <option value="RESOLVED">Resolved</option>
              <option value="CLOSED">Closed</option>
            </select>
            <button class="btn btn-outline" style="padding: 6px 12px;" onclick="submitStatusUpdate()">Update</button>
          </div>
          <div id="actionStatusMsg" style="font-size: 12px; color: var(--success);"></div>
        </div>

        <textarea id="replyTextarea" class="reply-textarea" placeholder="Type your response to the passenger..."></textarea>
        <div style="display: flex; justify-content: flex-end; gap: 8px;">
          <button class="btn btn-gold" onclick="submitReply()">
            ✉️ Send Reply to Passenger
          </button>
        </div>
      </div>
    </div>
  </div>

  <script>
    let activeTicketId = null;
    let searchTimeout = null;

    function getAdminToken() {
      return localStorage.getItem('KT_ADMIN_TOKEN') || '';
    }

    function promptTokenModal() {
      const current = getAdminToken();
      const token = prompt('Enter Super Admin Bearer JWT Token:', current);
      if (token !== null) {
        localStorage.setItem('KT_ADMIN_TOKEN', token.trim());
        loadDashboardData();
      }
    }

    function getAuthHeaders() {
      const token = getAdminToken();
      const headers = { 'Content-Type': 'application/json' };
      if (token) {
        headers['Authorization'] = 'Bearer ' + token;
      }
      return headers;
    }

    function debounceSearch() {
      clearTimeout(searchTimeout);
      searchTimeout = setTimeout(() => {
        loadDashboardData();
      }, 300);
    }

    function setFilterStatus(st) {
      document.getElementById('statusFilter').value = st;
      loadDashboardData();
    }

    async function loadDashboardData() {
      const status = document.getElementById('statusFilter').value;
      const category = document.getElementById('categoryFilter').value;
      const search = document.getElementById('searchInput').value;

      try {
        // Fetch stats
        const statsRes = await fetch('/api/v1/support/admin/overview', {
          headers: getAuthHeaders()
        });
        if (statsRes.status === 401 || statsRes.status === 403) {
          document.getElementById('authBanner').style.display = 'flex';
        } else if (statsRes.ok) {
          document.getElementById('authBanner').style.display = 'none';
          const statsJson = await statsRes.json();
          const d = statsJson.data || {};
          document.getElementById('statTotal').innerText = d.total ?? 0;
          document.getElementById('statOpen').innerText = d.open ?? 0;
          document.getElementById('statInProgress').innerText = d.inProgress ?? 0;
          document.getElementById('statWaiting').innerText = d.waitingForPassenger ?? 0;
          document.getElementById('statResolved').innerText = d.resolved ?? 0;
          document.getElementById('statUnread').innerText = d.unreadPassengerMessages ?? 0;
        }

        // Fetch tickets
        const params = new URLSearchParams();
        if (status) params.append('status', status);
        if (category) params.append('category', category);
        if (search) params.append('search', search);

        const ticketsRes = await fetch('/api/v1/support/admin/tickets?' + params.toString(), {
          headers: getAuthHeaders()
        });

        if (ticketsRes.ok) {
          const ticketsJson = await ticketsRes.json();
          renderTicketsTable(ticketsJson.data?.items || []);
        } else {
          document.getElementById('ticketsTableBody').innerHTML = '<tr><td colspan="8" class="empty-state">Unable to load tickets. Please check admin token credentials.</td></tr>';
        }
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      }
    }

    function renderTicketsTable(items) {
      const tbody = document.getElementById('ticketsTableBody');
      if (!items || items.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" class="empty-state">No support tickets match the selected filters.</td></tr>';
        return;
      }

      tbody.innerHTML = items.map(t => {
        const timeAgo = formatTimeAgo(new Date(t.lastMessageAt || t.createdAt));
        const passengerName = t.passenger?.fullName || 'Anonymous Passenger';
        const phone = t.passenger?.phoneNumber || 'No phone';
        return \`
          <tr>
            <td>
              <strong style="color: var(--primary-gold); font-family: monospace;">\${t.ticketNumber}</strong>
              \${t.unreadCount > 0 ? \`<span class="badge" style="background:#FEE2E2; color:#991B1B; margin-left:4px;">\${t.unreadCount} NEW</span>\` : ''}
            </td>
            <td>
              <div style="font-weight: 600;">\${passengerName}</div>
              <div style="font-size: 11px; color: var(--text-secondary);">\${phone}</div>
            </td>
            <td><span style="font-size: 12px; font-weight: 500;">\${formatCategory(t.category)}</span></td>
            <td>
              <div style="max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; font-weight: 600;">
                \${t.subject}
              </div>
              <div style="font-size: 11px; color: var(--text-muted); max-width: 280px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                \${t.latestMessage || ''}
              </div>
            </td>
            <td><span class="badge badge-\${t.priority}">\${t.priority}</span></td>
            <td><span class="badge badge-\${t.status}">\${formatStatus(t.status)}</span></td>
            <td style="color: var(--text-secondary); font-size: 12px;">\${timeAgo}</td>
            <td style="text-align: right;">
              <button class="btn btn-gold" style="padding: 6px 12px;" onclick="openTicketDetail('\${t.id}')">
                Review
              </button>
            </td>
          </tr>
        \`;
      }).join('');
    }

    async function openTicketDetail(ticketId) {
      activeTicketId = ticketId;
      document.getElementById('drawerOverlay').style.display = 'flex';
      document.getElementById('drawerMessageThread').innerHTML = '<div style="text-align:center; padding:20px; color:var(--text-secondary);">Loading conversation...</div>';

      try {
        const res = await fetch('/api/v1/support/admin/tickets/' + ticketId, {
          headers: getAuthHeaders()
        });
        if (res.ok) {
          const json = await res.json();
          const t = json.data;
          document.getElementById('drawerTicketNumber').innerText = t.ticketNumber;
          document.getElementById('drawerSubject').innerText = t.subject;
          document.getElementById('drawerCategory').innerText = formatCategory(t.category);
          document.getElementById('drawerPassengerName').innerText = t.passenger?.fullName || 'Passenger';
          document.getElementById('drawerPassengerPhone').innerText = t.passenger?.phoneNumber || 'N/A';
          document.getElementById('drawerCreatedAt').innerText = new Date(t.createdAt).toLocaleString();
          document.getElementById('drawerAdminName').innerText = t.assignedAdminName || 'Unassigned';
          document.getElementById('drawerBookingRef').innerText = t.bookingId ? t.bookingId.slice(0, 8) + '...' : 'N/A';

          const statusBadge = document.getElementById('drawerStatusBadge');
          statusBadge.className = 'badge badge-' + t.status;
          statusBadge.innerText = formatStatus(t.status);
          document.getElementById('updateStatusSelect').value = t.status;

          const priBadge = document.getElementById('drawerPriorityBadge');
          priBadge.className = 'badge badge-' + t.priority;
          priBadge.innerText = t.priority;

          renderThread(t.messages || []);
        }
      } catch (err) {
        console.error('Error fetching ticket detail:', err);
      }
    }

    function renderThread(messages) {
      const container = document.getElementById('drawerMessageThread');
      if (!messages || messages.length === 0) {
        container.innerHTML = '<div style="color: var(--text-muted); font-size: 13px;">No messages in this thread.</div>';
        return;
      }

      container.innerHTML = messages.map(m => {
        const isAdmin = m.senderType === 'ADMIN';
        const sender = isAdmin ? (m.senderName || 'Super Admin') : (m.senderName || 'Passenger');
        const time = new Date(m.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        return \`
          <div class="msg-bubble \${isAdmin ? 'msg-admin' : 'msg-passenger'}">
            <div class="msg-header">
              <span>\${sender}</span>
              <span>\${time}</span>
            </div>
            <div>\${escapeHtml(m.message)}</div>
          </div>
        \`;
      }).join('');

      const body = document.querySelector('.drawer-body');
      body.scrollTop = body.scrollHeight;
    }

    async function submitReply() {
      if (!activeTicketId) return;
      const text = document.getElementById('replyTextarea').value.trim();
      if (!text) return;

      try {
        const res = await fetch('/api/v1/support/admin/tickets/' + activeTicketId + '/messages', {
          method: 'POST',
          headers: getAuthHeaders(),
          body: JSON.stringify({ message: text })
        });
        if (res.ok) {
          document.getElementById('replyTextarea').value = '';
          openTicketDetail(activeTicketId);
          loadDashboardData();
        } else {
          alert('Failed to send reply. Please verify admin authorization.');
        }
      } catch (err) {
        console.error('Reply submission error:', err);
      }
    }

    async function submitStatusUpdate() {
      if (!activeTicketId) return;
      const newStatus = document.getElementById('updateStatusSelect').value;

      try {
        const res = await fetch('/api/v1/support/admin/tickets/' + activeTicketId + '/status', {
          method: 'PATCH',
          headers: getAuthHeaders(),
          body: JSON.stringify({ status: newStatus })
        });
        if (res.ok) {
          document.getElementById('actionStatusMsg').innerText = 'Status updated!';
          setTimeout(() => { document.getElementById('actionStatusMsg').innerText = ''; }, 3000);
          openTicketDetail(activeTicketId);
          loadDashboardData();
        } else {
          alert('Failed to update status.');
        }
      } catch (err) {
        console.error('Status update error:', err);
      }
    }

    function closeDrawer() {
      document.getElementById('drawerOverlay').style.display = 'none';
      activeTicketId = null;
    }

    function formatCategory(c) {
      if (!c) return '';
      return c.replace(/_/g, ' ').toLowerCase().replace(/\\b\\w/g, l => l.toUpperCase());
    }

    function formatStatus(s) {
      if (!s) return '';
      return s.replace(/_/g, ' ');
    }

    function formatTimeAgo(date) {
      const seconds = Math.floor((new Date() - date) / 1000);
      if (seconds < 60) return 'just now';
      const minutes = Math.floor(seconds / 60);
      if (minutes < 60) return minutes + 'm ago';
      const hours = Math.floor(minutes / 60);
      if (hours < 24) return hours + 'h ago';
      const days = Math.floor(hours / 24);
      return days + 'd ago';
    }

    function escapeHtml(str) {
      return str.replace(/[&<>'"]/g, tag => ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        "'": '&#39;',
        '"': '&quot;'
      }[tag] || tag));
    }

    // Initialize
    loadDashboardData();
    setInterval(loadDashboardData, 30000);
  </script>
</body>
</html>`;
}

