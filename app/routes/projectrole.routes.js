const controller = require("../controllers/projectRole.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/projectrole/add", controller.addProjectRole);
    app.get("/api/projectrole/getall", controller.getAllProjectRole);
    app.get("/api/projectrole/databyid/:id", controller.getProjectRoleById);
    app.put("/api/projectrole/updatebyid", controller.updateProjectRoleById);
    app.delete("/api/projectrole/delete/:id", controller.deleteProjectRoleById);
    // app.post("/api/notification/createNotification", controller.createNotification);
    // app.post("/api/notification/updateNotification", controller.updateNotification);
};