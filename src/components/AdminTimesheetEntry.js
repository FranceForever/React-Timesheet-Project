import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { getDoc, doc, query, collection, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import './CommonStyles.css';
import { FaArrowDown, FaArrowUp, FaCheck, FaTimes } from 'react-icons/fa'; // Import arrow icons
import * as XLSX from 'xlsx';

function AdminTimesheetEntry() {
  const [date, setDate] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [entries, setEntries] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc'); // 'desc' for latest to oldest, 'asc' for oldest to latest

  const [userDetails, setUserDetails] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const [editIndex, setEditIndex] = useState(-1);

  const handleApproval = async (entryId, status) => {
    const adminEntryRef = doc(db, "Users/admin/Entries", entryId);
    let updates = { status: status };

    // If rejecting, prompt for a reason
    if (status === 'Rejected') {
      const reason = prompt("Enter the reason for rejection:");
      updates.comments = reason; // Save rejection comments
    }

    try {
      // Fetch the current admin entry to get the developer's entry ID
      const adminEntryDoc = await getDoc(adminEntryRef);
      if (!adminEntryDoc.exists()) {
        console.error("Document does not exist!");
        return;
      }
      const devEntryId = adminEntryDoc.data().devEntryId; // Assuming the developer's entry ID is stored like this

      // Update the admin's entry
      await updateDoc(adminEntryRef, updates);

      // Update the developer's corresponding entry
      if (devEntryId) {
        const devEntryRef = doc(db, `Users/${userDetails.role}/Entries`, devEntryId);
        await updateDoc(devEntryRef, updates);
      }

      loadEntries(); // Reload entries to reflect changes
      alert(`Entry has been ${status.toLowerCase()}.`);
    } catch (error) {
      console.error("Error updating entry:", error);
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
          loadEntries(user.uid, userData.role);
        }
      }
    });
  }, []);

  const loadEntries = async () => {
    // Path to the 'Entries' subcollection under the 'admin' document
    const entriesRef = collection(db, "Users/admin/Entries");
    const q = query(entriesRef);
    const querySnapshot = await getDocs(q);
    const loadedEntries = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort(sortEntries); // Sort entries by date and time
    setEntries(loadedEntries);
  };  

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = "/login";
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const currentDate = new Date();
    const entryData = {
      userId: userUid,
      date: currentDate.toLocaleDateString(),
      time: currentDate.toLocaleTimeString(),
      hoursWorked,
      taskDescription,
      approvedBy
    };
  
    // Reference to the developer's entries collection
    const developerEntriesRef = collection(db, `Users/${userDetails.role}/Entries`);
  
    // Reference to the admin's entries collection
    // Assuming 'adminId' is known and is static, replace 'yourAdminId' with actual admin's UID
    const adminEntriesRef = collection(db, `Users/admin/Entries`);
  
    try {
      // Add to developer's entries
      const devDocRef = await addDoc(developerEntriesRef, entryData);
      // Optionally, add to admin's entries
      const adminDocRef = await addDoc(adminEntriesRef, {
        ...entryData,
        developerId: userUid,  // Include developer ID to track whose entry it is
        developerName: userDetails.name  // Optionally include developer name for easier identification
      });
  
      // Update local state
      setEntries(prevEntries => [
        { id: devDocRef.id, ...entryData },
        ...prevEntries
      ].sort(sortEntries));
  
      resetFormFields();
    } catch (error) {
      console.error("Error adding document: ", error);
    }
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
    approvedBy: ''
  });
  
  const handleFilterChange = (key, value) => {
    setFilter(prev => ({ ...prev, [key]: value }));
  };
  
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      return (filter.date ? entry.date.includes(filter.date) : true) &&
             (filter.developerName ? entry.developerName.toLowerCase().includes(filter.developerName.toLowerCase()) : true) &&
             (filter.approvedBy ? entry.approvedBy.toLowerCase().includes(filter.approvedBy.toLowerCase()) : true);
    }).sort(sortEntries);
  }, [entries, filter, sortOrder]);  

  const resetFormFields = () => {
    setDate('');
    setHoursWorked('');
    setTaskDescription('');
    setApprovedBy('');
  };

  const handleEdit = (index) => {
    setEditIndex(index);
    const entry = entries[index];
    setDate(entry.date);
    setHoursWorked(entry.hoursWorked);
    setTaskDescription(entry.taskDescription);
    setApprovedBy(entry.approvedBy);
  };

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure you want to delete this entry?')) {
      try {
        await deleteDoc(doc(db, `Users/${userDetails.role}/Entries`, id));
        loadEntries(userUid, userDetails.role);
        resetFormFields();
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const handleSave = async (index) => {
    const entry = entries[index];
    const entryRef = doc(db, `Users/admin/Entries`, entry.id);
    try {
      await updateDoc(entryRef, entry);
      setEntries(prev => prev.map((el, i) => i === index ? entry : el).sort(sortEntries));
      setEditIndex(-1);
      alert("Entry updated successfully!");
    } catch (error) {
      console.error("Error updating entry:", error);
    }
  };

  const handleCancel = () => {
    setEditIndex(-1);
  };

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
              {/* <th>Actions</th> */}
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {filteredEntries.map((entry, index) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.time}</td>
                <td>{editIndex === index ? <input type="number" value={entry.hoursWorked} onChange={(e) => {
                    const updatedEntry = {...entry, hoursWorked: e.target.value};
                    setEntries(prev => prev.map((el, i) => i === index ? updatedEntry : el));
                }} /> : entry.hoursWorked}</td>
                <td>{editIndex === index ? <input type="text" value={entry.taskDescription} onChange={(e) => {
                    const updatedEntry = {...entry, taskDescription: e.target.value};
                    setEntries(prev => prev.map((el, i) => i === index ? updatedEntry : el));
                }} /> : entry.taskDescription}</td>
                <td>{entry.approvedBy}</td>
                <td>{entry.developerName || 'Unknown'}</td>
                {/* <td>
                  {editIndex === index ? (
                    <>
                      <button className="button save-button" onClick={() => handleSave(index)}>Save</button>
                      <button className="button cancel-button" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <button className="button edit-button" onClick={() => handleEdit(index)}>Edit</button>
                  )}
                </td> */}
                <td>{entry.status || 'Pending'}</td>
                <td>
                  <button onClick={() => handleApproval(entry.id, 'Approved')}><FaCheck /></button>
                  <button onClick={() => handleApproval(entry.id, 'Rejected')}><FaTimes /></button>
                </td>
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