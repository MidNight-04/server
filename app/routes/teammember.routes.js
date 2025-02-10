const controller = require("../controllers/teamMember.controller");
const { uploadImage } = require("../middlewares/uploadImage");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/teammember/add", controller.addMember);
    app.get("/api/teammember/getall", controller.getAllMember);
    app.get("/api/teammember/databyid/:id", controller.getMemberById);
    app.put("/api/teammember/updatebyid", controller.updateMemberById);
    app.post(
        "/api/teammember/update-profile/:id",
        uploadImage.fields([
            {
                name: 'profileImage', maxCount: 10
            }
        ]),
        controller.updateMemberProfileById
    );
    app.delete("/api/teammember/delete/:id", controller.deleteMemberById);
    app.post("/api/auth-member/signin-otp", controller.signinOtp);
    app.post("/api/auth-member/signin", controller.signin);
    // app.post("/api/notification/createNotification", controller.createNotification);
    // app.post("/api/notification/updateNotification", controller.updateNotification);
};