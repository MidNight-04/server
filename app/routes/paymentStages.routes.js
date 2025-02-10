const controller = require("../controllers/paymentStages.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/paymentstages/add",uploadImage.fields([
        {
        name: 'stages', maxCount: 10
    }
    ]), controller.addPaymentStages);
    app.get("/api/paymentstages/getall", controller.getPaymentStages);
    app.put("/api/paymentstages/stageupdatebyid", controller.updatePaymentStagePointById);
    app.put("/api/paymentstages/addnewstage", controller.addNewPaymentStagePointById);
    app.put("/api/paymentstages/deletestage", controller.deletePaymentStagePointById);
    app.delete("/api/paymentstages/delete/:id", controller.deletePaymentStages);
};