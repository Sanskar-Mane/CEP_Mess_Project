const { setServers } = require('node:dns/promises');
setServers(['8.8.8.8', '1.1.1.1']); // DNS Fix

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors({ origin: '*', methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'], allowedHeaders: ['Content-Type', 'Authorization'] }));
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
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  ratingTotal: { type: Number, default: 0 }
});
const User = mongoose.model('User', UserSchema);

const MenuSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messName: { type: String, required: true },
  date: { type: String, required: true }, // Target Date YYYY-MM-DD
  items: [{ type: String }],
  price: { type: Number }
});
const Menu = mongoose.model('Menu', MenuSchema);

// FIXED: Using mongoose.Schema.Types.ObjectId for relational integrity
const AttendanceSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messName: String,
  status: { type: String, enum: ['coming', 'not_coming'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetDate: { type: String, required: true }, // The date the meal is for
  timestamp: { type: Date, default: Date.now }
});
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const ReviewSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
  date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

const DirectorySchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['rickshaws', 'rooms', 'emergency'] },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  area: String, status: String, tag: String
});
const Directory = mongoose.model('Directory', DirectorySchema);

// ==========================================
// 3. MIDDLEWARE
// ==========================================
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Access denied.' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token.' });
    req.user = user;
    next();
  });
};

// ADDED: Admin verification middleware
const authenticateAdmin = (req, res, next) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin access required.' });
  }
  next();
};

// ==========================================
// 4. ROUTES
// ==========================================

// --- AUTH ROUTES ---
app.post('/api/register', async (req, res) => {
  try {
    // 1. Extract latitude and longitude from req.body
    const { role, name, phone, password, messName, messAddress, fssaiNumber, yearBranch, latitude, longitude } = req.body;

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) {
      return res.status(400).json({ error: 'Invalid mobile number. Must be 10 digits and start with 6, 7, 8, or 9.' });
    }


    if (await User.findOne({ phone })) return res.status(400).json({ error: 'Phone number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    // 2. Base user data
    const userData = { role, name, phone, password: hashedPassword, messName, messAddress, fssaiNumber, yearBranch };

    // 3. If location is provided during auth, format it for MongoDB GeoJSON
    if (latitude && longitude) {
      userData.location = {
        type: 'Point',
        coordinates: [longitude, latitude] // GeoJSON strictly requires [longitude, latitude]
      };
    }

    const newUser = new User(userData);
    await newUser.save();

    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...newUser._doc }; delete userResponse.password;

    res.status(201).json({ message: 'Registration successful', user: userResponse, token });
  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ error: 'Server error' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...user._doc }; delete userResponse.password;
    res.status(200).json({ message: 'Login successful', user: userResponse, token });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.get('/api/me', authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('-password');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json(user);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch user profile' }); }
});

// --- ADMIN ROUTES (NEWLY ADDED) ---
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.status(200).json(users);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch users' }); }
});

app.put('/api/admin/verify/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.status(200).json({ message: 'Owner verified successfully', user });
  } catch (error) { res.status(500).json({ error: 'Failed to verify owner' }); }
});

app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'User deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete user' }); }
});

app.post('/api/admin/directory', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const newDir = new Directory(req.body);
    await newDir.save();
    res.status(201).json({ message: 'Directory item added', item: newDir });
  } catch (error) { res.status(500).json({ error: 'Failed to add directory item' }); }
});

app.delete('/api/admin/directory/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    await Directory.findByIdAndDelete(req.params.id);
    res.status(200).json({ message: 'Directory item deleted' });
  } catch (error) { res.status(500).json({ error: 'Failed to delete directory item' }); }
});


// --- MENU ROUTES ---
app.post('/api/menus', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized.' });
  try {
    // FIXED BOLA: Pull ownerId from token, not body
    const ownerId = req.user.id;
    const { messName, date, items, price } = req.body;

    const existingMenu = await Menu.findOne({ ownerId, date });
    if (existingMenu) {
      existingMenu.items = items;
      existingMenu.price = price;
      await existingMenu.save();
      return res.status(200).json({ message: 'Menu updated!' });
    }
    const newMenu = new Menu({ ownerId, messName, date, items, price });
    await newMenu.save();
    res.status(201).json({ message: 'Menu published!' });
  } catch (error) { res.status(500).json({ error: 'Failed to publish' }); }
});

