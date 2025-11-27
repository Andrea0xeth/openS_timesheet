'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { isAuthenticated, isManager, getUser, logout } from '@/lib/auth';
import ManagerDashboard from '@/components/ManagerDashboard';
import EmployeeDashboard from '@/components/EmployeeDashboard';

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (!isAuthenticated()) {
      router.push('/');
      return;
    }
    setUser(getUser());
  }, [router]);

  if (!mounted || !isAuthenticated()) {
    return <div className="loading">Caricamento...</div>;
  }

  const manager = isManager();

  return (
    <div>
      <header style={{ 
        background: 'white', 
        padding: '15px 20px', 
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
        marginBottom: '20px'
      }}>
        <div className="container" style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center' 
        }}>
          <h1 style={{ margin: 0 }}>Timesheet System</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
            <span>Ciao, {user?.nome} {user?.cognome}</span>
            <span className="badge badge-active">{manager ? 'Manager' : 'Dipendente'}</span>
            <button 
              className="btn btn-secondary" 
              onClick={() => {
                logout();
                router.push('/');
              }}
            >
              Logout
            </button>
          </div>
        </div>
      </header>

      <div className="container">
        {manager ? <ManagerDashboard /> : <EmployeeDashboard />}
      </div>
    </div>
  );
}

