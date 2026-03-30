const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { User, ResetToken } = require('../models');
const { logActivity } = require('../utils/logger');
const { Op } = require('sequelize');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { authLimiter, signupLimiter } = require('../middleware/rateLimiter');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS
  }
});

router.post('/login', authLimiter, async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (isMatch) {
        console.log("DEBUG LOGIN - Semnatura gasita in DB:", user.signature ? "DA (lungime: " + user.signature.length + ")" : "NU (este null)");
        
        
    }
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role , signature: user.signature},
      process.env.JWT_SECRET,
      { expiresIn: '1d' }
    );

    await logActivity(
        { 
          user: { id: user.id }, 
          ip: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress 
        }, 
        'LOGIN', 
        `Doctorul ${user.firstName} ${user.lastName} s-a logat.`
      );

    res.json({
      success: true,
      token,
      user:{
    id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role,
      signature: user.signature
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/signup', signupLimiter, async (req, res) => {
  const { email, password, firstName, lastName } = req.body;

  try {
    const existingUser = await User.findOne({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User already exists' });
    }

    const userCount = await User.count();
    const assignedRole = userCount === 0 ? 'admin' : 'doctor';

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
      role: assignedRole
    });

    res.json({ success: true, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});

router.post('/forgot-password', authLimiter, async (req, res) => {
  const { email } = req.body;

  try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
          return res.json({ success: true, message: 'If the email is registered, a password reset link has been sent.' });
      }

      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000);

      await ResetToken.create({ token, userId: user.id, expiresAt });

      const resetUrl = `${process.env.FRONTEND_URL}/reset-password/${token}`;
      await transporter.sendMail({
        from: process.env.NODEMAILER_USER,
        to: user.email,
        subject: 'CareTrack Password Reset',
        html: `<p>You requested a password reset. Click this link: <a href="${resetUrl}">${resetUrl}</a></p><p>This link expires in 1 hour.</p>`
      });

      res.json({ success: true, message: 'Password reset link sent.' });

  } catch (error) {
      console.error('Error in forgot-password:', error);
      res.status(500).json({ success: false, message: 'Server error during reset request.' });
  }
});

router.post('/reset-password', authLimiter, async (req, res) => {
  const { token, newPassword } = req.body;

  try {
      const resetRecord = await ResetToken.findOne({
          where: { token, expiresAt: { [Op.gt]: new Date() } }
      });

      if (!resetRecord) {
          return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
      }

      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.update({ password: hashedPassword }, { where: { id: resetRecord.userId } });

      await resetRecord.destroy();

      res.json({ success: true, message: 'Password successfully reset.' });

  } catch (error) {
      console.error('Error in reset-password:', error);
      res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
});

module.exports = router;
