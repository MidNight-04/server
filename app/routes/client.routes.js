const controller = require("../controllers/client.controller");
const { uploadImage } = require("../middlewares/uploadImage");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    app.post(
        "/api/client/update-profile/:id",
        uploadImage.fields([
            {
                name: 'profileImage', maxCount: 10
            }
        ]),
        controller.updateClientProfileById
    );

    app.post("/api/client/add", controller.addClient);
    app.get("/api/client/getall", controller.getAllClient);
    app.get("/api/client/databyid/:id", controller.getClientById);
    app.put("/api/client/updatebyid", controller.updateClientById);
    app.delete("/api/client/delete/:id", controller.deleteClientById);
    app.post("/api/auth-client/signin-otp", controller.signinOtp);
    app.post("/api/auth-client/signin", controller.signin);
    
};