const controller = require("../controllers/payProjectNotification.controller");
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/payproject/notification/get", controller.getAllNotification);
    app.post("/api/payproject/notification/createNotification", controller.createNotification);
    app.post("/api/payproject/notification/updateNotification", controller.updateNotification);
};