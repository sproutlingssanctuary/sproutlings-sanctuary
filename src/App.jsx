import React, { useState } from 'react'
import KioskView from './components/KioskView'
import AdminView from './components/AdminView'
import { getCurrentUser } from './utils/api'

export default function App() {
  const [view, setView] = useState('kiosk')

  return view === 'kiosk'
    ? <KioskView onAdminAccess={() => setView('admin')} />
    : <AdminView onBack={() => setView('kiosk')} />
}
