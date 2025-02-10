const controller = require("../controllers/design.controller");
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, Content-Type, Accept"
    );
    next();
  });

  app.post("/api/design/upload", uploadImage.fields([
    {
      name: 'twoDImage', maxCount: 10
    },
    {
      name: 'threeDImage', maxCount: 10
    },
    {
      name: 'cadImage', maxCount: 10
    }
  ]), controller.uploadDesign);

  app.post("/api/design/update", uploadImage.fields([
    {
      name: 'twoDImage', maxCount: 10
    },
    {
      name: 'threeDImage', maxCount: 10
    },
    {
      name: 'cadImage', maxCount: 10
    }
  ]), controller.updateDesign);


  app.post("/api/user/design", controller.getMyDesigns);
  app.post("/api/user/filterDesignsByData", controller.filterDesignsByData);
  app.post("/api/user/sponser-design", controller.sponserDesigns);
  app.post("/api/user/make-it-top-design", controller.makeItTopDesigns);
    app.post("/api/user/get-orders", controller.getOrders);
    app.post("/api/user/get-design-by-id", controller.getDesignById);
    //   design filter 
    app.post("/api/user/filterDesign", controller.getFilterDesign);
    // app.get("/api/architect/update-details", controller.updateArchitectDetails); 
    // app.get("/api/architect/applications", controller.getAllArchitectApplications);
    app.delete("/api/user/design/delete/:id",controller.deleteDesignById);
  
};