function authorizeApp() {
  // Force full WRITE permissions for Google Drive
  var folder = DriveApp.getRootFolder();
  var dummy = folder.createFile("dummy_auth.txt", "test", MimeType.PLAIN_TEXT);
  dummy.setTrashed(true); // delete it immediately
  SpreadsheetApp.getActiveSpreadsheet();
  return "Otorisasi penuh ke Google Drive berhasil!";
}

function doGet(e) {
  return handleRequest(e, 'GET');
}

function doPost(e) {
  return handleRequest(e, 'POST');
}

function handleRequest(e, method) {
  // Setup CORS headers
  var output = ContentService.createTextOutput();
  output.setMimeType(ContentService.MimeType.JSON);

  try {
    var params;
    if (method === 'POST') {
      if (e.parameter && e.parameter.data) {
        params = JSON.parse(e.parameter.data);
      } else {
        params = JSON.parse(e.postData.contents);
      }
    } else {
      params = e.parameter;
    }
    var action = params.action;
    var sheetId = params.sheetId;

    if (!sheetId) {
      return responseError('Spreadsheet ID is missing.');
    }

    var ss;
    try {
      ss = SpreadsheetApp.openById(sheetId);
    } catch (err) {
      return responseError('Invalid Spreadsheet ID or no permission to access.');
    }

    var result = null;

    switch (action) {
      case 'setup':
        result = setupDatabase(ss);
        break;
      case 'login':
        result = loginUser(ss, params.username, params.passwordHash);
        break;
      case 'getUsers':
        result = getUsers(ss);
        break;
      case 'saveUser':
        result = saveUser(ss, params.user);
        break;
      case 'deleteUser':
        result = deleteUser(ss, params.userId);
        break;
      case 'getTickets':
        result = getTickets(ss);
        break;
      case 'saveTicket':
        result = saveTicket(ss, params.ticket, params.user);
        break;
      case 'uploadFile':
        var folderId = params.folderId;
        if (!folderId) return responseError('Folder ID is missing.');
        result = uploadFile(folderId, params.base64, params.filename, params.mimeType, params.ticketId);
        break;
      case 'getSettings':
        result = getSettings(ss);
        break;
      case 'saveSettings':
        result = saveSettings(ss, params.settings);
        break;
      default:
        return responseError('Unknown action: ' + action);
    }

    return responseSuccess(result);
  } catch (error) {
    return responseError(error.toString());
  }
}

function responseSuccess(data) {
  return ContentService.createTextOutput(JSON.stringify({
    success: true,
    data: data
  })).setMimeType(ContentService.MimeType.JSON);
}

function responseError(message) {
  return ContentService.createTextOutput(JSON.stringify({
    success: false,
    message: message
  })).setMimeType(ContentService.MimeType.JSON);
}

// ----------------------------------------------------
// DATABASE SETUP
// ----------------------------------------------------
function setupDatabase(ss) {
  var sheets = [
    { name: 'Users', headers: ['User ID', 'Nama', 'Username', 'Password', 'Role', 'Status', 'Created At', 'Last Login'] },
    { name: 'Tickets', headers: ['Ticket ID', 'Tanggal Masuk', 'Reporter', 'Aplikasi', 'Priority', 'Masalah', 'Detail', 'Lampiran', 'Status', 'Assignee', 'Deadline', 'Last Update', 'Feedback', 'Kategori'] },
    { name: 'Timeline', headers: ['Timeline ID', 'Ticket ID', 'Tanggal', 'Aktivitas', 'Oleh', 'Keterangan'] }
  ];

  sheets.forEach(function (s) {
    var sheet = ss.getSheetByName(s.name);
    if (!sheet) {
      sheet = ss.insertSheet(s.name);
      sheet.appendRow(s.headers);
      sheet.getRange(1, 1, 1, s.headers.length).setFontWeight("bold").setBackground("#f3f4f6");
      sheet.setFrozenRows(1);
      
      if (s.name === 'Users') {
        // Create default admin if newly created
        // password is 'admin123' hashed with SHA256 -> '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9'
        var defaultAdmin = [
          'U-' + Date.now(),
          'System Admin',
          'admin',
          '240be518fabd2724ddb6f04eeb1da5967448d7e831c08c8fa822809f74c720a9',
          'Admin',
          'Active',
          new Date().toISOString(),
          ''
        ];
        sheet.appendRow(defaultAdmin);
      }
    }
  });

  return { message: 'Database setup complete.' };
}

