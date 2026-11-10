/**
 * Authentication Controller
 */

const bcrypt = require('bcryptjs');
const db = require('../config/db');

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const cleanEmail = email.trim().toLowerCase();
    let user = null;

    if (db.getDbMode() === 'mysql') {
      const pool = db.getPool();
      const [rows] = await pool.execute(
        'SELECT id, name, email, password, role, avatar_url FROM users WHERE LOWER(email) = ?',
        [cleanEmail]
      );
      if (rows && rows.length > 0) {
        user = rows[0];
      }
    } else {
      const localData = db.getLocalData();
      user = localData.users.find(u => u.email.toLowerCase() === cleanEmail);
    }

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. User with this email does not exist.'
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials. Password does not match.'
      });
    }

    // Save session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      avatar_url: user.avatar_url || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
    };

    // Record login activity
    await db.recordActivity(
      'User Login',
      `Administrator ${user.name} logged into the system.`,
      'auth',
      user.id,
      user.name
    );

    res.json({
      success: true,
      message: 'Login successful',
      user: req.session.user
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = (req, res, next) => {
  try {
    const userName = req.session && req.session.user ? req.session.user.name : 'User';
    req.session.destroy(err => {
      if (err) {
        return res.status(500).json({ success: false, message: 'Could not log out. Please try again.' });
      }
      res.clearCookie('sms_session_id');
      return res.json({
        success: true,
        message: `${userName} logged out successfully.`
      });
    });
  } catch (err) {
    next(err);
  }
};

exports.getCurrentUser = (req, res) => {
  if (req.session && req.session.user) {
    return res.json({
      success: true,
      user: req.session.user
    });
  }
  return res.status(401).json({
    success: false,
    message: 'No active session.'
  });
};
