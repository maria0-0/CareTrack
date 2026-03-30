module.exports = (sequelize, DataTypes) => {
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
      type: DataTypes.DATEONLY,
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
        fields: ['email', 'doctorId']
      }
    ]
  });

  Patient.associate = (models) => {
    Patient.belongsTo(models.User, { foreignKey: 'doctorId' });
    Patient.hasMany(models.Appointment, { foreignKey: 'patientId', onDelete: 'CASCADE' });
    Patient.hasMany(models.Note, { foreignKey: 'patientId', onDelete: 'CASCADE' });
    Patient.hasMany(models.PatientFile, { foreignKey: 'patientId', onDelete: 'CASCADE' });
    Patient.hasMany(models.MedicalRecord, { foreignKey: 'patientId', onDelete: 'CASCADE' });
    Patient.hasMany(models.PatientForm, { foreignKey: 'patientId', onDelete: 'CASCADE' });
  };

  return Patient;
};
