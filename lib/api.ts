/**
 * API Client per comunicare con Google Apps Script
 */

const API_URL = process.env.NEXT_PUBLIC_GOOGLE_SCRIPT_URL || '';

if (!API_URL) {
  console.warn('NEXT_PUBLIC_GOOGLE_SCRIPT_URL non configurato');
}

interface ApiResponse<T = any> {
  success?: boolean;
  error?: string;
  [key: string]: any;
}

/**
 * Chiamata GET
 */
async function get<T = any>(action: string, params?: Record<string, string>): Promise<T> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_GOOGLE_SCRIPT_URL non configurato. Verifica il file .env.local');
  }
  
  const url = new URL(API_URL);
  url.searchParams.set('action', action);
  
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }
  
  try {
    // Google Apps Script Web App fa sempre un redirect 302, quindi seguiamo i redirect
    const response = await fetch(url.toString(), {
      method: 'GET',
      mode: 'cors',
      cache: 'no-cache',
      redirect: 'follow', // Segui i redirect automaticamente
    });
    
    console.log('GET Response status:', response.status, response.statusText);
    
    if (!response.ok) {
      const text = await response.text();
      console.error('GET Error response:', text);
      throw new Error(`HTTP error! status: ${response.status} - ${text}`);
    }
    
    const text = await response.text();
    console.log('GET Response text:', text);
    
    let data: ApiResponse<T>;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      // Se la risposta non è JSON valido, potrebbe essere HTML (pagina di errore)
      console.error('Failed to parse JSON:', text);
      throw new Error('Risposta non valida dal server. Verifica che lo script sia pubblicato correttamente.');
    }
    
    if (data.error) {
      throw new Error(data.error);
    }
    
    return data as T;
  } catch (error: any) {
    console.error('GET Error:', error);
    if (error.message.includes('Failed to fetch') || error.message.includes('NetworkError')) {
      throw new Error('Impossibile connettersi al server. Verifica che lo script Google Apps Script sia pubblicato e autorizzato.');
    }
    throw error;
  }
}

/**
 * Chiamata POST
 * Usa GET invece di POST per evitare problemi CORS con Google Apps Script
 */
async function post<T = any>(action: string, data: any): Promise<T> {
  if (!API_URL) {
    throw new Error('NEXT_PUBLIC_GOOGLE_SCRIPT_URL non configurato. Verifica il file .env.local');
  }
  
  // Usa GET invece di POST per evitare problemi CORS
  // Google Apps Script Web App funziona meglio con GET
  console.log('Request (via GET, non POST):', { action, data, url: API_URL });
  
  // Converti i dati in parametri URL
  const params: Record<string, string> = {};
  Object.entries(data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      params[key] = String(value);
    }
  });
  
  return get<T>(action, params);
}

// ============ AUTH ============

export interface User {
  id: number;
  nome: string;
  cognome: string;
  username: string;
  ruolo: 'manager' | 'dipendente';
}

export async function login(username: string, password: string): Promise<{ success: boolean; user: User }> {
  return get('login', { username, password });
}

// ============ EMPLOYEES ============

export interface Employee {
  id: number;
  nome: string;
  cognome: string;
  username: string;
  password: string;
  ruolo: 'manager' | 'dipendente';
}

export async function getEmployees(): Promise<{ employees: Employee[] }> {
  return get('getEmployees');
}

export async function createEmployee(employee: Omit<Employee, 'id'>): Promise<{ success: boolean; id: number }> {
  return post('createEmployee', employee);
}

export async function updateEmployee(employee: Employee): Promise<{ success: boolean }> {
  return post('updateEmployee', employee);
}

export async function deleteEmployee(employeeId: number): Promise<{ success: boolean }> {
  return post('deleteEmployee', { employeeId });
}

// ============ PROJECTS ============

export interface Project {
  id: number;
  nome: string;
  descrizione: string;
  data_inizio: string;
  data_fine: string;
  stato: string;
}

export async function getProjects(): Promise<{ projects: Project[] }> {
  return get('getProjects');
}

export async function createProject(project: Omit<Project, 'id'>): Promise<{ success: boolean; id: number }> {
  return post('createProject', project);
}

