const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const { sequelize, User, Patient, Appointment, Note, PatientFile, AppointmentFile, ResetToken, MedicalRecord, FormTemplate, PatientForm, AuditLog} = require('./db');
const { Op } = require('sequelize'); 
const JWT_SECRET = 'your_secret_key_here_please_change_this';
const jwt = require('jsonwebtoken');
const app = express();
const port = 4000;
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const nodemailer = require('nodemailer'); 
const crypto = require('crypto'); // Built-in Node module for generating tokens
const cron = require('node-cron');
const vision = require('@google-cloud/vision'); 
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
      // Save files to the 'uploads' directory
      cb(null, 'uploads/'); 
  },
  filename: (req, file, cb) => {
      // Create a unique filename (e.g., patientFile-12345.jpg)
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + '-' + Date.now() + ext);
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 } // Optional: 5MB limit
});

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: 'mpetrulescu@gmail.com', // ⬅️ REPLACE THIS
      pass: 'waghtyuppezcmycf'      // ⬅️ REPLACE THIS (Use an App Password if using Gmail)
  }
});

const client = new vision.ImageAnnotatorClient({
  keyFilename: path.join(__dirname, 'google-vision-key.json') 
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) return res.status(401).json({ success: false, message: 'No token provided' });

  // Note: We are using a callback here, but making the inner logic async to query the DB
  jwt.verify(token, JWT_SECRET, async (err, user) => {
      if (err) return res.status(403).json({ success: false, message: 'Invalid token' });

      // ⭐️ NEW LOGIC: Fetch full user details from DB ⭐️
      try {
          // Find the user by the ID stored in the token payload
          const fullUser = await User.findByPk(user.id, { 
              attributes: ['id', 'email', 'firstName', 'lastName','role'] // Ensure name fields are selected
          });

          if (!fullUser) {
              // Token is valid, but user doesn't exist (e.g., deleted account)
              return res.status(403).json({ success: false, message: 'User not found' });
          }

          // Attach the full user object (including firstName and lastName) to the request
          req.user = fullUser.toJSON(); 
          next();
      } catch (dbError) {
          console.error("Error fetching user during token auth:", dbError);
          return res.status(500).json({ success: false, message: 'Server error during authentication' });
      }
  });
};

const logActivity = async (req, action, details = '') => {
  try {
    await AuditLog.create({
      action,
      details,
      doctorId: req.user.id,
      ipAddress: req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress
    });
  } catch (err) {
    console.error("Audit Error:", err);
  }
};

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const user = await User.findOne({ where: { email } });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ success: false, message: 'Invalid credentials' });

    // ⭐️ TEST: Vezi în terminalul negru (unde rulează Node) dacă apare "admin"
    console.log("Utilizator găsit în DB:", user.toJSON());

    const token = jwt.sign(
      { id: user.id, email: user.email, role: user.role }, 
      JWT_SECRET, 
      { expiresIn: '1d' }
    );

    await logActivity(
      { user: { id: user.id }, ip: req.ip || req.connection.remoteAddress }, 
      'LOGIN', 
      `Utilizatorul ${user.email} s-a autentificat cu succes.`
    );

    res.json({
      success: true,
      token,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      role: user.role // ⭐️ Trimitem explicit valoarea din DB
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});
  
  
  
  sequelize.sync()
  .then(() => {
    console.log('Database synced');
    app.listen(port, () => {
      console.log(`Backend running on http://localhost:${port}`);
    });
  })
  .catch(err => {
    console.error('Failed to sync database:', err);
  });

  app.put('/patients/:id', authenticateToken, async (req, res) => {
    try {
      const id = req.params.id;
      const { name, age , birthday, phone, email} = req.body;
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
            message: 'Aveți deja un alt pacient înregistrat cu acest email.' 
          });
        }
      }
      // ---------------------
  
      // Actualizăm datele
      patient.name = name || patient.name;
      patient.age = age || patient.age;
      patient.birthday = birthday || patient.birthday;
      patient.phone = phone || patient.phone;
      patient.email = email || patient.email;
  
      await patient.save();
 // În ruta de PUT /patients/:id
