// Demo data store (in-memory)
let demoData = {
  companies: {},
  employees: {},
  projects: {},
  nextId: 1
};

// Demo mode utilities
function isDemoMode() {
  return process.env.NODE_ENV === 'demo';
}

function generateId() {
  return demoData.nextId++;
}

function hashPassword(password) {
  // Simple hash for demo - in production use bcrypt
  return require('crypto').createHash('sha256').update(password).digest('hex');
}

function comparePassword(password, hash) {
  return hashPassword(password) === hash;
}

function generateToken(payload) {
  return require('jsonwebtoken').sign(payload, process.env.JWT_SECRET || 'demo-secret', { expiresIn: '24h' });
}

function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'demo-secret', (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
}

function verifyToken(token) {
  try {
    return require('jsonwebtoken').verify(token, process.env.JWT_SECRET || 'demo-secret');
  } catch (err) {
    return null;
  }
}

module.exports = {
  isDemoMode,
  generateId,
  hashPassword,
  comparePassword,
  generateToken,
  authenticateToken,
  verifyToken,
  demoData
};