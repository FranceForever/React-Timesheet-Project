import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import LoginPage from './components/LoginPage';
import AdminTimesheetEntry from './components/AdminTimesheetEntry';
import DeveloperTimesheetEntry from './components/DeveloperTimesheetEntry';
import { auth } from './components/firebase';

function App() {
  const [user, setUser] = useState();
  useEffect(() => {
    auth.onAuthStateChanged(user => {
      setUser(user);
    })
  })

  return (
    <Router>
      <Routes>
        {/* <Route path="/" element={user ? <Navigate to="/admin-timesheet"/> : <LoginPage />} /> */}
        <Route path="/" element={<LoginPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/admin-timesheet" element={<AdminTimesheetEntry />} />
        <Route path="/developer-timesheet" element={<DeveloperTimesheetEntry />} />
      </Routes>
    </Router>
  );
}

export default App;