await logActivity(req, 'EDIT_PATIENT', `A actualizat informațiile pentru: "${patient.name}"`);
      res.json({ success: true, patient });
    } catch (err) {
      console.error('Error updating patient:', err);
      res.status(500).json({ success: false, message: 'Server error' });
    }
  });
  
app.listen(port, () => {
  console.log(`Backend running on http://localhost:${port}`);
});


const checkAndSendReminders = async () => {
  const now = new Date();
    // 24 hours from now
    const twentyFourHours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    // 48 hours from now (to catch appointments that might have been missed yesterday)
    const fortyEightHours = new Date(now.getTime() + (48 * 60 * 60 * 1000));

  console.log(`[CRON] Checking for appointments scheduled for: ${startTime.toDateString()}`);

  try {
      const appointments = await Appointment.findAll({
          where: {
              date: {
                  [Op.between]: [twentyFourHours, fortyEightHours]
              },
              reminderSent: false
          },
          // ⭐️ Include Patient model to get email and phone ⭐️
          include: [{ model: Patient }] 
      });

      if (appointments.length > 0) {
          console.log(`[CRON] Found ${appointments.length} appointments for tomorrow. Initiating notifications.`);
          
          appointments.forEach(async appt => {
              const patientName = appt.Patient.name;
              const patientEmail = appt.Patient.email;
              const patientPhone = appt.Patient.phone;
              const apptTime = new Date(appt.date).toLocaleTimeString();
              const apptDate = new Date(appt.date).toLocaleDateString();

              // ----------------------------------------------------
              // 1. EMAIL NOTIFICATION (Real)
              // ----------------------------------------------------
              if (patientEmail) {
                  try {
                      await transporter.sendMail({
                          from: 'mpetrulescu@gmail.com', 
                          to: patientEmail,
                          subject: `Reminder: Appointment with CareTrack tomorrow at ${apptTime}`,
                          html: `
                              <p>Dear ${patientName},</p>
                              <p>This is a reminder for your scheduled appointment on <b>${apptDate}</b> at <b>${apptTime}</b>.</p>
                              <p>Reason: ${appt.reason}</p>
                              <p>Please confirm your availability.</p>
                              <p>Thank you.</p>
                          `
                      });
                      console.log(`[CRON] ✅ Email sent to ${patientEmail}`);
                  } catch (emailErr) {
                      console.error(`[CRON] ❌ Failed to send email to ${patientEmail}:`, emailErr.message);
                  }
              } else {
                  console.log(`[CRON] ⚠️ Skipped email for ${patientName}: Email address missing.`);
              }

              // ----------------------------------------------------
              // 2. PHONE NOTIFICATION (Simulated)
              // ----------------------------------------------------
              if (patientPhone) {
                  console.log(
                      `[CRON] 📞 SIMULATION: Would send SMS/Call to ${patientPhone} for ${patientName}.`
                  );
              } else {
                  console.log(`[CRON] ⚠️ Skipped phone notification for ${patientName}: Phone number missing.`);
              }
              if (appt.Patient.email) {
                // If email sends successfully:
                await Appointment.update(
                    { reminderSent: true },
                    { where: { id: appt.id } }
                );
                console.log(`[CRON] ✅ Reminder sent and marked as sent for Appointment ID: ${appt.id}`);
            }

          });
      }
  } catch (err) {
      console.error('[CRON ERROR] Failed to check reminders:', err);
  }
};


cron.schedule('0 8 * * *', () => { 
  checkAndSendReminders();
}, {
  scheduled: true,
  timezone: "Europe/Bucharest"
});
app.post('/signup', async (req, res) => {
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

    console.log(`Utilizator creat: ${email} cu rolul: ${assignedRole}`);
    res.json({ success: true, email: user.email, role: user.role });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Error creating user' });
  }
});
  


