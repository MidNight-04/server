const controller = require("../controllers/taskCategory.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });

  app.post("/api/category/add", controller.addCategory);
  app.get("/api/category/list", controller.getAllCategory);
  app.get("/api/task-category/databyid/:id", controller.getTaskCategoryById);
  app.put("/api/task-category/updatebyid", controller.updateTaskCategoryById);
  app.delete(
    "/api/task-category/delete/:id",
    controller.deleteTaskCategoryById
  );
};
