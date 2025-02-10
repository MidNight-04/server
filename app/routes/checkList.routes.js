const controller = require("../controllers/checkList.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    // app.post("/api/project/checklist/add", controller.addCheckList);
    app.get("/api/project/checklist/all", controller.getAllCheckList);
    app.put("/api/project/checklist/addpoint", controller.addNewPointById);
    app.put("/api/project/checklist/addextrapoint", controller.addNewExtraPointById);
    app.put("/api/project/checklist/deletepoint", controller.deletePointById);
    // app.put("/api/project/checklist/addnewheading", controller.addNewHeadingById);
    app.delete("/api/project/checklist/delete/:id", controller.deleteCheckListById);
};