module.exports = (sequelize, DataTypes) => {
  const PatientForm = sequelize.define('PatientForm', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    completedContent: {
      type: DataTypes.TEXT,
      allowNull: true, 
    },
    status: {
      type: DataTypes.ENUM('PENDING', 'IN_PROGRESS', 'COMPLETED'),
      defaultValue: 'PENDING'
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    templateId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    signature: {
      type: DataTypes.TEXT,
      allowNull: true
    }
  });

  PatientForm.associate = (models) => {
    PatientForm.belongsTo(models.Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });
    PatientForm.belongsTo(models.FormTemplate, { foreignKey: 'templateId' });
    PatientForm.belongsTo(models.User, { foreignKey: 'doctorId' });
  };

  return PatientForm;
};
