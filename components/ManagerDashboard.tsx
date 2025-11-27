'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { 
  getProjects, 
  getCommesse, 
  getTimesheets,
  getEmployees,
  createProject,
  updateProject,
  deleteProject,
  createCommessa,
  updateCommessa,
  deleteCommessa,
  approveTimesheet,
  rejectTimesheet,
  approveWeek,
  rejectWeek,
  createEmployee,
  updateEmployee,
  deleteEmployee,
  Project,
  Commessa,
  Timesheet,
  Employee
} from '@/lib/api';

// Funzione per ottenere il lunedì della settimana
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Formatta data come YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

export default function ManagerDashboard() {
  const user = getUser();
  const [activeTab, setActiveTab] = useState<'timesheets' | 'projects' | 'commesse' | 'employees'>('timesheets');
  const [projects, setProjects] = useState<Project[]>([]);
  const [commesse, setCommesse] = useState<Commessa[]>([]);
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Filtri timesheet
  const [filterEmployee, setFilterEmployee] = useState<number | ''>('');
  const [filterProject, setFilterProject] = useState<number | ''>('');
  const [filterAnno, setFilterAnno] = useState(new Date().getFullYear());
  const [filterMese, setFilterMese] = useState(new Date().getMonth() + 1);
  const [filterStato, setFilterStato] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  
  // Modals
  const [showProjectModal, setShowProjectModal] = useState(false);
  const [showCommessaModal, setShowCommessaModal] = useState(false);
  const [showEmployeeModal, setShowEmployeeModal] = useState(false);
  const [editingProject, setEditingProject] = useState<Project | null>(null);
  const [editingCommessa, setEditingCommessa] = useState<Commessa | null>(null);
  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  
  // Form states
  const [projectForm, setProjectForm] = useState({ nome: '', descrizione: '', data_inizio: '', data_fine: '', stato: 'attivo' });
  const [commessaForm, setCommessaForm] = useState({ project_id: '', nome: '', descrizione: '', budget_ore: '', stato: 'attiva' });
  const [employeeForm, setEmployeeForm] = useState({ nome: '', cognome: '', username: '', password: '', ruolo: 'dipendente' });

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'timesheets') {
      loadTimesheets();
    }
  }, [filterEmployee, filterProject, filterAnno, filterMese, filterStato]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, commesseRes, employeesRes] = await Promise.all([
        getProjects(),
        getCommesse(),
        getEmployees()
      ]);
      setProjects(projectsRes.projects);
      setCommesse(commesseRes.commesse);
      setEmployees(employeesRes.employees);
      await loadTimesheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const loadTimesheets = async () => {
    try {
      const filters: any = {};
      if (filterEmployee) filters.employeeId = Number(filterEmployee);
      if (filterProject) filters.projectId = Number(filterProject);
      if (filterAnno) filters.anno = filterAnno;
      if (filterMese) filters.mese = filterMese;
      
      const res = await getTimesheets(filters);
      let filtered = res.timesheets;
      
      if (filterStato !== 'all') {
        filtered = filtered.filter(ts => ts.stato === filterStato);
      }
      
      setTimesheets(filtered);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createProject(projectForm);
      setMessage({ type: 'success', text: 'Progetto creato con successo!' });
      setShowProjectModal(false);
      setProjectForm({ nome: '', descrizione: '', data_inizio: '', data_fine: '', stato: 'attivo' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    try {
      await updateProject({ ...editingProject, ...projectForm });
      setMessage({ type: 'success', text: 'Progetto aggiornato con successo!' });
      setShowProjectModal(false);
      setEditingProject(null);
      setProjectForm({ nome: '', descrizione: '', data_inizio: '', data_fine: '', stato: 'attivo' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteProject = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo progetto?')) return;
    try {
      await deleteProject(id);
      setMessage({ type: 'success', text: 'Progetto eliminato!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateCommessa = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createCommessa({
        ...commessaForm,
        project_id: Number(commessaForm.project_id),
        budget_ore: Number(commessaForm.budget_ore)
      });
      setMessage({ type: 'success', text: 'Commessa creata con successo!' });
      setShowCommessaModal(false);
      setCommessaForm({ project_id: '', nome: '', descrizione: '', budget_ore: '', stato: 'attiva' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateCommessa = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCommessa) return;
    try {
      await updateCommessa({
        ...editingCommessa,
        ...commessaForm,
        project_id: Number(commessaForm.project_id),
        budget_ore: Number(commessaForm.budget_ore)
      });
      setMessage({ type: 'success', text: 'Commessa aggiornata con successo!' });
      setShowCommessaModal(false);
      setEditingCommessa(null);
      setCommessaForm({ project_id: '', nome: '', descrizione: '', budget_ore: '', stato: 'attiva' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteCommessa = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questa commessa?')) return;
    try {
      await deleteCommessa(id);
      setMessage({ type: 'success', text: 'Commessa eliminata!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleCreateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createEmployee(employeeForm);
      setMessage({ type: 'success', text: 'Dipendente creato con successo!' });
      setShowEmployeeModal(false);
      setEmployeeForm({ nome: '', cognome: '', username: '', password: '', ruolo: 'dipendente' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee) return;
    try {
      await updateEmployee({ ...editingEmployee, ...employeeForm });
      setMessage({ type: 'success', text: 'Dipendente aggiornato con successo!' });
      setShowEmployeeModal(false);
      setEditingEmployee(null);
      setEmployeeForm({ nome: '', cognome: '', username: '', password: '', ruolo: 'dipendente' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleDeleteEmployee = async (id: number) => {
    if (!confirm('Sei sicuro di voler eliminare questo dipendente?')) return;
    try {
      await deleteEmployee(id);
      setMessage({ type: 'success', text: 'Dipendente eliminato!' });
      loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const openEmployeeModal = (employee?: Employee) => {
    if (employee) {
      setEditingEmployee(employee);
      setEmployeeForm({
        nome: employee.nome,
        cognome: employee.cognome,
        username: employee.username,
        password: employee.password,
        ruolo: employee.ruolo
      });
    } else {
      setEditingEmployee(null);
      setEmployeeForm({ nome: '', cognome: '', username: '', password: '', ruolo: 'dipendente' });
    }
    setShowEmployeeModal(true);
  };

  const handleApprove = async (timesheetId: number) => {
    try {
      await approveTimesheet(timesheetId, `${user?.nome} ${user?.cognome}`);
      setMessage({ type: 'success', text: 'Timesheet approvato!' });
      loadTimesheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleReject = async (timesheetId: number) => {
    try {
      await rejectTimesheet(timesheetId, `${user?.nome} ${user?.cognome}`);
      setMessage({ type: 'success', text: 'Timesheet rifiutato!' });
      loadTimesheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleApproveWeek = async (employeeId: number, weekStart: string, weekEnd: string) => {
    try {
      await approveWeek(employeeId, weekStart, weekEnd, `${user?.nome} ${user?.cognome}`);
      setMessage({ type: 'success', text: 'Settimana approvata!' });
      loadTimesheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  const handleRejectWeek = async (employeeId: number, weekStart: string, weekEnd: string) => {
    try {
      await rejectWeek(employeeId, weekStart, weekEnd, `${user?.nome} ${user?.cognome}`);
      setMessage({ type: 'success', text: 'Settimana rifiutata!' });
      loadTimesheets();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    }
  };

  // Raggruppa timesheet per settimana e dipendente
  const groupTimesheetsByWeek = () => {
    const groups: { [key: string]: { employee: Employee, weekStart: Date, weekEnd: Date, timesheets: Timesheet[] } } = {};
    
    timesheets.forEach(ts => {
      if (ts.stato !== 'pending') return; // Solo pending
      
      const tsDate = new Date(ts.data);
      const monday = getMonday(tsDate);
      const sunday = new Date(monday);
      sunday.setDate(sunday.getDate() + 6);
      
      const key = `${ts.employee_id}_${formatDate(monday)}`;
      
      if (!groups[key]) {
        const employee = employees.find(e => e.id === ts.employee_id);
        if (employee) {
          groups[key] = {
            employee,
            weekStart: monday,
            weekEnd: sunday,
            timesheets: []
          };
        }
      }
      
      if (groups[key]) {
        groups[key].timesheets.push(ts);
      }
    });
    
    return Object.values(groups).sort((a, b) => 
      b.weekStart.getTime() - a.weekStart.getTime()
    );
  };

  const openProjectModal = (project?: Project) => {
    if (project) {
      setEditingProject(project);
      setProjectForm({
        nome: project.nome,
        descrizione: project.descrizione,
        data_inizio: project.data_inizio,
        data_fine: project.data_fine,
        stato: project.stato
      });
    } else {
      setEditingProject(null);
      setProjectForm({ nome: '', descrizione: '', data_inizio: '', data_fine: '', stato: 'attivo' });
    }
    setShowProjectModal(true);
  };

  const openCommessaModal = (commessa?: Commessa) => {
    if (commessa) {
      setEditingCommessa(commessa);
      setCommessaForm({
        project_id: commessa.project_id.toString(),
        nome: commessa.nome,
        descrizione: commessa.descrizione,
        budget_ore: commessa.budget_ore.toString(),
        stato: commessa.stato
      });
    } else {
      setEditingCommessa(null);
      setCommessaForm({ project_id: '', nome: '', descrizione: '', budget_ore: '', stato: 'attiva' });
    }
    setShowCommessaModal(true);
  };

  const totalOre = timesheets.reduce((sum, ts) => sum + (Number(ts.ore) || 0), 0);
  const pendingCount = timesheets.filter(ts => ts.stato === 'pending').length;
  const weeksToApprove = groupTimesheetsByWeek();

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div>
      <h2>Dashboard Manager</h2>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', borderBottom: '2px solid #ddd' }}>
        <button
          className={`btn ${activeTab === 'timesheets' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('timesheets')}
        >
          Approvazioni ({weeksToApprove.length} settimane in attesa)
        </button>
        <button
          className={`btn ${activeTab === 'projects' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('projects')}
        >
          Progetti
        </button>
        <button
          className={`btn ${activeTab === 'commesse' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('commesse')}
        >
          Commesse
        </button>
        <button
          className={`btn ${activeTab === 'employees' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('employees')}
        >
          Dipendenti
        </button>
      </div>

      {/* Timesheets Tab */}
      {activeTab === 'timesheets' && (
        <div>
          <div className="card" style={{ marginBottom: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3>Approvazione Settimane</h3>
              <div style={{ fontSize: '18px', fontWeight: 'bold' }}>
                Totale Ore: {totalOre.toFixed(2)}
              </div>
            </div>

            <div style={{ display: 'flex', gap: '15px', marginBottom: '20px', flexWrap: 'wrap' }}>
              <div>
                <label>Dipendente: </label>
                <select value={filterEmployee} onChange={(e) => setFilterEmployee(e.target.value ? Number(e.target.value) : '')}>
                  <option value="">Tutti</option>
                  {employees.map(emp => (
                    <option key={emp.id} value={emp.id}>{emp.nome} {emp.cognome}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Anno: </label>
                <select value={filterAnno} onChange={(e) => setFilterAnno(Number(e.target.value))}>
                  {[2023, 2024, 2025, 2026].map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
              </div>
              <div>
                <label>Mese: </label>
                <select value={filterMese} onChange={(e) => setFilterMese(Number(e.target.value))}>
                  {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map(month => (
                    <option key={month} value={month}>
                      {new Date(2024, month - 1).toLocaleString('it-IT', { month: 'long' })}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Settimane da Approvare */}
          {filterStato === 'all' || filterStato === 'pending' ? (
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Settimane in Attesa di Approvazione</h3>
              {weeksToApprove.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
                  Nessuna settimana in attesa di approvazione
                </div>
              ) : (
                weeksToApprove.map((week, idx) => {
                  const weekTotal = week.timesheets.reduce((sum, ts) => sum + (Number(ts.ore) || 0), 0);
                  const weekStartStr = formatDate(week.weekStart);
                  const weekEndStr = formatDate(week.weekEnd);
                  
                  return (
                    <div key={idx} style={{ 
                      border: '1px solid #ddd', 
                      borderRadius: '8px', 
                      padding: '20px', 
                      marginBottom: '20px',
                      background: '#f8f9fa'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
                        <div>
                          <h4 style={{ margin: '0 0 5px 0' }}>
                            {week.employee.nome} {week.employee.cognome}
                          </h4>
                          <div style={{ color: '#666', fontSize: '14px' }}>
                            {week.weekStart.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} - {week.weekEnd.toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#0070f3' }}>
                            {(Number(weekTotal) || 0).toFixed(2)} ore
                          </div>
                          <div style={{ fontSize: '12px', color: '#666', marginTop: '5px' }}>
                            {week.timesheets.length} timesheet
                          </div>
                        </div>
                      </div>

                      <div style={{ marginBottom: '15px' }}>
                        <table className="table" style={{ fontSize: '13px' }}>
                          <thead>
                            <tr>
                              <th>Data</th>
                              <th>Progetto</th>
                              <th>Commessa</th>
                              <th>Ore</th>
                              <th>Descrizione</th>
                            </tr>
                          </thead>
                          <tbody>
                            {week.timesheets.map(ts => {
                              const project = projects.find(p => p.id === ts.project_id);
                              const commessa = commesse.find(c => c.id === ts.commessa_id);
                              
                              return (
                                <tr key={ts.id}>
                                  <td>{new Date(ts.data).toLocaleDateString('it-IT')}</td>
                                  <td>{project?.nome || '-'}</td>
                                  <td>{commessa?.nome || '-'}</td>
                                  <td>{ts.ore}</td>
                                  <td>{ts.descrizione || '-'}</td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>

                      <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                        <button 
                          className="btn btn-success" 
                          onClick={() => handleApproveWeek(week.employee.id, weekStartStr, weekEndStr)}
                        >
                          ✓ Approva Settimana
                        </button>
                        <button 
                          className="btn btn-danger" 
                          onClick={() => {
                            if (confirm('Sei sicuro di voler rifiutare questa settimana?')) {
                              handleRejectWeek(week.employee.id, weekStartStr, weekEndStr);
                            }
                          }}
                        >
                          ✗ Rifiuta Settimana
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="card">
              <h3 style={{ marginBottom: '20px' }}>Tutti i Timesheets</h3>
              <table className="table">
                <thead>
                  <tr>
                    <th>Data</th>
                    <th>Dipendente</th>
                    <th>Progetto</th>
                    <th>Commessa</th>
                    <th>Ore</th>
                    <th>Descrizione</th>
                    <th>Stato</th>
                    <th>Azioni</th>
                  </tr>
                </thead>
                <tbody>
                  {timesheets.length === 0 ? (
                    <tr>
                      <td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>
                        Nessun timesheet trovato
                      </td>
                    </tr>
                  ) : (
                    timesheets.map(ts => {
                      const project = projects.find(p => p.id === ts.project_id);
                      const commessa = commesse.find(c => c.id === ts.commessa_id);
                      
                      return (
                        <tr key={ts.id}>
                          <td>{new Date(ts.data).toLocaleDateString('it-IT')}</td>
                          <td>{ts.employee_name}</td>
                          <td>{project?.nome || '-'}</td>
                          <td>{commessa?.nome || '-'}</td>
                          <td>{ts.ore}</td>
                          <td>{ts.descrizione || '-'}</td>
                          <td>
                            <span className={`badge badge-${ts.stato}`}>
                              {ts.stato === 'pending' ? 'In attesa' : 
                               ts.stato === 'approved' ? 'Approvato' : 'Rifiutato'}
                            </span>
                          </td>
                          <td>
                            {ts.stato === 'pending' && (
                              <div style={{ display: 'flex', gap: '5px' }}>
                                <button 
                                  className="btn btn-success" 
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                  onClick={() => handleApprove(ts.id)}
                                >
                                  Approva
                                </button>
                                <button 
                                  className="btn btn-danger" 
                                  style={{ padding: '5px 10px', fontSize: '12px' }}
                                  onClick={() => handleReject(ts.id)}
                                >
                                  Rifiuta
                                </button>
                              </div>
                            )}
                            {ts.stato === 'approved' && ts.approvato_da && (
                              <small>Approvato da {ts.approvato_da}</small>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Projects Tab */}
      {activeTab === 'projects' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Gestione Progetti</h3>
            <button className="btn btn-primary" onClick={() => openProjectModal()}>
              + Nuovo Progetto
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Descrizione</th>
                <th>Data Inizio</th>
                <th>Data Fine</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {projects.map(project => (
                <tr key={project.id}>
                  <td>{project.nome}</td>
                  <td>{project.descrizione}</td>
                  <td>{new Date(project.data_inizio).toLocaleDateString('it-IT')}</td>
                  <td>{new Date(project.data_fine).toLocaleDateString('it-IT')}</td>
                  <td>
                    <span className={`badge badge-${project.stato === 'attivo' ? 'active' : 'completed'}`}>
                      {project.stato}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => openProjectModal(project)}
                      >
                        Modifica
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleDeleteProject(project.id)}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Commesse Tab */}
      {activeTab === 'commesse' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Gestione Commesse</h3>
            <button className="btn btn-primary" onClick={() => openCommessaModal()}>
              + Nuova Commessa
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Progetto</th>
                <th>Nome</th>
                <th>Descrizione</th>
                <th>Budget Ore</th>
                <th>Stato</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {commesse.map(commessa => {
                const project = projects.find(p => p.id === commessa.project_id);
                return (
                  <tr key={commessa.id}>
                    <td>{project?.nome || '-'}</td>
                    <td>{commessa.nome}</td>
                    <td>{commessa.descrizione}</td>
                    <td>{commessa.budget_ore}</td>
                    <td>
                      <span className={`badge badge-${commessa.stato === 'attiva' ? 'active' : 'completed'}`}>
                        {commessa.stato}
                      </span>
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '5px' }}>
                        <button 
                          className="btn btn-secondary" 
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => openCommessaModal(commessa)}
                        >
                          Modifica
                        </button>
                        <button 
                          className="btn btn-danger" 
                          style={{ padding: '5px 10px', fontSize: '12px' }}
                          onClick={() => handleDeleteCommessa(commessa.id)}
                        >
                          Elimina
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* Employees Tab */}
      {activeTab === 'employees' && (
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3>Gestione Dipendenti</h3>
            <button className="btn btn-primary" onClick={() => openEmployeeModal()}>
              + Nuovo Dipendente
            </button>
          </div>

          <table className="table">
            <thead>
              <tr>
                <th>Nome</th>
                <th>Cognome</th>
                <th>Username</th>
                <th>Ruolo</th>
                <th>Azioni</th>
              </tr>
            </thead>
            <tbody>
              {employees.map(employee => (
                <tr key={employee.id}>
                  <td>{employee.nome}</td>
                  <td>{employee.cognome}</td>
                  <td>{employee.username}</td>
                  <td>
                    <span className={`badge badge-${employee.ruolo === 'manager' ? 'active' : 'completed'}`}>
                      {employee.ruolo === 'manager' ? 'Manager' : 'Dipendente'}
                    </span>
                  </td>
                  <td>
                    <div style={{ display: 'flex', gap: '5px' }}>
                      <button 
                        className="btn btn-secondary" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => openEmployeeModal(employee)}
                      >
                        Modifica
                      </button>
                      <button 
                        className="btn btn-danger" 
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        onClick={() => handleDeleteEmployee(employee.id)}
                        disabled={employee.ruolo === 'manager' && employees.filter(e => e.ruolo === 'manager').length === 1}
                      >
                        Elimina
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Project Modal */}
      {showProjectModal && (
        <div className="modal" onClick={() => setShowProjectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingProject ? 'Modifica Progetto' : 'Nuovo Progetto'}</h3>
              <button className="close-btn" onClick={() => setShowProjectModal(false)}>×</button>
            </div>
            <form onSubmit={editingProject ? handleUpdateProject : handleCreateProject}>
              <div className="form-group">
                <label>Nome *</label>
                <input 
                  type="text" 
                  value={projectForm.nome} 
                  onChange={(e) => setProjectForm({ ...projectForm, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrizione</label>
                <textarea 
                  value={projectForm.descrizione} 
                  onChange={(e) => setProjectForm({ ...projectForm, descrizione: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Data Inizio *</label>
                <input 
                  type="date" 
                  value={projectForm.data_inizio} 
                  onChange={(e) => setProjectForm({ ...projectForm, data_inizio: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Data Fine *</label>
                <input 
                  type="date" 
                  value={projectForm.data_fine} 
                  onChange={(e) => setProjectForm({ ...projectForm, data_fine: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Stato *</label>
                <select 
                  value={projectForm.stato} 
                  onChange={(e) => setProjectForm({ ...projectForm, stato: e.target.value })}
                >
                  <option value="attivo">Attivo</option>
                  <option value="completato">Completato</option>
                  <option value="sospeso">Sospeso</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowProjectModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Commessa Modal */}
      {showCommessaModal && (
        <div className="modal" onClick={() => setShowCommessaModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingCommessa ? 'Modifica Commessa' : 'Nuova Commessa'}</h3>
              <button className="close-btn" onClick={() => setShowCommessaModal(false)}>×</button>
            </div>
            <form onSubmit={editingCommessa ? handleUpdateCommessa : handleCreateCommessa}>
              <div className="form-group">
                <label>Progetto *</label>
                <select 
                  value={commessaForm.project_id} 
                  onChange={(e) => setCommessaForm({ ...commessaForm, project_id: e.target.value })}
                  required
                >
                  <option value="">Seleziona progetto</option>
                  {projects.map(p => (
                    <option key={p.id} value={p.id}>{p.nome}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Nome *</label>
                <input 
                  type="text" 
                  value={commessaForm.nome} 
                  onChange={(e) => setCommessaForm({ ...commessaForm, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Descrizione</label>
                <textarea 
                  value={commessaForm.descrizione} 
                  onChange={(e) => setCommessaForm({ ...commessaForm, descrizione: e.target.value })}
                />
              </div>
              <div className="form-group">
                <label>Budget Ore *</label>
                <input 
                  type="number" 
                  value={commessaForm.budget_ore} 
                  onChange={(e) => setCommessaForm({ ...commessaForm, budget_ore: e.target.value })}
                  required
                  min="0"
                />
              </div>
              <div className="form-group">
                <label>Stato *</label>
                <select 
                  value={commessaForm.stato} 
                  onChange={(e) => setCommessaForm({ ...commessaForm, stato: e.target.value })}
                >
                  <option value="attiva">Attiva</option>
                  <option value="completata">Completata</option>
                  <option value="sospesa">Sospesa</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowCommessaModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Employee Modal */}
      {showEmployeeModal && (
        <div className="modal" onClick={() => setShowEmployeeModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editingEmployee ? 'Modifica Dipendente' : 'Nuovo Dipendente'}</h3>
              <button className="close-btn" onClick={() => setShowEmployeeModal(false)}>×</button>
            </div>
            <form onSubmit={editingEmployee ? handleUpdateEmployee : handleCreateEmployee}>
              <div className="form-group">
                <label>Nome *</label>
                <input 
                  type="text" 
                  value={employeeForm.nome} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, nome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Cognome *</label>
                <input 
                  type="text" 
                  value={employeeForm.cognome} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, cognome: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Username *</label>
                <input 
                  type="text" 
                  value={employeeForm.username} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, username: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Password *</label>
                <input 
                  type="password" 
                  value={employeeForm.password} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, password: e.target.value })}
                  required
                />
              </div>
              <div className="form-group">
                <label>Ruolo *</label>
                <select 
                  value={employeeForm.ruolo} 
                  onChange={(e) => setEmployeeForm({ ...employeeForm, ruolo: e.target.value as 'manager' | 'dipendente' })}
                >
                  <option value="dipendente">Dipendente</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn-secondary" onClick={() => setShowEmployeeModal(false)}>
                  Annulla
                </button>
                <button type="submit" className="btn btn-primary">
                  Salva
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

