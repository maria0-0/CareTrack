module.exports = (sequelize, DataTypes) => {
  const FormTemplate = sequelize.define('FormTemplate', {
    title: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    content: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    version: {
      type: DataTypes.INTEGER,
      defaultValue: 1
    },
    doctorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    }
  });

  FormTemplate.associate = (models) => {
    FormTemplate.hasMany(models.PatientForm, { foreignKey: 'templateId' });
    FormTemplate.belongsTo(models.User, { foreignKey: 'doctorId' });
  };

  return FormTemplate;
};
