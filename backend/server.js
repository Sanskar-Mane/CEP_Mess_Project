const { setServers } = require('node:dns/promises');
setServers(['8.8.8.8', '1.1.1.1']); // DNS Fix

require('dotenv').config();
const http = require('http');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Server } = require('socket.io');

const app = express();
app.set('trust proxy', 1);
const server = http.createServer(app);

// Fail fast on startup in production if JWT_SECRET is missing or insecure
if (process.env.NODE_ENV === 'production' && (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'fallback_secret')) {
  console.error('❌ FATAL: JWT_SECRET must be set to a secure secret in production!');
  process.exit(1);
}

// Security & Performance Middlewares
app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(compression());

// CORS Configuration (Permit ALLOWED_ORIGINS + Mobile Apps with no origin)
const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(',').map(o => o.trim()).filter(Boolean)
  : ['http://localhost:5173', 'http://localhost:3000'];

const corsOptions = {
  origin: (origin, callback) => {
    // Permit requests with no origin (e.g., mobile apps, curl, native tools)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      return callback(null, true);
    }
    // In development or local network, allow origins
    if (process.env.NODE_ENV !== 'production') {
      return callback(null, true);
    }
    return callback(new Error(`Not allowed by CORS: ${origin}`));
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

const io = new Server(server, {
  cors: corsOptions
});

io.on('connection', (socket) => {
  // Client connected
  socket.on('disconnect', () => {
    // Client disconnected
  });
});

// Unauthenticated Health Check Endpoint (placed before rate limiter to prevent probe throttling)
app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'ok',
    uptime: process.uptime(),
    dbState: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    timestamp: new Date().toISOString()
  });
});

// Rate Limiters
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts, please try again after 15 minutes.' }
});

const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please slow down.' }
});

app.use('/api/', apiLimiter);
app.use('/api/login', authLimiter);
app.use('/api/register', authLimiter);

const JWT_SECRET = process.env.JWT_SECRET || 'fallback_secret';

// ==========================================
// 1. DATABASE CONNECTION
// ==========================================
mongoose.connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ Successfully connected to MongoDB Atlas!');
    expireOutdatedSubscriptions();
    setInterval(expireOutdatedSubscriptions, 60 * 60 * 1000);
  })
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
  morningCutoff: { type: String, default: '09:30' }, // 24-hour HH:mm format, IST
  nightCutoff: { type: String, default: '17:30' },   // 24-hour HH:mm format, IST
  upiId: { type: String, default: '' },              // e.g. merchant@okaxis
  expoPushToken: { type: String, default: '' },      // Expo Push Notification Token
  rationConfig: {
    riceGrams: { type: Number, default: 120 },
    flourGrams: { type: Number, default: 110 },
    dalGrams: { type: Number, default: 45 },
    veggieGrams: { type: Number, default: 150 }
  },
  rating: { type: Number, default: 0 },
  ratingCount: { type: Number, default: 0 },
  ratingTotal: { type: Number, default: 0 }
});
UserSchema.index({ location: '2dsphere' });
const User = mongoose.model('User', UserSchema);

const MenuSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  messName: { type: String, required: true },
  date: { type: String, required: true }, // Target Date YYYY-MM-DD
  shift: { type: String, enum: ['morning', 'night'], required: true },
  items: [{ type: String }],
  price: { type: Number }
});
MenuSchema.index({ ownerId: 1, date: 1, shift: 1 }, { unique: true });
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
  status: { type: String, enum: ['pending', 'verification_pending', 'paid', 'expired'], default: 'pending' },
  monthlyFee: { type: Number, default: 0 },
  lastUtrNumber: { type: String, default: '' },
  paidAt: { type: Date },
  allowedSkips: { type: Number, default: 5 },
  usedSkips: { type: Number, default: 0 }
});
SubscriptionSchema.index({ studentId: 1, messId: 1 }, { unique: true });
const Subscription = mongoose.model('Subscription', SubscriptionSchema);

const AttendanceSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  messName: String,
  shift: { type: String, enum: ['morning', 'night'], required: true },
  status: { type: String, enum: ['coming', 'not_coming'] },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  targetDate: { type: String, required: true },
  isConsumed: { type: Boolean, default: false },
  consumedAt: { type: Date },
  timestamp: { type: Date, default: Date.now }
});
AttendanceSchema.index({ userId: 1, targetDate: 1, shift: 1 }, { unique: true });
const Attendance = mongoose.model('Attendance', AttendanceSchema);

const ReviewSchema = new mongoose.Schema({
  messId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  studentName: { type: String, required: true },
  rating: { type: Number, required: true },
  comment: { type: String },
  date: { type: Date, default: Date.now }
});
const Review = mongoose.model('Review', ReviewSchema);

const NotificationSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  body: { type: String, required: true },
  isRead: { type: Boolean, default: false },
  createdAt: { type: Date, default: Date.now }
});
NotificationSchema.index({ userId: 1, createdAt: -1 });
const Notification = mongoose.model('Notification', NotificationSchema);

// --- PUSH & IN-APP NOTIFICATION HELPER ---
const sendNotification = async (userIds, title, body) => {
  try {
    const rawIds = Array.isArray(userIds) ? userIds : [userIds];
    const validIds = rawIds.filter(Boolean);
    if (validIds.length === 0) return;

    const docs = validIds.map(id => ({ userId: id, title, body }));
    await Notification.insertMany(docs);

    io.emit('notification:new', {
      userIds: validIds.map(id => id.toString()),
      title,
      body,
      createdAt: new Date()
    });

    const usersWithTokens = await User.find({
      _id: { $in: validIds },
      expoPushToken: { $regex: /^ExponentPushToken\[/ }
    }).select('expoPushToken');

    if (usersWithTokens.length > 0) {
      const messages = usersWithTokens.map(u => ({
        to: u.expoPushToken,
        sound: 'default',
        title,
        body,
        data: { title, body }
      }));

      try {
        await fetch('https://exp.host/--/api/v2/push/send', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json'
          },
          body: JSON.stringify(messages)
        });
      } catch (pushErr) {
        console.error('Expo push delivery error:', pushErr.message);
      }
    }
  } catch (err) {
    console.error('sendNotification error:', err);
  }
};

const DirectorySchema = new mongoose.Schema({
  category: { type: String, required: true, enum: ['rickshaws', 'rooms', 'emergency'] },
  name: { type: String, required: true },
  phone: { type: String, required: true },
  area: String,
  status: String,
  tag: String,
  rentPerMonth: { type: Number, default: 0 },
  vacancies: { type: Number, default: 1 },
  genderPreference: { type: String, enum: ['boys', 'girls', 'co-ed', 'any'], default: 'any' },
  amenities: [{ type: String }],
  isAvailable: { type: Boolean, default: true }
});
const Directory = mongoose.model('Directory', DirectorySchema);

const RidePoolSchema = new mongoose.Schema({
  creatorId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  creatorName: { type: String, required: true },
  creatorPhone: { type: String, required: true },
  from: { type: String, required: true }, // e.g., "GCOEARA Campus Gate"
  to: { type: String, required: true },   // e.g., "Manchar Bus Stand"
  date: { type: String, required: true }, // YYYY-MM-DD
  departureTime: { type: String, required: true }, // e.g., "17:30"
  totalSeats: { type: Number, default: 3, min: 1 },
  totalFare: { type: Number, default: 60 },
  passengers: [{
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: String,
    phone: String
  }],
  status: { type: String, enum: ['open', 'full', 'cancelled'], default: 'open' },
  createdAt: { type: Date, default: Date.now }
});
RidePoolSchema.index({ date: 1, departureTime: 1 });
const RidePool = mongoose.model('RidePool', RidePoolSchema);

// ==========================================
// HELPERS
// ==========================================
const getISTDateTime = () => {
  const now = new Date();
  const istDateStr = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now);
  const istTimeStr = new Intl.DateTimeFormat('en-GB', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit', hour12: false }).format(now);
  return { date: istDateStr, time: istTimeStr };
};

const expireOutdatedSubscriptions = async () => {
  try {
    const result = await Subscription.updateMany(
      { endDate: { $lt: new Date() }, status: { $ne: 'expired' } },
      { $set: { status: 'expired' } }
    );
    if (result.modifiedCount > 0) {
      console.log(`ℹ️ Auto-expired ${result.modifiedCount} outdated subscriptions.`);
      io.emit('subscription:updated', { expiredCount: result.modifiedCount });
    }
  } catch (error) {
    console.error('Failed to expire subscriptions:', error);
  }
};

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

