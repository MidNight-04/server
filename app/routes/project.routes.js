const controller = require('../controllers/project.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const fileUploader = require('../middlewares/fileUploader');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/project/deletestatusimage',
    fileUploader,
    controller.deleteStatusImage
  );
  app.post('/api/project/add', controller.addProject);
  app.get('/api/project/getall', controller.getAllProject);
  app.get('/api/project/member/:id', controller.getProjectByMember);
  app.get('/api/project/client/:id', controller.getProjectByClientId);
  app.get('/api/project/databyid/:id', controller.getProjectById);
  app.put('/api/project/updatebyid', controller.updateProjectById);
  app.post('/api/project/deleteImage', controller.deleteImage);
  app.put(
    '/api/project/updatetaskbymember',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.updateProjectTaskByMember
  );
  app.put('/api/project/updateimagestatusbyid', controller.updateImageStatus);
  app.put(
    '/api/project/updatestatusbyid',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.updateProjectStatusById
  );
  app.put(
    '/api/project/client-query',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.clientQueryForProject
  );
  app.put('/api/project/member/delete', controller.deleteProjectMember);
  app.put('/api/project/member/add', controller.addProjectMember);
  app.delete('/api/project/delete/:id', controller.deleteProjectById);
  app.put('/api/singleproject/checklist/addpoint', controller.addNewPointById);
  app.put(
    '/api/singleproject/checklist/addextrapoint',
    controller.addNewExtraPointById
  );
  app.put(
    '/api/singleproject/checklist/deletepoint',
    controller.deleteExtraPointById
  );
  app.get('/api/project/filterlist', controller.filterData);
  app.get('/api/project/filterlist/member', controller.filterMemberData);
  app.post('/api/project/initiate-payment', controller.initiatePayment);
  app.post('/api/project/verify-payment', controller.verifyPayment);
  app.put('/api/project/createnewpoint', controller.AddNewProjectPoint);
  app.put('/api/project/deletepoint', controller.DeleteProjectPoint);
  app.put('/api/project/deletestep', controller.ProjectStepDelete);

  // ticket update related /api/project/ticketupdatemember/byid
  app.put(
    '/api/project/ticketupdatemember/byid',
    uploadImage.fields([
      {
        name: 'image',
        maxCount: 20,
      },
    ]),
    controller.TicketUpdateByMember
  );
  app.post('/api/project/changeissuemember', controller.changeIssueMember);
  app.get('/api/project/getallsiteids', controller.getAllSiteIds);
};
