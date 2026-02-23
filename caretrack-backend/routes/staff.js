const express = require('express');
const router = express.Router();
const { User, logActivity } = require('../db');
const { authenticateToken } = require('../middleware/auth');
const  adminOnly  = require('../middleware/admin');

router.get('/', authenticateToken, adminOnly, async (req, res) => {
    try {
        const users = await User.findAll({
            attributes: ['id', 'email', 'firstName', 'lastName', 'role']
        });
        res.json({ success: true, users });
    } catch (error) {
        console.error('Error fetching staff:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

router.put('/:userId/role', authenticateToken, adminOnly, async (req, res) => {
    const { userId } = req.params;
    const { role } = req.body; // Aici primim 'admin' sau 'doctor'

    try {
        const userToUpdate = await User.findByPk(userId);
        if (!userToUpdate) {
            return res.status(404).json({ success: false, message: 'Utilizator negăsit.' });
        }

        // Prevenim situația în care un admin își scoate singur drepturile (auto-blocare)
        if (userToUpdate.id === req.user.id && role !== 'admin') {
            return res.status(400).json({ success: false, message: 'Nu îți poți schimba singur rolul de admin.' });
        }

        const oldRole = userToUpdate.role;
        userToUpdate.role = role;
        await userToUpdate.save();

        // Înregistrăm acțiunea în Audit Log
        if (typeof logActivity === 'function') {
            await logActivity(req, 'CHANGE_ROLE', `Rolul lui ${userToUpdate.email} a fost schimbat din ${oldRole} în ${role}`);
        }

        res.json({ success: true, message: `Rolul a fost actualizat în ${role}.` });
    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Eroare la actualizarea rolului.' });
    }
});

module.exports = router;