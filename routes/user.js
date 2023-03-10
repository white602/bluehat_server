var express = require('express');
var router = express.Router();
const userCtrl = require('../controllers/user.ctrl');
const { verifyToken } = require('../middlewares/verify');

router.post("/", userCtrl.addUser);
router.delete("/", userCtrl.delUser);
router.post("/edit-info", verifyToken, userCtrl.editUserInfo);
router.get('/', verifyToken, userCtrl.getUserInfo);
router.get('/get-coin', verifyToken, userCtrl.getUserCoin);
router.post("/update-coin", verifyToken, userCtrl.updateUserCoin);
router.post("/update-egg", verifyToken, userCtrl.updateUserEgg);
router.post("/update-coin-and-egg", verifyToken, userCtrl.updateCoinAndEgg);

module.exports = router;
