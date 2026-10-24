import React,{ useState } from 'react';
import './css/Register.css';
function Register() {
    const[name,SetName]=useState("");
    const[email,SetEmail]=useState("");
    const[password,SetPassword]=useState("");
    const[confirmPassword,SetConfirmPassword]=useState("");

    const handleRegister=(e)=>{
        if (!name.trim()){
            alert("Name is required");
            return;
        }
        if(!email.includes("@") && !email.includes(".")){
            alert("Please enter a valid email address");
            return;
        }
        const passwordPattern =
  /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/;
  if (!passwordPattern.test(password)) {
    alert(
      "Password must be at least 6 characters long and contain at least one uppercase letter, one lowercase letter, one number, and one special character"
    );
    return;
  }
  if (password !== confirmPassword) {  
    alert("Passwords do not match");
    return;
  } 
  const UserData = {
    name: name,
    email: email,
    password: password,
  };
  const Users = JSON.parse(localStorage.getItem("users")) || [];

  const existingUser = Users.find((user) => user.email === email);
  if (existingUser) {
    alert("User with this email already exists");
    return;
  }
  Users.push(UserData);
  localStorage.setItem("users", JSON.stringify(Users));
  console.log("Registered User:", Users);
    console.log("All Users:", Users);
    alert("Registration successful!");

    SetName("");
    SetEmail("");
    SetPassword("");
    SetConfirmPassword(""); 
}
    return (
    <div className="container">
      <div className="register-card">
        <h1>PrepAI</h1>
        <p>Create Your Account</p>

        <input
          type="text"
          placeholder="Full Name"
          value={name}
          onChange={(e) => SetName(e.target.value)}
        />

        <input
          type="email"
          placeholder="Email Address"
          value={email}
          onChange={(e) => SetEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => SetPassword(e.target.value)}
        />

        <input
          type="password"
          placeholder="Confirm Password"
          value={confirmPassword}
          onChange={(e) => SetConfirmPassword(e.target.value)}
        />

        <button onClick={handleRegister}>
          Register
        </button>

        <span>
          Already have an account? Login
        </span>
      </div>
    </div>
  );
}

export default Register;