// --- VALIDATION MIDDLEWARE ---
const validateRegister = (req, res, next) => {
  const { phone, password, role } = req.body;
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  const phoneRegex = /^[6-9]\d{9}$/;
  if (!phoneRegex.test(phone.trim())) {
    return res.status(400).json({ error: 'Invalid mobile number. Must be a 10-digit number starting with 6-9.' });
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  if (!role || !['student', 'owner', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (student, owner, or admin).' });
  }
  next();
};

const validateLogin = (req, res, next) => {
  const { phone, password, role } = req.body;
  if (!phone || typeof phone !== 'string' || !phone.trim()) {
    return res.status(400).json({ error: 'Phone number is required.' });
  }
  if (!password || typeof password !== 'string' || !password.trim()) {
    return res.status(400).json({ error: 'Password is required.' });
  }
  if (role !== undefined && !['student', 'owner', 'admin'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required (student, owner, or admin).' });
  }
  next();
};

const validateMenu = (req, res, next) => {
  const { shift, items, price } = req.body;
  if (!shift || !['morning', 'night'].includes(shift)) {
    return res.status(400).json({ error: 'Shift must be either "morning" or "night".' });
  }
  if (!Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Items must be a non-empty array.' });
  }
  const numPrice = Number(price);
  if (price === undefined || price === null || isNaN(numPrice) || numPrice < 0) {
    return res.status(400).json({ error: 'Price must be a valid non-negative number.' });
  }
  next();
};

const validateRating = (req, res, next) => {
  const { rating } = req.body;
  const numRating = Number(rating);
  if (rating === undefined || rating === null || isNaN(numRating) || numRating < 1 || numRating > 5) {
    return res.status(400).json({ error: 'Rating must be an integer or float between 1 and 5.' });
  }
  next();
};

// ==========================================
// 4. ROUTES
// ==========================================

// --- AUTH ROUTES ---
app.post('/api/register', validateRegister, async (req, res) => {
  try {
    const { role, name, phone, password, messName, messAddress, fssaiNumber, yearBranch, latitude, longitude } = req.body;

    if (await User.findOne({ phone })) return res.status(400).json({ error: 'Phone number already registered' });

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);
    const userData = { role, name, phone, password: hashedPassword, messName, messAddress, fssaiNumber, yearBranch };

    if (latitude && longitude) {
      userData.location = { type: 'Point', coordinates: [longitude, latitude] };
    }

    const newUser = new User(userData);
    await newUser.save();
    const token = jwt.sign({ id: newUser._id, role: newUser.role, messName: newUser.messName }, JWT_SECRET, { expiresIn: '7d' });
    const userResponse = { ...newUser._doc }; delete userResponse.password;

    res.status(201).json({ message: 'Registration successful', user: userResponse, token });
  } catch (error) { res.status(500).json({ error: 'Server error' }); }
});

app.post('/api/login', validateLogin, async (req, res) => {
  try {
    const { phone, password } = req.body;
    const user = await User.findOne({ phone });
    if (!user) return res.status(404).json({ error: 'User not found' });
    if (!(await bcrypt.compare(password, user.password))) return res.status(400).json({ error: 'Invalid password' });
    const token = jwt.sign({ id: user._id, role: user.role, messName: user.messName }, JWT_SECRET, { expiresIn: '7d' });
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
    const body = { ...req.body };
    if (typeof body.amenities === 'string') {
      body.amenities = body.amenities.split(',').map(s => s.trim()).filter(Boolean);
    }
    const newDir = new Directory(body);
    await newDir.save();
    res.status(201).json({ message: 'Directory item added', item: newDir });
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/admin/directory/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try {
    const body = { ...req.body };
    if (typeof body.amenities === 'string') {
      body.amenities = body.amenities.split(',').map(s => s.trim()).filter(Boolean);
    }
    const updated = await Directory.findByIdAndUpdate(req.params.id, body, { new: true });
    if (!updated) return res.status(404).json({ error: 'Directory item not found' });
    res.status(200).json({ message: 'Directory item updated', item: updated });
  } catch (error) { res.status(500).json({ error: 'Failed to update directory item' }); }
});

app.delete('/api/admin/directory/:id', authenticateToken, authenticateAdmin, async (req, res) => {
  try { await Directory.findByIdAndDelete(req.params.id); res.status(200).json({ message: 'Directory item deleted' }); } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

// --- MENU ROUTES ---
app.post('/api/menus', authenticateToken, validateMenu, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized.' });
  try {
    const ownerId = req.user.id;
    const { messName, date, shift, items, price } = req.body;

    const existingMenu = await Menu.findOne({ ownerId, date, shift });
    if (existingMenu) {
      existingMenu.items = items;
      existingMenu.price = price;
      await existingMenu.save();
      io.emit('menu:updated', { date, shift, messName, ownerId });
      // Notify active students
      Subscription.find({ messId: ownerId, status: { $in: ['paid', 'verification_pending'] }, $or: [{ shift }, { shift: 'both' }] })
        .then(subs => {
          const ids = subs.map(s => s.studentId);
          if (ids.length > 0) sendNotification(ids, `Menu Updated: ${shift === 'morning' ? '☀️ Morning' : '🌙 Night'}`, `🍽️ ${messName || 'Mess'} updated the ${shift} menu!`);
        }).catch(() => {});
      return res.status(200).json({ message: `${shift} menu updated!` });
    }
    const newMenu = new Menu({ ownerId, messName, date, shift, items, price });
    await newMenu.save();
    io.emit('menu:updated', { date, shift, messName, ownerId });
    // Notify active students
    Subscription.find({ messId: ownerId, status: { $in: ['paid', 'verification_pending'] }, $or: [{ shift }, { shift: 'both' }] })
      .then(subs => {
        const ids = subs.map(s => s.studentId);
        if (ids.length > 0) sendNotification(ids, `Menu Published: ${shift === 'morning' ? '☀️ Morning' : '🌙 Night'}`, `🍽️ ${messName || 'Mess'} published the ${shift} menu!`);
      }).catch(() => {});
    res.status(201).json({ message: `${shift} menu published!` });
  } catch (error) { res.status(500).json({ error: 'Failed to publish' }); }
});

app.get('/api/menus/:date', authenticateToken, async (req, res) => {
  try {
    const menus = await Menu.find({ date: req.params.date }).populate('ownerId', 'rating ratingCount morningCutoff nightCutoff');
    res.status(200).json(menus);
  } catch (error) { res.status(500).json({ error: 'Failed to fetch menus' }); }
});

// --- ATTENDANCE ROUTES ---
app.post('/api/attendance', authenticateToken, async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();
  try {
    const { messId, messName, shift, status, targetDate } = req.body;
    if (!shift) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Shift is required.' });
    }
    const userId = req.user.id;

    // Hard Cut-off Timer Enforcement
    const { date: todayIST, time: currentISTTime } = getISTDateTime();

    if (targetDate < todayIST) {
      await session.abortTransaction();
      return res.status(400).json({ error: 'Cannot modify attendance for past dates.' });
    }

    if (targetDate === todayIST) {
      let ownerCutoffs = { morning: '09:30', night: '17:30' };
      if (messId) {
        const owner = await User.findById(messId);
        if (owner) {
          if (owner.morningCutoff) ownerCutoffs.morning = owner.morningCutoff;
          if (owner.nightCutoff) ownerCutoffs.night = owner.nightCutoff;
        }
      }

      const shiftCutoff = shift === 'morning' ? ownerCutoffs.morning : ownerCutoffs.night;
      if (currentISTTime > shiftCutoff) {
        await session.abortTransaction();
        return res.status(400).json({ error: `Attendance cut-off time (${shiftCutoff}) has passed for this shift.` });
      }
    }

    const sub = await Subscription.findOne({ studentId: userId, messId }).session(session);
    const existingAtt = await Attendance.findOne({ userId, targetDate, shift }).session(session);

    if (sub && sub.status !== 'expired') {
      if (status === 'not_coming' && (!existingAtt || existingAtt.status !== 'not_coming')) {
        if (sub.usedSkips >= sub.allowedSkips) {
          await session.abortTransaction();
          return res.status(400).json({ error: `Skip limit reached (${sub.allowedSkips} max). Please contact the owner for more skips.` });
        }
        sub.usedSkips += 1;
        await sub.save({ session });
      }
      else if (status === 'coming' && existingAtt && existingAtt.status === 'not_coming') {
        if (sub.usedSkips > 0) {
          sub.usedSkips -= 1;
          await sub.save({ session });
        }
      }
    }

    await Attendance.findOneAndUpdate(
      { userId, targetDate, shift },
      { messId, messName, status, timestamp: new Date() },
      { upsert: true, new: true, session }
    );

    await session.commitTransaction();
    io.emit('attendance:updated', { messName, targetDate, shift });
    res.status(200).json({ success: true, message: "Attendance saved successfully!" });
  } catch (error) {
    if (session.inTransaction()) {
      await session.abortTransaction();
    }
    res.status(500).json({ success: false, message: "Failed to save attendance." });
  } finally {
    await session.endSession();
  }
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
      return sub.status !== 'expired' && targetDateObj >= start && targetDateObj <= end;
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

    const morningConsumed = morningAtt.filter(r => r.isConsumed).length;
    const nightConsumed = nightAtt.filter(r => r.isConsumed).length;

    // Fetch owner ration configuration
    const owner = await User.findOne({ messName, role: 'owner' });
    const cfg = owner?.rationConfig || { riceGrams: 120, flourGrams: 110, dalGrams: 45, veggieGrams: 150 };
    const totalGramsPerMeal = (cfg.riceGrams || 120) + (cfg.flourGrams || 110) + (cfg.dalGrams || 45) + (cfg.veggieGrams || 150);

    const calcEstimates = (coming, notComing) => ({
      requiredKg: {
        rice: Number(((coming * (cfg.riceGrams || 120)) / 1000).toFixed(2)),
        flour: Number(((coming * (cfg.flourGrams || 110)) / 1000).toFixed(2)),
        dal: Number(((coming * (cfg.dalGrams || 45)) / 1000).toFixed(2)),
        veggies: Number(((coming * (cfg.veggieGrams || 150)) / 1000).toFixed(2))
      },
      foodSavedKg: Number(((notComing * totalGramsPerMeal) / 1000).toFixed(2))
    });

    res.status(200).json({
      morning: { coming: morningComing, notComing: morningNotComing, consumed: morningConsumed, estimates: calcEstimates(morningComing, morningNotComing) },
      night: { coming: nightComing, notComing: nightNotComing, consumed: nightConsumed, estimates: calcEstimates(nightComing, nightNotComing) },
      rationConfig: cfg
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
        return sub.status !== 'expired' && dateObj >= start && dateObj <= end;
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

app.post('/api/messes/:ownerId/rate', authenticateToken, validateRating, async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const numRating = Number(rating);
    const owner = await User.findById(req.params.ownerId);
    const student = await User.findById(req.user.id);

    if (!owner || owner.role !== 'owner') return res.status(404).json({ error: 'Owner not found.' });
    if (!student) return res.status(401).json({ error: 'Student profile not found. Please log out and log back in.' });

    owner.ratingTotal = (owner.ratingTotal || 0) + numRating;
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

    const startDate = new Date();
    const endDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);

    const existing = await Subscription.findOne({ studentId: student._id, messId });
    if (existing) {
      if (existing.status === 'expired') {
        existing.shift = shift || existing.shift;
        existing.startDate = startDate;
        existing.endDate = endDate;
        existing.usedSkips = 0;
        existing.status = 'pending';
        if (messName) existing.messName = messName;
        await existing.save();
        io.emit('subscription:updated', { messId: existing.messId, studentId: existing.studentId });
        return res.status(200).json({ message: 'Subscription renewed! Awaiting owner confirmation.', sub: existing });
      }
      return res.status(400).json({ error: 'You are already a member of this mess.' });
    }

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
    io.emit('subscription:updated', { messId: newSub.messId, studentId: newSub.studentId });
    res.status(201).json({ message: 'Subscribed successfully! Awaiting owner confirmation.', sub: newSub });
  } catch (error) { res.status(500).json({ error: 'Failed to subscribe' }); }
});

app.get('/api/subscriptions/me', authenticateToken, async (req, res) => {
  try {
    const subs = await Subscription.find({ studentId: req.user.id }).populate('messId', 'name messName upiId morningCutoff nightCutoff');
    res.status(200).json(subs);
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.get('/api/subscriptions/mess', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized' });
    res.status(200).json(await Subscription.find({ messId: req.user.id }).populate('studentId', 'name phone yearBranch'));
  } catch (error) { res.status(500).json({ error: 'Failed' }); }
});

app.put('/api/subscriptions/:subId', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'owner') return res.status(403).json({ error: 'Unauthorized' });
    const { status, monthlyFee, extendDays, allowedSkips, renew } = req.body;

    const sub = await Subscription.findOne({ _id: req.params.subId, messId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    if (renew) {
      const now = new Date();
      sub.startDate = now;
      sub.endDate = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
      sub.usedSkips = 0;
      sub.status = status || 'paid';
      sub.paidAt = now;
      sendNotification(
        sub.studentId,
        'Subscription Renewed! 🎉',
        `Your 30-day membership for ${sub.messName || 'your mess'} has been renewed.`
      );
    } else {
      if (status) {
        if (sub.status === 'paid' && status === 'pending') {
          return res.status(400).json({ error: 'Cannot mark as pending. This subscription is already permanently marked as paid.' });
        }
        if (status === 'paid' && sub.status !== 'paid') {
          sub.paidAt = new Date();
          sendNotification(
            sub.studentId,
            'Payment Approved! 🎉',
            `Your subscription for ${sub.messName || 'your mess'} has been confirmed and activated.`
          );
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
    }

    await sub.save();
    io.emit('subscription:updated', { messId: sub.messId, studentId: sub.studentId });
    res.status(200).json({ message: 'Subscription successfully updated', sub });
  } catch (error) { res.status(500).json({ error: 'Failed to update subscription' }); }
});

// Student UPI Payment Submission
app.post('/api/subscriptions/:subId/submit-payment', authenticateToken, async (req, res) => {
  try {
    const { utrNumber } = req.body;
    const sub = await Subscription.findOne({ _id: req.params.subId, studentId: req.user.id });
    if (!sub) return res.status(404).json({ error: 'Subscription not found' });

    sub.status = 'verification_pending';
    sub.lastUtrNumber = utrNumber ? String(utrNumber).trim() : '';
    await sub.save();

    io.emit('subscription:updated', { messId: sub.messId, studentId: sub.studentId });

    sendNotification(
      sub.messId,
      'Payment Verification Requested 💳',
      `${sub.studentName || 'A student'} submitted UPI payment of ₹${sub.monthlyFee || 0} (UTR: ${sub.lastUtrNumber || 'N/A'}).`
    );

    res.status(200).json({ message: 'Payment submitted for verification', sub });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit payment' });
  }
});

// Owner UPI ID Configuration
app.put('/api/owner/upi', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only mess owners can update UPI ID.' });
  try {
    const { upiId } = req.body;
    const updated = await User.findByIdAndUpdate(req.user.id, { upiId: upiId ? upiId.trim() : '' }, { new: true }).select('-password');
    res.status(200).json({ message: 'UPI ID updated successfully!', user: updated });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update UPI ID' });
  }
});

// Owner Kitchen Ration Norms Configuration
app.put('/api/owner/ration-config', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only mess owners can update ration norms.' });
  try {
    const { riceGrams, flourGrams, dalGrams, veggieGrams } = req.body;
    const nums = { riceGrams, flourGrams, dalGrams, veggieGrams };
    for (const [key, val] of Object.entries(nums)) {
      if (val !== undefined) {
        const numVal = Number(val);
        if (isNaN(numVal) || numVal <= 0) {
          return res.status(400).json({ error: `${key} must be a positive number in grams.` });
        }
      }
    }

    const updateFields = {};
    if (riceGrams !== undefined) updateFields['rationConfig.riceGrams'] = Number(riceGrams);
    if (flourGrams !== undefined) updateFields['rationConfig.flourGrams'] = Number(flourGrams);
    if (dalGrams !== undefined) updateFields['rationConfig.dalGrams'] = Number(dalGrams);
    if (veggieGrams !== undefined) updateFields['rationConfig.veggieGrams'] = Number(veggieGrams);

    const updated = await User.findByIdAndUpdate(req.user.id, { $set: updateFields }, { new: true }).select('rationConfig');
    res.status(200).json({ message: 'Ration norms updated successfully!', rationConfig: updated.rationConfig });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ration norms' });
  }
});

// --- QR CODE MEAL PASS ROUTES ---
app.get('/api/attendance/qr/:messId/:targetDate/:shift', authenticateToken, async (req, res) => {
  try {
    if (req.user.role !== 'student') return res.status(403).json({ error: 'Only students can generate meal passes.' });
    const { messId, targetDate, shift } = req.params;

    const sub = await Subscription.findOne({ studentId: req.user.id, messId, status: 'paid' });
    const att = await Attendance.findOne({ userId: req.user.id, targetDate, shift });

    const isEligible = (sub && (sub.shift === 'both' || sub.shift === shift) && (!att || att.status !== 'not_coming')) || (att && att.status === 'coming');
    if (!isEligible) {
      return res.status(403).json({ error: 'No active meal reservation or paid subscription for this shift.' });
    }

    if (att && att.isConsumed) {
      return res.status(400).json({ error: 'Meal already claimed for this shift.' });
    }

    const student = await User.findById(req.user.id);
    const qrToken = jwt.sign(
      {
        type: 'meal_pass',
        studentId: req.user.id,
        studentName: student?.name || 'Student',
        messId,
        targetDate,
        shift
      },
      JWT_SECRET,
      { expiresIn: '15m' }
    );

    res.status(200).json({ qrToken });
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate meal pass' });
  }
});

app.post('/api/attendance/verify-qr', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only mess owners can verify meal passes.' });
  try {
    const { qrToken } = req.body;
    if (!qrToken) return res.status(400).json({ error: 'QR token is required.' });

    let decoded;
    try {
      decoded = jwt.verify(qrToken, JWT_SECRET);
    } catch (e) {
      return res.status(400).json({ error: 'Invalid or expired QR meal pass. Ask student to refresh QR.' });
    }

    if (decoded.type !== 'meal_pass') {
      return res.status(400).json({ error: 'Invalid token type.' });
    }

    if (decoded.messId !== req.user.id) {
      return res.status(403).json({ error: 'This meal pass is for a different mess.' });
    }

    let att = await Attendance.findOne({
      userId: decoded.studentId,
      targetDate: decoded.targetDate,
      shift: decoded.shift
    });

    if (att && att.isConsumed) {
      const timeStr = att.consumedAt ? new Date(att.consumedAt).toLocaleTimeString('en-IN', { timeZone: 'Asia/Kolkata', hour: '2-digit', minute: '2-digit' }) : '';
      return res.status(400).json({ error: `Already scanned! Meal was claimed at ${timeStr || 'an earlier time'}.` });
    }

    const owner = await User.findById(req.user.id).select('messName');
    const messName = owner?.messName || req.user.messName || 'Partner Mess';

    const now = new Date();
    if (!att) {
      att = new Attendance({
        messId: req.user.id,
        messName,
        shift: decoded.shift,
        status: 'coming',
        userId: decoded.studentId,
        targetDate: decoded.targetDate,
        isConsumed: true,
        consumedAt: now
      });
    } else {
      att.status = 'coming';
      att.isConsumed = true;
      att.consumedAt = now;
      att.messId = req.user.id;
      att.messName = messName;
    }
    await att.save();

    io.emit('attendance:consumed', {
      studentId: decoded.studentId,
      studentName: decoded.studentName,
      messId: req.user.id,
      targetDate: decoded.targetDate,
      shift: decoded.shift,
      consumedAt: now
    });
    io.emit('attendance:updated', {
      messName,
      targetDate: decoded.targetDate,
      shift: decoded.shift
    });

    // Notify student
    sendNotification(
      decoded.studentId,
      'Meal Verified! 🍽️',
      `Enjoy your ${decoded.shift} meal at ${messName}!`
    );

    res.status(200).json({
      success: true,
      studentName: decoded.studentName,
      shift: decoded.shift,
      consumedAt: now
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to verify meal pass' });
  }
});

// --- NOTIFICATION & PUSH TOKEN ROUTES ---
app.put('/api/users/push-token', authenticateToken, async (req, res) => {
  try {
    const { token } = req.body;
    await User.findByIdAndUpdate(req.user.id, { expoPushToken: token || '' });
    res.status(200).json({ message: 'Push token saved successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to save push token' });
  }
});

app.get('/api/notifications', authenticateToken, async (req, res) => {
  try {
    const list = await Notification.find({ userId: req.user.id }).sort({ createdAt: -1 }).limit(30);
    res.status(200).json(list);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications' });
  }
});

app.put('/api/notifications/read-all', authenticateToken, async (req, res) => {
  try {
    await Notification.updateMany({ userId: req.user.id, isRead: false }, { $set: { isRead: true } });
    res.status(200).json({ message: 'All notifications marked as read' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications' });
  }
});

// --- CUT-OFF TIMER ROUTES ---
app.put('/api/owner/cutoff', authenticateToken, async (req, res) => {
  if (req.user.role !== 'owner') return res.status(403).json({ error: 'Only owners can update cut-off times.' });
  try {
    const { morningCutoff, nightCutoff } = req.body;
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

    const updateData = {};
    if (morningCutoff !== undefined) {
      if (!timeRegex.test(morningCutoff)) {
        return res.status(400).json({ error: 'Invalid morningCutoff format. Expected HH:mm (e.g. 09:30).' });
      }
      updateData.morningCutoff = morningCutoff;
    }
    if (nightCutoff !== undefined) {
      if (!timeRegex.test(nightCutoff)) {
        return res.status(400).json({ error: 'Invalid nightCutoff format. Expected HH:mm (e.g. 17:30).' });
      }
      updateData.nightCutoff = nightCutoff;
    }

    const updatedUser = await User.findByIdAndUpdate(req.user.id, updateData, { new: true }).select('-password');
    res.status(200).json({ message: 'Cut-off times updated successfully!', user: updatedUser });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update cut-off times.' });
  }
});

// Haversine Distance Helper (returns distance in km)
const haversineDistanceKm = (lat1, lon1, lat2, lon2) => {
  const toRad = (x) => (x * Math.PI) / 180;
  const R = 6371; // Earth radius in kilometers
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

// --- LOCATION/MAP ROUTES ---
app.get('/api/messes/nearby', authenticateToken, async (req, res) => {
  try {
    const { lat, lng, maxDistanceKm } = req.query;
    const latNum = parseFloat(lat);
    const lngNum = parseFloat(lng);
    const maxDist = parseFloat(maxDistanceKm) || 15;

    const messes = await User.find({
      role: 'owner',
      isVerified: true,
      'location.coordinates': { $ne: [0, 0] }
    }).select('messName messAddress location rating ratingCount fssaiNumber phone');

    // If valid coordinates are provided, compute distanceKm and sort ascending
    if (!isNaN(latNum) && !isNaN(lngNum)) {
      const results = [];
      for (const m of messes) {
        if (m.location && Array.isArray(m.location.coordinates) && m.location.coordinates.length === 2) {
          const [messLng, messLat] = m.location.coordinates;
          if (messLng !== 0 || messLat !== 0) {
            const dist = haversineDistanceKm(latNum, lngNum, messLat, messLng);
            if (dist <= maxDist) {
              const mObj = m.toObject();
              mObj.distanceKm = Math.round(dist * 10) / 10;
              results.push(mObj);
            }
          }
        }
      }
      results.sort((a, b) => a.distanceKm - b.distanceKm);
      return res.status(200).json(results);
    }

    // Default response when lat/lng are omitted
    res.status(200).json(messes);
  } catch (error) {
    console.error('Error fetching nearby messes:', error);
    res.status(500).json({ error: 'Failed to fetch nearby messes' });
  }
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

// --- RIDE POOL / AUTO POOLING ROUTES ---
app.get('/api/rides', authenticateToken, async (req, res) => {
  try {
    const { date } = req.query;
    const queryDate = date || getISTDateTime().date;
    const rides = await RidePool.find({
      date: queryDate,
      status: { $ne: 'cancelled' }
    }).sort({ departureTime: 1 });
    res.status(200).json(rides);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rides' });
  }
});

app.post('/api/rides', authenticateToken, async (req, res) => {
  try {
    const { from, to, date, departureTime, totalSeats, totalFare } = req.body;
    if (!from || !to || !date || !departureTime) {
      return res.status(400).json({ error: 'From, To, Date, and Departure Time are required.' });
    }

    const seats = Number(totalSeats) || 3;
    if (seats < 1) {
      return res.status(400).json({ error: 'Total seats must be at least 1.' });
    }

    const user = await User.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newRide = new RidePool({
      creatorId: user._id,
      creatorName: user.name,
      creatorPhone: user.phone,
      from: from.trim(),
      to: to.trim(),
      date,
      departureTime,
      totalSeats: seats,
      totalFare: Number(totalFare) || 60,
      passengers: [{
        userId: user._id,
        name: user.name,
        phone: user.phone
      }],
      status: 'open'
    });

    await newRide.save();
    io.emit('ride:updated', { rideId: newRide._id, action: 'created', date });
    res.status(201).json({ message: 'Ride pool created successfully!', ride: newRide });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create ride pool' });
  }
});

app.post('/api/rides/:id/toggle-join', authenticateToken, async (req, res) => {
  try {
    const ride = await RidePool.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride pool not found' });
    if (ride.status === 'cancelled') return res.status(400).json({ error: 'This ride has been cancelled.' });

    const userIdStr = req.user.id.toString();
    const existingIndex = ride.passengers.findIndex(p => p.userId.toString() === userIdStr);

    if (existingIndex !== -1) {
      // User is already in ride
      if (ride.creatorId.toString() === userIdStr) {
        return res.status(400).json({ error: 'As creator, you cannot leave the ride pool. You can cancel it instead.' });
      }
      ride.passengers.splice(existingIndex, 1);
      ride.status = 'open';
      await ride.save();
      io.emit('ride:updated', { rideId: ride._id, action: 'left', date: ride.date });
      return res.status(200).json({ message: 'You left the ride pool.', ride });
    } else {
      // User joining
      if (ride.passengers.length >= ride.totalSeats) {
        return res.status(400).json({ error: 'This ride pool is already full.' });
      }
      const user = await User.findById(req.user.id);
      ride.passengers.push({
        userId: user._id,
        name: user.name,
        phone: user.phone
      });
      if (ride.passengers.length >= ride.totalSeats) {
        ride.status = 'full';
      }
      await ride.save();
      io.emit('ride:updated', { rideId: ride._id, action: 'joined', date: ride.date });
      return res.status(200).json({ message: 'Successfully joined ride pool!', ride });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to update ride membership' });
  }
});

app.delete('/api/rides/:id', authenticateToken, async (req, res) => {
  try {
    const ride = await RidePool.findById(req.params.id);
    if (!ride) return res.status(404).json({ error: 'Ride not found' });

    if (ride.creatorId.toString() !== req.user.id && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only the creator or admin can cancel this ride.' });
    }

    ride.status = 'cancelled';
    await ride.save();
    io.emit('ride:updated', { rideId: ride._id, action: 'cancelled', date: ride.date });
    res.status(200).json({ message: 'Ride pool cancelled successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to cancel ride pool' });
  }
});

// Global Express Error Handler (prevents stack trace leaks in production)
app.use((err, req, res, next) => {
  console.error('Unhandled Server Error:', err);
  const isProd = process.env.NODE_ENV === 'production';
  res.status(err.status || 500).json({
    error: err.message || 'Internal Server Error',
    ...(isProd ? {} : { stack: err.stack })
  });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 Backend Server is running at http://localhost:${PORT}`));

// Graceful Shutdown on SIGINT and SIGTERM
const gracefulShutdown = async (signal) => {
  console.log(`\n🛑 [${signal}] Initiating graceful shutdown...`);
  try {
    io.close(() => {
      console.log('⚡ Socket.io connections closed.');
    });
    server.close(async () => {
      console.log('🌐 HTTP server closed.');
      await mongoose.connection.close();
      console.log('📦 MongoDB connection closed.');
      process.exit(0);
    });
    // Force exit after 10s if graceful shutdown hangs
    setTimeout(() => {
      console.error('⚠️ Forcing server shutdown after timeout.');
      process.exit(1);
    }, 10000);
  } catch (err) {
    console.error('❌ Error during graceful shutdown:', err);
    process.exit(1);
  }
};

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));