app.get('/profile', authenticateToken, (req, res) => {
  res.json({ 
      success: true, 
      message: `Welcome, ${req.user.firstName} ${req.user.lastName}`,
      email: req.user.email,
      firstName: req.user.firstName,
      lastName: req.user.lastName
  });
});
    
 
  app.use(express.json()); // make sure this is at the top if not already
  app.post('/patients', authenticateToken, async (req, res) => {
    console.log('Received POST /patients with body:', req.body);
    const { name, age , birthday, phone, email} = req.body;
  
    
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
          message: 'Aveți deja un pacient înregistrat cu această adresă de email.' 
        });
      }
      const newPatient = await Patient.create({ name, age, birthday, phone, email, doctorId: req.user.id });
      console.log('New patient added:', newPatient.toJSON());
      res.status(201).json({ success: true, patient: newPatient });
    } catch (err) {
      console.error('Error creating patient:', err);
      res.status(500).json({ success: false, message: 'Server error creating patient' });
    }
  });


app.get('/patients', authenticateToken, async (req, res) => {
  try {
    // Luăm pagina și limita din URL (ex: /patients?page=1&limit=10)
    // Dacă nu sunt trimise, folosim valori default (Pagina 1, Limita 10)
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;
    const searchTerm = req.query.search || '';

    const doctorId = req.user.id;

    // findAndCountAll ne dă și lista de pacienți, și numărul total (util pentru paginare)
    const { count, rows } = await Patient.findAndCountAll({
      where: { doctorId ,
        [Op.or]: [
          { name: { [Op.like]: `%${searchTerm}%` } },
          { email: { [Op.like]: `%${searchTerm}%` } }
        ]
      },
      limit: limit,
      offset: offset,
      order: [['createdAt', 'DESC']] // Cei mai recenți primii
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
    res.status(500).json({ success: false, message: 'Eroare la preluarea pacienților.' });
  }
});

app.get('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const patient = await Patient.findOne({
        where: { id: req.params.id, doctorId: req.user.id },
        include: [
          { model: Appointment, include: [{ model: User, attributes: ['email'] },
          { model: AppointmentFile }] },
          Note,
          PatientFile,
          MedicalRecord,
          { model: PatientForm, order: [['createdAt', 'DESC']] } 
        ], 
        order: [
            [Note, 'createdAt', 'DESC'], 
            [Appointment, 'date', 'ASC'] ,
            //{ model: PatientForm, order: [['createdAt', 'DESC']] } 
        ]
    });
      
      if (!patient) {
          return res.status(404).json({ success: false, message: 'Patient not found or unauthorized.' });
      }
      
      res.json({ success: true, patient: patient });
  } catch (error) {
      // This is where a database crash or model error would trigger the catch.
      console.error("Patient fetch error:", error); 
      res.status(500).json({ success: false, message: 'Server error: Failed to fetch patient.' });
  }
});
  

