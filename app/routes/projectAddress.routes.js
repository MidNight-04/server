const controller = require("../controllers/projectAddress.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    // Address api
    app.post("/api/project/add-address",  controller.addAddress);
    app.post("/api/project/update-address", controller.updateAddress);
    app.post("/api/project/delete-address", controller.deleteAddress);
    app.post("/api/project/get-address", controller.getAddress);
};