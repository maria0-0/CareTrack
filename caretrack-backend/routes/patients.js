const express = require('express');
const router = express.Router();
const { Patient, Note, MedicalRecord, PatientFile, PatientForm, FormTemplate, Appointment, AppointmentFile, User, logActivity } = require('../db');
const { Op } = require('sequelize');
const { authenticateToken } = require('../middleware/auth');
const { upload } = require('../middleware/multer');
const fs = require('fs');
const { S3Client, DeleteObjectCommand } = require('@aws-sdk/client-s3');

const s3 = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    }
});

router.post('/', authenticateToken, async (req, res) => {
  const { name, age, birthday, phone, email } = req.body;

  if (!name || !age || !birthday || !phone || !email) {
    return res.status(400).json({ success: false, message: 'Name, age, birthday, phone and email are required' });
  }

  try {
    const existingPatient = await Patient.findOne({
      where: {
        email: email,
        doctorId: req.user.id
      }
    });

    if (existingPatient) {
      return res.status(400).json({
        success: false,
        message: 'You already have a patient registered with this email address.'
      });
    }
    const newPatient = await Patient.create({ name, age, birthday, phone, email, doctorId: req.user.id });
    res.status(201).json({ success: true, patient: newPatient });
  } catch (err) {
    console.error('Error creating patient:', err);
    res.status(500).json({ success: false, message: 'Server error creating patient' });
  }
});

router.get('/', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search || '';

    const doctorId = req.user.id;

    const { count, rows } = await Patient.findAndCountAll({
      where: { 
        doctorId,
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']]
    });

    res.json({
      success: true,
      patients: rows,
      totalPages: Math.ceil(count / limit),
      currentPage: page,
      totalPatients: count
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error fetching patients.' });
  }
});

router.get('/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({
      where: { id: req.params.id, doctorId: req.user.id },
      include: [
        { model: Appointment, include: [{ model: User, attributes: ['email'] }, { model: AppointmentFile }] },
        Note,
        PatientFile,
        MedicalRecord,
        { model: PatientForm, order: [['createdAt', 'DESC']] }
      ],
      order: [
        [Note, 'createdAt', 'DESC'],
        [Appointment, 'date', 'ASC'],
      ]
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found or unauthorized.' });
    }

    res.json({ success: true, patient: patient });
  } catch (error) {
    console.error("Patient fetch error:", error);
    res.status(500).json({ success: false, message: 'Server error: Failed to fetch patient.' });
  }
});

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const id = req.params.id;
    const { name, age, birthday, phone, email } = req.body;
    const doctorId = req.user.id;

    const patient = await Patient.findByPk(id);
    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found' });
    }

    if (email && email !== patient.email) {
      const emailExists = await Patient.findOne({
        where: {
          email: email,
          doctorId: doctorId,
          id: { [Op.ne]: id }
        }
      });

      if (emailExists) {
        return res.status(400).json({
          success: false,
          message: 'You already have another patient registered with this email.'
        });
      }
    }

    patient.name = name || patient.name;
    patient.age = age || patient.age;
    patient.birthday = birthday || patient.birthday;
    patient.phone = phone || patient.phone;
    patient.email = email || patient.email;

    await patient.save();
    res.json({ success: true, patient });
  } catch (err) {
    console.error('Error updating patient:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const patient = await Patient.findOne({ where: { id, doctorId: req.user.id } });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found.' });
    }
    const patientName = patient.name;

    await patient.destroy();

    await logActivity(req, 'DELETE_PATIENT', `A șters pacientul: ${patientName}`);
    res.json({ success: true, message: 'Patient deleted successfully.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error deleting patient.' });
  }
});

router.post('/:patientId/notes', authenticateToken, async (req, res) => {
  const patientId = req.params.patientId;
  const { content } = req.body;
  const doctorId = req.user.id;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Note content is required.' });
  }

  try {
    const patient = await Patient.findOne({
      where: { id: patientId, doctorId: doctorId }
    });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Patient not found or unauthorized.' });
    }

    const newNote = await Note.create({
      content,
      patientId,
      doctorId
    });

    res.status(201).json({ success: true, note: newNote });

  } catch (error) {
    console.error("Error creating note:", error);
    res.status(500).json({ success: false, message: 'Server error creating note.' });
  }
});

