const controller = require("../controllers/projectPaymentStage.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.get("/api/project/paymentstages/getall", controller.getPaymentStages);
    app.get("/api/project/paymentstages/bysiteid/:id", controller.getPaymentStagesBySiteID);
    app.post("/api/project/paymentstages/forclient", controller.getPaymentStagesBySiteIDClientID);
    app.put("/api/project/paymentstages/stageupdatebyid", controller.updatePaymentStagePointById);
    app.put("/api/project/paymentstages/addnewstage", controller.addNewPaymentStagePointById);
    app.put("/api/project/paymentstages/deletestage", controller.deletePaymentStagePointById);
    app.delete("/api/project/paymentstages/delete/:id", controller.deletePaymentStages);
};