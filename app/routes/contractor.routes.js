const controller = require("../controllers/contractorDetails.controller");
const { uploadImage } = require('../middlewares/uploadImage');
const validateRequest = require("../middlewares/vallidate");

module.exports = function (app) {
    app.use(function (req, res, next) {
        res.header(
            "Access-Control-Allow-Headers",
            "Origin, Content-Type, Accept"
        );
        next();
    });

    app.post("/api/contractor/details", uploadImage.fields([
        {
            name: 'gstImage', maxCount: 10
        },
        {
            name: 'panImage', maxCount: 10
        },
        {
            name: 'aadharImage', maxCount: 10
        },
        {
            name: 'bankDetailsImage', maxCount: 10
        }
    ]), controller.saveContractorDetails);
    app.post("/api/contractor/detail", controller.getContractorDetails);
    app.post("/api/contractor/update-details", uploadImage.fields([
        {
            name: 'gstImage', maxCount: 10
        },
        {
            name: 'panImage', maxCount: 10
        },
        {
            name: 'aadharImage', maxCount: 10
        },
        {
            name: 'bankDetailsImage', maxCount: 10
        }
    ]), controller.updateContractorDetails);
    app.get("/api/contractor/applications", controller.getAllContractors);
    // app.delete("/api/contractor/deleteById/:id",controller.deleteDealerById);
    // app.put("/api/contractor/suspendById/:id",controller.suspendDealerById);
    // app.put("/api/contractor/activeById/:id",controller.activeDealerById);
    // app.post("/api/user/filterProducts", brandController.getFilterProducts);
    // app.post("/api/user/filterProductsByData", brandController.getFilterProductsByData);
    // app.post("/api/dealer/products/category-name", brandController.getBrandsByCategoryName);
    // app.post("/api/dealer/products/product-name", brandController.getBrandsByProductName);
    // app.post("/api/user/sponser-product", brandController.sponserBrands);
    // app.post("/api/user/make-it-top-product", brandController.makeItTopBrands);
    
    // app.post("/api/dealer/get-dealer-rating-by-id", controller.getDealerRatingById);
    // app.post("/api/dealer/post-dealer-rating", controller.postDealerRating);
    // app.get("/api/dealer/get-dealer-rating", controller.getDealerRating);
    // app.post("/api/dealer/delete-dealer-rating", controller.deleteDealerRating);
    // app.post("/api/dealer/update-dealer-rating", controller.updateDealerRaing);
    // getBrandsByUploadingUser
};