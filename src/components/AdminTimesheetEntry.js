import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { getDoc, doc, query, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import './CommonStyles.css';
import { FaArrowDown, FaArrowUp, FaCheck, FaTimes } from 'react-icons/fa'; // Import arrow icons
import * as XLSX from 'xlsx';

function AdminTimesheetEntry() {
  const [entries, setEntries] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for latest to oldest, 'asc' for oldest to latest

  const [userDetails, setUserDetails] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const handleApproval = async (entryId, status) => {
    const entryRefAdmin = doc(db, "Users/admin/Entries", entryId);
    let updates = { status };
  
    if (status === 'Rejected') {
      const reason = prompt("Enter the reason for rejection:");
      updates.comments = reason;
    }
    else if (status === 'Approved') {
      updates.comments = '';  // Clear out the comments
    }
  
    try {
      await updateDoc(entryRefAdmin, updates);
  
      const entrySnapshot = await getDoc(entryRefAdmin);
      if (entrySnapshot.exists()) {
        const entryData = entrySnapshot.data();
        // Use devEntryId to update the developer's entry
        if (entryData.devEntryId) {
          updateDeveloperEntry(entryData.userId, entryData.devEntryId, updates);
        } else {
          console.error("Developer entry ID missing");
        }
      } else {
        console.error("No entry found with ID:", entryId);
      }
  
      loadEntries();  // Refresh entries to reflect updated status
    } catch (error) {
      console.error("Error updating entry:", error);
    }
  };
  
  const updateDeveloperEntry = async (userId, devEntryId, updates) => {
    const entryRefDeveloper = doc(db, `Users/developer/Entries`, devEntryId);  // Adjust path as necessary
  
    try {
      const devEntrySnapshot = await getDoc(entryRefDeveloper);
      if (devEntrySnapshot.exists()) {
        await updateDoc(entryRefDeveloper, updates);
        console.log("Developer entry updated successfully");
      } else {
        console.error("No developer entry found with ID:", devEntryId);
      }
    } catch (error) {
      console.error("Error updating developer's entry:", error);
    }
  };  

  const handleExport = () => {
    const ws = XLSX.utils.json_to_sheet(entries.map(entry => ({
      Date: entry.date,
      "Time of Entry": entry.time,
      "Hours Worked": entry.hoursWorked,
      "Task Description": entry.taskDescription,
      "Approved By": entry.approvedBy,
      Developer: entry.developerName || 'Unknown'
    })));
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "TimesheetEntries");
    XLSX.writeFile(wb, "TimesheetEntries.xlsx");
  };

  useEffect(() => {
    auth.onAuthStateChanged(async (user) => {
      if (user) {
        setUserUid(user.uid);
        const userDoc = await getDoc(doc(db, "Users", user.uid));
        if (userDoc.exists()) {
          const userData = userDoc.data();
          setUserDetails(userData);
          loadEntries();
        }
      }
    });
  }, []);

  const loadEntries = async () => {
    const entriesRef = collection(db, "Users/admin/Entries");
    const q = query(entriesRef);
    const querySnapshot = await getDocs(q);
    const loadedEntries = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort(sortEntries);
    setEntries(loadedEntries);
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = "/login";
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
    setEntries(prevEntries => [...prevEntries].sort(sortEntries));
  };

  const sortEntries = (a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  };

  const [filter, setFilter] = useState({
    date: '',
    developerName: '',
    approvedBy: '',
    status: ''
  });

  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };

  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return (filter.date ? entry.date.includes(filter.date) : true) &&
             (filter.developerName ? entry.developerName.toLowerCase().includes(filter.developerName.toLowerCase()) : true) &&
             (filter.approvedBy ? entry.approvedBy.toLowerCase().includes(filter.approvedBy.toLowerCase()) : true) &&
             (filter.status ? entry.status === filter.status : true);
    }).sort(sortEntries);
  }, [entries, filter, sortOrder]);

  return (
    <>
      <div className="navbar">
        <img src="hdfcergo_logo.jpeg" alt="Logo" className="logo" />
        <button className="logout-button button" onClick={handleLogout}>Logout</button>
      </div>
      <div className="top-section full-screen">
        {userDetails ? (
          <>
            <div className="header">
              <p>Welcome {userDetails.name} | Role: {userDetails.role}</p>
              <button className="button export-button" onClick={handleExport}>Export as Excel</button>
            </div>
            <h1>Admin Timesheet Entry</h1>
            <div className="filter-section">
              <h3 className="filter-heading">Filter Entries:</h3>
              <input
                type="date"
                value={filter.date}
                onChange={(e) => handleFilterChange('date', e.target.value)}
                placeholder="Filter by Date"
              />
              <input
                type="text"
                value={filter.developerName}
                onChange={(e) => handleFilterChange('developerName', e.target.value)}
                placeholder="Filter by Developer Name"
              />
              <input
                type="text"
                value={filter.approvedBy}
                onChange={(e) => handleFilterChange('approvedBy', e.target.value)}
                placeholder="Filter by Approved By"
              />
              <select
                  value={filter.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  placeholder="Filter by Status"
                >
                  <option value="">All</option>
                  <option value="Approved">Approved</option>
                  <option value="Rejected">Rejected</option>
                  <option value="Pending">Pending</option>
                </select>
            </div>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <div className="bottom-section full-screen">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th onClick={toggleSortOrder} style={{ cursor: 'pointer' }}>
                Date of Task {sortOrder === 'desc' ? <FaArrowDown /> : <FaArrowUp />}
              </th>
              <th>Time of Entry</th>
              <th>Hours Worked</th>
              <th>Task Description</th>
              <th>Approved By</th>
              <th>Developer</th>
              <th>Status</th>
              <th>Approve/Reject</th>
              <th>Comments</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr key={entry.id} style={{ backgroundColor: entry.status === 'Approved' ? 'lightgreen' : entry.status === 'Rejected' ? 'grey' : 'none' }}>
                <td>{entry.date}</td>
                <td>{entry.time}</td>
                <td>{entry.hoursWorked}</td>
                <td>{entry.taskDescription}</td>
                <td>{entry.approvedBy}</td>
                <td>{entry.developerName || 'Unknown'}</td>
                <td>{entry.status}</td>
                <td>
                  <button onClick={() => handleApproval(entry.id, 'Approved')}><FaCheck /></button>
                  <button onClick={() => handleApproval(entry.id, 'Rejected')}><FaTimes /></button>
                </td>
                <td>{entry.comments}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="footer">
        <img src="hdfcergo_logo.jpeg" alt="Company Logo" className="footer-logo" />
        <div className="footer-content">
          <p>HDFC ERGO General Insurance Company Ltd.</p>
          <p>1st Floor, HDFC House, Backbay Reclamation, H. T. Parekh Marg, Churchgate, Mumbai - 400020.</p>
          <p><a href="mailto:contact@hdfcergo.com" style={{ color: 'inherit' }}>contact@hdfcergo.com</a></p>
        </div>
      </footer>
    </>
  );
}

export default AdminTimesheetEntry;