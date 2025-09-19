const controller = require('../controllers/project.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const fileUploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior, canCreate } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/project/deletestatusimage',
    verifyToken,
    isSenior,
    fileUploader,
    controller.deleteStatusImage
  );
  app.post('/api/project/add', verifyToken, canCreate, controller.addProject);
  app.get('/api/project/getall', verifyToken, controller.getAllProject);
  app.get(
    '/api/project/member/:id',
    verifyToken,
    controller.getProjectByMember
  );
  app.get(
    '/api/project/client/:id',
    verifyToken,
    controller.getProjectByClientId
  );
  app.get('/api/project/databyid/:id', verifyToken, controller.getProjectById);
  app.put('/api/project/updatebyid', verifyToken, controller.updateProjectById);
  app.post(
    '/api/project/deleteImage',
    verifyToken,
    isSenior,
    controller.deleteImage
  );
  app.put(
    '/api/project/updatetaskbymember',
    verifyToken,
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    fileUploader,
    controller.updateProjectTaskByMember
  );
  app.put(
    '/api/project/updateimagestatusbyid',
    verifyToken,
    isSenior,
    controller.updateImageStatus
  );
  app.put(
    '/api/project/updatestatusbyid',
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    fileUploader,
    verifyToken,
    controller.updateProjectStatusById
  );
  app.put(
    '/api/project/client-query',
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    fileUploader,
    verifyToken,
    controller.clientQueryForProject
  );
  app.put(
    '/api/project/member/delete',
    verifyToken,
    isSenior,
    controller.deleteProjectMember
  );
  app.put(
    '/api/project/member/add',
    verifyToken,
    isSenior,
    controller.addProjectMember
  );
  app.delete(
    '/api/project/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteProjectById
  );
  app.put(
    '/api/singleproject/checklist/addpoint',
    verifyToken,
    isSenior,
    controller.addNewPointById
  );
  app.put(
    '/api/singleproject/checklist/addextrapoint',
    verifyToken,
    isSenior,
    controller.addNewExtraPointById
  );
  app.put(
    '/api/singleproject/checklist/deletepoint',
    verifyToken,
    isSenior,
    controller.deleteExtraPointById
  );
  app.get('/api/project/filterlist', controller.filterData);
  app.get('/api/project/filterlist/member', controller.filterMemberData);
  app.post('/api/project/initiate-payment', controller.initiatePayment);
  app.post('/api/project/verify-payment', controller.verifyPayment);
  app.put(
    '/api/project/createnewpoint',
    verifyToken,
    controller.AddNewProjectPoint
  );
  app.put(
    '/api/project/deletepoint',
    verifyToken,
    isSenior,
    controller.DeleteProjectPoint
  );
  app.put(
    '/api/project/deletestep',
    verifyToken,
    isSenior,
    controller.ProjectStepDelete
  );

  // ticket update related /api/project/ticketupdatemember/byid
  app.put(
    '/api/project/updateticket/:ticketId',
    // uploadImage.fields([
    //   {
    //     name: 'image',
    //     maxCount: 20,
    //   },
    // ]),
    verifyToken,
    fileUploader,
    controller.updateTicket
  );
  app.post(
    '/api/project/changeissuemember',
    verifyToken,
    isSenior,
    controller.changeIssueMember
  );
  app.get('/api/project/getallsiteids', controller.getAllSiteIds);
  app.get(
    '/api/project/getallprojectissuemembers/:siteId',
    controller.getAllProjectIssueMembers
  );
};
