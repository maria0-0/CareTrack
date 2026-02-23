const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize({
  dialect: 'sqlite',
  storage: './database.sqlite'
});

const User = sequelize.define('User', {
  email: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false
  },
  firstName: {
    type: DataTypes.STRING,
    allowNull: true // Can be null temporarily until the user updates
},
lastName: {
    type: DataTypes.STRING,
    allowNull: true // Can be null temporarily until the user updates
},
role: {
  type: DataTypes.STRING,
  defaultValue: 'doctor', // Implicit, toată lumea e doctor
  allowNull: false
},
signature: { 
  type: Sequelize.TEXT('long'), 
  allowNull: true
 }
});

const Patient = sequelize.define('Patient', {
  name: {
    type: DataTypes.STRING,
    allowNull: false
  },
  age: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  birthday: {
    type: DataTypes.DATEONLY, // Stores only the date (YYYY-MM-DD)
    allowNull: true
},
phone: {
    type: DataTypes.STRING,
    allowNull: true
},
email: {
    type: DataTypes.STRING,
    allowNull: true,
    unique: false
},
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
}, {

    indexes: [
      {
        unique: true,
        fields: ['email', 'doctorId'] // Un doctor nu poate avea doi pacienți cu același email
      }
    ]
});



const Appointment = sequelize.define('Appointment', {
  date: {
    type: DataTypes.DATE,
    allowNull: false,
    get() {
      return this.getDataValue('date');
    }
  },
  reason: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  reminderSent: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
    defaultValue: false
},
  followUpNote: { 
    type: DataTypes.TEXT,
    allowNull: true, 
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  
  patientId: { 
    type: DataTypes.INTEGER,
    allowNull: false,
  }
});

const PatientFile = sequelize.define('PatientFile', {
  description: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  fileUrl: { // This will store a placeholder URL since we can't upload real files
    type: DataTypes.STRING,
    allowNull: false,
    defaultValue: '/placeholder-image.png' // A generic placeholder
  }
});


const Note = sequelize.define('Note', {
content: {
  type: DataTypes.TEXT,
  allowNull: false
},
doctorId: { // To ensure only the writing doctor can see/edit their notes
  type: DataTypes.INTEGER,
  allowNull: false
},
patientId: { // Link to the specific patient
  type: DataTypes.INTEGER,
  allowNull: false
}
});

const AppointmentFile = sequelize.define('AppointmentFile', {
  fileName: {
    type: DataTypes.STRING,
    allowNull: false
  },
  filePath: { // The path to the file on the server (e.g., /uploads/filename.jpg)
    type: DataTypes.STRING,
    allowNull: false
  },
  fileMimeType: {
    type: DataTypes.STRING,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  }
});

const ResetToken = sequelize.define('ResetToken', {
  token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
  },
  userId: {
      type: DataTypes.INTEGER,
      allowNull: false
  },
  expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
  }
});

const MedicalRecord = sequelize.define('MedicalRecord', {
  type: {
    // e.g., 'Allergy', 'Condition', 'Medication'
    type: DataTypes.ENUM('Allergy', 'Condition', 'Medication'),
    allowNull: false
  },
  name: {
    // e.g., "Penicillin", "Hypertension", "Metformin"
    type: DataTypes.STRING, 
    allowNull: false
  },
  severity: {
    // Optional: e.g., "Severe", "Mild", "500mg daily"
    type: DataTypes.STRING, 
    allowNull: true
  },
  notes: {
    type: DataTypes.TEXT, // Description or details
    allowNull: true
  },
  patientId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});
const FormTemplate = sequelize.define('FormTemplate', {
  title: { // e.g., "Standard Consent Form"
      type: DataTypes.STRING,
      allowNull: false,
  },
  content: { // The editable text/structure of the agreement (could be rich HTML/JSON)
      type: DataTypes.TEXT,
      allowNull: false,
  },
  version: { // Optional: Useful for tracking updates
      type: DataTypes.INTEGER,
      defaultValue: 1
  },
  doctorId: { // Link to the doctor who owns this template
      type: DataTypes.INTEGER,
      allowNull: false
  }
});

