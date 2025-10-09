// backend/auth.js
const jwt = require('jsonwebtoken');

function requireAuth(req, res, next) {
  try {
    const authHeader = req.headers['authorization'];
    if (!authHeader) {
      return res.status(401).json({ message: 'Missing Authorization header' });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({ message: 'Token not found' });
    }

    // ✅ ตรวจสอบ token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // เก็บข้อมูล user ไว้ให้ route ใช้ได้ (id, email, role)
    next();
  } catch (err) {
    console.error('Auth failed:', err.message);
    return res.status(401).json({ message: 'Unauthorized' });
  }
}

function requireAdmin(req, res, next) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(401).json({ message: 'Admin only' });
  }
  next();
}

module.exports = { requireAuth, requireAdmin };
