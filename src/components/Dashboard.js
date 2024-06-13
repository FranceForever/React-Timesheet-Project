import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import './Dashboard.css'; // Import CSS file for styling
import AdminTimesheetEntry from './AdminTimesheetEntry'; // Import AdminTimesheetEntry component
import DeveloperTimesheetEntry from './DeveloperTimesheetEntry'; // Import DeveloperTimesheetEntry component

function Dashboard() {
  const location = useLocation();
  const navigate = useNavigate();
  const { username, role } = location.state || {};

  const [logins, setLogins] = useState(() => {
    // Retrieve stored logins from local storage if available
    const savedLogins = localStorage.getItem('logins');
    return savedLogins ? JSON.parse(savedLogins) : [];
  });

  useEffect(() => {
    if (username && role) {
      const newLogin = {
        username,
        role,
        date: new Date().toLocaleDateString(),
        time: new Date().toLocaleTimeString(),
      };

      const updatedLogins = [...logins, newLogin];
      setLogins(updatedLogins);

      // Store logins in local storage
      localStorage.setItem('logins', JSON.stringify(updatedLogins));
    }
  }, [username, role]);

  const handleLogout = () => {
    navigate('/');
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <div className="user-info">Welcome, {location.state.username}</div>
        <div className="date-info">{new Date().toLocaleDateString()}</div>
        <button className="logout-button" onClick={handleLogout}>Logout</button>
      </header>
      <nav className="dashboard-nav">
        {/* Conditional rendering based on role */}
        {role === 'admin' ? <AdminTimesheetEntry /> : <DeveloperTimesheetEntry />}
      </nav>
    </div>
    // <div className="dashboard-container">
    //   <header className="dashboard-header">
    //     <div className="user-info">Welcome, {username}</div>
    //     <div className="date-info">{new Date().toLocaleDateString()}</div>
    //     <button className="logout-button" onClick={handleLogout}>Logout</button>
    //   </header>
    //   <nav className="dashboard-nav">
    //     <Link to="/timesheet">Timesheet Entry</Link>
    //   </nav>
    //   <main className="dashboard-main">
    //     <h1>Dashboard</h1>
    //     <p>Role: {role}</p>
    //     <table className="login-table">
    //       <thead>
    //         <tr>
    //           <th>Username</th>
    //           <th>Role</th>
    //           <th>Date</th>
    //           <th>Time</th>
    //         </tr>
    //       </thead>
    //       <tbody>
    //         {logins.map((login, index) => (
    //           <tr key={index}>
    //             <td>{login.username}</td>
    //             <td>{login.role}</td>
    //             <td>{login.date}</td>
    //             <td>{login.time}</td>
    //           </tr>
    //         ))}
    //       </tbody>
    //     </table>
    //   </main>
    // </div>
  );
}

export default Dashboard;
