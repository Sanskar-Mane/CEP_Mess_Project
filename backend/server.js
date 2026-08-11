const { setServers } = require('node:dns/promises');
setServers(['8.8.8.8', '1.1.1.1']); // DNS Fix

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => console.log('✅ Successfully connected to MongoDB Atlas!'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// ==========================================
// 2. SCHEMAS & MODELS
// ==========================================
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
  hostelRoom: String,
  // New Rating Fields for Owners
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const MenuSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messName: { type: String, required: true },
  date: { type: String, required: true },
  items: [{ type: String }],
  price: { type: Number },
});
const Menu = mongoose.model('Menu', MenuSchema);

const AttendanceSchema = new mongoose.Schema({
  messId: String,
  messName: String,
  status: String,
  userId: String,
  timestamp: { type: Date, default: Date.now }
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);

// New Directory Schema
const DirectorySchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['rickshaws', 'rooms', 'emergency'] },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  area: String, // Used for rickshaws & rooms
  status: String, // Used for emergency & rooms
  tag: String,
  price: String,
  features: [{ type: String }]
});
const Directory = mongoose.model('Directory', DirectorySchema);

// ==========================================
// 3. MIDDLEWARE
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  
  if (!token) return res.status(401).json({ error: 'Access denied. No token provided.' });

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
};

// ==========================================
// 4. ROUTES
// ==========================================

// --- AUTH ROUTES --- (Unchanged)
app.post('/api/register', async (req, res) => {
  try {
    const { role, name, phone, password, messName, messAddress, fssaiNumber, yearBranch, hostelRoom } = req.body;
    const existingUser = await User.findOne({ phone });
    if (existingUser) return res.status(400).json({ error: 'Phone number already registered' });
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const newUser = new User({ role, name, phone, password: hashedPassword, messName, messAddress, fssaiNumber, yearBranch, hostelRoom });
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...newUser._doc };
    delete userResponse.password;
    res.status(201).json({ message: 'Registration successful', user: userResponse, token });
  } catch (error) { res.status(500).json({ error: 'Server error during registration' }); }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...user._doc };
    delete userResponse.password;
    res.status(200).json({ message: 'Login successful', user: userResponse, token });
  } catch (error) { res.status(500).json({ error: 'Server error during login' }); }
});

// --- MENU ROUTES ---
app.post('/api/menus', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can publish menus.' });
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
  } catch (error) { res.status(500).json({ error: 'Failed to publish menu' }); }
});

// GET MENUS WITH OWNER RATING
app.get('/api/menus/:date', authenticateToken, async (req, res) => {
  try {
    const menus = await Menu.find({ date: req.params.date }).populate('ownerId', 'rating ratingCount');
    res.status(200).json(menus);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch menus' }); }
});

// --- ATTENDANCE & RATING ROUTES ---
// --- ATTENDANCE & RATING ROUTES ---
app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { status } = req.body;
    const today = new Date().toISOString().split('T')[0];

    // Enforce "One Mess At One Time" rule
    if (status === 'coming') {
      const records = await Attendance.find({ userId: req.user.id });
      const hasCommittedToday = records.some(r => 
        new Date(r.timestamp).toISOString().split('T')[0] === today && r.status === 'coming'
      );

      if (hasCommittedToday) {
        return res.status(400).json({ 
          success: false, 
          error: "You have already selected a mess for today. You can only attend one." 
        });
      }
    }

    const newRecord = new Attendance({ ...req.body, userId: req.user.id });
    await newRecord.save();
    res.status(200).json({ success: true, message: "Attendance saved!" });
  } catch (error) { 
    res.status(500).json({ success: false, message: "Failed to save attendance." }); 
  }
});

// NEW: Fetch user's attendance for today so they can't double-submit
app.get('/api/attendance/me/:date', authenticateToken, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user.id });
    const todayRecords = records.filter(r => new Date(r.timestamp).toISOString().split('T')[0] === req.params.date);
    res.status(200).json(todayRecords);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch your attendance' }); }
});

app.get('/api/attendance/stats/:messName/:date', authenticateToken, async (req, res) => {
  try {
    const { messName, date } = req.params;
    const records = await Attendance.find({ messName: decodeURIComponent(messName) });
    let coming = 0, notComing = 0;
    records.forEach(r => {
      if (new Date(r.timestamp).toISOString().split('T')[0] === date) {
        if (r.status === 'coming') coming++;
        if (r.status === 'not_coming') notComing++;
      }
    });
    res.status(200).json({ coming, notComing, total: coming + notComing });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// NEW: Rate a Mess
app.post('/api/messes/:ownerId/rate', authenticateToken, async (req, res) => {
  try {
    const { rating } = req.body;
    const owner = await User.findById(req.params.ownerId);
    if (!owner || owner.role !== 'owner') return res.status(404).json({ error: 'Owner not found' });

    const newTotal = (owner.rating * owner.ratingCount) + rating;
    owner.ratingCount += 1;
    owner.rating = newTotal / owner.ratingCount;
    
    await owner.save();
    res.status(200).json({ message: 'Rating submitted successfully', newRating: owner.rating });
  } catch (error) { res.status(500).json({ error: 'Failed to submit rating' }); }
});

// --- DIRECTORY ROUTES ---
app.get('/api/directory', authenticateToken, async (req, res) => {
  try {
    const items = await Directory.find();
    res.json(items);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch directory' }); }
});

app.post('/api/admin/directory', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const newItem = new Directory(req.body);
    await newItem.save();
    res.status(201).json({ message: 'Item added to directory', item: newItem });
  } catch (error) { res.status(500).json({ error: 'Failed to add item' }); }
});

app.delete('/api/admin/directory/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    await Directory.findByIdAndDelete(req.params.id);
    res.json({ message: 'Directory item deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete item' }); }
});

// --- ADMIN USERS ROUTES ---
app.get('/api/admin/users', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const users = await User.find().select('-password');
    res.json(users);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch users' }); }
});
app.put('/api/admin/verify/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.json({ message: 'Owner verified successfully', user });
  } catch (error) { res.status(500).json({ error: 'Failed to verify user' }); }
});
app.delete('/api/admin/users/:id', authenticateToken, async (req, res) => {
  if (req.user.role !== 'admin') return res.status(403).json({ error: 'Unauthorized' });
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted successfully' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete user' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend Server is running at http://localhost:${PORT}`));