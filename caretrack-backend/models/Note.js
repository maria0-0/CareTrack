module.exports = (sequelize, DataTypes) => {
  const Note = sequelize.define('Note', {
    content: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    patientId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  Note.associate = (models) => {
    Note.belongsTo(models.User, { foreignKey: 'doctorId' });
    Note.belongsTo(models.Patient, { foreignKey: 'patientId' });
  };

  return Note;
};
