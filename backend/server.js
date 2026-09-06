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
  shift: { type: String, enum: ['morning', 'night'], required: true },
  items: [{ type: String }],
  price: { type: Number }
});
const Menu = mongoose.model('Menu', MenuSchema);

const SubscriptionSchema = new mongoose.Schema({
  studentId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: String,
  studentPhone: String,
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messName: String,
  shift: { type: String, enum: ['morning', 'night', 'both'], default: 'both' },
  startDate: { type: Date, default: Date.now },
  endDate: { type: Date },
  status: { type: String, enum: ['pending', 'paid'], default: 'pending' },
  monthlyFee: { type: Number, default: 0 },
  allowedSkips: { type: Number, default: 5 },
  usedSkips: { type: Number, default: 0 }
});
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

const AttendanceSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messName: String,
  shift: { type: String, enum: ['morning', 'night'], required: true },
  status: { type: String, enum: ['coming', 'not_coming'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetDate: { type: String, required: true },
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
    const { role, name, phone, password, messName, messAddress, fssaiNumber, yearBranch, latitude, longitude } = req.body;

    const phoneRegex = /^[6-9]\d{9}$/;
    if (!phoneRegex.test(phone)) return res.status(400).json({ error: 'Invalid mobile number.' });
    if (await User.findOne({ phone })) return res.status(400).json({ error: 'Phone number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = { role, name, phone, password: hashedPassword, messName, messAddress, fssaiNumber, yearBranch };

    if (latitude && longitude) {
      userData.location = { type: 'Point', coordinates: [longitude, latitude] };
    }

    const newUser = new User(userData);
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...newUser._doc }; delete userResponse.password;

    res.status(201).json({ message: 'Registration successful', user: userResponse, token });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
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

// --- ADMIN ROUTES ---
app.get('/api/admin/users', authenticateToken, authenticateAdmin, async (req, res) => {
  try { res.status(200).json(await User.find().select('-password').sort({ createdAt: -1 })); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/verify/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const user = await User.findByIdAndUpdate(req.params.id, { isVerified: true }, { new: true });
    res.status(200).json({ message: 'Owner verified successfully', user });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/users/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try { await User.findByIdAndDelete(req.params.id); res.status(200).json({ message: 'User deleted' }); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.post('/api/admin/directory', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const newDir = new Directory(req.body);
    await newDir.save();
    res.status(201).json({ message: 'Directory item added', item: newDir });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.delete('/api/admin/directory/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try { await Directory.findByIdAndDelete(req.params.id); res.status(200).json({ message: 'Directory item deleted' }); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// --- MENU ROUTES ---
app.post('/api/menus', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized.' });
  try {
    const ownerId = req.user.id;
    const { messName, date, shift, items, price } = req.body;
    if (!shift) return res.status(400).json({ error: 'Shift (morning or night) is required.' });
    if (price < 0) return res.status(400).json({ error: 'Price cannot be negative.' });

    const existingMenu = await Menu.findOne({ ownerId, date, shift });
    if (existingMenu) {
      existingMenu.items = items;
      existingMenu.price = price;
      await existingMenu.save();
      return res.status(200).json({ message: `${shift} menu updated!` });
    }
    const newMenu = new Menu({ ownerId, messName, date, shift, items, price });
    await newMenu.save();
    res.status(201).json({ message: `${shift} menu published!` });
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
    const { messId, messName, shift, status, targetDate } = req.body;
    if (!shift) return res.status(400).json({ error: 'Shift is required.' });
    const userId = req.user.id;

    const sub = await Subscription.findOne({ studentId: userId, messId });
    const existingAtt = await Attendance.findOne({ userId, targetDate, shift });

    if (sub) {
      if (status === 'not_coming' && (!existingAtt || existingAtt.status !== 'not_coming')) {
        if (sub.usedSkips >= sub.allowedSkips) {
          return res.status(400).json({ error: `Skip limit reached (${sub.allowedSkips} max). Please contact the owner for more skips.` });
        }
        sub.usedSkips += 1;
        await sub.save();
      }
      else if (status === 'coming' && existingAtt && existingAtt.status === 'not_coming') {
        if (sub.usedSkips > 0) {
          sub.usedSkips -= 1;
          await sub.save();
        }
      }
    }

    await Attendance.findOneAndUpdate(
      { userId, targetDate, shift },
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

// FIX: Auto-Count Monthly Members in Owner Stats
app.get('/api/attendance/stats/:messName/:date', authenticateToken, async (req, res) => {
  try {
    const messName = decodeURIComponent(req.params.messName);
    const targetDate = req.params.date;
    const targetDateObj = new Date(targetDate);

    const records = await Attendance.find({ messName, targetDate });
    const allSubs = await Subscription.find({ messName });

    // Filter to currently active subscriptions
    const activeSubs = allSubs.filter(sub => {
      const start = new Date(sub.startDate);
      const end = sub.endDate ? new Date(sub.endDate) : new Date(8640000000000000);
      return targetDateObj >= start && targetDateObj <= end;
    });

    const morningAtt = records.filter(r => r.shift === 'morning');
    const nightAtt = records.filter(r => r.shift === 'night');

    const morningSubs = activeSubs.filter(s => s.shift === 'morning' || s.shift === 'both');
    const nightSubs = activeSubs.filter(s => s.shift === 'night' || s.shift === 'both');

    // Morning Stats Calculation
    let morningComing = 0;
    let morningNotComing = 0;
    const morningSubIds = new Set(morningSubs.map(s => s.studentId.toString()));

    morningSubs.forEach(sub => {
      const att = morningAtt.find(r => r.userId.toString() === sub.studentId.toString());
      if (att && att.status === 'not_coming') morningNotComing++;
      else morningComing++; // Auto-counted as coming!
    });
    morningAtt.forEach(r => {
      if (!morningSubIds.has(r.userId.toString())) {
        if (r.status === 'coming') morningComing++;
        if (r.status === 'not_coming') morningNotComing++;
      }
    });

    // Night Stats Calculation
    let nightComing = 0;
    let nightNotComing = 0;
    const nightSubIds = new Set(nightSubs.map(s => s.studentId.toString()));

    nightSubs.forEach(sub => {
      const att = nightAtt.find(r => r.userId.toString() === sub.studentId.toString());
      if (att && att.status === 'not_coming') nightNotComing++;
      else nightComing++; // Auto-counted as coming!
    });
    nightAtt.forEach(r => {
      if (!nightSubIds.has(r.userId.toString())) {
        if (r.status === 'coming') nightComing++;
        if (r.status === 'not_coming') nightNotComing++;
      }
    });

    res.status(200).json({
      morning: { coming: morningComing, notComing: morningNotComing },
      night: { coming: nightComing, notComing: nightNotComing }
    });
  } catch (error) { res.status(500).json({ error: 'Failed to fetch stats' }); }
});

// FIX: Auto-Count Monthly Members in Owner History Chart
app.get('/api/attendance/history/:messName', authenticateToken, async (req, res) => {
  try {
    const messName = decodeURIComponent(req.params.messName);
    const history = {};
    const dateStrings = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateStr = new Date(d.getTime() - (d.getTimezoneOffset() * 60000)).toISOString().split('T')[0];
      history[dateStr] = { date: dateStr, coming: 0, notComing: 0 };
      dateStrings.push(dateStr);
    }

    const records = await Attendance.find({ messName, targetDate: { $in: dateStrings } });
    const allSubs = await Subscription.find({ messName });

    dateStrings.forEach(dateStr => {
      const dateObj = new Date(dateStr);
      const activeSubs = allSubs.filter(sub => {
        const start = new Date(sub.startDate);
        const end = sub.endDate ? new Date(sub.endDate) : new Date(8640000000000000);
        return dateObj >= start && dateObj <= end;
      });

      const dayRecords = records.filter(r => r.targetDate === dateStr);
      let coming = 0;
      let notComing = 0;
      const subIds = new Set(activeSubs.map(s => s.studentId.toString()));

      activeSubs.forEach(sub => {
        let shifts = sub.shift === 'both' ? ['morning', 'night'] : [sub.shift];
        shifts.forEach(shift => {
          const att = dayRecords.find(r => r.userId.toString() === sub.studentId.toString() && r.shift === shift);
          if (att && att.status === 'not_coming') notComing++;
          else coming++; // Auto-counted
        });
      });

      dayRecords.forEach(r => {
        if (!subIds.has(r.userId.toString())) {
          if (r.status === 'coming') coming++;
          if (r.status === 'not_coming') notComing++;
        }
      });

      history[dateStr].coming = coming;
      history[dateStr].notComing = notComing;
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

    if (!owner || owner.role !== 'owner') return res.status(404).json({ error: 'Owner not found.' });
    if (!student) return res.status(401).json({ error: 'Student profile not found. Please log out and log back in.' });

    owner.ratingTotal = (owner.ratingTotal || 0) + rating;
    owner.ratingCount += 1;
    owner.rating = owner.ratingTotal / owner.ratingCount;
    await owner.save();

    const safeStudentName = student.name || 'Anonymous Student';
    if (comment) {
      const review = new Review({ messId: owner._id, studentName: safeStudentName, rating, comment });
      await review.save();
    }
    res.status(200).json({ message: 'Rating submitted successfully!' });
  } catch (error) { res.status(500).json({ error: 'Server crashed' }); }
});

app.get('/api/messes/:ownerId/reviews', authenticateToken, async (req, res) => {
  try { res.status(200).json(await Review.find({ messId: req.params.ownerId }).sort({ date: -1 }).limit(5)); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// --- DIRECTORY ROUTES ---
app.get('/api/directory', authenticateToken, async (req, res) => {
  try { res.json(await Directory.find()); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// --- SUBSCRIPTION ROUTES ---
app.post('/api/subscriptions', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can subscribe.' });
    const { messId, messName, shift } = req.body;
    const student = await User.findById(req.user.id);

    const existing = await Subscription.findOne({ studentId: student._id, messId });
    if (existing) return res.status(400).json({ error: 'You are already a member of this mess.' });

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const newSub = new Subscription({
      studentId: student._id,
      studentName: student.name || 'Student',
      studentPhone: student.phone,
      messId,
      messName,
      shift: shift || 'both',
      startDate,
      endDate,
      monthlyFee: 0,
      allowedSkips: 5,
      usedSkips: 0
    });

    await newSub.save();
    res.status(201).json({ message: 'Subscribed successfully! Awaiting owner confirmation.', sub: newSub });
  } catch (error) { res.status(500).json({ error: 'Failed to subscribe' }); }
});

app.get('/api/subscriptions/me', authenticateToken, async (req, res) => {
  try { res.status(200).json(await Subscription.find({ studentId: req.user.id })); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/subscriptions/mess', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized' });
    res.status(200).json(await Subscription.find({ messId: req.user.id }));
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/subscriptions/:subId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized' });
    const { status, monthlyFee, extendDays, allowedSkips } = req.body;

    const sub = await Subscription.findOne({ _id: req.params.subId, messId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (status) {
      if (sub.status === 'paid' && status === 'pending') {
        return res.status(400).json({ error: 'Cannot mark as pending. This subscription is already permanently marked as paid.' });
      }
      sub.status = status;
    }

    if (monthlyFee !== undefined) {
      if (monthlyFee < 0) return res.status(400).json({ error: 'Fee cannot be negative.' });
      sub.monthlyFee = monthlyFee;
    }

    if (allowedSkips !== undefined) {
      if (allowedSkips < 0) return res.status(400).json({ error: 'Allowed skips cannot be negative.' });
      sub.allowedSkips = allowedSkips;
    }

    if (extendDays) {
      if (extendDays < 0) return res.status(400).json({ error: 'Extended days cannot be negative.' });
      const currentEnd = sub.endDate ? new Date(sub.endDate) : new Date();
      sub.endDate = new Date(currentEnd.getTime() + (extendDays * 24 * 60 * 60 * 1000));
    }

    await sub.save();
    res.status(200).json({ message: 'Subscription successfully updated', sub });
  } catch (error) { res.status(500).json({ error: 'Failed to update subscription' }); }
});

// --- LOCATION/MAP ROUTES ---
app.get('/api/messes/nearby', authenticateToken, async (req, res) => {
  try {
    res.status(200).json(await User.find({ role: 'owner', isVerified: true, 'location.coordinates': { $ne: [0, 0] } }).select('messName messAddress location rating ratingCount'));
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/owner/location', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized.' });
  try {
    const { latitude, longitude } = req.body;
    if (!latitude || !longitude) return res.status(400).json({ error: 'Coords required.' });
    await User.findByIdAndUpdate(req.user.id, { location: { type: 'Point', coordinates: [longitude, latitude] } });
    res.status(200).json({ message: 'Location updated successfully!' });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Backend Server is running at http://localhost:${PORT}`));