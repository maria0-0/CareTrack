module.exports = (sequelize, DataTypes) => {
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

  Appointment.associate = (models) => {
    Appointment.belongsTo(models.User, { foreignKey: 'doctorId' });
    Appointment.belongsTo(models.Patient, { foreignKey: 'patientId' });
    Appointment.hasMany(models.AppointmentFile, { foreignKey: 'appointmentId', onDelete: 'CASCADE' });
  };

  return Appointment;
};
