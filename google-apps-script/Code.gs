/**
 * Timesheet System - Google Apps Script API
 * Questo script va copiato in Google Apps Script (Estensioni > Apps Script)
 * e pubblicato come Web App
 */

// ID del tuo Google Sheet (dall'URL)
const SPREADSHEET_ID = '1pGtqrMySNWXfhnL0OZKehs_ip_-QOA7bnD5tC5vBNIg';

// Nomi dei fogli (tabs)
const SHEETS = {
  EMPLOYEES: 'employees',
  PROJECTS: 'projects',
  COMMESSE: 'commesse',
  TIMESHEETS: 'timesheets'
};

/**
 * Ottiene il foglio di calcolo
 */
function getSpreadsheet() {
  return SpreadsheetApp.openById(SPREADSHEET_ID);
}

/**
 * GET endpoint - Legge e scrive dati
 * Usa GET anche per le operazioni di scrittura (per evitare problemi CORS)
 */
function doGet(e) {
  try {
    const action = e.parameter.action;
    const ss = getSpreadsheet();
    
    // Setup automatico se richiesto
    if (action === 'setup') {
      return handleSetup(ss);
    }
    
    // Operazioni di lettura
    switch(action) {
      case 'login':
        return handleLogin(ss, e.parameter);
      
      case 'getEmployees':
        return handleGetEmployees(ss);
      
      case 'getProjects':
        return handleGetProjects(ss);
      
      case 'getCommesse':
        return handleGetCommesse(ss, e.parameter.projectId);
      
      case 'getTimesheets':
        return handleGetTimesheets(ss, e.parameter);
      
      case 'getEmployeeTimesheets':
        return handleGetEmployeeTimesheets(ss, e.parameter.employeeId);
      
      // Operazioni di scrittura (via GET per evitare CORS)
      case 'createProject':
        return handleCreateProject(ss, e.parameter);
      
      case 'updateProject':
        return handleUpdateProject(ss, e.parameter);
      
      case 'deleteProject':
        return handleDeleteProject(ss, e.parameter.projectId);
      
      case 'createCommessa':
        return handleCreateCommessa(ss, e.parameter);
      
      case 'updateCommessa':
        return handleUpdateCommessa(ss, e.parameter);
      
      case 'deleteCommessa':
        return handleDeleteCommessa(ss, e.parameter.commessaId);
      
      case 'createTimesheet':
        return handleCreateTimesheet(ss, e.parameter);
      
      case 'updateTimesheet':
        return handleUpdateTimesheet(ss, e.parameter);
      
      case 'approveTimesheet':
        return handleApproveTimesheet(ss, e.parameter);
      
      case 'rejectTimesheet':
        return handleRejectTimesheet(ss, e.parameter);
      case 'deleteTimesheet':
        return handleDeleteTimesheet(ss, e.parameter);
      case 'batchSaveTimesheets':
        return handleBatchSaveTimesheets(ss, e.parameter);
      
      case 'createEmployee':
        return handleCreateEmployee(ss, e.parameter);
      
      case 'updateEmployee':
        return handleUpdateEmployee(ss, e.parameter);
      
      case 'deleteEmployee':
        return handleDeleteEmployee(ss, e.parameter.employeeId);
      
      case 'submitWeekForApproval':
        return handleSubmitWeekForApproval(ss, e.parameter);
      
      case 'approveWeek':
        return handleApproveWeek(ss, e.parameter);
      
      case 'rejectWeek':
        return handleRejectWeek(ss, e.parameter);
      
      default:
        return createResponse({ error: 'Action not found' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * POST endpoint - Scrive dati
 */
function doPost(e) {
  try {
    // Log per debug
    console.log('POST received:', e.postData ? e.postData.contents : 'No data');
    
    if (!e.postData || !e.postData.contents) {
      return createResponse({ error: 'Nessun dato ricevuto' }, 400);
    }
    
    const data = JSON.parse(e.postData.contents);
    const action = data.action;
    
    if (!action) {
      return createResponse({ error: 'Action non specificata' }, 400);
    }
    
    console.log('Action:', action, 'Data:', data);
    
    const ss = getSpreadsheet();
    
    switch(action) {
      case 'createProject':
        return handleCreateProject(ss, data);
      
      case 'updateProject':
        return handleUpdateProject(ss, data);
      
      case 'deleteProject':
        return handleDeleteProject(ss, data.projectId);
      
      case 'createCommessa':
        return handleCreateCommessa(ss, data);
      
      case 'updateCommessa':
        return handleUpdateCommessa(ss, data);
      
      case 'deleteCommessa':
        return handleDeleteCommessa(ss, data.commessaId);
      
      case 'createTimesheet':
        return handleCreateTimesheet(ss, data);
      
      case 'updateTimesheet':
        return handleUpdateTimesheet(ss, data);
      
      case 'approveTimesheet':
        return handleApproveTimesheet(ss, data);
      
      case 'rejectTimesheet':
        return handleRejectTimesheet(ss, data);
      case 'deleteTimesheet':
        return handleDeleteTimesheet(ss, data);
      
      case 'createEmployee':
        return handleCreateEmployee(ss, data);
      
      case 'updateEmployee':
        return handleUpdateEmployee(ss, data);
      
      case 'deleteEmployee':
        return handleDeleteEmployee(ss, data.employeeId);
      
      default:
        return createResponse({ error: 'Action not found' }, 400);
    }
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Login - Verifica username e password
 */
function handleLogin(ss, params) {
  const username = params.username;
  const password = params.password;
  
  if (!username || !password) {
    return createResponse({ error: 'Username e password richiesti' }, 400);
  }
  
  const sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sheet) {
    return createResponse({ error: 'Foglio employees non trovato' }, 500);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  
  // Trova indici colonne
  const usernameIdx = headers.indexOf('username');
  const passwordIdx = headers.indexOf('password');
  const nomeIdx = headers.indexOf('nome');
  const cognomeIdx = headers.indexOf('cognome');
  const ruoloIdx = headers.indexOf('ruolo');
  const idIdx = headers.indexOf('id');
  
  // Cerca utente
  for (let i = 1; i < data.length; i++) {
    if (data[i][usernameIdx] === username && data[i][passwordIdx] === password) {
      return createResponse({
        success: true,
        user: {
          id: data[i][idIdx],
          nome: data[i][nomeIdx],
          cognome: data[i][cognomeIdx],
          username: data[i][usernameIdx],
          ruolo: data[i][ruoloIdx]
        }
      });
    }
  }
  
  return createResponse({ error: 'Credenziali non valide' }, 401);
}

/**
 * Ottiene tutti i dipendenti
 */
function handleGetEmployees(ss) {
  const sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sheet) return createResponse({ error: 'Foglio employees non trovato' }, 500);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const employees = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) { // Se c'è almeno un dato
      const emp = {};
      headers.forEach((header, idx) => {
        emp[header] = data[i][idx];
      });
      employees.push(emp);
    }
  }
  
  return createResponse({ employees });
}

/**
 * Ottiene tutti i progetti
 */
function handleGetProjects(ss) {
  const sheet = ss.getSheetByName(SHEETS.PROJECTS);
  if (!sheet) return createResponse({ error: 'Foglio projects non trovato' }, 500);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const projects = [];
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0]) {
      const proj = {};
      headers.forEach((header, idx) => {
        proj[header] = data[i][idx];
      });
      projects.push(proj);
    }
  }
  
  return createResponse({ projects });
}

/**
 * Ottiene commesse per progetto
 */
function handleGetCommesse(ss, projectId) {
  const sheet = ss.getSheetByName(SHEETS.COMMESSE);
  if (!sheet) return createResponse({ error: 'Foglio commesse non trovato' }, 500);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const commesse = [];
  const projectIdIdx = headers.indexOf('project_id');
  
  for (let i = 1; i < data.length; i++) {
    if (data[i][0] && (!projectId || data[i][projectIdIdx] == projectId)) {
      const comm = {};
      headers.forEach((header, idx) => {
        comm[header] = data[i][idx];
      });
      commesse.push(comm);
    }
  }
  
  return createResponse({ commesse });
}

/**
 * Ottiene timesheet con filtri
 */
function handleGetTimesheets(ss, params) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const timesheets = [];
  
  const employeeIdIdx = headers.indexOf('employee_id');
  const projectIdIdx = headers.indexOf('project_id');
  const commessaIdIdx = headers.indexOf('commessa_id');
  const dataIdx = headers.indexOf('data');
  const statoIdx = headers.indexOf('stato');
  
  const filterEmployeeId = params.employeeId;
  const filterProjectId = params.projectId;
  const filterCommessaId = params.commessaId;
  const filterAnno = params.anno;
  const filterMese = params.mese;
  
  for (let i = 1; i < data.length; i++) {
    if (!data[i][0]) continue;
    
    // Filtri
    if (filterEmployeeId && data[i][employeeIdIdx] != filterEmployeeId) continue;
    if (filterProjectId && data[i][projectIdIdx] != filterProjectId) continue;
    if (filterCommessaId && data[i][commessaIdIdx] != filterCommessaId) continue;
    
    // Filtro data
    if (filterAnno || filterMese) {
      const dateStr = data[i][dataIdx];
      if (dateStr) {
        const date = new Date(dateStr);
        if (filterAnno && date.getFullYear() != filterAnno) continue;
        if (filterMese && (date.getMonth() + 1) != filterMese) continue;
      }
    }
    
    const ts = {};
    headers.forEach((header, idx) => {
      ts[header] = data[i][idx];
    });
    timesheets.push(ts);
  }
  
  return createResponse({ timesheets });
}