const PatientForm = sequelize.define('PatientForm', {
  title: { // To quickly identify the form instance
      type: DataTypes.STRING,
      allowNull: false,
  },
  completedContent: { // The final, signed/completed version of the agreement
      type: DataTypes.TEXT,
      allowNull: true, 
  },
  status: { // Tracks the form's state
      type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
      defaultValue: 'PENDING'
  },
  doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false
  },
  signature: {
    type: Sequelize.TEXT, // Stocăm imaginea ca string lung (Base64)
    allowNull: true
}
});

const AuditLog = sequelize.define('AuditLog', {
  action: {
    type: DataTypes.STRING, // Ex: 'LOGIN', 'VIEW_PATIENT', 'DELETE_FILE'
    allowNull: false
  },
  details: {
    type: DataTypes.TEXT, // Detalii: "A șters fișierul analize.pdf"
    allowNull: true
  },
  ipAddress: {
    type: DataTypes.STRING,
    allowNull: true
  },
  doctorId: {
    type: DataTypes.INTEGER,
    allowNull: false
  }
});

const logActivity = async (req, action, details = '') => {
  try {
    // Importăm modelul AuditLog local pentru a evita referințele circulare
    const { AuditLog } = require('./db'); 
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


Patient.belongsTo(User, { foreignKey: 'doctorId' });
User.hasMany(Patient, { foreignKey: 'doctorId' , onDelete: 'CASCADE' });

Appointment.belongsTo(User, { foreignKey: 'doctorId' });
User.hasMany(Appointment, { foreignKey: 'doctorId' , onDelete: 'CASCADE' });

Patient.hasMany(Appointment, { foreignKey: 'patientId', onDelete: 'CASCADE', });
Appointment.belongsTo(Patient, { foreignKey: 'patientId' });

Note.belongsTo(User, { foreignKey: 'doctorId' });
User.hasMany(Note, { foreignKey: 'doctorId' , onDelete: 'CASCADE' });

Note.belongsTo(Patient, { foreignKey: 'patientId' }); // A note belongs to one patient
Patient.hasMany(Note, { foreignKey: 'patientId', onDelete: 'CASCADE', }); // A patient can have many notes

Patient.hasMany(PatientFile, { foreignKey: 'patientId', onDelete: 'CASCADE' });
PatientFile.belongsTo(Patient, { foreignKey: 'patientId' });

PatientFile.belongsTo(User, { foreignKey: 'doctorId' });
User.hasMany(PatientFile, { foreignKey: 'doctorId' });

Appointment.hasMany(AppointmentFile, { foreignKey: 'appointmentId', onDelete: 'CASCADE' });
AppointmentFile.belongsTo(Appointment, { foreignKey: 'appointmentId' });

User.hasMany(ResetToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
ResetToken.belongsTo(User, { foreignKey: 'userId' });

Patient.hasMany(MedicalRecord, { foreignKey: 'patientId', onDelete: 'CASCADE' });
MedicalRecord.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE'});

PatientForm.belongsTo(Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });
Patient.hasMany(PatientForm, { foreignKey: 'patientId', onDelete: 'CASCADE' });

PatientForm.belongsTo(FormTemplate, { foreignKey: 'templateId' });
FormTemplate.hasMany(PatientForm, { foreignKey: 'templateId' });

PatientForm.belongsTo(User, { foreignKey: 'doctorId' });
FormTemplate.belongsTo(User, { foreignKey: 'doctorId' });

AuditLog.belongsTo(User, { foreignKey: 'doctorId' });
User.hasMany(AuditLog, { foreignKey: 'doctorId' });

module.exports = {
  sequelize,
  User,
  Patient,
  Appointment,
  Note,
  PatientFile,
  AppointmentFile,
  ResetToken,
  MedicalRecord,
  FormTemplate,
  PatientForm,
  AuditLog,
  logActivity
};
