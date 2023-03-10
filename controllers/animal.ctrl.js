const models = require("../models");
const errorMsg = require("../message/msg_error");
const infoMsg = require("../message/msg_info");
const logger = require("../config/logger");
const colorUtils = require("../utils/color.utils");
const { Op } = require("sequelize");
const animalNameArray = [
	"Pinky",
	"Poco",
	"Peppi",
	"Poppy",
	"Riley",
	"Rollo",
	"Ruby",
	"Roy",
	"Abel",
	"Asha",
	"Baba",
	"Allie",
	"Buddy",
	"Cara",
	"Casey",
	"Bessie",
	"Coco",
	"Connie",
	"Colin",
	"Cookie",
	"Coy",
	"Cindy",
	"Colin",
	"Cutie",
	"Fella",
	"Kyle"];


exports.getUserAnimal = async function (req, res) {
	logger.info(`${req.method} ${req.originalUrl}`);
	if (req.userId)
		logger.info(req.userId + ":" + `${req.method} ${req.originalUrl}`);
	try {
		let userId = req.userId;
		let nft = req.query.nft;
		let market = req.query.market;
		if (!market) {
			market = false;
		}
		if (!nft) {
			nft = false;
		}
		let constraint = { user_id: userId };
		if (nft) {
			constraint = { user_id: userId, nft_id: { [Op.ne]: null } };

			if (market) {
				let uploadAnimal = await models.market.findAll({
					where: { user_id: userId },
				})
				if (uploadAnimal.length > 0) {
					let animalId = uploadAnimal.map((animal) => animal.animal_possession_id);
					constraint = { user_id: userId, nft_id: { [Op.ne]: null }, id: { [Op.notIn]: animalId } };
				}
			}

		}
		let userAnimal = await models.animal_possession.findAll({
			where: constraint,
			include: [
				{
					model: models.animal,
					attributes: ["type"],
				},
				{
					model: models.head_item,
					attributes: ["filename"],
				},
				{
					model: models.pattern,
					attributes: ["filename"],
				},
			],
			attributes: ["name", "tier", "color", "id"],
			raw: true,
		});
		let data = [];
		userAnimal.forEach(element => {
			let result = {
				"name": element.name,
				"tier": element.tier,
				"color": element.color,
				"id": element.id,
				"animalType": element["animal.type"],
				"headItem": element["head_item.filename"],
				"pattern": element["pattern.filename"]
			}
			data.push(result);
		});
		return res.status(200).send({ "data": data });
	} catch (e) {
		logger.error(`${req.method} ${req.originalUrl}` + ": " + e);
		return res.status(500).send(errorMsg.internalServerError);
	}
};

exports.mergeAnimal = async function (req, res) {
	logger.info(`${req.method} ${req.originalUrl}`);
	const { animalId1, animalId2 } = req.body;
	if (animalId1 === undefined || animalId2 === undefined) {
		return res.status(400).send(errorMsg.needParameter);
	}
	try {

		let animals = await models.animal_possession.findAll({
			where: { [Op.or]: [{ id: animalId1 }, { id: animalId2 }] },
		});
		if (!animals[0])
			return res.status(400).send(errorMsg.animalNotFound);

		let animal_type;
		if (Math.floor(Math.random() * 10 + 1) <= 2) {
			animal_type = Math.random() * (await models.animal.count()) + 1
		}
		else
			animal_type = animals[randomVal()].animal_type;
		let color = await colorUtils.synthesizeColor(animals[0].dataValues.color, animals[1].dataValues.color, animal_type);

		function randomVal() {
			return Math.round(Math.random());
		}
		let new_animal = {
			name: animals[randomVal()].name,
			tier: animals[randomVal()].tier,
			user_id: req.userId,
			color: color,
			animal_type: animal_type,
			head_item_id: animals[randomVal()].head_item_id,
			pattern_id: animals[randomVal()].pattern_id,
		};

		let new_animals = await models.animal_possession.create(new_animal);
		let merge_result = {
			name: new_animals.name,
			tier: new_animals.tier,
			color: color,
			id: new_animals.id,
			animalType: new_animal.animal_type,
			headItem: new_animal.head_item_id,
			pattern: new_animal.pattern_id,
		};
		await models.animal_possession
			.destroy({
				where: { [Op.or]: [{ id: animalId1 }, { id: animalId2 }] },
			})
			.then(logger.info("merge success"));

		return res.status(201).send(merge_result);

	} catch (e) {
		logger.error(e);
		return res.status(500).send(errorMsg.internalServerError);
	}
};

