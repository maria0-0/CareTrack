require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const { sequelize } = require('./models');
const path = require('path');
const cron = require('node-cron');
const { checkAndSendReminders } = require('./services/reminderService');

const authRoutes = require('./routes/auth');
const patientRoutes = require('./routes/patients');
const appointmentRoutes = require('./routes/appointments');
const formRoutes = require('./routes/forms');
const noteRoutes = require('./routes/notes');
const ocrRoutes = require('./routes/ocr');
const miscRoutes = require('./routes/misc');
const staffRoutes = require('./routes/staff');


const app = express();
const port = process.env.PORT || 4000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.json());


app.use('/', authRoutes);
app.use('/patients', patientRoutes);
app.use('/appointments', appointmentRoutes);
app.use('/forms', formRoutes);
app.use('/notes', noteRoutes);
app.use('/ocr-extract', ocrRoutes);
app.use('/', miscRoutes);
app.use('/staff', staffRoutes);


cron.schedule('0 8 * * *', () => { 
  checkAndSendReminders();
}, {
  scheduled: true,
  timezone: "Europe/Bucharest"
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