app.get('/api/menus/:date', authenticateToken, async (req, res) => {
  try {
    const menus = await Menu.find({ date: req.params.date }).populate('ownerId', 'rating ratingCount');
    res.status(200).json(menus);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch menus' }); }
});

// --- ATTENDANCE ROUTES ---
app.post('/api/attendance', authenticateToken, async (req, res) => {
  try {
    const { messId, messName, status, targetDate } = req.body;
    const userId = req.user.id;

    // FIXED DUPLICATES: Upsert attendance records to ensure max 1 per user per day
    await Attendance.findOneAndUpdate(
      { userId, targetDate },
      { messId, messName, status, timestamp: new Date() },
      { upsert: true, new: true }
    );

    res.status(200).json({ success: true, message: "Attendance saved successfully!" });
  } catch (error) { res.status(500).json({ success: false, message: "Failed to save attendance." }); }
});

app.get('/api/attendance/me/:date', authenticateToken, async (req, res) => {
  try {
    const records = await Attendance.find({ userId: req.user.id, targetDate: req.params.date });
    res.status(200).json(records);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch your attendance' }); }
});

app.get('/api/attendance/stats/:messName/:date', authenticateToken, async (req, res) => {
  try {
    const records = await Attendance.find({ messName: decodeURIComponent(req.params.messName), targetDate: req.params.date });
    const coming = records.filter(r => r.status === 'coming').length;
    const notComing = records.filter(r => r.status === 'not_coming').length;
    res.status(200).json({ coming, notComing, total: coming + notComing });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

app.get('/api/attendance/history/:messName', authenticateToken, async (req, res) => {
  try {
    const { messName } = req.params;
    // Build the last 7 days date strings
    const history = {};
    const dateStrings = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      history[dateStr] = { date: dateStr, coming: 0, notComing: 0 };
      dateStrings.push(dateStr);
    }

    const records = await Attendance.find({
      messName: decodeURIComponent(messName),
      targetDate: { $in: dateStrings }
    });

    records.forEach(r => {
      if (history[r.targetDate]) {
        if (r.status === 'coming') history[r.targetDate].coming++;
        if (r.status === 'not_coming') history[r.targetDate].notComing++;
      }
    });

    res.status(200).json(Object.values(history));
  } catch (error) { res.status(500).json({ error: 'Failed to fetch history' }); }
});

// --- LEADERBOARD & RATING ROUTES ---
app.get('/api/messes/leaderboard', authenticateToken, async (req, res) => {
  try {
    const topMesses = await User.find({ role: 'owner', ratingCount: { $gt: 0 } }).sort({ rating: -1 }).limit(3).select('messName rating ratingCount');
    res.status(200).json(topMesses);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch leaderboard' }); }
});

app.post('/api/messes/:ownerId/rate', authenticateToken, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const owner = await User.findById(req.params.ownerId);
    const student = await User.findById(req.user.id);
    if (!owner || owner.role !== 'owner') return res.status(404).json({ error: 'Owner not found' });

    owner.ratingTotal = (owner.ratingTotal || 0) + rating;
    owner.ratingCount += 1;
    owner.rating = owner.ratingTotal / owner.ratingCount;
    await owner.save();

    if (comment) {
      const review = new Review({ messId: owner._id, studentName: student.name, rating, comment });
      await review.save();
    }
    res.status(200).json({ message: 'Rating submitted' });
  } catch (error) { res.status(500).json({ error: 'Failed to submit rating' }); }
});

app.get('/api/messes/:ownerId/reviews', authenticateToken, async (req, res) => {
  try {
    const reviews = await Review.find({ messId: req.params.ownerId }).sort({ date: -1 }).limit(5);
    res.status(200).json(reviews);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch reviews' }); }
});

// --- DIRECTORY ROUTES ---
app.get('/api/directory', authenticateToken, async (req, res) => {
  try { res.json(await Directory.find()); } catch (error) { res.status(500).json({ error: 'Failed to fetch' }); }
});

// --- LOCATION/MAP ROUTES ---
app.get('/api/messes/nearby', authenticateToken, async (req, res) => {
  try {
    const messes = await User.find({
      role: 'owner',
      isVerified: true, // <--- IMPORTANT
      'location.coordinates': { $ne: [0, 0] }
    }).select('messName messAddress location rating ratingCount');
    res.status(200).json(messes);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch nearby messes' }); }
});

app.put('/api/owner/location', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized.' });
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Latitude and longitude are required.' });
    await User.findByIdAndUpdate(req.user.id, {
      location: { type: 'Point', coordinates: [longitude, latitude] }
    });
    res.status(200).json({ message: 'Location updated successfully!' });
  } catch (error) { res.status(500).json({ error: 'Failed to update location' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend Server is running at http://localhost:${PORT}`));