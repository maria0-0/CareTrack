module.exports = (sequelize, DataTypes) => {
  const AppointmentFile = sequelize.define('AppointmentFile', {
    fileName: {
      type: DataTypes.STRING,
      allowNull: false
    },
    filePath: {
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

  AppointmentFile.associate = (models) => {
    AppointmentFile.belongsTo(models.Appointment, { foreignKey: 'appointmentId' });
  };

  return AppointmentFile;
};
