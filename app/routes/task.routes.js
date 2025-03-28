const controller = require('../controllers/task.controller');
const { uploadImage } = require('../middlewares/uploadImage');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/task/add',
    uploadImage.fields([
      {
        name: 'file',
        maxCount: 10,
      },
      {
        name: 'audio',
        maxCount: 10,
      },
    ]),
    controller.addTask
  );
  app.post('/api/task/getall', controller.getAllTask);
  app.post('/api/task/employeeID/:id', controller.getTaskByEmployeeId);
  app.put(
    '/api/task/update/member',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.taskUpdateByMember
  );

  app.put(
    '/api/task/update/admin',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.taskUpdateByAdmin
  );
  app.delete('/api/task/delete/:id', controller.deleteTaskByAdmin);
  app.get(
    '/api/projecttask/byclient/:id',
    controller.getAllProjectTaskByClient
  );
  app.get('/api/projecttask/viewbyid/:id', controller.getTicketByTicketId);
  app.get(
    '/api/projecttask/bymember/:id',
    controller.getAllProjectTaskByMember
  );
  app.get('/api/projectticket/byclient/all', controller.getAllProjectTickets);
  // app.put("/api/constructionstep/deletefield", controller.deleteConstructionPointById);
  // app.delete("/api/constructionstep/delete/:id", controller.deleteConstructionStepById);
  app.get('/api/task/gettaskbyid/:id', controller.getTaskByid);
  app.post('/api/task/search/:searchTerm', controller.searchTask);
  app.post(
    '/api/task/taskaddcomment',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
      {
        name: 'audio',
        maxCount: 1,
      },
    ]),
    controller.taskAddComment
  );
  app.post('/api/task/edittask', controller.editTask);
  app.post(
    '/api/task/deletetaskcommentimage',
    controller.deleteTaskCommentImage
  );
};
