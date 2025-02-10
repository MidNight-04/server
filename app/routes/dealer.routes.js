const controller = require("../controllers/dealerDetails.controller");
const brandController = require("../controllers/brands.controller");
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

    app.post("/api/dealer/details", uploadImage.fields([
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
    ]), controller.saveDealerDetails);
    app.post("/api/dealer/product-detail", brandController.getBrandsById);
    app.get("/api/dealer/products/proxy-image", brandController.getProxyImage);
    app.delete("/api/dealer/product-delete/:id", brandController.deleteBrandsById);
    app.post("/api/dealer/upload-brand", uploadImage.fields([
        {
            name: 'productImage', maxCount: 10
        }
    ]),validateRequest, brandController.uploadBrands);
    app.post("/api/dealer/update-brand", uploadImage.fields([
        {
            name: 'productImage', maxCount: 10
        }
    ]), brandController.updateBrands);
    app.post("/api/dealer/detail", controller.getDealerDetails);
    app.post("/api/dealer/detailbyid", controller.getDealerDetailbyId);
    app.post("/api/vendor-list/bybrand", controller.getVendorListByBrand);
    app.post("/api/dealer/update-details", uploadImage.fields([
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
    ]), controller.updateDealerDetails);
    app.get("/api/dealer/applications", controller.getAllDealers);
    app.delete("/api/dealer/deleteById/:id",controller.deleteDealerById);
    app.put("/api/dealer/suspendById/:id",controller.suspendDealerById);
    app.put("/api/dealer/activeById/:id",controller.activeDealerById);
    app.get("/api/dealer/products", brandController.getBrandsByUploadingUser);
    app.post("/api/dealer/products/all", brandController.getAllBrands);
    app.post("/api/user/filterProducts", brandController.getFilterProducts);
    app.post("/api/user/filterProductsByData", brandController.getFilterProductsByData);
    app.post("/api/dealer/products/category-name", brandController.getBrandsByCategoryName);
    app.post("/api/dealer/products/product-name", brandController.getBrandsByProductName);
    app.post("/api/user/sponser-product", brandController.sponserBrands);
    app.post("/api/user/make-it-top-product", brandController.makeItTopBrands);
    
    app.post("/api/dealer/get-dealer-rating-by-id", controller.getDealerRatingById);
    app.post("/api/dealer/post-dealer-rating", controller.postDealerRating);
    app.get("/api/dealer/get-dealer-rating", controller.getDealerRating);
    app.post("/api/dealer/delete-dealer-rating", controller.deleteDealerRating);
    app.post("/api/dealer/update-dealer-rating", controller.updateDealerRaing);
    // getBrandsByUploadingUser
};