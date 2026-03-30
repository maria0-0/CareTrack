module.exports = (sequelize, DataTypes) => {
  const PatientFile = sequelize.define('PatientFile', {
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    fileUrl: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: '/placeholder-image.png'
    }
  });

  PatientFile.associate = (models) => {
    PatientFile.belongsTo(models.Patient, { foreignKey: 'patientId' });
    PatientFile.belongsTo(models.User, { foreignKey: 'doctorId' });
  };

  return PatientFile;
};
