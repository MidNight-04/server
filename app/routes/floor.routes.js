const controller = require("../controllers/floor.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/floor/add", controller.addProjectFloor);
    app.get("/api/floor/getall", controller.getAllProjectFloor);
    app.get("/api/floor/databyid/:id", controller.getProjectFloorById);
    app.put("/api/floor/updatebyid", controller.updateProjectFloorById);
    app.delete("/api/floor/delete/:id", controller.deleteProjectFloorById);
};