/**
 * Ottiene timesheet di un dipendente
 */
function handleGetEmployeeTimesheets(ss, employeeId) {
  return handleGetTimesheets(ss, { employeeId: employeeId });
}

/**
 * Crea nuovo progetto
 */
function handleCreateProject(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.PROJECTS);
  if (!sheet) return createResponse({ error: 'Foglio projects non trovato' }, 500);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = headers.indexOf('id');
  
  // Genera nuovo ID
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? Math.max(...sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat()) + 1 : 1;
  
  const row = [newId];
  headers.forEach(header => {
    if (header !== 'id') {
      // Gestisci sia parametri URL (stringhe) che oggetti JSON
      const value = data[header];
      row.push(value !== undefined && value !== null ? value : '');
    }
  });
  
  sheet.appendRow(row);
  return createResponse({ success: true, id: newId });
}

/**
 * Aggiorna progetto
 */
function handleUpdateProject(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.PROJECTS);
  if (!sheet) return createResponse({ error: 'Foglio projects non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const projectId = data.id;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == projectId) {
      headers.forEach((header, colIdx) => {
        if (header !== 'id' && data[header] !== undefined && data[header] !== null) {
          sheet.getRange(i + 1, colIdx + 1).setValue(data[header]);
        }
      });
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Progetto non trovato' }, 404);
}

/**
 * Elimina progetto
 */
function handleDeleteProject(ss, projectId) {
  const sheet = ss.getSheetByName(SHEETS.PROJECTS);
  if (!sheet) return createResponse({ error: 'Foglio projects non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == projectId) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Progetto non trovato' }, 404);
}

/**
 * Crea nuova commessa
 */
function handleCreateCommessa(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.COMMESSE);
  if (!sheet) return createResponse({ error: 'Foglio commesse non trovato' }, 500);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = headers.indexOf('id');
  
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? Math.max(...sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat()) + 1 : 1;
  
  const row = [newId];
  headers.forEach(header => {
    if (header !== 'id') {
      row.push(data[header] || '');
    }
  });
  
  sheet.appendRow(row);
  return createResponse({ success: true, id: newId });
}

