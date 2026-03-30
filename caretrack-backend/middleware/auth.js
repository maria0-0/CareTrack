const jwt = require('jsonwebtoken');
const { User } = require('../models');
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
      if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

      try {
          const fullUser = await User.findByPk(user.id, { 
              attributes: ['id', 'email', 'firstName', 'lastName','role','signature']
          });

          if (!fullUser) {
              return res.status(403).json({ success: false, message: 'User not found' });
          }

          req.user = fullUser.toJSON(); 
          next();
      } catch (dbError) {
          console.error("Error fetching user during token auth:", dbError);
          return res.status(500).json({ success: false, message: 'Server error during authentication' });
      }
  });
};

module.exports = { authenticateToken };
