import React, { useState, useEffect } from 'react';
import { auth, db } from './firebase';
import { getDoc, doc, query, collection, where, getDocs, addDoc, updateDoc, deleteDoc } from 'firebase/firestore';
import './CommonStyles.css';
import Select from 'react-select';
import { FaArrowDown, FaArrowUp } from 'react-icons/fa'; // Import arrow icons

function DeveloperTimesheetEntry() {
  const [date, setDate] = useState('');
  const [hoursWorked, setHoursWorked] = useState('');
  const [taskDescription, setTaskDescription] = useState('');
  const [approvedBy, setApprovedBy] = useState('');
  // const [collaborators, setCollaborators] = useState([]);
  const [entries, setEntries] = useState([]);
  const [developerOptions, setDeveloperOptions] = useState([]);
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
          // loadDevelopers(userData.role, user.uid);
        }
      }
    });
  }, []);

  // const loadDevelopers = async (role, currentUid) => {
  //   const devsRef = collection(db, "Users");
  //   const q = query(devsRef, where("role", "==", role), where("uid", "not-in", [currentUid]));
  //   const querySnapshot = await getDocs(q);
  //   const options = querySnapshot.docs.map(doc => ({
  //     value: doc.id,
  //     label: doc.data().name
  //   }));
  //   setDeveloperOptions(options);
  // };  

  const loadEntries = async (uid, role) => {
    const entriesRef = collection(db, `Users/${role}/Entries`);
    const q = query(entriesRef, where("userId", "==", uid));
    const querySnapshot = await getDocs(q);
    const loadedEntries = querySnapshot.docs
      .map(doc => ({ id: doc.id, ...doc.data() }))
      .sort(sortEntries); // Make sure entries are sorted right after fetching
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
      approvedBy,
      developerName: userDetails.name  // Assuming 'name' is part of 'userDetails'
    };

    // Include collaborators
    // entryData.collaborators = collaborators.map(option => option.label);
  
    // Reference to the developer's entries collection
    const developerEntriesRef = collection(db, `Users/${userDetails.role}/Entries`);
    // Reference to the admin's entries collection
    const adminEntriesRef = collection(db, "Users/admin/Entries");
  
    try {
      // Add to developer's entries
      const devDocRef = await addDoc(developerEntriesRef, entryData);
      // Add to admin's entries
      const adminDocRef = await addDoc(adminEntriesRef, {
        ...entryData,
        developerId: userUid,  // Include developer ID to track whose entry it is
        developerName: userDetails.name  // Include developer name for easier identification
      });
  
      // Update local state with new entry for immediate UI update
      setEntries(prevEntries => [
        { id: devDocRef.id, ...entryData },
        ...prevEntries
      ].sort(sortEntries));
  
      resetFormFields();
    } catch (error) {
      console.error("Error adding document: ", error);
    }
  };    

  // const handleSelectChange = (selectedOptions) => {
  //   setCollaborators(selectedOptions || []);
  // };

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

  const handleSave = async () => {
    const entry = entries[editIndex];
    const updatedData = {
      date,
      hoursWorked,
      taskDescription,
      approvedBy,
    };
    const entryRef = doc(db, `Users/${userDetails.role}/Entries`, entry.id);
    try {
      await updateDoc(entryRef, updatedData);
      setEntries(prev => prev.map((el, i) => i === editIndex ? { ...el, ...updatedData } : el).sort(sortEntries));
      setEditIndex(-1);
      resetFormFields();
    } catch (error) {
      console.error("Error updating entry:", error);
    }
  };

  const handleCancel = () => {
    resetFormFields();
    setEditIndex(-1);
  };

  const toggleSortOrder = () => {
    setSortOrder(prevOrder => prevOrder === 'desc' ? 'asc' : 'desc');
    setEntries(prevEntries => [...prevEntries].sort(sortEntries));
  };  

  const sortEntries = (a, b) => {
    const dateA = new Date(a.date + "T" + a.time);
    const dateB = new Date(b.date + "T" + b.time);
    return sortOrder === 'desc' ? dateB - dateA : dateA - dateB;
  };  

  return (
    <>
      <div className="top-section full-screen">
        {userDetails ? (
          <>
            <div className="header">
              <p>Welcome {userDetails.name} | Role: {userDetails.role}</p>
              <button className="logout-button button" onClick={handleLogout}>Logout</button>
            </div>
            <h1>Developer Timesheet Entry</h1>
            <form onSubmit={handleSubmit} className="timesheet-form">
              <div className="grid-form">
                <div className="form-group">
                  <label htmlFor="date">Date:</label>
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
                {/* <div className="form-group">
                  <label htmlFor="collaborators">Collaborators:</label>
                  <Select
                    id="collaborators"
                    isMulti
                    options={developerOptions}
                    className="basic-multi-select"
                    classNamePrefix="select"
                    onChange={handleSelectChange}
                    value={collaborators}
                  />
                </div> */}
              </div>
              <div className="submit-container">
                <button type="submit" className="submit-button button">Submit</button>
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
              <th onClick={toggleSortOrder} style={{ cursor: 'pointer' }}>
                Date {sortOrder === 'desc' ? <FaArrowDown /> : <FaArrowUp />}
              </th>
              <th>Time</th>
              <th>Hours Worked</th>
              <th>Task Description</th>
              {/* <th>Collaborators</th> Add header for new column */}
              <th>Approved By</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => (
              <tr key={entry.id}>
                <td>{entry.date}</td>
                <td>{entry.time}</td>
                <td>{editIndex === index ? <input type="number" value={hoursWorked} onChange={e => setHoursWorked(e.target.value)} /> : entry.hoursWorked}</td>
                <td>{editIndex === index ? <input type="text" value={taskDescription} onChange={e => setTaskDescription(e.target.value)} /> : entry.taskDescription}</td>
                {/* <td>{entry.collaborators ? entry.collaborators.join(", ") : "No Collaborators"}</td> */}
                <td>{editIndex === index ? <input type="text" value={approvedBy} onChange={e => setApprovedBy(e.target.value)} /> : entry.approvedBy}</td>
                <td>
                  {editIndex === index ? (
                    <>
                      <button className="button save-button" onClick={() => handleSave(index)}>Save</button>
                      <button className="button cancel-button" onClick={handleCancel}>Cancel</button>
                    </>
                  ) : (
                    <>
                      <button className="button edit-button" onClick={() => handleEdit(index)}>Edit</button>
                      <button className="button delete-button" onClick={() => handleDelete(entry.id)}>Delete</button>
                    </>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}

export default DeveloperTimesheetEntry;