const controller = require('../controllers/task.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const uploader = require("../middlewares/fileUploader");

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
    controller.addTask
  );
  app.post('/api/task/getall', controller.getAllTask);
  app.post('/api/task/employeeID/:id', controller.getTaskByEmployeeId);
  app.put(
    '/api/task/update/member',
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
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    uploader,
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
  app.post('/api/task/edittask', controller.editTask);
  app.post('/api/task/deletetaskcomment', controller.deleteTaskComment);
  app.post('/api/task/approvetaskcomment', controller.approveTaskComment);
  app.post('/api/task/reassigntask', controller.reassignTask);
  app.post('/api/task/deletetaskcommentimage', controller.deleteTaskCommentImage);
  app.post('/api/task/manuallyclosetask', controller.manuallyCloseTask);

  app.post('/api/task/gettodaytaskbyid', controller.getTodayTaskById);
  app.post('/api/task/getyesterdaytaskbyid', controller.getYesterdayTaskById);
  app.post('/api/task/gettomorrowtaskbyid', controller.getTomorrowTaskById);
  app.post('/api/task/getthisweektaskbyid', controller.getThisWeekTaskById);
  app.post('/api/task/getlastweektaskbyid', controller.getLastWeekTaskById);
  app.post('/api/task/getnextweektaskbyid', controller.nextWeekTaskById);
  app.post('/api/task/getlastmonthtaskbyid', controller.getLastMonthTaskById);
  app.post('/api/task/getthismonthtaskbyid', controller.thisMonthTaskById);
  app.post('/api/task/getnextmonthtaskbyid', controller.getNextMonthTaskById);
  app.post('/api/task/getlastyeartaskbyid', controller.getLastYearTaskById);
  app.post('/api/task/getthisyeartaskbyid', controller.getThisYearTaskById);
  app.post('/api/task/customfilters', controller.customFilters);
  app.get('/api/task/getTask', controller.getTask);
  app.post('/api/task/customdashboardfilters', controller.customDashboardFilters);
  app.post('/api/task/addchecklist', controller.addChecklist);
  app.post('/api/task/updatechecklistpoint', controller.updateChecklistPoint);
  app.post('/api/task/deletechecklist', controller.deleteChecklist);
};
