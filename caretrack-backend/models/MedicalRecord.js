module.exports = (sequelize, DataTypes) => {
  const MedicalRecord = sequelize.define('MedicalRecord', {
    type: {
      type: DataTypes.ENUM('Allergy', 'Condition', 'Medication'),
      allowNull: false
    },
    name: {
      type: DataTypes.STRING, 
      allowNull: false
    },
    severity: {
      type: DataTypes.STRING, 
      allowNull: true
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  MedicalRecord.associate = (models) => {
    MedicalRecord.belongsTo(models.Patient, { foreignKey: 'patientId', onDelete: 'CASCADE' });
  };

  return MedicalRecord;
};
