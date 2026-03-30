const express = require('express');
const router = express.Router();
const { Appointment, Patient, AppointmentFile } = require('../models');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/multer');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const appointments = await Appointment.findAll({
      where: { doctorId: req.user.id },
      include: Patient
    });
    
    res.json({ success: true, appointments });
  } catch (err) {
    res.status(500).json({ success: false, message: 'Error fetching appointments' });
  }
});

router.post('/', authenticateToken, async (req, res) => {
  const { patientId, date, reason } = req.body;

  if (!patientId || !date || !reason) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    const appointment = await Appointment.create({
      patientId,
      date,
      reason,
      doctorId: req.user.id
    });
    
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [{ model: Patient }]
    });

    res.status(201).json({ success: true, appointment: fullAppointment });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;

  try {
    const appointment = await Appointment.findOne({
      where: {
        id,
        doctorId: req.user.id
      }
    });
        if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    await appointment.destroy();
    res.json({ success: true, message: 'Appointment deleted' });
  } catch (err) {
    console.error('Error deleting appointment:', err);
    res.status(500).json({ success: false, message: 'Error deleting appointment' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  const { id } = req.params;
  const { date, reason, patientId } = req.body;
  const doctorId = req.user.id;
  if (!date || !reason || !patientId) {
    return res.status(400).json({ success: false, message: 'Missing date, reason, or patient ID for update.' });
  }
  try {
    const appointment = await Appointment.findOne({
      where: {
        id,
        doctorId: req.user.id,
        patientId: patientId
      }
    });
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }

    const [updatedRows] = await Appointment.update(
      { 
          date: date,
          reason: reason
      },
      {
          where: { id, doctorId }
      }
    );

    if (updatedRows === 0) {
      return res.status(200).json({ success: false, message: 'No changes were detected or applied.' });
    }

    const updatedAppointment = await Appointment.findByPk(id, {
       include: [{ model: Patient, attributes: ['id', 'name'] }] 
    });

    res.json({ success: true, appointment: updatedAppointment });

  } catch (error) {
    console.error('Error updating appointment:', error);
    res.status(500).json({ success: false, message: 'Server error updating appointment.' });
  }
});

