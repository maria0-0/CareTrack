const express = require('express');
const router = express.Router();
const { User, AuditLog } = require('../models');
const { authenticateToken } = require('../middleware/auth');
const { uploadBase64ToS3 } = require('../utils/s3Upload');

router.get('/profile', authenticateToken, (req, res) => {
  res.json({
      success: true,
      message: `Welcome, ${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName,
      signature: req.user.signature
  });
});

router.delete('/account', authenticateToken, async (req, res) => {
    try {
        const doctorId = req.user.id;
        
        // Importăm toate modelele din baza ta de date
        const { 
            User, Patient, Appointment, Note, 
            PatientFile, AppointmentFile, ResetToken, 
            MedicalRecord, FormTemplate, PatientForm, AuditLog 
        } = require('../models');

        console.log(`[SECURITY] Inițiere procedură de ștergere totală pentru ID: ${doctorId}`);

        // 1. Curățăm tabelele care sunt direct legate de DOCTOR (User)
        // Acestea blochează ștergerea User-ului dacă nu sunt golite primele
        await AuditLog.destroy({ where: { doctorId } });
        await FormTemplate.destroy({ where: { doctorId } });
        await ResetToken.destroy({ where: { userId: doctorId } });

        // 2. Curățăm datele asociate PACIENȚILOR acestui doctor
        // Luăm toți pacienții doctorului pentru a le șterge dependențele lor specifice
        const patients = await Patient.findAll({ where: { doctorId } });
        const patientIds = patients.map(p => p.id);

        if (patientIds.length > 0) {
            // Ștergem MedicalRecords, Note și Formularele pacienților
            await MedicalRecord.destroy({ where: { patientId: patientIds } });
            await Note.destroy({ where: { patientId: patientIds } });
            await PatientForm.destroy({ where: { patientId: patientIds } });
            await PatientFile.destroy({ where: { patientId: patientIds } });

            // Ștergem fișierele programărilor
            const appts = await Appointment.findAll({ where: { patientId: patientIds } });
            const apptIds = appts.map(a => a.id);
            if (apptIds.length > 0) {
                await AppointmentFile.destroy({ where: { appointmentId: apptIds } });
            }
        }

        // 3. Ștergem tabelele părinte: Programările și Pacienții
        await Appointment.destroy({ where: { doctorId } });
        await Patient.destroy({ where: { doctorId } });

        // 4. PASUL FINAL: Acum Users este liber de orice legătură
        const deleted = await User.destroy({ where: { id: doctorId } });

        if (deleted) {
            console.log(`[SUCCESS] Contul doctorului ${doctorId} a fost eliminat.`);
            res.json({ success: true, message: "Contul și toate datele asociate au fost șterse definitiv." });
        } else {
            res.status(404).json({ success: false, message: "Utilizatorul nu a fost găsit." });
        }

    } catch (err) {
        console.error("ERROARE CRITICĂ LA ȘTERGERE:", err);
        // Trimitem eroarea exactă pentru a o vedea în consolă
        res.status(500).json({ success: false, message: "Eroare DB: " + err.message });
    }
});

router.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    let queryOptions = {
      include: [{ model: User, attributes: ['firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']]
    };

    if (req.user.role !== 'admin') {
      queryOptions.where = { doctorId: req.user.id };
    }

    const logs = await AuditLog.findAll(queryOptions);
    
    res.json({ success: true, logs });
  } catch (err) {
    console.error("EROARE LA AUDIT:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});


router.put('/profile/signature', authenticateToken, async (req, res) => {
    try {
        const user = await User.findByPk(req.user.id);
        if (!user) return res.status(404).json({ success: false, message: 'User not found' });

        // Upload to S3 if signature is potentially a base64 string
        let signatureUrl = req.body.signature;
        if (signatureUrl && signatureUrl.startsWith('data:image')) {
            signatureUrl = await uploadBase64ToS3(signatureUrl, `signatures/doctor-${user.id}`);
        }

        user.signature = signatureUrl;
        await user.save();

        res.json({ success: true, message: 'Signature updated and saved to S3.', signature: user.signature });
    } catch (err) {
        console.error("Signature S3 Upload Error:", err);
        res.status(500).json({ success: false, message: 'Server error processing signature' });
    }
});

// Proxy route for images to bypass CORS issues in PDF generation
router.get('/proxy-image', authenticateToken, async (req, res) => {
  const { url } = req.query;
  if (!url) return res.status(400).send('URL is required');

  try {
    const axios = require('axios');
    const response = await axios({
      url,
      method: 'GET',
      responseType: 'stream'
    });

    res.set('Content-Type', response.headers['content-type']);
    response.data.pipe(res);
  } catch (error) {
    console.error('Error proxying image:', error.message);
    res.status(500).send('Error fetching image');
  }
});

module.exports = router;
