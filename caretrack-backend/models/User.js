module.exports = (sequelize, DataTypes) => {
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
      allowNull: true
    },
    lastName: {
      type: DataTypes.STRING,
      allowNull: true
    },
    role: {
      type: DataTypes.STRING,
      defaultValue: 'doctor',
      allowNull: false
    },
    signature: { 
      type: DataTypes.TEXT, 
      allowNull: true
    }
  });

  User.associate = (models) => {
    User.hasMany(models.Patient, { foreignKey: 'doctorId', onDelete: 'CASCADE' });
    User.hasMany(models.Appointment, { foreignKey: 'doctorId', onDelete: 'CASCADE' });
    User.hasMany(models.Note, { foreignKey: 'doctorId', onDelete: 'CASCADE' });
    User.hasMany(models.PatientFile, { foreignKey: 'doctorId' });
    User.hasMany(models.ResetToken, { foreignKey: 'userId', onDelete: 'CASCADE' });
    User.hasMany(models.FormTemplate, { foreignKey: 'doctorId' });
    User.hasMany(models.AuditLog, { foreignKey: 'doctorId' });
  };

  return User;
};