app.put('/patients/:patientId/notes/:noteId', authenticateToken, async (req, res) => {
  const { patientId, noteId } = req.params;
  const { content } = req.body;
  const doctorId = req.user.id;

  if (!content) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
  }

  try {
      // Find the note and ensure it belongs to the correct patient AND the logged-in doctor
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

app.delete('/patients/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;

    // 1. Găsim pacientul mai întâi pentru a-i afla numele
    const patient = await Patient.findOne({ where: { id, doctorId: req.user.id } });

    if (!patient) {
      return res.status(404).json({ success: false, message: 'Pacientul nu a fost găsit.' });
    }

    const patientName = patient.name; // Salvăm numele într-o variabilă

    // 2. Ștergem pacientul
    await patient.destroy();

    // 3. Înregistrăm activitatea folosind numele, nu ID-ul
    await logActivity(req, 'DELETE_PATIENT', `A șters pacientul ${patientName}`);

    res.json({ success: true, message: 'Pacient șters cu succes.' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Eroare la ștergere.' });
  }
});

app.delete('/patients/:patientId/notes/:noteId', authenticateToken, async (req, res) => {
  const { patientId, noteId } = req.params;
  const doctorId = req.user.id;

  try {
      // Find the note and ensure it belongs to the correct patient AND the logged-in doctor
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
  

app.post('/patients/:patientId/medical', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { type, name, severity, notes } = req.body;
  const doctorId = req.user.id; // For security checks

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

app.delete('/medical/:recordId', authenticateToken, async (req, res) => {
  const { recordId } = req.params;
  const doctorId = req.user.id;

  try {
      // Ensure the record belongs to a patient owned by this doctor (via join)
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

app.post('/patients/:patientId/files', authenticateToken, upload.single('patientFile'), async (req, res) => {
  const { patientId } = req.params;
  const { description } = req.body; // Description comes from the form field

  // Check if the file was handled successfully by multer
  if (!req.file) {
      return res.status(400).json({ success: false, message: "No file provided or file type is not supported" });
  }

  if (!description || !description.trim()) {
      // Delete the file if the description is missing
      fs.unlinkSync(req.file.path); 
      return res.status(400).json({ success: false, message: "File description is required" });
  }

  try {
      const patient = await Patient.findOne({ where: { id: patientId, doctorId: req.user.id } });
      if (!patient) {
          fs.unlinkSync(req.file.path);
          return res.status(404).json({ success: false, message: 'Patient not found' });
      }

      // The fileUrl is now the actual public path where the file can be accessed
      const newFile = await PatientFile.create({
          description,
          patientId: patient.id,
          doctorId: req.user.id,
          fileUrl: '/' + req.file.path.replace(/\\/g, '/') // e.g., /uploads/patientFile-12345.jpg
      });

      res.status(201).json({ success: true, file: newFile });
  } catch (err) {
      console.error(err);
      if (req.file) fs.unlinkSync(req.file.path);
      res.status(500).json({ success: false, message: 'Server error adding file' });
  }
});

// ⭐️ ROUTE 2: DELETE FILE
app.delete('/files/:fileId', authenticateToken, async (req, res) => {
  const { fileId } = req.params;

  try {
      const file = await PatientFile.findOne({ where: { id: fileId, doctorId: req.user.id } });

      if (!file) {
          return res.status(404).json({ success: false, message: 'File not found' });
      }

      await file.destroy();

      res.json({ success: true, message: 'File record deleted successfully' });
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error deleting file' });
  }
});
  // Get all appointments
app.get('/appointments', authenticateToken, async (req, res) => {
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

// Create appointment
app.post('/appointments', authenticateToken, async (req, res) => {
  const { patientId, date, reason } = req.body;

  if (!patientId || !date || !reason) {
    return res.status(400).json({ success: false, message: 'Missing fields' });
  }

  try {
    // Create the appointment
    const appointment = await Appointment.create({
      patientId,
      date,
      reason,
      doctorId: req.user.id    // <-- important
    });
    

    // Fetch appointment again, including Patient data
    const fullAppointment = await Appointment.findByPk(appointment.id, {
      include: [{ model: Patient }]
    });

    res.status(201).json({ success: true, appointment: fullAppointment });
  } catch (err) {
    console.error('Error creating appointment:', err);
    res.status(500).json({ success: false, message: 'Server error' });
  }
});

// Delete an appointment
app.delete('/appointments/:id', authenticateToken, async (req, res) => {
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
// Update an appointment
app.put('/appointments/:id', authenticateToken, async (req, res) => {
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
          // Only update the fields that can change
          date: date, // ⭐️ CRITICAL: Ensure the new date is applied here ⭐️
          reason: reason // Update reason if provided, or keep existing
      },
      {
          where: { id, doctorId }
      }
  );

  if (updatedRows === 0) {
      // This happens if the data sent was exactly the same as the existing data, 
      // or if the findOne check somehow failed (less likely).
      return res.status(200).json({ success: false, message: 'No changes were detected or applied.' });
  }

  // 3. Fetch the updated record (with Patient details, crucial for frontend list refresh)
  const updatedAppointment = await Appointment.findByPk(id, {
       // Assuming you have the Patient model association set up
       include: [{ model: Patient, attributes: ['id', 'name'] }] 
  });

  res.json({ success: true, appointment: updatedAppointment });

} catch (error) {
  console.error('Error updating appointment:', error);
  res.status(500).json({ success: false, message: 'Server error updating appointment.' });
}
});

app.post('/appointments/check', authenticateToken, async (req, res) => {
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


app.get('/appointments/by-date/:date', authenticateToken, async (req, res) => {
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


app.post('/appointments/day', authenticateToken, async (req, res) => {
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

app.get('/appointments/unavailable', authenticateToken, async (req, res) => {
  const doctorId = req.user.id;
  // We will look for appointments starting today
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);

  try {
      const appointments = await Appointment.findAll({
          where: {
              doctorId: doctorId,
              // Filter appointments from today onward
              date: {
                  [Op.gte]: startOfToday 
              }
          },
          attributes: ['id', 'date', 'duration'],
          order: [['date', 'ASC']]
      });

      // The frontend needs a simple list of scheduled dates/times
      const scheduledSlots = appointments.map(app => ({
          id: app.id,
          date: app.date, // Send the full Date object/string
          duration: app.duration // Useful for calculating block length
      }));

      res.json({ success: true, slots: scheduledSlots });
  } catch (error) {
      console.error("Error fetching unavailable slots:", error);
      res.status(500).json({ success: false, message: 'Server error fetching unavailable slots.' });
  }
});

app.post('/patients/:id/notes', authenticateToken, async (req, res) => {
  const patientId = req.params.id;
  const { content } = req.body;
  const doctorId = req.user.id; // From the auth token

  if (!content) {
      return res.status(400).json({ success: false, message: 'Note content is required.' });
  }

  try {
      // 1. Check if the patient belongs to the doctor (security)
      const patient = await Patient.findOne({ 
          where: { id: patientId, doctorId: doctorId } 
      });

      if (!patient) {
          return res.status(404).json({ success: false, message: 'Patient not found or unauthorized.' });
      }

      // 2. Create the note
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


app.put('/appointments/:appointmentId/note', authenticateToken, async (req, res) => {
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

      appointment.followUpNote = followUpNote || null; // Allow clearing the note
      await appointment.save();

      res.json({ success: true, appointment });
  } catch (error) {
      console.error("Error updating appointment note:", error);
      res.status(500).json({ success: false, message: 'Server error updating appointment note.' });
  }
});

app.put('/notes/:noteId', authenticateToken, async (req, res) => {
  const { noteId } = req.params;
  const { content } = req.body;

  if (!content || content.trim() === '') {
      return res.status(400).json({ success: false, message: 'Note content cannot be empty' });
  }

  try {
      const note = await Note.findOne({ where: { id: noteId } });

      if (!note) {
          return res.status(404).json({ success: false, message: 'Note not found' });
      }

      // Check if the logged-in user (req.user.id) is the owner of the note
      if (note.doctorId !== req.user.id) {
          // Unauthorized check is now explicit
          return res.status(403).json({ success: false, message: 'Unauthorized to edit this note' });
      }

      // Update the content and save
      note.content = content;
      await note.save();

      return res.json({ success: true, note });

  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error updating note' });
  }
});

app.delete('/notes/:noteId', authenticateToken, async (req, res) => {
  const { noteId } = req.params;

  try {
      const deleted = await Note.destroy({
          where: { id: noteId, doctorId: req.user.id }
      });

      if (deleted) {
          return res.json({ success: true, message: 'Note deleted successfully' });
      } else {
          return res.status(404).json({ success: false, message: 'Note not found or unauthorized' });
      }
  } catch (err) {
      console.error(err);
      res.status(500).json({ success: false, message: 'Server error deleting note' });
  }
});

app.post('/appointments/:appointmentId/files', authenticateToken, upload.single('file'), async (req, res) => {
  // 💡 NOTE: 'upload.single('file')' is the Multer middleware. 
  // If you are NOT using Multer, replace 'upload.single('file')' 
  // with your existing file handling middleware or logic here.

  const { appointmentId } = req.params;
  const { description } = req.body;
  
  if (!req.file) { // Checks if the file was processed by your middleware
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
          filePath: `/uploads/${req.file.filename}`, // Adjust path if needed
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


app.delete('/appointments/files/:fileId', authenticateToken, async (req, res) => {
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
      
      await file.destroy();

      res.json({ success: true, message: 'File record deleted successfully.' });
  } catch (err) {
      console.error('Error deleting appointment file:', err); 
      res.status(500).json({ success: false, message: 'Server error deleting file.' });
  }
});


app.put('/appointments/files/:fileId', authenticateToken, async (req, res) => {
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

app.post('/forgot-password', async (req, res) => {
  const { email } = req.body;

  try {
      const user = await User.findOne({ where: { email } });
      if (!user) {
          // Success message is sent even if the user isn't found for security reasons
          return res.json({ success: true, message: 'If the email is registered, a password reset link has been sent.' });
      }

      // 1. Generate token and set expiration (1 hour)
      const token = crypto.randomBytes(32).toString('hex');
      const expiresAt = new Date(Date.now() + 3600000); 

      // 2. Save the token to the database
      await ResetToken.create({ token, userId: user.id, expiresAt });
      
      // 3. Construct the client-side reset URL
      const resetUrl = `http://localhost:3000/reset-password/${token}`; 
      await transporter.sendMail({
        from: 'mpetrulescu@gmail.com', // ⬅️ MAKE SURE THIS EXACTLY MATCHES auth.user
        to: user.email,
  subject: 'CareTrack Password Reset',
  
  // ⭐️ CRITICAL FIX: Ensure the HTML uses the resetUrl variable ⭐️
  html: `<p>You requested a password reset. Click this link: <a href="${resetUrl}">${resetUrl}</a></p>
         <p>This link expires in 1 hour.</p>`
});

      res.json({ success: true, message: 'Password reset link sent.' });

  } catch (error) {
      console.error('Error in forgot-password:', error);
      res.status(500).json({ success: false, message: 'Server error during reset request.' });
  }
});


app.post('/reset-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
      // 1. Find the token and check expiration (Op.gt is Sequelize's "Greater Than" operator)
      const resetRecord = await ResetToken.findOne({ 
          where: { token, expiresAt: { [Op.gt]: new Date() } }
      });

      if (!resetRecord) {
          return res.status(400).json({ success: false, message: 'Invalid or expired reset link.' });
      }
      
      // 2. Hash the new password and update the user
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await User.update({ password: hashedPassword }, { where: { id: resetRecord.userId } });

      // 3. Delete the used token
      await resetRecord.destroy();

      res.json({ success: true, message: 'Password successfully reset.' });

  } catch (error) {
      console.error('Error in reset-password:', error);
      res.status(500).json({ success: false, message: 'Server error during password reset.' });
  }
});



app.delete('/account', authenticateToken, async (req, res) => {
  const userId = req.user.id;

  try {
          const deletedCount = await User.destroy({
          where: { id: userId },
          individualHooks: true, 
          cascade: true // Ensure Sequelize attempts cascading deletion
      });

      if (deletedCount === 0) {
          return res.status(404).json({ success: false, message: 'User account not found.' });
      }

      res.json({ success: true, message: 'Account and all associated data successfully deleted.' });
    } catch (err) {
      console.error('SERVER CRASH: FINAL DELETION ATTEMPT FAILED:', err);
      res.status(500).json({ success: false, message: 'Server error during account deletion.' });
  }
});
app.post('/ocr-extract', authenticateToken, upload.single('imageFile'), async (req, res) => {
  if (!req.file) {
      return res.status(400).json({ success: false, message: "No image file provided." });
  }

  try {
      const imagePath = req.file.path;
      
      const [result] = await client.documentTextDetection(imagePath);
      
      const detections = result.fullTextAnnotation ? result.fullTextAnnotation.pages[0].blocks : [];

      if (detections.length === 0) {
          fs.unlinkSync(imagePath);
          return res.json({ success: true, extractedText: 'No detailed structure found.' });
      }

      
      let allWords = [];
      // Flatten the complex nested structure (pages -> blocks -> paragraphs -> words)
      detections.forEach(block => {
          block.paragraphs.forEach(paragraph => {
              paragraph.words.forEach(word => {
                  // Get the average Y-coordinate (the top of the word)
                  const yCoord = word.boundingBox.vertices[0].y;
                  const text = word.symbols.map(s => s.text).join('');
                  
                  allWords.push({
                      text: text,
                      x: word.boundingBox.vertices[0].x, // Starting X position
                      y: yCoord,                        // Starting Y position
                      y_mid: (yCoord + word.boundingBox.vertices[2].y) / 2 // Mid-Y coordinate
                  });
              });
          });
      });

      // 4. Group words by approximate line height (Y-coordinate)
      const LINE_TOLERANCE = 15; // Pixels of tolerance for grouping words on the same line
      let lines = [];
      allWords.sort((a, b) => a.y_mid - b.y_mid); // Sort primarily by vertical position

      allWords.forEach(word => {
          let foundLine = false;
          for (let line of lines) {
              // Check if the word's vertical center is within the line's Y tolerance
              if (Math.abs(word.y_mid - line.y_mid) <= LINE_TOLERANCE) {
                  line.words.push(word);
                  line.y_mid = (line.y_mid * (line.words.length - 1) + word.y_mid) / line.words.length; // Re-average Y
                  foundLine = true;
                  break;
              }
          }
          if (!foundLine) {
              lines.push({ y_mid: word.y_mid, words: [word] });
          }
      });

      // 5. Build the final text string
      let extractedText = lines.map(line => {
          // Sort words within each line by their X-coordinate (left-to-right)
          line.words.sort((a, b) => a.x - b.x);
          // Join the words in the line, adding a space unless it's a punctuation mark
          return line.words.map(w => w.text).join(' ');
      }).join('\n'); // Join lines with a newline character

      // 6. Clean up
      fs.unlinkSync(imagePath);

      res.json({ success: true, extractedText: extractedText });

  } catch (error) {
      console.error('OCR Coordinate Sorting Error:', error.message);
      if (req.file) fs.unlinkSync(req.file.path); 
      res.status(500).json({ success: false, message: 'OCR failed during coordinate processing.' });
  }
});

app.post('/patients/:patientId/forms/assign', authenticateToken, async (req, res) => {
  const { patientId } = req.params;
  const { templateId } = req.body;
  const doctorId = req.user.id;

  try {
      const patient = await Patient.findOne({ where: { id: patientId, doctorId } });
      if (!patient) return res.status(404).json({ success: false, message: 'Patient not found.' });

      const template = await FormTemplate.findOne({ where: { id: templateId, doctorId } });
      if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });

      // Create a new instance of the form for the patient
      const newPatientForm = await PatientForm.create({
          patientId,
          templateId,
          title: template.title, // Copy the title
          // The content remains null until completed
          doctorId
      });

      res.status(201).json({ success: true, form: newPatientForm });
  } catch (error) {
      console.error('Error assigning form:', error);
      res.status(500).json({ success: false, message: 'Server error assigning form.' });
  }
});

app.get('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const doctorId = req.user.id;

  try {
      const template = await FormTemplate.findOne({ where: { id: templateId, doctorId } });
      if (!template) return res.status(404).json({ success: false, message: 'Template not found.' });
      
      res.json({ success: true, template });
  } catch (error) {
      console.error('Error fetching template:', error);
      res.status(500).json({ success: false, message: 'Server error fetching template.' });
  }
});

app.put('/forms/:formId/complete', authenticateToken, async (req, res) => {
  const { formId } = req.params;
  // The client sends the final content (e.g., text with patient details filled in)
  const { completedContent } = req.body; 
  const doctorId = req.user.id;

  if (!completedContent) {
      return res.status(400).json({ success: false, message: 'Completed content is required.' });
  }

  try {
      const patientForm = await PatientForm.findOne({ where: { id: formId, doctorId } });
      if (!patientForm) return res.status(404).json({ success: false, message: 'Form not found or unauthorized.' });

      patientForm.completedContent = completedContent;
      patientForm.status = 'COMPLETED';
      await patientForm.save();

      res.json({ success: true, form: patientForm });
  } catch (error) {
      console.error('Error completing form:', error);
      res.status(500).json({ success: false, message: 'Server error completing form.' });
  }
});

app.post('/templates', authenticateToken, async (req, res) => {
  const { title, content } = req.body;
  const doctorId = req.user.id;

  if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required for a template.' });
  }

  try {
      const newTemplate = await FormTemplate.create({ title, content, doctorId });
      res.status(201).json({ success: true, template: newTemplate });
  } catch (error) {
      console.error('Error creating template:', error);
      res.status(500).json({ success: false, message: 'Server error creating template.' });
  }
});

app.get('/templates', authenticateToken, async (req, res) => {
  try {
      const templates = await FormTemplate.findAll({ where: { doctorId: req.user.id } });
      res.json({ success: true, templates });
  } catch (error) {
      console.error('Error fetching templates:', error);
      res.status(500).json({ success: false, message: 'Server error fetching templates.' });
  }
});

app.put('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const { title, content } = req.body;
  const doctorId = req.user.id;

  if (!title || !content) {
      return res.status(400).json({ success: false, message: 'Title and content are required.' });
  }

  try {
      const [updated] = await FormTemplate.update(
          { title, content },
          { where: { id: templateId, doctorId: doctorId } }
      );

      if (updated) {
          const updatedTemplate = await FormTemplate.findByPk(templateId);
          return res.json({ success: true, template: updatedTemplate });
      }
      res.status(404).json({ success: false, message: 'Template not found or unauthorized.' });
  } catch (error) {
      console.error('Error updating template:', error);
      res.status(500).json({ success: false, message: 'Server error updating template.' });
  }
});

app.delete('/templates/:templateId', authenticateToken, async (req, res) => {
  const { templateId } = req.params;
  const doctorId = req.user.id;

  try {
      const deleted = await FormTemplate.destroy({
          where: { id: templateId, doctorId: doctorId }
      });

      if (deleted) {
          // Note: Sequelize should automatically delete linked PatientForms due to onDelete: CASCADE
          return res.json({ success: true, message: 'Template successfully deleted.' });
      }
      res.status(404).json({ success: false, message: 'Template not found or unauthorized.' });
  } catch (error) {
      console.error('Error deleting template:', error);
      res.status(500).json({ success: false, message: 'Server error deleting template.' });
  }
});

app.delete('/forms/:formId', authenticateToken, async (req, res) => {
  const { formId } = req.params;
  const doctorId = req.user.id;

  try {
      const deleted = await PatientForm.destroy({
          where: { id: formId, doctorId: doctorId }
      });

      if (deleted) {
          return res.json({ success: true, message: 'Patient form instance successfully deleted.' });
      }
      res.status(404).json({ success: false, message: 'Patient form not found or unauthorized.' });
  } catch (error) {
      console.error('Error deleting patient form:', error);
      res.status(500).json({ success: false, message: 'Server error deleting patient form.' });
  }
});

app.get('/audit-logs', authenticateToken, async (req, res) => {
  try {
    console.log("Cine cere datele:", req.user.email, "Rol:", req.user.role);

    let queryOptions = {
      include: [{ model: User, attributes: ['firstName', 'lastName'] }],
      order: [['createdAt', 'DESC']]
    };

    if (req.user.role !== 'admin') {
      console.log("Filtrez doar pentru doctorId:", req.user.id);
      queryOptions.where = { doctorId: req.user.id };
    } else {
      console.log("Sunt Admin, cer TOATE logurile");
    }

    const logs = await AuditLog.findAll(queryOptions);
    console.log("Am găsit atâtea loguri:", logs.length);
    
    res.json({ success: true, logs });
  } catch (err) {
    console.error("EROARE LA AUDIT:", err);
    res.status(500).json({ success: false, message: err.message });
  }
});