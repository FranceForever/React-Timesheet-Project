import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import './LoginPage.css'; // Import CSS file for styling
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from './firebase';
import { setDoc, doc, getDoc } from 'firebase/firestore';

function typeWriter(element) {
  const textArray = element.innerHTML.split("");
  element.innerHTML = "";
  textArray.forEach((letter, i) => {
      setTimeout(() => (element.innerHTML += letter), 100 * i);
  });
}

function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState({});
  const [successMessage, setSuccessMessage] = useState('');
  const [registerName, setRegisterName] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPhone, setRegisterPhone] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerRole, setRegisterRole] = useState('developer');
  const [stage, setStage] = useState(0); // 0: Initial, 1: Login, 2: Password, 3: Expand Login, 4: Register
  const navigate = useNavigate();

  const emailRef = useRef(null);
  const passwordRef = useRef(null);

  useEffect(() => {
    document.body.classList.add('fade-in');
    const interval = setInterval(() => {
      const loginButton = document.querySelector(".login-button");
      if (loginButton) {
        typeWriter(loginButton);
        clearInterval(interval);
      }
      const registerButton = document.querySelector(".register-button");
      if (registerButton) {
        typeWriter(registerButton);
        clearInterval(interval);
      }
    }, 100);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const loginTime = parseInt(localStorage.getItem('loginTime'), 10);
    
    if (isLoggedIn && Date.now() - loginTime < 1800000) { // 1800000 milliseconds = 30 minutes
      const user = auth.currentUser;
      if (user) {
        navigateBasedOnRole(user.role); // Implement a way to get the role or save the role in local storage as well
      }
    } else {
      localStorage.removeItem('isLoggedIn');
      localStorage.removeItem('loginTime');
    }
  }, [navigate]);

  const validateLogin = () => {
    let isValid = true;
    let errors = {};

    if (!username || !password) {
      errors.login = "Email and password are required.";
      isValid = false;
    }

    setErrors(errors);
    return isValid;
  };

  const validateForm = () => {
    let isValid = true;
    let errors = {};

    if (/[^a-zA-Z ]/.test(registerName)) {
      errors.name = "Name must only contain letters and spaces.";
      isValid = false;
    }

    if (registerPhone.length !== 10) {
      errors.phone = "Phone number must be 10 digits.";
      isValid = false;
    }

    if (registerPassword.length < 6) {
      errors.password = "Password must be at least 6 characters long.";
      isValid = false;
    }

    setErrors(errors);
    return isValid;
  };

  const handleNext = (e) => {
    e.preventDefault();
    setStage(2);
    setTimeout(() => {
      passwordRef.current.focus();
    }, 0); // Timeout ensures that the focus call is enqueued after DOM updates
  };  

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!validateLogin()) {
      alert(errors.login); // Display the validation error
      return; // Stop the login if validation fails
    }
  
    try {
      const userCredential = await signInWithEmailAndPassword(auth, username, password);
      const userRef = doc(db, "Users", userCredential.user.uid);
      const docSnap = await getDoc(userRef);
  
      localStorage.setItem('loginTime', Date.now());
      localStorage.setItem('isLoggedIn', 'true');
  
      if (docSnap.exists()) {
        const userData = docSnap.data();
        navigateBasedOnRole(userData.role);
        alert('Login successful!'); // Notify user of successful login
      } else {
        alert('Failed to retrieve user data.');
      }
    } catch (error) {
      // alert(error.message); // Display firebase error message using alert
      alert('Incorrect email/password. Please try again.');
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
    if (!validateForm()) {
      // Construct a string from all errors and display them in an alert
      // alert(Object.values(errors).join('\n'));
      alert('Registration Unsuccessful !');
      return; // Stop the registration if the form is invalid
    }
  
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, registerEmail, registerPassword);
      await setDoc(doc(db, "Users", userCredential.user.uid), {
        name: registerName,
        email: registerEmail,
        phone: registerPhone,
        role: registerRole
      });
  
      alert('Registration successful!'); // Notify user of successful registration
      setStage(0);
    } catch (error) {
      if (error.code === "auth/email-already-in-use") {
        alert('User already exists!'); // Specific alert for duplicate email
      } else {
        alert(error.message); // Display firebase error message using alert for other errors
      }
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
            {/* {error && <p className="error">{error}</p>} */}
                <div className="form-group">
                  <label id="register-label" htmlFor="register-name">Name:</label>
                  <input
                    type="text"
                    id="register-name"
                    value={registerName}
                    onChange={e => setRegisterName(e.target.value)}
                    required
                  />
                  {errors.name && <p className="error">{errors.name}</p>}
                </div>
                <div className="form-group">
                  <label id="register-label" htmlFor="register-email">Email:</label>
                  <input
                    type="email"
                    id="register-email"
                    value={registerEmail}
                    onChange={e => setRegisterEmail(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label id="register-label" htmlFor="register-phone">Phone:</label>
                  <input
                    type="text"
                    id="register-phone"
                    value={registerPhone}
                    onChange={e => setRegisterPhone(e.target.value)}
                    maxLength={10}
                    pattern="\d*"
                    required
                  />
                  {errors.phone && <p className="error">{errors.phone}</p>}
                </div>
                <div className="form-group">
                  <label id="register-label" htmlFor="register-password">Password:</label>
                  <input
                    type="password"
                    id="register-password"
                    value={registerPassword}
                    onChange={e => setRegisterPassword(e.target.value)}
                    minLength={6}
                    required
                  />
                  {errors.password && <p className="error">{errors.password}</p>}
                </div>
                <div className="form-group">
                  <label id="register-label" htmlFor="register-role">Role:</label>
                  <select id="register-role" value={registerRole} onChange={(e) => setRegisterRole(e.target.value)}>
                    <option value="admin">Admin</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>
              <button className="register_button" type="submit">Register</button>
              {errors.firebase && <p className="error">{errors.firebase}</p>}
            </form>
          </div>
        ) : (
          <div className={`image-container ${stage === 1 || stage === 2 ? 'centered' : 'initial-centered'}`}>
            <img src="/time_logo.png" alt="Login" className="section-image" />
          </div>
        )}
      </div>
      <div className={`login-section right-section ${stage === 1 || stage === 2 || stage === 4 ? 'form-section' : ''}`}>
        {stage === 0 && (
          <div className="image-container initial-centered">
            <img src="/loginImage.png" alt="Register" className="section-image" />
            {stage !== 4 && (
              <div>
                <button className="action-button login-button" onClick={handleLoginClick}>
                  Login
                </button>
                <button className="action-button register-button" onClick={handleRegisterClick}>
                  Register
                </button>
              </div>
            )}
          </div>
        )}
        {(stage === 1 || stage === 2) && (
          <div className="form-container-login">
            {successMessage && <div className="success-message">{successMessage}</div>}
            {stage === 1 && (
              <form className="form" onSubmit={handleNext}>
                {/* {error && <p className="error">{error}</p>} */}
                {errors.login && <p className="error">{errors.login}</p>}
                <div className="form-group">
                  <label htmlFor="username">Email:</label>
                  <input
                    type="email"
                    id="username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    ref={emailRef}
                    required
                  />
                </div>
                <button className="sub_button" type="submit">Next</button>
              </form>
            )}
            {stage === 2 && (
              <form className="form" onSubmit={handleLogin}>
                 {errors.login && <p className="error">{errors.login}</p>}
                <div className="form-group">
                  <label htmlFor="password">Password:</label>
                  <input
                    type="password"
                    id="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    ref={passwordRef}
                    required
                  />
                </div>
                <button className="login_button" type="submit">Login</button>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );  
}

export default LoginPage;