// ----------------------------------------------------
// USERS
// ----------------------------------------------------
function loginUser(ss, username, passwordHash) {
  var sheet = ss.getSheetByName('Users');
  if(!sheet) throw new Error("Database belum disetup.");
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][2] === username && data[i][3] === passwordHash) {
      if (data[i][5] !== 'Active') {
        throw new Error('Akun Anda tidak aktif.');
      }
      
      // Update last login
      sheet.getRange(i + 1, 8).setValue(new Date().toISOString());
      
      return {
        id: data[i][0],
        name: data[i][1],
        username: data[i][2],
        role: data[i][4],
        status: data[i][5]
      };
    }
  }
  throw new Error('Username atau password salah.');
}

function getUsers(ss) {
  var sheet = ss.getSheetByName('Users');
  if(!sheet) return [];
  var data = sheet.getDataRange().getValues();
  var users = [];
  for (var i = 1; i < data.length; i++) {
    users.push({
      id: data[i][0],
      name: data[i][1],
      username: data[i][2],
      role: data[i][4],
      status: data[i][5],
      createdAt: data[i][6],
      lastLogin: data[i][7]
    });
  }
  return users;
}

function saveUser(ss, user) {
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;

  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === user.id) {
      rowIndex = i + 1;
      break;
    }
  }

  // Check unique username if changing/new
  for (var j = 1; j < data.length; j++) {
    if (data[j][2] === user.username && (rowIndex === -1 || rowIndex !== j + 1)) {
      throw new Error('Username sudah digunakan.');
    }
  }

  if (rowIndex > -1) {
    // BATCH UPDATE user row
    var newRow = [
      data[rowIndex - 1][0], // User ID
      user.name,
      user.username,
      user.password ? user.password : data[rowIndex - 1][3],
      user.role,
      user.status,
      data[rowIndex - 1][6], // Created At
      data[rowIndex - 1][7]  // Last Login
    ];
    sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
  } else {
    // Insert
    user.id = 'U-' + Date.now();
    sheet.appendRow([
      user.id,
      user.name,
      user.username,
      user.password, // hashed
      user.role,
      user.status || 'Active',
      new Date().toISOString(),
      ''
    ]);
  }
  return user;
}

function deleteUser(ss, userId) {
  var sheet = ss.getSheetByName('Users');
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === userId) {
      sheet.deleteRow(i + 1);
      return { id: userId };
    }
  }
  throw new Error('User tidak ditemukan.');
}

// ----------------------------------------------------
// TICKETS
// ----------------------------------------------------
function getTickets(ss) {
  var cache = CacheService.getScriptCache();
  var cacheKey = 'tickets_' + ss.getId();
  var cached = cache.get(cacheKey);
  if (cached) {
    try { return JSON.parse(cached); } catch(e) {}
  }

  var sheetT = ss.getSheetByName('Tickets');
  var sheetTl = ss.getSheetByName('Timeline');
  if(!sheetT) return [];

  var tData = sheetT.getDataRange().getValues();
  var tlData = sheetTl ? sheetTl.getDataRange().getValues() : [];

  var tickets = [];
  var timelines = {};

  // Parse timelines
  for (var j = 1; j < tlData.length; j++) {
    var tId = tlData[j][1];
    if (!timelines[tId]) timelines[tId] = [];
    timelines[tId].push({
      id: tlData[j][0],
      ticketId: tId,
      date: tlData[j][2],
      activity: tlData[j][3],
      by: tlData[j][4],
      notes: tlData[j][5]
    });
  }

  // Parse tickets
  for (var i = 1; i < tData.length; i++) {
    var tid = tData[i][0];
    if(!tid) continue;
    tickets.push({
      id: tid,
      date: tData[i][1],
      reporter: tData[i][2],
      app: tData[i][3],
      priority: tData[i][4],
      problem: tData[i][5],
      detail: tData[i][6],
      attachment: tData[i][7],
      status: tData[i][8],
      assignee: tData[i][9],
      deadline: tData[i][10],
      lastUpdate: tData[i][11],
      feedback: tData[i][12] || '',
      category: tData[i][13] || 'Bug',
      timeline: timelines[tid] || []
    });
  }

  // sort timeline descending
  tickets.forEach(function(t) { t.timeline.sort(function(a,b) { return new Date(b.date) - new Date(a.date); }); });

  // Cache for 2 minutes (max 100KB per entry)
  try { cache.put(cacheKey, JSON.stringify(tickets), 120); } catch(e) {}

  return tickets;
}

