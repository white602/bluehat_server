module.exports = function (sequelize, DataTypes) {
    const market = sequelize.define(
        "market",
        {
            id: {
                type: DataTypes.INTEGER,
                allowNull: false,
                primaryKey: true,
                autoIncrement: true,
            },
            price: {
                type: DataTypes.INTEGER,
                allowNull: false,
            },
            view_count: {
                type: DataTypes.INTEGER,
                default: 0,
            },
            description: {
                type: DataTypes.STRING,
            }
        },
        {
            sequelize,
            tableName: "market",
            timestamps: true,
        }
    );
    market.associate = (models) => {
        market.belongsTo(models.user, {
            foreignKey: "user_id",
            targetKey: "id"
        })
        market.belongsTo(models.animal_possession, {
            foreignKey: "animal_possession_id",
            targetKey: "id"
        })
    };
    return market;
};