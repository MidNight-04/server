const controller = require('../controllers/task.controller');
const uploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post('/api/task/add', uploader, verifyToken, controller.addTask);
  app.post('/api/task/getall', verifyToken, controller.getAllTask);
  app.post(
    '/api/task/employeeID/:id',
    verifyToken,
    controller.getTaskByEmployeeId
  );
  app.put(
    '/api/task/update/member',
    verifyToken,
    uploader,
    controller.taskUpdateByMember
  );

  app.put(
    '/api/task/update/admin',
    verifyToken,
    isSenior,
    uploader,
    controller.taskUpdateByAdmin
  );
  app.delete(
    '/api/task/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteTaskByAdmin
  );
  app.get(
    '/api/projecttask/byclient/:id',
    verifyToken,
    controller.getAllProjectTaskByClient
  );
  app.get(
    '/api/projecttask/viewbyid/:id',
    verifyToken,
    controller.getTicketByTicketId
  );
  app.get(
    '/api/projecttask/bymember/:id',
    verifyToken,
    controller.getAllProjectTaskByMember
  );
  app.get(
    '/api/projectticket/byclient/all',
    verifyToken,
    isSenior,
    controller.getAllProjectTickets
  );
  app.get('/api/task/gettaskbyid/:id', verifyToken, controller.getTaskByid);
  app.post(
    '/api/task/taskaddcomment',
    verifyToken,
    uploader,
    controller.taskAddComment
  );
  app.post('/api/task/edittask', verifyToken, isSenior, controller.editTask);
  app.post(
    '/api/task/deletetaskcomment',
    verifyToken,
    isSenior,
    controller.deleteTaskComment
  );
  app.post(
    '/api/task/approvetaskcomment',
    verifyToken,
    controller.approveTaskComment
  );
  app.post(
    '/api/task/reassigntask',
    verifyToken,
    isSenior,
    controller.reassignTask
  );
  app.post(
    '/api/task/deletetaskcommentimage',
    verifyToken,
    isSenior,
    controller.deleteTaskCommentImage
  );
  app.post(
    '/api/task/manuallyclosetask',
    verifyToken,
    isSenior,
    controller.manuallyCloseTask
  );

  app.post('/api/task/customfilters', verifyToken, controller.customFilters);
  app.post('/api/task/delegatedtasks', verifyToken, controller.delegatedTasks);
  app.post('/api/task/mytasks', verifyToken, controller.myTasks);
  app.get('/api/task/getTask', verifyToken, controller.getTask);
  app.post(
    '/api/task/addchecklist',
    verifyToken,
    isSenior,
    controller.addChecklist
  );
  app.post(
    '/api/task/updatechecklistpoint',
    verifyToken,
    uploader,
    controller.updateChecklistPoint
  );
  app.post(
    '/api/task/deletechecklist',
    verifyToken,
    isSenior,
    controller.deleteChecklist
  );
  app.post(
    '/api/task/dashboardfilter',
    verifyToken,
    controller.dashboardFilter
  );
};