/**
 * Aggiorna commessa
 */
function handleUpdateCommessa(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.COMMESSE);
  if (!sheet) return createResponse({ error: 'Foglio commesse non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const commessaId = data.id;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == commessaId) {
      headers.forEach((header, colIdx) => {
        if (header !== 'id' && data[header] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(data[header]);
        }
      });
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Commessa non trovata' }, 404);
}

/**
 * Elimina commessa
 */
function handleDeleteCommessa(ss, commessaId) {
  const sheet = ss.getSheetByName(SHEETS.COMMESSE);
  if (!sheet) return createResponse({ error: 'Foglio commesse non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == commessaId) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Commessa non trovata' }, 404);
}

/**
 * Crea nuovo timesheet
 */
function handleCreateTimesheet(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = headers.indexOf('id');
  
  // Ottieni nome dipendente
  const empSheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  const empData = empSheet.getDataRange().getValues();
  const empHeaders = empData[0];
  const empIdIdx = empHeaders.indexOf('id');
  const empNomeIdx = empHeaders.indexOf('nome');
  const empCognomeIdx = empHeaders.indexOf('cognome');
  let employeeName = '';
  
  for (let i = 1; i < empData.length; i++) {
    if (empData[i][empIdIdx] == data.employee_id) {
      employeeName = `${empData[i][empNomeIdx]} ${empData[i][empCognomeIdx]}`;
      break;
    }
  }
  
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? Math.max(...sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat()) + 1 : 1;
  
  const row = [newId];
  headers.forEach(header => {
    if (header === 'id') {
      // già aggiunto
    } else if (header === 'employee_name') {
      row.push(employeeName);
    } else if (header === 'stato') {
      row.push(data.stato || 'pending');
    } else if (header === 'data_inserimento') {
      row.push(new Date());
    } else {
      row.push(data[header] || '');
    }
  });
  
  sheet.appendRow(row);
  return createResponse({ success: true, id: newId });
}

/**
 * Aggiorna timesheet
 */
function handleUpdateTimesheet(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const timesheetId = data.id;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == timesheetId) {
      headers.forEach((header, colIdx) => {
        if (header !== 'id' && header !== 'employee_name' && data[header] !== undefined) {
          sheet.getRange(i + 1, colIdx + 1).setValue(data[header]);
        }
      });
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Timesheet non trovato' }, 404);
}

/**
 * Approva timesheet
 */
function handleApproveTimesheet(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const statoIdx = headers.indexOf('stato');
  const approvatoDaIdx = headers.indexOf('approvato_da');
  const dataApprovazioneIdx = headers.indexOf('data_approvazione');
  const timesheetId = data.timesheetId;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == timesheetId) {
      sheet.getRange(i + 1, statoIdx + 1).setValue('approved');
      if (approvatoDaIdx >= 0) {
        sheet.getRange(i + 1, approvatoDaIdx + 1).setValue(data.approvedBy || '');
      }
      if (dataApprovazioneIdx >= 0) {
        sheet.getRange(i + 1, dataApprovazioneIdx + 1).setValue(new Date());
      }
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Timesheet non trovato' }, 404);
}

/**
 * Rifiuta timesheet
 */
function handleRejectTimesheet(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const statoIdx = headers.indexOf('stato');
  const approvatoDaIdx = headers.indexOf('approvato_da');
  const dataApprovazioneIdx = headers.indexOf('data_approvazione');
  const timesheetId = data.timesheetId;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == timesheetId) {
      sheet.getRange(i + 1, statoIdx + 1).setValue('rejected');
      if (approvatoDaIdx >= 0) {
        sheet.getRange(i + 1, approvatoDaIdx + 1).setValue(data.rejectedBy || '');
      }
      if (dataApprovazioneIdx >= 0) {
        sheet.getRange(i + 1, dataApprovazioneIdx + 1).setValue(new Date());
      }
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Timesheet non trovato' }, 404);
}

/**
 * Elimina timesheet
 */
function handleDeleteTimesheet(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const timesheetId = data.timesheetId;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == timesheetId) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Timesheet non trovato' }, 404);
}

