const controller = require("../controllers/projectOrder.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post('/api/project/material/initiate-payment', controller.initiatePayment)
    app.post('/api/project/material/verify-payment', controller.verifyPayment)
    app.post('/api/project/material/make-payment-cod', controller.verifyPaymentCOD)
   
};