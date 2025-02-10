const { authJwt } = require("../middlewares");
const controller = require("../controllers/aigeneratedDesign.controller");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });
    
    app.post("/api/aigenerated/design", controller.saveAigeneratedDesign);
    app.get("/api/aigenerated/your-house-design-list", controller.getAIGeneratedDesign);
};