export async function updateProject(project: Project): Promise<{ success: boolean }> {
  return post('updateProject', project);
}

export async function deleteProject(projectId: number): Promise<{ success: boolean }> {
  return post('deleteProject', { projectId });
}

// ============ COMMESSE ============

export interface Commessa {
  id: number;
  project_id: number;
  nome: string;
  descrizione: string;
  budget_ore: number;
  stato: string;
}

export async function getCommesse(projectId?: number): Promise<{ commesse: Commessa[] }> {
  const params = projectId ? { projectId: projectId.toString() } : undefined;
  return get('getCommesse', params);
}

export async function createCommessa(commessa: Omit<Commessa, 'id'>): Promise<{ success: boolean; id: number }> {
  return post('createCommessa', commessa);
}

export async function updateCommessa(commessa: Commessa): Promise<{ success: boolean }> {
  return post('updateCommessa', commessa);
}

export async function deleteCommessa(commessaId: number): Promise<{ success: boolean }> {
  return post('deleteCommessa', { commessaId });
}

// ============ TIMESHEETS ============

export interface Timesheet {
  id: number;
  employee_id: number;
  employee_name: string;
  project_id: number;
  commessa_id: number;
  data: string;
  ore: number;
  descrizione: string;
  stato: 'pending' | 'approved' | 'rejected';
  approvato_da?: string;
  data_approvazione?: string;
  data_inserimento?: string;
}

export interface TimesheetFilters {
  employeeId?: number;
  projectId?: number;
  commessaId?: number;
  anno?: number;
  mese?: number;
}

export async function getTimesheets(filters?: TimesheetFilters): Promise<{ timesheets: Timesheet[] }> {
  const params: Record<string, string> = {};
  if (filters) {
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined) {
        params[key] = value.toString();
      }
    });
  }
  return get('getTimesheets', params);
}

export async function getEmployeeTimesheets(employeeId: number): Promise<{ timesheets: Timesheet[] }> {
  return get('getEmployeeTimesheets', { employeeId: employeeId.toString() });
}

export async function createTimesheet(timesheet: Omit<Timesheet, 'id' | 'employee_name' | 'data_inserimento'>): Promise<{ success: boolean; id: number }> {
  return post('createTimesheet', timesheet);
}

export async function updateTimesheet(timesheet: Partial<Timesheet> & { id: number }): Promise<{ success: boolean }> {
  return post('updateTimesheet', timesheet);
}

export async function approveTimesheet(timesheetId: number, approvedBy: string): Promise<{ success: boolean }> {
  return post('approveTimesheet', { timesheetId, approvedBy });
}

export async function rejectTimesheet(timesheetId: number, rejectedBy: string): Promise<{ success: boolean }> {
  return post('rejectTimesheet', { timesheetId, rejectedBy });
}

export async function deleteTimesheet(timesheetId: number): Promise<{ success: boolean }> {
  return post('deleteTimesheet', { timesheetId });
}

export async function batchSaveTimesheets(
  toCreate: Array<Omit<Timesheet, 'id' | 'employee_name' | 'data_inserimento'>>,
  toUpdate: Array<Partial<Timesheet> & { id: number }>,
  toDelete: number[]
): Promise<{ success: boolean; results: any; summary: any }> {
  return post('batchSaveTimesheets', {
    toCreate: JSON.stringify(toCreate),
    toUpdate: JSON.stringify(toUpdate),
    toDelete: JSON.stringify(toDelete)
  });
}

export async function submitWeekForApproval(employeeId: number, weekStart: string, weekEnd: string): Promise<{ success: boolean }> {
  return post('submitWeekForApproval', { employeeId, weekStart, weekEnd });
}

export async function approveWeek(employeeId: number, weekStart: string, weekEnd: string, approvedBy: string): Promise<{ success: boolean }> {
  return post('approveWeek', { employeeId, weekStart, weekEnd, approvedBy });
}

export async function rejectWeek(employeeId: number, weekStart: string, weekEnd: string, rejectedBy: string): Promise<{ success: boolean }> {
  return post('rejectWeek', { employeeId, weekStart, weekEnd, rejectedBy });
}