/**
 * Salva multipli timesheet in batch
 */
function handleBatchSaveTimesheets(ss, params) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  try {
    // Parse dei dati batch (vengono passati come stringa JSON)
    const toCreate = params.toCreate ? JSON.parse(params.toCreate) : [];
    const toUpdate = params.toUpdate ? JSON.parse(params.toUpdate) : [];
    const toDelete = params.toDelete ? JSON.parse(params.toDelete) : [];
    
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    const idIdx = headers.indexOf('id');
    
    const results = {
      created: [],
      updated: [],
      deleted: [],
      errors: []
    };
    
    // Ottieni nome dipendente una volta per tutte
    const empSheet = ss.getSheetByName(SHEETS.EMPLOYEES);
    const empData = empSheet.getDataRange().getValues();
    const empHeaders = empData[0];
    const empIdIdx = empHeaders.indexOf('id');
    const empNomeIdx = empHeaders.indexOf('nome');
    const empCognomeIdx = empHeaders.indexOf('cognome');
    
    // Crea timesheet
    const lastRow = sheet.getLastRow();
    let newId = lastRow > 1 ? Math.max(...sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat()) : 0;
    
    toCreate.forEach(data => {
      try {
        newId++;
        
        // Trova nome dipendente
        let employeeName = '';
        for (let i = 1; i < empData.length; i++) {
          if (empData[i][empIdIdx] == data.employee_id) {
            employeeName = `${empData[i][empNomeIdx]} ${empData[i][empCognomeIdx]}`;
            break;
          }
        }
        
        const row = [newId];
        headers.forEach(header => {
          if (header === 'id') {
            // già aggiunto
          } else if (header === 'employee_name') {
            row.push(employeeName);
          } else if (header === 'stato') {
            row.push(data.stato || 'pending');
          } else if (header === 'data_inserimento') {
            row.push(new Date());
          } else {
            row.push(data[header] || '');
          }
        });
        
        sheet.appendRow(row);
        results.created.push({ id: newId, data: data });
      } catch (err) {
        results.errors.push({ action: 'create', error: err.toString(), data: data });
      }
    });
    
    // Aggiorna timesheet
    let dataRange = sheet.getDataRange().getValues();
    toUpdate.forEach(data => {
      try {
        for (let i = 1; i < dataRange.length; i++) {
          if (dataRange[i][idIdx] == data.id) {
            headers.forEach((header, colIdx) => {
              if (header !== 'id' && data[header] !== undefined && data[header] !== null) {
                sheet.getRange(i + 1, colIdx + 1).setValue(data[header]);
              }
            });
            results.updated.push({ id: data.id });
            break;
          }
        }
      } catch (err) {
        results.errors.push({ action: 'update', error: err.toString(), data: data });
      }
    });
    
    // Elimina timesheet (in ordine inverso per evitare problemi di indici)
    const sortedDelete = toDelete.sort((a, b) => b - a);
    sortedDelete.forEach(timesheetId => {
      try {
        // Ricarica dataRange dopo ogni eliminazione per avere indici corretti
        dataRange = sheet.getDataRange().getValues();
        for (let i = dataRange.length - 1; i >= 1; i--) {
          if (dataRange[i][idIdx] == timesheetId) {
            sheet.deleteRow(i + 1);
            results.deleted.push(timesheetId);
            break;
          }
        }
      } catch (err) {
        results.errors.push({ action: 'delete', error: err.toString(), id: timesheetId });
      }
    });
    
    return createResponse({ 
      success: true, 
      results: results,
      summary: {
        created: results.created.length,
        updated: results.updated.length,
        deleted: results.deleted.length,
        errors: results.errors.length
      }
    });
  } catch (error) {
    return createResponse({ error: error.toString() }, 500);
  }
}

