const { setServers } = require('node:dns/promises');
setServers(['8.8.8.8', '1.1.1.1']); // DNS Fix

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const app = express();
app.use(cors({
  origin: '*', // Allow requests from any origin
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// 2. SCHEMAS & MODELS
// ==========================================

// User Schema (Students, Owners, Admins)
const UserSchema = new mongoose.Schema({
  role: { type: String, required: true, enum: ['student', 'owner', 'admin'] },
  name: { type: String, required: true },
  phone: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  messName: String,
  messAddress: String,
  fssaiNumber: String,
  isVerified: { type: Boolean, default: false },
  yearBranch: String,
  hostelRoom: String
});
const User = mongoose.model('User', UserSchema);

// Menu Schema
const MenuSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messName: { type: String, required: true },
  date: { type: String, required: true }, // Format: YYYY-MM-DD
  items: [{ type: String }],
  price: { type: Number },
});
const Menu = mongoose.model('Menu', MenuSchema);

// Attendance Schema
const AttendanceSchema = new mongoose.Schema({
  messId: String,
  messName: String,
  status: String,
  timestamp: { type: Date, default: Date.now }
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);


// ==========================================
// 3. ROUTES
// ==========================================

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
  try {
    const { role, name, phone, password, messName, messAddress, fssaiNumber, yearBranch, hostelRoom } = req.body;
    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ error: 'Phone number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      role, name, phone, password: hashedPassword,
      messName, messAddress, fssaiNumber, yearBranch, hostelRoom
    });

    await newUser.save();
    const userResponse = { ...newUser._doc };
    delete userResponse.password;
    
    res.status(201).json({ message: 'Registration successful', user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Server error during registration' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });

    const userResponse = { ...user._doc };
    delete userResponse.password;

    res.status(200).json({ message: 'Login successful', user: userResponse });
  } catch (error) {
    res.status(500).json({ error: 'Server error during login' });
  }
});

// --- MENU ROUTES ---
app.post('/api/menus', async (req, res) => {
  try {
    const { ownerId, messName, date, items, price } = req.body;
    const existingMenu = await Menu.findOne({ ownerId, date });
    
    if (existingMenu) {
      existingMenu.items = items;
      existingMenu.price = price;
      await existingMenu.save();
      return res.status(200).json({ message: 'Menu updated successfully!', menu: existingMenu });
    }

    const newMenu = new Menu({ ownerId, messName, date, items, price });
    await newMenu.save();
    res.status(201).json({ message: 'Menu published successfully!', menu: newMenu });
  } catch (error) {
    console.error("❌ Menu Publish Error:", error);
    res.status(500).json({ error: 'Failed to publish menu' });
  }
});

app.get('/api/menus/:date', async (req, res) => {
  try {
    const menus = await Menu.find({ date: req.params.date });
    res.status(200).json(menus);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch menus' });
  }
});

// --- ATTENDANCE ROUTE ---
app.post('/api/attendance', async (req, res) => {
  try {
    const newRecord = new Attendance(req.body);
    await newRecord.save();
    res.status(200).json({ success: true, message: "Attendance saved!" });
  } catch (error) {
    res.status(500).json({ success: false, message: "Failed to save attendance." });
  }
});

// --- GET ATTENDANCE STATS ---
app.get('/api/attendance/stats/:messName/:date', async (req, res) => {
  try {
    const { messName, date } = req.params;
    
    // Fetch all attendance records matching this mess name
    const records = await Attendance.find({ messName: decodeURIComponent(messName) });

    let coming = 0;
    let notComing = 0;

    records.forEach(r => {
      // Compare only the YYYY-MM-DD portion of the timestamp string
      const recordDate = new Date(r.timestamp).toISOString().split('T')[0];
      if (recordDate === date) {
        if (r.status === 'coming') coming++;
        if (r.status === 'not_coming') notComing++;
      }
    });

    res.status(200).json({
      coming,
      notComing,
      total: coming + notComing
    });

  } catch (error) {
    console.error("Stats Error:", error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// --- ADMIN ROUTES ---
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.put('/api/admin/verify/:id', async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.json({ message: 'Owner verified successfully', user });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify user' });
  }
});

app.delete('/api/admin/users/:id', async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// ==========================================
// 4. START SERVER
// ==========================================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`🚀 Backend Server is running at http://localhost:${PORT}`);
});