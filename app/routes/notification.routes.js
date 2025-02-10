const controller = require("../controllers/notification.controller");
const { uploadImage } = require('../middlewares/uploadImage');
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/notification/get", controller.getAllNotification);
    app.post("/api/notification/createNotification", controller.createNotification);
    app.post("/api/notification/updateNotification", controller.updateNotification);
};