function saveTicket(ss, ticket, user) {
  var sheet = ss.getSheetByName('Tickets');
  var data = sheet.getDataRange().getValues();
  var rowIndex = -1;
  var isNew = false;
  var oldTicket = null;

  if (ticket.id) {
    for (var i = 1; i < data.length; i++) {
      if (data[i][0] === ticket.id) {
        rowIndex = i + 1;
        oldTicket = {
          status: data[i][8],
          assignee: data[i][9],
          deadline: data[i][10]
        };
        break;
      }
    }
  }

  var now = new Date().toISOString();

  if (rowIndex > -1) {
    // --- BATCH UPDATE: build a full row and write at once ---
    var existingRow = data[rowIndex - 1]; // rowIndex is 1-based, data is 0-based
    var newRow = [
      existingRow[0], // Ticket ID - unchanged
      existingRow[1], // Date - unchanged
      existingRow[2], // Reporter - unchanged
      ticket.app      !== undefined ? ticket.app      : existingRow[3],
      ticket.priority !== undefined ? ticket.priority : existingRow[4],
      ticket.problem  !== undefined ? ticket.problem  : existingRow[5],
      ticket.detail   !== undefined ? ticket.detail   : existingRow[6],
      ticket.attachment !== undefined ? ticket.attachment : existingRow[7],
      ticket.status   !== undefined ? ticket.status   : existingRow[8],
      ticket.assignee !== undefined ? ticket.assignee : existingRow[9],
      ticket.deadline !== undefined ? ticket.deadline : existingRow[10],
      now, // Last Update always refreshed
      ticket.feedback !== undefined ? ticket.feedback : (existingRow[12] || ''),
      ticket.category !== undefined ? ticket.category : (existingRow[13] || 'Bug')
    ];
    sheet.getRange(rowIndex, 1, 1, newRow.length).setValues([newRow]);
    
    // Invalidate cache
    try { CacheService.getScriptCache().remove('tickets_' + ss.getId()); } catch(e) {}
    
    // Check timeline events
    if (ticket.status && oldTicket.status !== ticket.status) {
      logTimeline(ss, ticket.id, 'Status diubah ke ' + ticket.status, user.name, '');
    }
    if (ticket.assignee !== undefined && oldTicket.assignee !== ticket.assignee) {
      logTimeline(ss, ticket.id, 'Assignee diperbarui', user.name, ticket.assignee);
    }
    if (ticket.deadline !== undefined && oldTicket.deadline !== ticket.deadline) {
      logTimeline(ss, ticket.id, 'Deadline diperbarui', user.name, ticket.deadline);
    }

  } else {
    // Insert new ticket
    isNew = true;
    var d = new Date();
    var ymd = d.getFullYear() + ('0'+(d.getMonth()+1)).slice(-2) + ('0'+d.getDate()).slice(-2);
    
    // Find max ID for today
    var maxId = 0;
    var prefix = 'TIK-' + ymd + '-';
    for(var k=1; k<data.length; k++) {
      if(data[k][0].toString().indexOf(prefix) === 0) {
        var num = parseInt(data[k][0].replace(prefix, ''), 10);
        if(num > maxId) maxId = num;
      }
    }
    ticket.id = prefix + ('0000' + (maxId + 1)).slice(-4);
    ticket.date = ticket.date || now;
    ticket.status = 'Open';
    
    sheet.appendRow([
      ticket.id,
      ticket.date,
      ticket.reporter,
      ticket.app,
      ticket.priority,
      ticket.problem,
      ticket.detail,
      ticket.attachment || '',
      ticket.status,
      ticket.assignee || '',
      ticket.deadline || '',
      now,
      ticket.feedback || '',
      ticket.category || 'Bug'
    ]);
    
    logTimeline(ss, ticket.id, 'Tiket dibuat', user.name, '');
    
    // Invalidate cache on new ticket
    try { CacheService.getScriptCache().remove('tickets_' + ss.getId()); } catch(e) {}
    
    return {
      id: ticket.id,
      date: ticket.date,
      reporter: ticket.reporter,
      app: ticket.app,
      priority: ticket.priority,
      problem: ticket.problem,
      detail: ticket.detail,
      attachment: ticket.attachment || '',
      status: ticket.status,
      assignee: ticket.assignee || '',
      deadline: ticket.deadline || '',
      lastUpdate: now,
      feedback: ticket.feedback || '',
      category: ticket.category || 'Bug',
      timeline: [{
        id: 'TL-NEW',
        ticketId: ticket.id,
        date: now,
        activity: 'Tiket dibuat',
        by: user.name,
        notes: ''
      }]
    };
  }

  return getTicketById(ss, ticket.id); // return updated for updates
}

