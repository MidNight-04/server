const controller = require("../controllers/projectPaymentDetails.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    app.post('/api/project/initiate-payment', controller.initiatePayment)
    app.post('/api/project/verify-payment', controller.verifyPayment)
};