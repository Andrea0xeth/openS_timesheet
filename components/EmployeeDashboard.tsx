'use client';

import { useState, useEffect } from 'react';
import { getUser } from '@/lib/auth';
import { 
  getProjects, 
  getCommesse, 
  getEmployeeTimesheets, 
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
  batchSaveTimesheets,
  submitWeekForApproval,
  Project,
  Commessa,
  Timesheet
} from '@/lib/api';

// Funzione per ottenere il lunedì della settimana
function getMonday(date: Date): Date {
  const d = new Date(date);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

// Funzione per ottenere i giorni della settimana
function getWeekDays(monday: Date): Date[] {
  const days: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    days.push(day);
  }
  return days;
}

// Formatta data come YYYY-MM-DD
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}

// Verifica se due date sono lo stesso giorno
function isSameDay(date1: Date, date2: Date): boolean {
  return formatDate(date1) === formatDate(date2);
}

interface TimesheetRow {
  id: string;
  project_id: number;
  commessa_id: number;
  project_name: string;
  commessa_name: string;
  days: { [date: string]: { timesheetId?: number; ore: number; descrizione: string } };
  total: number;
}

export default function EmployeeDashboard() {
  const user = getUser();
  const [projects, setProjects] = useState<Project[]>([]);
  const [allCommesse, setAllCommesse] = useState<Commessa[]>([]); // Tutte le commesse per visualizzazione
  const [timesheets, setTimesheets] = useState<Timesheet[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  
  // Gestione settimana corrente
  const [currentWeekMonday, setCurrentWeekMonday] = useState<Date>(getMonday(new Date()));
  const weekDays = getWeekDays(currentWeekMonday);
  
  // Cella in editing (formato: "rowId_dateKey")
  const [editingCell, setEditingCell] = useState<string | null>(null);
  
  // Modifiche locali non ancora salvate (formato: { "rowId_dateKey": { ore: number, timesheetId?: number } })
  const [localChanges, setLocalChanges] = useState<{ [key: string]: { ore: number; timesheetId?: number; project_id: number; commessa_id: number; date: string } }>({});
  
  // Righe aggiunte manualmente (per mantenere visibili anche se vuote)
  // Inizializza con 4 righe vuote di default
  const [addedRows, setAddedRows] = useState<Array<{ project_id: number; commessa_id: number }>>([
    { project_id: 0, commessa_id: 0 },
    { project_id: 0, commessa_id: 0 },
    { project_id: 0, commessa_id: 0 },
    { project_id: 0, commessa_id: 0 }
  ]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadData();
    setLocalChanges({}); // Reset modifiche locali quando cambia settimana
    setAddedRows([]); // Reset righe aggiunte quando cambia settimana
  }, [currentWeekMonday]);


  const loadData = async () => {
    try {
      setLoading(true);
      const [projectsRes, timesheetsRes] = await Promise.all([
        getProjects(),
        getEmployeeTimesheets(user?.id || 0)
      ]);
      setProjects(projectsRes.projects);
      setTimesheets(timesheetsRes.timesheets);
      
      // Carica commesse per tutti i progetti (per avere i nomi)
      const loadedCommesse: Commessa[] = [];
      for (const project of projectsRes.projects) {
        try {
          const commesseRes = await getCommesse(project.id);
          loadedCommesse.push(...commesseRes.commesse);
        } catch (err) {
          // Ignora errori per progetti senza commesse
        }
      }
      setAllCommesse(loadedCommesse);
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };


  // Organizza timesheet in righe per progetto/commessa (include modifiche locali)
  const organizeTimesheets = (): TimesheetRow[] => {
    const rowsMap: { [key: string]: TimesheetRow } = {};
    
    // Inizializza giorni della settimana
    const daysMap: { [date: string]: { timesheetId?: number; ore: number; descrizione: string } } = {};
    weekDays.forEach(day => {
      daysMap[formatDate(day)] = { ore: 0, descrizione: '' };
    });

    // Prima, aggiungi tutte le righe manualmente aggiunte (anche se vuote)
    // Le righe con project_id = 0 sono righe vuote da compilare
    addedRows.forEach((addedRow, index) => {
      // Se la riga ha project_id = 0, è una riga vuota da compilare
      if (addedRow.project_id === 0 && addedRow.commessa_id === 0) {
        const key = `empty_${index}`;
        rowsMap[key] = {
          id: key,
          project_id: 0,
          commessa_id: 0,
          project_name: '',
          commessa_name: '',
          days: JSON.parse(JSON.stringify(daysMap)),
          total: 0
        };
      } else if (addedRow.project_id > 0) {
        // Riga con progetto selezionato (anche se commessa non ancora selezionata)
        // Usa sempre empty_index per mantenere la riga visibile e tracciabile
        const key = `empty_${index}`;
        if (!rowsMap[key]) {
          const project = projects.find(p => p.id === addedRow.project_id);
          const commessa = addedRow.commessa_id > 0 ? allCommesse.find(c => c.id === addedRow.commessa_id) : null;
          
          rowsMap[key] = {
            id: key,
            project_id: addedRow.project_id,
            commessa_id: addedRow.commessa_id || 0,
            project_name: project?.nome || '',
            commessa_name: commessa?.nome || '',
            days: JSON.parse(JSON.stringify(daysMap)),
            total: 0
          };
        }
      }
    });

    // Raggruppa timesheet per progetto/commessa
    timesheets.forEach(ts => {
      const tsDate = new Date(ts.data);
      const tsDateStr = formatDate(tsDate);
      const weekStartStr = formatDate(weekDays[0]);
      const weekEndStr = formatDate(weekDays[6]);
      
      // Verifica se il timesheet è nella settimana corrente
      if (tsDateStr < weekStartStr || tsDateStr > weekEndStr) return;
      
      const key = `${ts.project_id}_${ts.commessa_id}`;
      const dateKey = tsDateStr;
      const cellKey = `${key}_${dateKey}`;
      
      // Se c'è una modifica locale, usa quella invece del timesheet salvato
      if (localChanges[cellKey]) {
        return; // Salta questo timesheet, useremo la modifica locale
      }
      
      // Se questa riga è già in addedRows, non crearla di nuovo (usa quella esistente)
      const isInAddedRows = addedRows.some(r => r.project_id === ts.project_id && r.commessa_id === ts.commessa_id);
      if (isInAddedRows) {
        // Aggiorna solo i giorni, non creare nuova riga
        const existingKey = Object.keys(rowsMap).find(k => {
          const r = rowsMap[k];
          return r.project_id === ts.project_id && r.commessa_id === ts.commessa_id;
        });
        if (existingKey) {
          rowsMap[existingKey].days[dateKey] = {
            timesheetId: ts.id,
            ore: ts.ore,
            descrizione: ts.descrizione || ''
          };
        }
        return;
      }
      
      if (!rowsMap[key]) {
        const project = projects.find(p => p.id === ts.project_id);
        const commessa = allCommesse.find(c => c.id === ts.commessa_id);
        
        rowsMap[key] = {
          id: key,
          project_id: ts.project_id,
          commessa_id: ts.commessa_id,
          project_name: project?.nome || '',
          commessa_name: commessa?.nome || '',
          days: JSON.parse(JSON.stringify(daysMap)),
          total: 0
        };
      }
      
      rowsMap[key].days[dateKey] = {
        timesheetId: ts.id,
        ore: ts.ore,
        descrizione: ts.descrizione || ''
      };
    });

    // Applica modifiche locali
    Object.entries(localChanges).forEach(([cellKey, change]) => {
      // cellKey formato: "projectId_commessaId_dateKey"
      const parts = cellKey.split('_');
      const dateKey = parts.slice(-1)[0]; // Ultima parte è la data
      
      // Trova la riga corrispondente in addedRows
      const addedRowIndex = addedRows.findIndex(r => r.project_id === change.project_id && r.commessa_id === change.commessa_id);
      
      let fullRowKey = '';
      if (addedRowIndex >= 0) {
        // Usa empty_index per mantenere la riga tracciabile
        fullRowKey = `empty_${addedRowIndex}`;
      } else {
        // Se non è in addedRows, usa il formato projectId_commessaId
        fullRowKey = `${change.project_id}_${change.commessa_id}`;
      }
      
      if (!rowsMap[fullRowKey]) {
        const project = projects.find(p => p.id === change.project_id);
        const commessa = allCommesse.find(c => c.id === change.commessa_id);
        
        rowsMap[fullRowKey] = {
          id: fullRowKey,
          project_id: change.project_id,
          commessa_id: change.commessa_id,
          project_name: project?.nome || '',
          commessa_name: commessa?.nome || '',
          days: JSON.parse(JSON.stringify(daysMap)),
          total: 0
        };
      }
      
      rowsMap[fullRowKey].days[change.date] = {
        timesheetId: change.timesheetId,
        ore: change.ore,
        descrizione: ''
      };
    });

      // Calcola totali
      Object.values(rowsMap).forEach(row => {
        row.total = Object.values(row.days).reduce((sum, day) => sum + (Number(day.ore) || 0), 0);
      });

    return Object.values(rowsMap);
  };


  const handleSaveCell = (cellKey: string, date: Date, ore: number) => {
    if (!user?.id) return;
    
    const dateStr = formatDate(date);
    
    // Estrai project_id e commessa_id dal cellKey
    // Formato: "projectId_commessaId_dateKey" o "empty_X_dateKey"
    let projectId: number, commessaId: number;
    
    if (cellKey.startsWith('empty_')) {
      // Riga vuota - estrai l'indice e trova project/commessa da addedRows
      const parts = cellKey.split('_');
      const emptyIdx = parseInt(parts[1]);
      const emptyRow = addedRows[emptyIdx];
      if (!emptyRow || emptyRow.project_id === 0 || emptyRow.commessa_id === 0) {
        setMessage({ type: 'error', text: 'Seleziona progetto e commessa prima di inserire le ore' });
        setEditingCell(null);
        return;
      }
      projectId = emptyRow.project_id;
      commessaId = emptyRow.commessa_id;
    } else {
      // cellKey formato: "projectId_commessaId_dateKey"
      const parts = cellKey.split('_');
      projectId = parseInt(parts[0]);
      commessaId = parseInt(parts[1]);
    }
    
    // Usa sempre il formato projectId_commessaId per il cellKey finale
    const finalCellKey = `${projectId}_${commessaId}_${dateStr}`;
    const rows = organizeTimesheets();
    const row = rows.find(r => r.project_id === projectId && r.commessa_id === commessaId);
    const existingCell = row?.days[dateStr];
    
    // NON validare il limite di 8 ore qui - l'utente può inserire qualsiasi valore
    // La validazione avverrà solo quando si clicca "Salva e Invia"
    
    // Salva in memoria locale usando sempre il formato projectId_commessaId
    if (ore > 0) {
      setLocalChanges(prev => ({
        ...prev,
        [finalCellKey]: {
          ore: ore,
          timesheetId: existingCell?.timesheetId,
          project_id: projectId,
          commessa_id: commessaId,
          date: dateStr
        }
      }));
      
      // Rimuovi anche eventuali chiavi vecchie (empty_X) se esistono
      if (cellKey !== finalCellKey) {
        setLocalChanges(prev => {
          const newChanges = { ...prev };
          delete newChanges[cellKey];
          return newChanges;
        });
      }
    } else {
      // Rimuovi modifica locale se ore = 0
      setLocalChanges(prev => {
        const newChanges = { ...prev };
        delete newChanges[finalCellKey];
        delete newChanges[cellKey]; // Rimuovi anche la chiave vecchia se esiste
        return newChanges;
      });
    }
    
    setEditingCell(null);
  };

  const handleAddNewRow = () => {
    setAddedRows(prev => [...prev, { project_id: 0, commessa_id: 0 }]);
  };

  const handleDeleteRow = (addedRowIndex: number, row: TimesheetRow) => {
    if (!confirm('Sei sicuro di voler eliminare questa riga? Tutte le ore inserite verranno perse.')) {
      return;
    }

    // Rimuovi tutte le modifiche locali per questa riga PRIMA di rimuovere la riga
    setLocalChanges(prev => {
      const newChanges = { ...prev };
      Object.keys(newChanges).forEach(key => {
        // Se la chiave inizia con empty_X o project_id_commessa_id di questa riga
        if (row.id.startsWith('empty_')) {
          // Rimuovi tutte le celle che iniziano con empty_X_dateKey
          if (key.startsWith(`${row.id}_`)) {
            delete newChanges[key];
          }
        } else if (row.project_id > 0 && row.commessa_id > 0) {
          // Rimuovi tutte le celle che iniziano con project_id_commessa_id_dateKey
          if (key.startsWith(`${row.project_id}_${row.commessa_id}_`)) {
            delete newChanges[key];
          }
        }
      });
      return newChanges;
    });

    // Rimuovi la riga da addedRows solo se è in addedRows
    if (addedRowIndex >= 0) {
      setAddedRows(prev => {
        const newRows = [...prev];
        newRows.splice(addedRowIndex, 1);
        return newRows;
      });
    }
  };

  const handleSaveAndSubmitWeek = async () => {
    if (!user?.id) return;
    
    // Verifica che la settimana sia completa
    if (!weekValidation.isValid) {
      const incompleteDaysList = weekValidation.incompleteDays
        .map(d => `${d.day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })} (${d.total.toFixed(1)}h, mancano ${d.missing.toFixed(1)}h)`)
        .join(', ');
      setMessage({ 
        type: 'error', 
        text: `Impossibile inviare: tutti i giorni devono avere esattamente 8 ore. Giorni incompleti: ${incompleteDaysList}` 
      });
      return;
    }
    
    const weekStart = formatDate(weekDays[0]);
    const weekEnd = formatDate(weekDays[6]);
    
    // Conta modifiche locali
    const changesCount = Object.keys(localChanges).length;

    if (!confirm(`Vuoi salvare e inviare in approvazione la settimana? ${changesCount > 0 ? `(${changesCount} modifiche da salvare)` : ''}`)) {
      return;
    }

    try {
      setLoading(true);
      
      // Salva tutte le modifiche locali
      if (changesCount > 0) {
        await saveAllLocalChanges();
      }
      
      // Invia settimana in approvazione
      await submitWeekForApproval(user.id, weekStart, weekEnd);
      
      setMessage({ type: 'success', text: 'Settimana salvata e inviata in approvazione!' });
      setLocalChanges({});
      setAddedRows([]); // Reset righe aggiunte dopo il salvataggio
      await loadData();
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const saveAllLocalChanges = async () => {
    if (!user?.id) return;
    
    const changes = Object.values(localChanges);
    
    // Raggruppa per operazione (create, update, delete)
    const toCreate: Array<{ employee_id: number; project_id: number; commessa_id: number; data: string; ore: number; descrizione: string; stato: string }> = [];
    const toUpdate: Array<{ id: number; ore: number; descrizione: string; stato: string }> = [];
    const toDelete: number[] = [];
    
    changes.forEach(change => {
      if (change.ore > 0) {
        if (change.timesheetId) {
          toUpdate.push({
            id: change.timesheetId,
            ore: change.ore,
            descrizione: '',
            stato: 'pending'
          });
        } else {
          toCreate.push({
            employee_id: user.id!,
            project_id: change.project_id,
            commessa_id: change.commessa_id,
            data: change.date,
            ore: change.ore,
            descrizione: '',
            stato: 'pending'
          });
        }
      } else if (change.timesheetId) {
        toDelete.push(change.timesheetId);
      }
    });
    
    // Se non ci sono modifiche, esci
    if (toCreate.length === 0 && toUpdate.length === 0 && toDelete.length === 0) {
      return;
    }
    
    // Salva tutto in una singola chiamata batch
    await batchSaveTimesheets(toCreate, toUpdate, toDelete);
  };

  const goToPreviousWeek = () => {
    const newMonday = new Date(currentWeekMonday);
    newMonday.setDate(newMonday.getDate() - 7);
    setCurrentWeekMonday(newMonday);
  };

  const goToNextWeek = () => {
    const newMonday = new Date(currentWeekMonday);
    newMonday.setDate(newMonday.getDate() + 7);
    setCurrentWeekMonday(newMonday);
  };

  const goToCurrentWeek = () => {
    setCurrentWeekMonday(getMonday(new Date()));
  };

  const rows = organizeTimesheets();
  
  // Calcola totali per giorno
  const dayTotals = weekDays.map(day => {
    const dateKey = formatDate(day);
    return rows.reduce((sum, row) => sum + (row.days[dateKey]?.ore || 0), 0);
  });
  
  const weekTotal = dayTotals.reduce((sum, total) => sum + total, 0);
  
  // Trova commesse già selezionate (escludendo la riga corrente)
  const getUsedCommesse = (excludeRowIndex: number) => {
    const used: Set<number> = new Set();
    addedRows.forEach((row, idx) => {
      if (idx !== excludeRowIndex && row.project_id > 0 && row.commessa_id > 0) {
        used.add(row.commessa_id);
      }
    });
    return used;
  };
  
  // Trova progetti con tutte le commesse già usate (escludendo la riga corrente)
  const getProjectsWithAllCommesseUsed = (excludeRowIndex: number) => {
    const usedCommesse = getUsedCommesse(excludeRowIndex);
    const projectsWithAllUsed: Set<number> = new Set();
    
    projects.forEach(project => {
      const projectCommesse = allCommesse.filter(c => c.project_id === project.id);
      if (projectCommesse.length > 0) {
        const allUsed = projectCommesse.every(c => usedCommesse.has(c.id));
        if (allUsed) {
          projectsWithAllUsed.add(project.id);
        }
      }
    });
    
    return projectsWithAllUsed;
  };
  
  // Verifica se la settimana è completa (tutti i giorni con esattamente 8 ore)
  const weekValidation = (() => {
    const incompleteDays: Array<{ day: Date; total: number; missing: number }> = [];
    
    weekDays.forEach((day, idx) => {
      const total = dayTotals[idx] || 0;
      if (total !== 8) {
        incompleteDays.push({
          day,
          total,
          missing: 8 - total
        });
      }
    });
    
    return {
      isValid: incompleteDays.length === 0,
      incompleteDays
    };
  })();

  // Trova giorni che superano 8 ore
  const overLimitDays = weekDays
    .map((day, idx) => ({
      day,
      total: dayTotals[idx] || 0
    }))
    .filter(d => d.total > 8);

  // Verifica se la settimana è approvata
  const weekTimesheets = timesheets.filter(ts => {
    const tsDate = new Date(ts.data);
    return tsDate >= weekDays[0] && tsDate <= weekDays[6];
  });
  const isWeekApproved = weekTimesheets.length > 0 && weekTimesheets.every(ts => ts.stato === 'approved');

  if (loading) {
    return <div className="loading">Caricamento...</div>;
  }

  return (
    <div>
      <h2>Dashboard Dipendente</h2>

      {message && (
        <div className={`alert alert-${message.type === 'success' ? 'success' : 'error'}`}>
          {message.text}
        </div>
      )}

      <div className="card">
        <div style={{ marginBottom: '20px' }}>
          <h3>Timesheet Settimanale</h3>
        </div>

        {/* Navigazione Settimane */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', padding: '15px', background: '#f8f9fa', borderRadius: '4px' }}>
          <button className="btn btn-secondary" onClick={goToPreviousWeek}>
            ← Settimana Precedente
          </button>
          <div style={{ textAlign: 'center' }}>
            <h4 style={{ margin: '0 0 5px 0' }}>
              {weekDays[0].toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })} - {weekDays[6].toLocaleDateString('it-IT', { day: 'numeric', month: 'long', year: 'numeric' })}
            </h4>
            <button className="btn btn-secondary" onClick={goToCurrentWeek} style={{ fontSize: '12px', padding: '5px 10px' }}>
              Settimana Corrente
            </button>
          </div>
          <button className="btn btn-secondary" onClick={goToNextWeek}>
            Settimana Successiva →
          </button>
        </div>

        {/* Tabella Timesheet */}
        <div style={{ overflowX: 'auto' }}>
          <table className="table" style={{ minWidth: '800px' }}>
            <thead>
              <tr>
                <th style={{ minWidth: '50px', position: 'sticky', left: 0, background: '#f8f9fa', zIndex: 10, textAlign: 'center' }}>
                  {/* Colonna per il cestino */}
                </th>
                <th style={{ minWidth: '200px', position: 'sticky', left: '50px', background: '#f8f9fa', zIndex: 10 }}>
                  Progetto
                </th>
                <th style={{ minWidth: '200px', position: 'sticky', left: '250px', background: '#f8f9fa', zIndex: 10 }}>
                  Commessa
                </th>
                {weekDays.map((day, idx) => {
                  const dayTotal = dayTotals[idx] || 0;
                  const isOverLimit = dayTotal > 8;
                  return (
                    <th key={idx} style={{ minWidth: '80px', textAlign: 'center' }}>
                      <div>{day.getDate()}</div>
                      <div style={{ fontSize: '11px', color: '#666' }}>
                        {day.toLocaleDateString('it-IT', { weekday: 'short' })}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        fontWeight: 'bold',
                        marginTop: '5px',
                        color: isOverLimit ? '#dc3545' : dayTotal > 0 ? '#28a745' : '#666'
                      }}>
                        {dayTotal > 0 ? `${dayTotal.toFixed(1)}h` : ''}
                      </div>
                      {isOverLimit && (
                        <div style={{ fontSize: '10px', color: '#dc3545', marginTop: '2px' }}>
                          ⚠ Max 8h
                        </div>
                      )}
                    </th>
                  );
                })}
                <th style={{ minWidth: '100px', textAlign: 'center', background: '#f8f9fa' }}>
                  Tot. Ore
                </th>
              </tr>
            </thead>
            <tbody>
              {/* Righe Progetto/Commessa */}
              {rows.map((row, rowIndex) => {
                const isEmptyRow = row.project_id === 0 && row.commessa_id === 0;
                
                // Trova l'indice nella lista addedRows
                let addedRowIndex = -1;
                if (isEmptyRow && row.id.startsWith('empty_')) {
                  addedRowIndex = parseInt(row.id.split('_')[1]);
                } else {
                  // Cerca se questa riga è in addedRows
                  addedRowIndex = addedRows.findIndex(r => r.project_id === row.project_id && r.commessa_id === row.commessa_id);
                }
                
                // Usa sempre l'ID della riga come key, non l'indice
                const rowKey = row.id;
                
                // Se la riga è in addedRows o è vuota, mostra i dropdown
                const isEditableRow = isEmptyRow || addedRowIndex >= 0;
                
                return (
                <tr key={rowKey}>
                  <td style={{ position: 'sticky', left: 0, background: 'white', zIndex: 5, textAlign: 'center', width: '50px' }}>
                    {(isEditableRow || addedRowIndex >= 0) && (
                      <button
                        onClick={() => handleDeleteRow(addedRowIndex, row)}
                        style={{
                          background: 'transparent',
                          border: 'none',
                          cursor: 'pointer',
                          padding: '5px',
                          fontSize: '16px',
                          color: '#dc3545',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          width: '100%'
                        }}
                        title="Elimina riga"
                      >
                        🗑️
                      </button>
                    )}
                  </td>
                  <td style={{ position: 'sticky', left: '50px', background: 'white', zIndex: 5 }}>
                    {isEditableRow ? (
                      <select
                        value={isEmptyRow ? (addedRows[addedRowIndex]?.project_id || '') : row.project_id}
                        onChange={(e) => {
                          const newProjectId = e.target.value ? Number(e.target.value) : 0;
                          if (isEmptyRow) {
                            setAddedRows(prev => {
                              const newRows = [...prev];
                              newRows[addedRowIndex] = { ...newRows[addedRowIndex], project_id: newProjectId, commessa_id: 0 };
                              return newRows;
                            });
                          } else {
                            // Aggiorna la riga esistente in addedRows
                            setAddedRows(prev => {
                              const newRows = [...prev];
                              newRows[addedRowIndex] = { ...newRows[addedRowIndex], project_id: newProjectId, commessa_id: 0 };
                              return newRows;
                            });
                            // Rimuovi le modifiche locali per questa riga
                            setLocalChanges(prev => {
                              const newChanges = { ...prev };
                              Object.keys(newChanges).forEach(key => {
                                if (key.startsWith(`${row.project_id}_${row.commessa_id}_`)) {
                                  delete newChanges[key];
                                }
                              });
                              return newChanges;
                            });
                          }
                        }}
                        style={{ width: '100%', padding: '5px' }}
                      >
                        <option value="">Seleziona progetto</option>
                        {projects
                          .filter(p => {
                            // Se il progetto è già selezionato in questa riga, mostralo sempre
                            if (addedRows[addedRowIndex]?.project_id === p.id) {
                              return true;
                            }
                            // Altrimenti, mostra solo se non ha tutte le commesse già usate
                            const projectsWithAllUsed = getProjectsWithAllCommesseUsed(addedRowIndex);
                            return !projectsWithAllUsed.has(p.id);
                          })
                          .map(p => (
                            <option key={p.id} value={p.id}>{p.nome}</option>
                          ))
                        }
                      </select>
                    ) : (
                      row.project_name
                    )}
                  </td>
                  <td style={{ position: 'sticky', left: '250px', background: 'white', zIndex: 5 }}>
                    {isEditableRow ? (
                      <select
                        value={isEmptyRow ? (addedRows[addedRowIndex]?.commessa_id || '') : row.commessa_id}
                        onChange={(e) => {
                          const newCommessaId = e.target.value ? Number(e.target.value) : 0;
                          if (isEmptyRow) {
                            setAddedRows(prev => {
                              const newRows = [...prev];
                              newRows[addedRowIndex] = { ...newRows[addedRowIndex], commessa_id: newCommessaId };
                              return newRows;
                            });
                          } else {
                            // Aggiorna la riga esistente in addedRows
                            setAddedRows(prev => {
                              const newRows = [...prev];
                              newRows[addedRowIndex] = { ...newRows[addedRowIndex], commessa_id: newCommessaId };
                              return newRows;
                            });
                            // Rimuovi le modifiche locali per questa riga
                            setLocalChanges(prev => {
                              const newChanges = { ...prev };
                              Object.keys(newChanges).forEach(key => {
                                if (key.startsWith(`${row.project_id}_${row.commessa_id}_`)) {
                                  delete newChanges[key];
                                }
                              });
                              return newChanges;
                            });
                          }
                        }}
                        disabled={!addedRows[addedRowIndex]?.project_id && !row.project_id}
                        style={{ width: '100%', padding: '5px' }}
                      >
                        <option value="">Seleziona commessa</option>
                        {(addedRows[addedRowIndex]?.project_id || row.project_id) && 
                          (() => {
                            const currentProjectId = addedRows[addedRowIndex]?.project_id || row.project_id;
                            const usedCommesse = getUsedCommesse(addedRowIndex);
                            return allCommesse
                              .filter(c => {
                                // Filtra per progetto
                                if (c.project_id !== currentProjectId) return false;
                                // Se questa commessa è già selezionata in questa riga, mostrala sempre
                                if (addedRows[addedRowIndex]?.commessa_id === c.id) return true;
                                // Altrimenti, mostra solo se non è già usata in altre righe
                                return !usedCommesse.has(c.id);
                              })
                              .map(c => (
                                <option key={c.id} value={c.id}>{c.nome}</option>
                              ));
                          })()
                        }
                      </select>
                    ) : (
                      row.commessa_name
                    )}
                  </td>
                  {weekDays.map((day, dayIdx) => {
                    const dateKey = formatDate(day);
                    
                    // Determina il cellKey corretto
                    // Usa sempre project_id_commessa_id_dateKey se la riga ha progetto e commessa
                    // Altrimenti usa empty_X_dateKey per righe vuote o con solo progetto
                    let cellKey: string;
                    if (row.project_id > 0 && row.commessa_id > 0) {
                      // Riga con progetto e commessa - usa sempre questo formato per consistenza
                      cellKey = `${row.project_id}_${row.commessa_id}_${dateKey}`;
                    } else if (row.id.startsWith('empty_')) {
                      // Riga vuota o con solo progetto - usa empty_X_dateKey
                      cellKey = `${row.id}_${dateKey}`;
                    } else {
                      // Fallback per altre righe
                      cellKey = `${row.id}_${dateKey}`;
                    }
                    
                    const isEditing = editingCell === cellKey;
                    
                    // Usa modifica locale se presente, altrimenti usa cella salvata
                    const localChange = localChanges[cellKey];
                    const cell = localChange 
                      ? { ore: localChange.ore, timesheetId: localChange.timesheetId, descrizione: '' }
                      : row.days[dateKey];
                    const hasLocalChange = !!localChange;
                    
                    // Permetti di scrivere se:
                    // 1. La riga ha progetto E commessa selezionati, OPPURE
                    // 2. La riga è vuota ma ha un progetto selezionato (per permettere di inserire ore anche prima di selezionare commessa)
                    const canEdit = (row.project_id > 0 && row.commessa_id > 0) || 
                                   (isEmptyRow && addedRows[addedRowIndex]?.project_id > 0 && addedRows[addedRowIndex]?.commessa_id > 0) ||
                                   (!isEmptyRow && row.project_id > 0);
                    
                    return (
                      <td key={dayIdx} style={{ textAlign: 'center', padding: '2px' }}>
                        {isEditing ? (
                          <input
                            type="number"
                            step="0.5"
                            min="0"
                            defaultValue={cell?.ore || 0}
                            style={{ width: '60px', textAlign: 'center', padding: '4px' }}
                            onBlur={(e) => {
                              const ore = parseFloat(e.target.value) || 0;
                              handleSaveCell(cellKey, day, ore);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                const ore = parseFloat((e.target as HTMLInputElement).value) || 0;
                                handleSaveCell(cellKey, day, ore);
                                (e.target as HTMLInputElement).blur();
                              }
                              if (e.key === 'Escape') {
                                e.preventDefault();
                                setEditingCell(null);
                                (e.target as HTMLInputElement).blur();
                              }
                            }}
                            autoFocus
                          />
                        ) : (
                          <div
                            onClick={(e) => {
                              if (!canEdit) {
                                setMessage({ type: 'error', text: 'Seleziona progetto e commessa prima di inserire le ore' });
                                return;
                              }
                              e.preventDefault();
                              e.stopPropagation();
                              setEditingCell(cellKey);
                            }}
                            style={{
                              minHeight: '30px',
                              padding: '5px',
                              cursor: canEdit ? 'pointer' : 'not-allowed',
                              background: cell?.ore > 0 ? (hasLocalChange ? '#fff3cd' : '#e3f2fd') : 'transparent',
                              borderRadius: '3px',
                              border: hasLocalChange ? '2px solid #ffc107' : '1px dashed #ddd',
                              opacity: canEdit ? 1 : 0.5
                            }}
                            title={!canEdit ? 'Seleziona progetto e commessa' : hasLocalChange ? 'Modifica non salvata' : ''}
                          >
                            {cell?.ore > 0 ? Number(cell.ore).toFixed(1) : ''}
                            {hasLocalChange && <span style={{ fontSize: '10px', color: '#ffc107' }}> *</span>}
                          </div>
                        )}
                      </td>
                    );
                  })}
                  <td style={{ textAlign: 'center', fontWeight: 'bold', background: '#f8f9fa' }}>
                    {(Number(row.total) || 0).toFixed(1)}
                  </td>
                </tr>
                );
              })}

              {/* Riga per aggiungere nuova riga con totali giornalieri */}
              <tr style={{ background: '#f0f0f0', fontWeight: 'bold' }}>
                <td colSpan={3} style={{ position: 'sticky', left: 0, background: '#f0f0f0', zIndex: 5, textAlign: 'center' }}>
                  <button
                    className="btn btn-primary"
                    onClick={handleAddNewRow}
                    style={{ padding: '8px 15px', fontSize: '14px' }}
                  >
                    + Aggiungi Riga
                  </button>
                </td>
                {dayTotals.map((total, idx) => {
                  const isOverLimit = total > 8;
                  return (
                    <td 
                      key={idx} 
                      style={{ 
                        textAlign: 'center', 
                        background: isOverLimit ? '#f8d7da' : total > 0 ? '#fff3cd' : '#f0f0f0',
                        color: isOverLimit ? '#dc3545' : total > 0 ? '#000' : '#666',
                        fontWeight: 'bold',
                        border: isOverLimit ? '2px solid #dc3545' : 'none'
                      }}
                    >
                      {total > 0 ? total.toFixed(1) : ''}
                      {isOverLimit && <div style={{ fontSize: '10px', marginTop: '2px' }}>⚠</div>}
                    </td>
                  );
                })}
                <td style={{ textAlign: 'center', background: '#f0f0f0', fontWeight: 'bold' }}>
                  {weekTotal.toFixed(1)}
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* Totale Ore e Pulsante Invia in Approvazione */}
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '20px', justifyContent: 'flex-end' }}>
          <div style={{ fontSize: '18px', fontWeight: 'bold', marginRight: '20px' }}>
            Totale Ore: <span style={{ color: '#0070f3' }}>{weekTotal.toFixed(2)}</span>
          </div>
          {!isWeekApproved && (
            <button 
              className="btn btn-success" 
              onClick={handleSaveAndSubmitWeek}
              disabled={loading || !weekValidation.isValid}
              title={!weekValidation.isValid ? 'Completa tutti i giorni con esattamente 8 ore per inviare' : ''}
            >
              {Object.keys(localChanges).length > 0 ? 'Salva e Invia in Approvazione' : 'Invia in Approvazione'}
              {Object.keys(localChanges).length > 0 && ` (${Object.keys(localChanges).length} modifiche)`}
            </button>
          )}
          {isWeekApproved && (
            <span style={{ color: '#28a745', fontWeight: 'bold' }}>✓ Settimana Approvata</span>
          )}
        </div>

        {/* Messaggio di avviso per giorni che superano 8 ore */}
        {overLimitDays.length > 0 && (
          <div style={{ 
            padding: '10px 15px', 
            background: '#f8d7da', 
            border: '1px solid #dc3545', 
            borderRadius: '4px',
            fontSize: '14px',
            marginTop: '20px',
            color: '#721c24'
          }}>
            <strong>⚠ Attenzione:</strong> Alcuni giorni superano 8 ore:
            <div style={{ marginTop: '5px', fontSize: '13px' }}>
              {overLimitDays.map((d, idx) => (
                <span key={idx} style={{ marginRight: '15px' }}>
                  <strong>{d.day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}:</strong> {d.total.toFixed(1)}h (supera di {(d.total - 8).toFixed(1)}h)
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Messaggio di avviso settimana incompleta */}
        {!isWeekApproved && !weekValidation.isValid && (
          <div style={{ 
            padding: '10px 15px', 
            background: '#fff3cd', 
            border: '1px solid #ffc107', 
            borderRadius: '4px',
            fontSize: '14px',
            maxWidth: '100%',
            width: '100%',
            marginTop: '20px'
          }}>
            <strong>⚠ Settimana incompleta:</strong> {weekValidation.incompleteDays.length} giorno/i non ha/hanno esattamente 8 ore.
            <div style={{ marginTop: '5px', fontSize: '13px' }}>
              {weekValidation.incompleteDays.map((d, idx) => (
                <span key={idx} style={{ marginRight: '15px' }}>
                  <strong>{d.day.toLocaleDateString('it-IT', { weekday: 'short', day: 'numeric' })}:</strong> {d.total.toFixed(1)}h (mancano {d.missing.toFixed(1)}h)
                </span>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