router.put('/:patientId/notes/:noteId', authenticateToken, async (req, res) => {
  const { patientId, noteId } = req.params;
  const { content } = req.body;
  const doctorId = req.user.id;

  if (!content) {
    return res.status(400).json({ success: false, message: 'Note content is required.' });
  }

  try {
    const note = await Note.findOne({
      where: {
        id: noteId,
        patientId: patientId,
        doctorId: doctorId
      }
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized.' });
    }

    note.content = content;
    await note.save();

    res.json({ success: true, note });
  } catch (error) {
    console.error("Error updating note:", error);
    res.status(500).json({ success: false, message: 'Server error updating note.' });
  }
});

router.delete('/:patientId/notes/:noteId', authenticateToken, async (req, res) => {
  const { patientId, noteId } = req.params;
  const doctorId = req.user.id;

  try {
    const note = await Note.findOne({
      where: {
        id: noteId,
        patientId: patientId,
        doctorId: doctorId
      }
    });

    if (!note) {
      return res.status(404).json({ success: false, message: 'Note not found or unauthorized.' });
    }

    await note.destroy();

    res.json({ success: true, message: 'Note successfully deleted.' });
  } catch (error) {
    console.error("Error deleting note:", error);
    res.status(500).json({ success: false, message: 'Server error deleting note.' });
  }
});

router.post('/:patientId/medical', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { type, name, severity, notes } = req.body;
  const doctorId = req.user.id;

  try {
    const patient = await Patient.findOne({ where: { id: patientId, doctorId } });
    if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

    const record = await MedicalRecord.create({
      patientId,
      type, name, severity, notes
    });
    res.status(201).json({ success: true, record });
  } catch (error) {
    console.error('Failed to add medical record:', error);
    res.status(500).json({ success: false, message: 'Failed to add medical record.' });
  }
});

router.delete('/medical/:recordId', authenticateToken, async (req, res) => {
  const { recordId } = req.params;
  const doctorId = req.user.id;

  try {
    const deleted = await MedicalRecord.destroy({
      where: { id: recordId },
      include: [{
        model: Patient,
        where: { doctorId: doctorId }
      }]
    });

    if (deleted) return res.json({ success: true, message: 'Record deleted.' });
    res.status(404).json({ success: false, message: 'Record not found or unauthorized.' });
  } catch (error) {
    console.error('Failed to delete medical record:', error);
    res.status(500).json({ success: false, message: 'Failed to delete record.' });
  }
});

router.post('/:patientId/files', authenticateToken, upload.single('patientFile'), async (req, res) => {
    const { patientId } = req.params;
    const { description } = req.body;
  
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Fișierul nu a fost încărcat." });
    }
  
    try {
      const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
      if (!patient) {
        return res.status(404).json({ success: false, message: 'Pacient negăsit.' });
      }
  
      // Salvăm URL-ul public de pe S3 în locul căii locale
      const newFile = await PatientFile.create({
        description,
        patientId: patient.id,
        doctorId: req.user.id,
        fileUrl: req.file.location, // Aceasta este adresa de la Amazon S3
        fileName: req.file.originalname
      });
  
      res.status(201).json({ success: true, file: newFile });
    } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Eroare server la încărcarea în S3.' });
    }
  });
router.delete('/files/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;

  try {
    const file = await PatientFile.findOne({ where: { id: fileId, doctorId: req.user.id } });

    if (!file) {
      return res.status(404).json({ success: false, message: 'File not found' });
    }
    const fileKey = file.fileUrl.split(`${process.env.AWS_S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/`)[1];

    if (fileKey) {
        const deleteParams = {
            Bucket: process.env.AWS_S3_BUCKET_NAME,
            Key: fileKey,
        };
        // 2. ȘTERGEM DIN AWS S3
        await s3.send(new DeleteObjectCommand(deleteParams));
        console.log(`[AWS] Fișier șters din S3: ${fileKey}`);
    }
    await file.destroy();

    res.json({ success: true, message: 'File record deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error deleting file' });
  }
});



module.exports = router;
