const { Sequelize, DataTypes } = require('sequelize');

const sequelize = new Sequelize(process.env.DATABASE_URL || 'postgres://localhost:5432/caretrack', {
  dialect: 'postgres',
  logging: false,
});

const models = {
  User: require('./User')(sequelize, DataTypes),
  Patient: require('./Patient')(sequelize, DataTypes),
  Appointment: require('./Appointment')(sequelize, DataTypes),
  PatientFile: require('./PatientFile')(sequelize, DataTypes),
  Note: require('./Note')(sequelize, DataTypes),
  AppointmentFile: require('./AppointmentFile')(sequelize, DataTypes),
  ResetToken: require('./ResetToken')(sequelize, DataTypes),
  MedicalRecord: require('./MedicalRecord')(sequelize, DataTypes),
  FormTemplate: require('./FormTemplate')(sequelize, DataTypes),
  PatientForm: require('./PatientForm')(sequelize, DataTypes),
  AuditLog: require('./AuditLog')(sequelize, DataTypes),
};

// Run associations
Object.keys(models).forEach((modelName) => {
  if (models[modelName].associate) {
    models[modelName].associate(models);
  }
});

models.sequelize = sequelize;
models.Sequelize = Sequelize;

module.exports = models;