exports.makeNewAnimal = async function (req, res) {
	/*
		1. Create New Animal to user
	*/
	logger.info(`${req.method} ${req.originalUrl}`);
	try {
		const allAnimalLength = await models.animal.count();
		let animalPickIndex = Math.floor(Math.random() * allAnimalLength + 1);
		let animal = await models.animal.findOne({ where: { id: animalPickIndex } });
		let color = colorUtils.makeDefaultColor();
		const user = await models.user.findOne({ where: { id: req.userId } });
		if (!user) {
			return res.status(400).send(errorMsg.userNotFound);
		}
		else {
			if (user.egg <= 0) {
				return res.status(400).send(errorMsg.notEnoughEgg);
			}
			else {
				user.egg -= 1;
				user.save();
			}
		}

		await models.animal_possession
			.create({
				color: color,
				name: animalNameArray[Math.floor(Math.random() * animalNameArray.length)],
				tier: 5,
				user_id: req.userId,
				animal_type: animal.id,
				head_item_id: 1,
				pattern_id: 1,
			})
			.then((user) => {
				logger.info(user);
			});

		return res.status(201).send(animal);
	} catch (e) {
		logger.error(`${req.method} ${req.originalUrl}` + ": " + e);
		return res.status(500).send(errorMsg.internalServerError);
	}
};

exports.changeAnimalColor = async function (req, res) {
	/*
		1. Change Animal Color
	*/
	logger.info(`${req.method} ${req.originalUrl}`);
	try {
		const animal_id = req.body.animalId;
		if (animal_id === undefined) {
			return res.status(400).send(errorMsg.needParameter);
		}
		let animal = await models.animal_possession.findOne({
			where: { id: animal_id },
			attributes: ["animal_type", "color"],
		});
		let new_color = await colorUtils.changeColor(animal.dataValues.color, animal.dataValues.animal_type);
		await models.animal_possession.update({ color: new_color }, { where: { id: animal_id } });
		return res.status(201).send(infoMsg.success);
	} catch (e) {
		logger.error(`${req.method} ${req.originalUrl}` + ": " + e);
		return res.status(500).send(errorMsg.internalServerError);
	}
};

exports.updateAnimal = async function (req, res) {

	logger.info(`${req.method} ${req.originalUrl}`);
	const { name, tier, color, id, animalType, headItem, pattern } = req.body.data;
	if (id === undefined || name === undefined || tier === undefined || color === undefined || animalType === undefined || headItem === undefined || pattern === undefined) {
		return res.status(400).send(errorMsg.needParameter);
	}
	try {
		const head_item_id = await models.head_item.findOne({ where: { filename: headItem } });
		const pattern_id = await models.pattern.findOne({ where: { filename: pattern } });
		const animal_type = await models.animal.findOne({ where: { type: animalType } });
		await models.animal_possession.update({ name: name, color: color, animal_type: animal_type.id, head_item_id: head_item_id.id, pattern_id: pattern_id.id }, { where: { id: id } });
	} catch (e) {
		logger.error(`${req.method} ${req.originalUrl}` + ": " + e);
		return res.status(500).send(errorMsg.internalServerError);
	}
}

exports.getAnimalInfo = async function (req, res, next) {
	logger.info(`${req.method} ${req.originalUrl}`);
	const animal_id = req.query.id;
	try {
		let animal = await models.animal_possession.findAll({
			where: { id: animal_id },
			include: [
				{
					model: models.animal,
					attributes: ["type"],
				},
				{
					model: models.head_item,
					attributes: ["filename"],
				},
				{
					model: models.pattern,
					attributes: ["filename"],
				},
			],
			attributes: ["name", "tier", "color", "id"],
			raw: true,
		});
		animal.forEach(element => {
			element.animalType = element["animal.type"];
			element.headItem = element["head_item.filename"];
			element.pattern = element["pattern.filename"];
			delete element["animal.type"];
			delete element["head_item.filename"];
			delete element["pattern.filename"];
		});
		return res.status(200).send(animal);
	}
	catch (e) {
		logger.error(`${req.method} ${req.originalUrl}` + ": " + e);
		return res.status(500).send(errorMsg.internalServerError);
	}
}