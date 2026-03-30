const { AuditLog } = require('../models');

const logActivity = async (req, action, details = '') => {
  try {
    await AuditLog.create({
      action,
      details,
      doctorId: req.user ? req.user.id : null,
      ipAddress: req.ip || (req.headers && req.headers['x-forwarded-for']) || req.socket.remoteAddress || '0.0.0.0'
    });
  } catch (err) {
    console.error("Audit Log Error:", err);
  }
};

module.exports = { logActivity };
