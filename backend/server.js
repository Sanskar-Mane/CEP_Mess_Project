const express = require('express');
const cors = require('cors');

const app = express();
const PORT = 3000;

// Middleware
// cors() allows your React frontend (port 5173) to talk to this backend (port 3000)
app.use(cors());
// express.json() allows the server to read the JSON data sent from React
app.use(express.json());

// ----------------------------------------------------
// ROUTES
// ----------------------------------------------------

// 1. A simple test route just to check if the server is alive
app.get('/api/test', (req, res) => {
    res.json({ message: "Backend is running perfectly!" });
});

// 2. The Attendance Route (Receives data from React)
app.post('/api/attendance', (req, res) => {
    const studentData = req.body;
    
    // Print the received data to the terminal
    console.log("-----------------------------------------");
    console.log("📣 NEW ATTENDANCE RECORDED:");
    console.log(`Mess Name : ${studentData.messName}`);
    console.log(`Status    : ${studentData.status.toUpperCase()}`);
    console.log(`Time      : ${new Date(studentData.timestamp).toLocaleTimeString()}`);
    console.log("-----------------------------------------");
    
    // Send a success response back to React
    res.status(200).json({ 
        success: true, 
        message: "Attendance recorded successfully" 
    });
});

// ----------------------------------------------------
// START SERVER
// ----------------------------------------------------
app.listen(PORT, () => {
    console.log(`🚀 Backend Server is running at http://localhost:${PORT}`);
});