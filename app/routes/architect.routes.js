const controller = require("../controllers/architectDetails.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/architect/details", uploadImage.fields([
        {
            name: 'gstImage', maxCount: 10
        },
        {
            name: 'panImage', maxCount: 10
        },
        {
            name: 'coaLicenseImage', maxCount: 10
        },
        {
            name: 'otherLicenseImage', maxCount: 10
        },
        {
            name: 'aadharImage', maxCount: 10
        },
        {
            name: 'bankDetailsImage', maxCount: 10
        }
    ]), controller.saveArchitectDetails);
    app.post("/api/uploadImage", uploadImage.single("image"), controller.uploadImage);
    app.post("/api/architect/detail", controller.getArchitectDetails);

    app.post("/api/architect/update-details", uploadImage.fields([
        {
            name: 'gstImage', maxCount: 10
        },
        {
            name: 'panImage', maxCount: 10
        },
        {
            name: 'coaLicenseImage', maxCount: 10
        },
        {
            name: 'otherLicenseImage', maxCount: 10
        },
        {
            name: 'aadharImage', maxCount: 10
        },
        {
            name: 'bankDetailsImage', maxCount: 10
        }
    ]), controller.updateArchitectDetails);
    app.get("/api/architect/applications", controller.getAllArchitectApplications);
    app.post("/api/architect/filter-applications", controller.getFilterArchitectApplications);
    app.delete("/api/architect/deleteById/:id",controller.deleteArchitectById);
    app.put("/api/architect/suspendById/:id",controller.suspendArchitectById);
    app.put("/api/architect/activeById/:id",controller.activeArchitectById);
    app.put("/api/architect/authorizedById/:id",controller.authorizedArchitectById);
    app.get("/api/architect/designs", controller.getDesignsForUser);
    app.post("/api/architect/order", controller.contactArchitect);
    app.get("/api/banner/images", controller.getBannerImages);

};