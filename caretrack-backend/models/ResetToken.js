module.exports = (sequelize, DataTypes) => {
  const ResetToken = sequelize.define('ResetToken', {
    token: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    expiresAt: {
      type: DataTypes.DATE,
      allowNull: false
    }
  });

  ResetToken.associate = (models) => {
    ResetToken.belongsTo(models.User, { foreignKey: 'userId' });
  };

  return ResetToken;
};