/**
 * Crea nuovo dipendente
 */
function handleCreateEmployee(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sheet) return createResponse({ error: 'Foglio employees non trovato' }, 500);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const idIdx = headers.indexOf('id');
  
  // Genera nuovo ID
  const lastRow = sheet.getLastRow();
  const newId = lastRow > 1 ? Math.max(...sheet.getRange(2, idIdx + 1, lastRow - 1, 1).getValues().flat()) + 1 : 1;
  
  const row = [newId];
  headers.forEach(header => {
    if (header !== 'id') {
      const value = data[header];
      row.push(value !== undefined && value !== null ? value : '');
    }
  });
  
  sheet.appendRow(row);
  return createResponse({ success: true, id: newId });
}

/**
 * Aggiorna dipendente
 */
function handleUpdateEmployee(ss, data) {
  const sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sheet) return createResponse({ error: 'Foglio employees non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  const employeeId = data.id;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == employeeId) {
      headers.forEach((header, colIdx) => {
        if (header !== 'id' && data[header] !== undefined && data[header] !== null) {
          sheet.getRange(i + 1, colIdx + 1).setValue(data[header]);
        }
      });
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Dipendente non trovato' }, 404);
}

/**
 * Elimina dipendente
 */
function handleDeleteEmployee(ss, employeeId) {
  const sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
  if (!sheet) return createResponse({ error: 'Foglio employees non trovato' }, 500);
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const idIdx = headers.indexOf('id');
  
  for (let i = 1; i < dataRange.length; i++) {
    if (dataRange[i][idIdx] == employeeId) {
      sheet.deleteRow(i + 1);
      return createResponse({ success: true });
    }
  }
  
  return createResponse({ error: 'Dipendente non trovato' }, 404);
}

/**
 * Invia settimana in approvazione
 */
function handleSubmitWeekForApproval(ss, params) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const employeeId = params.employeeId || params.employee_id;
  const weekStart = new Date(params.weekStart);
  const weekEnd = new Date(params.weekEnd);
  weekEnd.setHours(23, 59, 59, 999); // Fine giornata
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const employeeIdIdx = headers.indexOf('employee_id');
  const dataIdx = headers.indexOf('data');
  const statoIdx = headers.indexOf('stato');
  
  let updated = 0;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (!dataRange[i][0]) continue;
    
    const tsEmployeeId = dataRange[i][employeeIdIdx];
    const tsDate = new Date(dataRange[i][dataIdx]);
    const tsStato = dataRange[i][statoIdx];
    
    if (tsEmployeeId == employeeId && 
        tsDate >= weekStart && 
        tsDate <= weekEnd && 
        tsStato !== 'approved' && 
        tsStato !== 'rejected') {
      sheet.getRange(i + 1, statoIdx + 1).setValue('pending');
      updated++;
    }
  }
  
  return createResponse({ success: true, updated: updated });
}