function getTicketById(ss, id) {
  // Read directly from sheet instead of re-loading all tickets
  var sheetT = ss.getSheetByName('Tickets');
  var sheetTl = ss.getSheetByName('Timeline');
  if (!sheetT) return null;
  var tData = sheetT.getDataRange().getValues();
  var tlData = sheetTl ? sheetTl.getDataRange().getValues() : [];
  var timelines = {};
  for (var j = 1; j < tlData.length; j++) {
    var tId = tlData[j][1];
    if (!timelines[tId]) timelines[tId] = [];
    timelines[tId].push({ id: tlData[j][0], ticketId: tId, date: tlData[j][2], activity: tlData[j][3], by: tlData[j][4], notes: tlData[j][5] });
  }
  for (var i = 1; i < tData.length; i++) {
    if (tData[i][0] === id) {
      var t = {
        id: tData[i][0], date: tData[i][1], reporter: tData[i][2], app: tData[i][3],
        priority: tData[i][4], problem: tData[i][5], detail: tData[i][6], attachment: tData[i][7],
        status: tData[i][8], assignee: tData[i][9], deadline: tData[i][10], lastUpdate: tData[i][11],
        feedback: tData[i][12] || '', category: tData[i][13] || 'Bug',
        timeline: (timelines[id] || []).sort(function(a,b) { return new Date(b.date) - new Date(a.date); })
      };
      return t;
    }
  }
  return null;
}

function logTimeline(ss, ticketId, activity, by, notes) {
  var sheet = ss.getSheetByName('Timeline');
  if(!sheet) return;
  sheet.appendRow([
    'TL-' + Date.now() + '-' + Math.floor(Math.random()*1000),
    ticketId,
    new Date().toISOString(),
    activity,
    by,
    notes
  ]);
}

// ----------------------------------------------------
// DRIVE UPLOAD
// ----------------------------------------------------
function uploadFile(folderId, base64Data, filename, mimeType, ticketId) {
  try {
    var folder = DriveApp.getFolderById(folderId);
    var data = Utilities.base64Decode(base64Data);
    var blob = Utilities.newBlob(data, mimeType, filename);
    
    // Rename file if ticketId provided
    if (ticketId) {
      var ext = filename.split('.').pop();
      filename = ticketId + '_' + Date.now() + '.' + ext;
      blob.setName(filename);
    }
    
    var file = folder.createFile(blob);
    
    // Attempt to make file publicly accessible
    try {
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
    } catch (sharingErr) {
      // Ignore if blocked by Google Workspace admin policy
    }
    
    return {
      url: file.getUrl(),
      downloadUrl: file.getDownloadUrl(),
      id: file.getId(),
      filename: filename
    };
  } catch (err) {
    throw new Error('Gagal mengakses Folder Google Drive. Pastikan ID Folder (' + folderId + ') benar dan Anda adalah pemiliknya! Detail: ' + err.toString());
  }
}

// ----------------------------------------------------
// SETTINGS
// ----------------------------------------------------
function getSettings(ss) {
  var sheet = ss.getSheetByName('Settings');
  var defaultSettings = {
    apps: ['Mobile App', 'Web Dashboard', 'ERP System'],
    priorities: ['Low', 'Medium', 'High', 'Critical'],
    statuses: ['Open', 'Assigned', 'In Progress', 'Ready For Testing', 'Done'],
    categories: ['Bug', 'Task', 'Feature']
  };
  
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['Key', 'Value']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
    sheet.appendRow(['config', JSON.stringify(defaultSettings)]);
    return defaultSettings;
  }
  
  var data = sheet.getDataRange().getValues();
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'config') {
      try {
        return JSON.parse(data[i][1]);
      } catch(e) {
        break;
      }
    }
  }
  
  sheet.appendRow(['config', JSON.stringify(defaultSettings)]);
  return defaultSettings;
}

function saveSettings(ss, settingsData) {
  var sheet = ss.getSheetByName('Settings');
  if (!sheet) {
    sheet = ss.insertSheet('Settings');
    sheet.appendRow(['Key', 'Value']);
    sheet.getRange(1, 1, 1, 2).setFontWeight('bold');
  }
  
  var data = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (data[i][0] === 'config') {
      sheet.getRange(i + 1, 2).setValue(JSON.stringify(settingsData));
      found = true;
      break;
    }
  }
  
  if (!found) {
    sheet.appendRow(['config', JSON.stringify(settingsData)]);
  }
  
  return settingsData;
}
