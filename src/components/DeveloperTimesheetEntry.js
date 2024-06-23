import React, { useState, useEffect, useMemo } from 'react';
import { auth, db } from './firebase';
import { getDoc, doc, query, collection, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import './CommonStyles.css';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'; // Import arrow icons

function DeveloperTimesheetEntry() {
  const [date, setDate] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  const [entries, setEntries] = useState([]);
  const [sortOrder, setSortOrder] = useState('desc');

  const [userDetails, setUserDetails] = useState(null);
  const [userUid, setUserUid] = useState(null);

  const [editIndex, setEditIndex] = useState(-1);

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

  const loadEntries = async (uid, role) => {
    const entriesRef = collection(db, `Users/${role}/Entries`);
    const q = query(entriesRef, where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    const loadedEntries = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setEntries(loadedEntries);
  };

  const sortedEntries = useMemo(() => {
    return entries.sort((a, b) => {
      const dateA = new Date(a.date);
      const dateB = new Date(b.date);
      return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
    });
  }, [entries, sortOrder]);

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
  };

  const validateEntry = () => {
    // Validate all required fields are filled
    if (!date || !hoursWorked || !taskDescription || !approvedBy) {
      alert("All fields must be filled out.");
      return false; // Return false to indicate invalid inputs
    }
    // Validate hours worked is within a reasonable range
    if (hoursWorked < 0 || hoursWorked > 100) {
      alert("Hours Worked must be between 0 and 100.");
      return false; // Return false to indicate invalid inputs
    }
    return true; // Return true to indicate valid inputs
  };

  const formatDate = (dateString) => {
    const dateObj = new Date(dateString);
    const formattedDate = dateObj.toLocaleDateString('en-GB');
    return formattedDate;
  };

  const handleLogout = async () => {
    await auth.signOut();
    window.location.href = "/login";
  };

  const entrySorter = (a, b) => {
    const dateA = new Date(a.date);
    const dateB = new Date(b.date);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!validateEntry()) return;

    const entryData = {
      userId: userUid,
      date: date,
      time: new Date().toLocaleTimeString(),
      hoursWorked,
      taskDescription,
      approvedBy,
      developerName: userDetails.name,
      creationDate: new Date().toLocaleDateString('en-GB'), // Store the local machine's current date
      role: userDetails.role,
      status: 'Pending'  // Set the initial status to 'Pending'
    };

    const developerEntriesRef = collection(db, `Users/${userDetails.role}/Entries`);
    const adminEntriesRef = collection(db, "Users/admin/Entries");

    try {
      // Add document to developer's collection and get the document reference
      const devDocRef = await addDoc(developerEntriesRef, entryData);

      // Add the same entry to the admin's collection with the developerId attribute
      await addDoc(adminEntriesRef, {
        ...entryData,
        developerId: userUid,
        devEntryId: devDocRef.id  // Store the developer's entry ID in the admin's collection
      });

      // Update local state to include the new entry with the id
      setEntries(prevEntries => [
        { id: devDocRef.id, ...entryData },
        ...prevEntries
      ].sort(entrySorter));

      resetFormFields();
      alert("Entry added successfully!");
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };

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
        // Also delete the entry from the admin's collection
        await deleteDoc(doc(db, "Users/admin/Entries", id));
        loadEntries(userUid, userDetails.role);
        resetFormFields();
        alert("Entry deleted successfully!");
      } catch (error) {
        console.error("Error deleting document: ", error);
      }
    }
  };

  const handleSave = async () => {
    const entry = entries[editIndex];
    const updatedData = {
      date,
      hoursWorked,
      taskDescription,
      approvedBy,
      status: 'Pending',  // Reset status to Pending on resubmit
      comments: ''  // Clear previous comments
    };
  
    const entryRef = doc(db, `Users/${userDetails.role}/Entries`, entry.id);
    try {
      await updateDoc(entryRef, updatedData);
  
      // Fetch the admin entry using the devEntryId stored in the developer's entry
      const adminEntryQuery = query(collection(db, "Users/admin/Entries"), where("devEntryId", "==", entry.id));
      const adminEntrySnapshot = await getDocs(adminEntryQuery);
  
      if (!adminEntrySnapshot.empty) {
        const adminEntryDoc = adminEntrySnapshot.docs[0];
        const adminEntryRef = adminEntryDoc.ref;
        await updateDoc(adminEntryRef, updatedData);
      } else {
        console.error("No corresponding admin entry found for devEntryId:", entry.id);
      }
  
      // Update local state
      setEntries(prev => prev.map((el, i) => i === editIndex ? { ...el, ...updatedData } : el).sort(entrySorter));
      setEditIndex(-1);
      resetFormFields();
      alert("Entry resubmitted successfully!");
    } catch (error) {
      console.error("Error updating entry:", error);
    }
  };  

  const handleCancel = () => {
    resetFormFields();
    setEditIndex(-1);
  };

  return (
    <>
      <div className="navbar">
        <img src="/time_logo.png" alt="Logo" className="logo" />
        <button className="logout-button button" onClick={handleLogout}>Logout</button>
      </div>
      <div className="top-section full-screen">
        {userDetails ? (
          <>
            <div className="header">
              <p>Welcome {userDetails.name} | Role: {userDetails.role}</p>
            </div>
            <h1>Developer Timesheet Entry</h1>
            <form onSubmit={handleSubmit} className="timesheet-form">
              <div className="grid-form">
                <div className="form-group">
                  <label htmlFor="date">Date of Task:</label>
                  <input type="date" id="date" value={date} onChange={e => setDate(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="hoursWorked">Hours Worked:</label>
                  <input type="number" id="hoursWorked" value={hoursWorked} onChange={e => setHoursWorked(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="taskDescription">Task Description:</label>
                  <input type="text" id="taskDescription" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label htmlFor="approvedBy">Approved By:</label>
                  <input type="text" id="approvedBy" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} required />
                </div>
              </div>
              <div className="submit-container">
                <button type="submit" className="submit-button button">Add New Entry</button>
              </div>
            </form>
          </>
        ) : (
          <p>Loading...</p>
        )}
      </div>
      <div className="bottom-section full-screen">
        <table className="timesheet-table">
          <thead>
            <tr>
              <th>Entry added on</th> {/* New column header */}
              <th onClick={toggleSortOrder} style={{ cursor: 'pointer' }}>
                Date of Task {sortOrder === 'desc' ? <FaArrowDown /> : <FaArrowUp />}
              </th>
              <th>Time of Entry</th>
              <th>Hours Worked</th>
              <th>Task Description</th>
              <th>Approved By</th>
              <th>Status</th>
              <th>Comments</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id} style={{ backgroundColor: entry.status === 'Approved' ? 'lightgreen' : entry.status === 'Rejected' ? 'red' : 'none' }}>
                <td>{entry.creationDate}</td>
                <td>{formatDate(entry.date)}</td>
                <td>{entry.time}</td>
                <td>{entry.hoursWorked}</td>
                <td>{entry.taskDescription}</td>
                <td>{entry.approvedBy}</td>
                <td>{entry.status}</td>
                <td>{entry.comments}</td>
                <td>
                  {entry.status !== 'Approved' && (
                    <>
                      {editIndex === index ? (
                        <>
                          <button className="button save-button" onClick={handleSave}>Save</button>
                          <button className="button cancel-button" onClick={handleCancel}>Cancel</button>
                        </>
                      ) : (
                        <>
                          <button className="button edit-button" onClick={() => handleEdit(index)}>Edit</button>
                          <button className="button delete-button" onClick={() => handleDelete(entry.id)}>Delete</button>
                        </>
                      )}
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <footer className="footer">
        <img src="/time_logo.png" alt="Company Logo" className="footer-logo" />
        <div className="footer-content">
          <p>Armaan Ghosh</p>
          <p><a href="mailto:armaanghosh2005@gmail.com" style={{ color: 'inherit' }}>armaanghosh2005@gmail.com</a></p>
        </div>
      </footer>
    </>
  );
}

export default DeveloperTimesheetEntry;