/**
 * Approva settimana
 */
function handleApproveWeek(ss, params) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const employeeId = params.employeeId;
  const weekStart = new Date(params.weekStart);
  const weekEnd = new Date(params.weekEnd);
  weekEnd.setHours(23, 59, 59, 999);
  const approvedBy = params.approvedBy || '';
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const employeeIdIdx = headers.indexOf('employee_id');
  const dataIdx = headers.indexOf('data');
  const statoIdx = headers.indexOf('stato');
  const approvatoDaIdx = headers.indexOf('approvato_da');
  const dataApprovazioneIdx = headers.indexOf('data_approvazione');
  
  let updated = 0;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (!dataRange[i][0]) continue;
    
    const tsEmployeeId = dataRange[i][employeeIdIdx];
    const tsDate = new Date(dataRange[i][dataIdx]);
    
    if (tsEmployeeId == employeeId && tsDate >= weekStart && tsDate <= weekEnd) {
      sheet.getRange(i + 1, statoIdx + 1).setValue('approved');
      if (approvatoDaIdx >= 0) {
        sheet.getRange(i + 1, approvatoDaIdx + 1).setValue(approvedBy);
      }
      if (dataApprovazioneIdx >= 0) {
        sheet.getRange(i + 1, dataApprovazioneIdx + 1).setValue(new Date());
      }
      updated++;
    }
  }
  
  return createResponse({ success: true, updated: updated });
}

/**
 * Rifiuta settimana
 */
function handleRejectWeek(ss, params) {
  const sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
  if (!sheet) return createResponse({ error: 'Foglio timesheets non trovato' }, 500);
  
  const employeeId = params.employeeId;
  const weekStart = new Date(params.weekStart);
  const weekEnd = new Date(params.weekEnd);
  weekEnd.setHours(23, 59, 59, 999);
  const rejectedBy = params.rejectedBy || '';
  
  const dataRange = sheet.getDataRange().getValues();
  const headers = dataRange[0];
  const employeeIdIdx = headers.indexOf('employee_id');
  const dataIdx = headers.indexOf('data');
  const statoIdx = headers.indexOf('stato');
  const approvatoDaIdx = headers.indexOf('approvato_da');
  const dataApprovazioneIdx = headers.indexOf('data_approvazione');
  
  let updated = 0;
  
  for (let i = 1; i < dataRange.length; i++) {
    if (!dataRange[i][0]) continue;
    
    const tsEmployeeId = dataRange[i][employeeIdIdx];
    const tsDate = new Date(dataRange[i][dataIdx]);
    
    if (tsEmployeeId == employeeId && tsDate >= weekStart && tsDate <= weekEnd) {
      sheet.getRange(i + 1, statoIdx + 1).setValue('rejected');
      if (approvatoDaIdx >= 0) {
        sheet.getRange(i + 1, approvatoDaIdx + 1).setValue(rejectedBy);
      }
      if (dataApprovazioneIdx >= 0) {
        sheet.getRange(i + 1, dataApprovazioneIdx + 1).setValue(new Date());
      }
      updated++;
    }
  }
  
  return createResponse({ success: true, updated: updated });
}