router.post('/check', authenticateToken, async (req, res) => {
  const { date } = req.body;

  try {
    const existing = await Appointment.findOne({
      where: {
        doctorId: req.user.id,
        date
      }
    });

    res.json({ success: true, available: !existing });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.get('/by-date/:date', authenticateToken, async (req, res) => {
  const date = req.params.date;

  try {
    const start = new Date(`${date}T00:00:00`);
    const end = new Date(`${date}T23:59:59`);

    const appointments = await Appointment.findAll({
      where: {
        doctorId: req.user.id,
        date: { [Op.between]: [start, end] }
      },
      include: Patient
    });

    res.json({ success: true, appointments });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.post('/day', authenticateToken, async (req, res) => {
  const { date } = req.body;

  if (!date) {
    return res.status(400).json({ success: false, message: "Missing date" });
  }

  const day = new Date(date);
  const start = new Date(day.setHours(0, 0, 0, 0));
  const end = new Date(day.setHours(23, 59, 59, 999));

  try {
    const appointments = await Appointment.findAll({
      where: {
        doctorId: req.user.id,
        date: {
          [Op.between]: [start, end],
        },
      },
      include: [{ model: Patient }]
    });

    res.json({ success: true, appointments });
  } catch (err) {
    console.error("Error fetching appointments for day:", err);
    res.status(500).json({ success: false, message: "Server error" });
  }
});

router.get('/unavailable', authenticateToken, async (req, res) => {
  const doctorId = req.user.id;
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  try {
      const appointments = await Appointment.findAll({
          where: {
              doctorId: doctorId,
              date: {
                  [Op.gte]: startOfToday 
              }
          },
          attributes: ['id', 'date', 'duration'],
          order: [['date', 'ASC']]
      });

      const scheduledSlots = appointments.map(app => ({
          id: app.id,
          date: app.date,
          duration: app.duration
      }));

      res.json({ success: true, slots: scheduledSlots });
  } catch (error) {
      console.error("Error fetching unavailable slots:", error);
      res.status(500).json({ success: false, message: 'Server error fetching unavailable slots.' });
  }
});

router.put('/:appointmentId/note', authenticateToken, async (req, res) => {
  const { appointmentId } = req.params;
  const { followUpNote } = req.body;
  const doctorId = req.user.id;

  try {
      const appointment = await Appointment.findOne({
          where: { id: appointmentId, doctorId: doctorId }
      });

      if (!appointment) {
          return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized.' });
      }
      
      if (new Date(appointment.date) >= new Date()) {
           return res.status(400).json({ success: false, message: 'Cannot add a follow-up note to an upcoming appointment.' });
      }

      appointment.followUpNote = followUpNote || null;
      await appointment.save();

      res.json({ success: true, appointment });
  } catch (error) {
      console.error("Error updating appointment note:", error);
      res.status(500).json({ success: false, message: 'Server error updating appointment note.' });
  }
});

router.post('/:appointmentId/files', authenticateToken, upload.single('file'), async (req, res) => {
  const { appointmentId } = req.params;
  const { description } = req.body;
  
  if (!req.file) {
      return res.status(400).json({ success: false, message: 'No file uploaded.' });
  }

  try {
      const appointment = await Appointment.findOne({
          where: { id: appointmentId, doctorId: req.user.id }
      });

      if (!appointment) {
          return res.status(404).json({ success: false, message: 'Appointment not found or unauthorized.' });
      }
      
      const newFile = await AppointmentFile.create({
          fileName: req.file.originalname,
          fileUrl: req.file.location, // S3 Public URL
          fileMimeType: req.file.mimetype,
          description: description,
          appointmentId: appointmentId
      });

      res.json({ success: true, file: newFile });
  } catch (err) {
      console.error('Error uploading appointment file:', err);
      res.status(500).json({ success: false, message: 'Server error during file upload.' });
  }
});

router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;

  try {
      const file = await AppointmentFile.findOne({ 
          where: { id: fileId },
          include: [{ 
              model: Appointment, 
              where: { doctorId: req.user.id } 
          }]
      });

      if (!file) {
          return res.status(404).json({ success: false, message: 'File not found or unauthorized.' });
      }
      
      // 1. Delete from S3 if configured
      const fileKey = file.fileUrl.split(`${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];
      if (fileKey) {
          try {
              const deleteParams = {
                  Bucket: process.env.AWS_S3_BUCKET_NAME,
                  Key: fileKey,
              };
              await s3.send(new DeleteObjectCommand(deleteParams));
              console.log(`[AWS] Fișier șters din S3 (Programări): ${fileKey}`);
          } catch (s3Err) {
              console.error("[AWS] Eroare la ștergerea din S3:", s3Err);
          }
      }

      await file.destroy();

      res.json({ success: true, message: 'File record deleted successfully.' });
  } catch (err) {
      console.error('Error deleting appointment file:', err); 
      res.status(500).json({ success: false, message: 'Server error deleting file.' });
  }
});

router.put('/files/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;
  const { description } = req.body;

  try {
      const file = await AppointmentFile.findOne({
          where: { id: fileId },
          include: [{ 
              model: Appointment, 
              where: { doctorId: req.user.id } 
          }]
      });

      if (!file) {
          return res.status(404).json({ success: false, message: 'File not found or unauthorized.' });
      }
      
      file.description = description || '';
      await file.save();
      
      res.json({ success: true, file });
  } catch (err) {
      console.error('Error updating file description details:', err.message);
      res.status(500).json({ success: false, message: 'Server error updating file description.' }); 
  }
});

module.exports = router;
