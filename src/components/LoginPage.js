import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // Import CSS file for styling
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('developer');
  const [stage, setStage] = useState(0); // 0: Initial, 1: Login, 2: Password, 3: Expand Login, 4: Register
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add('fade-in');
  }, []);

  const handleNext = (e) => {
    e.preventDefault();
    setStage(2);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const user = userCredential.user;
      const userRef = doc(db, "Users", user.uid);
      const docSnap = await getDoc(userRef);

      if (docSnap.exists()) {
        const userData = docSnap.data();
        navigateBasedOnRole(userData.role);
      } else {
        console.error("No such user exists!");
      }
    } catch (error) {
      console.error('Error during login:', error);
    }
  };

  const navigateBasedOnRole = (role) => {
    if (role === 'admin') {
      navigate('/admin-timesheet');
    } else if (role === 'developer') {
      navigate('/developer-timesheet');
    } else {
      navigate('/login');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();

    try {
      await createUserWithEmailAndPassword(auth,registerEmail,registerPassword);
      const user = auth.currentUser;
      console.log(user);

      if(user){
        await setDoc(doc(db, "Users", user.uid), {
          email: user.email,
          name: registerName,
          phone: registerPhone,
          role: registerRole
        });
        setStage(0);  // Reset the stage to the initial page
        navigate('/');  // Optionally, use navigate to go to the root page or a specific path
      }
      console.log("User registered successfully!");
      navigate('/login');
    } catch (error) {
      console.error('Error during registration:', error);
      console.log(error.message);
    }
  };

  const handleLoginClick = () => {
    setStage(1);
  };

  const handleRegisterClick = () => {
    setStage(4);
  };

  return (
    <div className={`login-container ${stage === 1 || stage === 2 ? 'login-expanded' : ''}`}>
      <div className={`login-section left-section ${stage === 1 || stage === 2 || stage === 4 ? 'expanded' : ''}`}>
        {stage === 4 ? (
          <div className="form-container">
            <form className="form" onSubmit={handleRegister}>
              <div className="form-group">
                <label htmlFor="register-name">Name:</label>
                <input
                  type="text"
                  id="register-name"
                  value={registerName}
                  onChange={(e) => setRegisterName(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-email">Email:</label>
                <input
                  type="email"
                  id="register-email"
                  value={registerEmail}
                  onChange={(e) => setRegisterEmail(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-phone">Phone:</label>
                <input
                  type="text"
                  id="register-phone"
                  value={registerPhone}
                  onChange={(e) => setRegisterPhone(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-password">Password:</label>
                <input
                  type="password"
                  id="register-password"
                  value={registerPassword}
                  onChange={(e) => setRegisterPassword(e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="register-role">Role:</label>
                <select id="register-role" value={registerRole} onChange={(e) => setRegisterRole(e.target.value)}>
                  <option value="admin">Admin</option>
                  <option value="developer">Developer</option>
                </select>
              </div>
              <button className="sub_button" type="submit">Register</button>
            </form>
          </div>
        ) : (
          <div className={`image-container ${stage === 1 || stage === 2 ? 'centered' : 'initial-centered'}`}>
            <img src="/loginImage.png" alt="Login" className="section-image" />
            {stage === 0 && (
              <button className="action-button login-button" onClick={handleLoginClick}>
                Login
              </button>
            )}
          </div>
        )}
      </div>
      <div className={`login-section right-section ${stage === 1 || stage === 2 || stage === 4 ? 'form-section' : ''}`}>
        {stage === 0 && (
          <div className="image-container initial-centered">
            <img src="/loginImage.png" alt="Register" className="section-image" />
            {stage !== 4 && (
              <button className="action-button register-button" onClick={handleRegisterClick}>
                Register
              </button>
            )}
          </div>
        )}
        {(stage === 1 || stage === 2) && (
          <div className="form-container">
            {stage === 1 && (
              <form className="form" onSubmit={handleNext}>
                <div className="form-group">
                  <label htmlFor="username">Username/Email:</label>
                  <input
                    type="text"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                  />
                </div>
                <button className="sub_button" type="submit">Next</button>
              </form>
            )}
            {stage === 2 && (
              <form className="form" onSubmit={handleLogin}>
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                </div>
                <button className="sub_button" type="submit">Login</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default LoginPage;