/**
 * Setup automatico - Crea fogli e header se non esistono
 */
function handleSetup(ss) {
  try {
    const results = {
      created: [],
      existing: [],
      errors: []
    };
    
    // Crea foglio employees
    let sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.EMPLOYEES);
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'nome', 'cognome', 'username', 'password', 'ruolo']]);
      results.created.push('employees');
      
      // Inserisci utente admin di default
      sheet.appendRow([1, 'Admin', 'Admin', 'admin', 'admin123', 'manager']);
    } else {
      results.existing.push('employees');
    }
    
    // Crea foglio projects
    sheet = ss.getSheetByName(SHEETS.PROJECTS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.PROJECTS);
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'nome', 'descrizione', 'data_inizio', 'data_fine', 'stato']]);
      results.created.push('projects');
    } else {
      results.existing.push('projects');
    }
    
    // Crea foglio commesse
    sheet = ss.getSheetByName(SHEETS.COMMESSE);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.COMMESSE);
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'project_id', 'nome', 'descrizione', 'budget_ore', 'stato']]);
      results.created.push('commesse');
    } else {
      results.existing.push('commesse');
    }
    
    // Crea foglio timesheets
    sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
    if (!sheet) {
      sheet = ss.insertSheet(SHEETS.TIMESHEETS);
      sheet.getRange(1, 1, 1, 12).setValues([[
        'id', 'employee_id', 'employee_name', 'project_id', 'commessa_id', 
        'data', 'ore', 'descrizione', 'stato', 'approvato_da', 
        'data_approvazione', 'data_inserimento'
      ]]);
      results.created.push('timesheets');
    } else {
      results.existing.push('timesheets');
    }
    
    // Verifica e crea header se mancanti
    sheet = ss.getSheetByName(SHEETS.EMPLOYEES);
    if (sheet && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'nome', 'cognome', 'username', 'password', 'ruolo']]);
      sheet.appendRow([1, 'Admin', 'Admin', 'admin', 'admin123', 'manager']);
    }
    
    sheet = ss.getSheetByName(SHEETS.PROJECTS);
    if (sheet && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'nome', 'descrizione', 'data_inizio', 'data_fine', 'stato']]);
    }
    
    sheet = ss.getSheetByName(SHEETS.COMMESSE);
    if (sheet && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 6).setValues([['id', 'project_id', 'nome', 'descrizione', 'budget_ore', 'stato']]);
    }
    
    sheet = ss.getSheetByName(SHEETS.TIMESHEETS);
    if (sheet && sheet.getLastRow() === 0) {
      sheet.getRange(1, 1, 1, 12).setValues([[
        'id', 'employee_id', 'employee_name', 'project_id', 'commessa_id', 
        'data', 'ore', 'descrizione', 'stato', 'approvato_da', 
        'data_approvazione', 'data_inserimento'
      ]]);
    }
    
    return createResponse({
      success: true,
      message: 'Setup completato',
      results: results
    });
  } catch (error) {
    return createResponse({ 
      error: error.toString(),
      message: 'Errore durante il setup'
    }, 500);
  }
}

/**
 * Crea risposta JSON con CORS headers
 */
function createResponse(data, statusCode = 200) {
  const output = ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
  
  // Aggiungi header CORS per permettere chiamate dal frontend
  // Nota: Google Apps Script non supporta setHeader direttamente,
  // ma le Web App gestiscono CORS automaticamente se configurate correttamente
  
  return output;
}

