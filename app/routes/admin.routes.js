const { authJwt } = require("../middlewares");
const controller = require("../controllers/admin.controller");
const { uploadImage } = require('../middlewares/uploadImage');
module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/admin/application/update", controller.approveApplicationArchitect);
    app.post("/api/admin/design/update", controller.approveDesignArchitect);
    app.post("/api/admin/approve-application/dealer", controller.approveApplicationDealer);
    app.post("/api/admin/approve-application/contractor", controller.approveApplicationContractor);
    app.post("/api/admin/approve-product/dealer", controller.approveProduct);
    // TEST S3 bucket
    app.post(
        "/api/admin/uploadImage",
        uploadImage.single("image"), // our uploadImage middleware
        (req, res, next) => {
            /* 
               req.file = { 
                 fieldname, originalname, 
                 mimetype, size, bucket, key, location
               }
            */
            console.log(req.file)
            console.log(req.body.asdfa)
            // location key in req.file holds the s3 url for the image
            let data = {}
            if (req.file) {
                data.image = req.file.location
            }
            res.send(req.file)
            // HERE IS YOUR LOGIC TO UPDATE THE DATA IN DATABASE
        }
    );
    app.post("/api/admin/changeUserStatus", controller.changeArchitechDealerStatus);

};