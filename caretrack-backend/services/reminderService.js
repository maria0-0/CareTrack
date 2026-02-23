const { Appointment, Patient } = require('../db');
const { Op } = require('sequelize');
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
      user: process.env.NODEMAILER_USER,
      pass: process.env.NODEMAILER_PASS
  }
});

const checkAndSendReminders = async () => {
  const now = new Date();
    const twentyFourHours = new Date(now.getTime() + (24 * 60 * 60 * 1000));
    const fortyEightHours = new Date(now.getTime() + (48 * 60 * 60 * 1000));

  try {
      const appointments = await Appointment.findAll({
          where: {
              date: {
                  [Op.between]: [twentyFourHours, fortyEightHours]
              },
              reminderSent: false
          },
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

              if (patientEmail) {
                  try {
                      await transporter.sendMail({
                          from: process.env.NODEMAILER_USER, 
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

              if (patientPhone) {
                  console.log(
                      `[CRON] 📞 SIMULATION: Would send SMS/Call to ${patientPhone} for ${patientName}.`
                  );
              } else {
                  console.log(`[CRON] ⚠️ Skipped phone notification for ${patientName}: Phone number missing.`);
              }
              if (appt.Patient.email) {
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

module.exports = { checkAndSendReminders };
