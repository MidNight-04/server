const controller = require('../controllers/task.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const uploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/task/add',
    // uploadImage.fields([
    //   {
    //     name: 'file',
    //     maxCount: 10,
    //   },
    //   {
    //     name: 'audio',
    //     maxCount: 10,
    //   },
    // ]),
    uploader,
    verifyToken,
    controller.addTask
  );
  app.post('/api/task/getall', verifyToken, controller.getAllTask);
  app.post(
    '/api/task/employeeID/:id',
    verifyToken,
    controller.getTaskByEmployeeId
  );
  app.put(
    '/api/task/update/member',
    verifyToken,
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    uploader,
    controller.taskUpdateByMember
  );

  app.put(
    '/api/task/update/admin',
    verifyToken,
    isSenior,
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
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
  // app.put("/api/constructionstep/deletefield", controller.deleteConstructionPointById);
  // app.delete("/api/constructionstep/delete/:id", controller.deleteConstructionStepById);
  app.get('/api/task/gettaskbyid/:id', verifyToken, controller.getTaskByid);
  app.post('/api/task/search/:searchTerm', verifyToken, controller.searchTask);
  app.post(
    '/api/task/taskaddcomment',
    verifyToken,
    isSenior,
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    //   {
    //     name: 'audio',
    //     maxCount: 1,
    //   },
    // ]),
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

  app.post(
    '/api/task/gettodaytaskbyid',
    verifyToken,
    controller.getTodayTaskById
  );
  app.post(
    '/api/task/getyesterdaytaskbyid',
    verifyToken,
    controller.getYesterdayTaskById
  );
  app.post(
    '/api/task/gettomorrowtaskbyid',
    verifyToken,
    controller.getTomorrowTaskById
  );
  app.post(
    '/api/task/getthisweektaskbyid',
    verifyToken,
    controller.getThisWeekTaskById
  );
  app.post(
    '/api/task/getlastweektaskbyid',
    verifyToken,
    controller.getLastWeekTaskById
  );
  app.post(
    '/api/task/getnextweektaskbyid',
    verifyToken,
    controller.nextWeekTaskById
  );
  app.post(
    '/api/task/getlastmonthtaskbyid',
    verifyToken,
    controller.getLastMonthTaskById
  );
  app.post(
    '/api/task/getthismonthtaskbyid',
    verifyToken,
    controller.thisMonthTaskById
  );
  app.post(
    '/api/task/getnextmonthtaskbyid',
    verifyToken,
    controller.getNextMonthTaskById
  );
  app.post(
    '/api/task/getlastyeartaskbyid',
    verifyToken,
    controller.getLastYearTaskById
  );
  app.post(
    '/api/task/getthisyeartaskbyid',
    verifyToken,
    controller.getThisYearTaskById
  );
  app.post('/api/task/customfilters', verifyToken, controller.customFilters);
  app.get('/api/task/getTask', verifyToken, controller.getTask);
  app.post(
    '/api/task/customdashboardfilters',
    controller.customDashboardFilters
  );
  app.post(
    '/api/task/addchecklist',
    verifyToken,
    isSenior,
    controller.addChecklist
  );
  app.post(
    '/api/task/updatechecklistpoint',
    verifyToken,
    controller.updateChecklistPoint
  );
  app.post(
    '/api/task/deletechecklist',
    verifyToken,
    isSenior,
    controller.deleteChecklist
  );
};
