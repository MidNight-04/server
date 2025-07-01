const controller = require('../controllers/teamMember.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const fileUploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  // app.post('/api/teammember/add', verifyToken, isSenior, controller.addMember);
  app.get('/api/teammember/getall', verifyToken, controller.getAllMember);
  app.get(
    '/api/teammember/databyid/:id',
    verifyToken,
    controller.getMemberById
  );
  app.put(
    '/api/teammember/updatebyid',
    verifyToken,
    isSenior,
    controller.updateMemberById
  );
  app.post(
    '/api/teammember/update-profile/:id',
    verifyToken,
    // uploadImage.fields([
    //   {
    //     name: 'profileImage',
    //     maxCount: 10,
    //   },
    // ]),
    fileUploader,
    controller.updateMemberProfileById
  );
  app.delete(
    '/api/teammember/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteMemberById
  );
  app.post('/api/auth-member/signin-otp', controller.signinOtp);
  app.post('/api/auth-member/signin', controller.signin);
  // app.post("/api/notification/createNotification", controller.createNotification);
  // app.post("/api/notification/updateNotification", controller.updateNotification);
  app.post(
    '/api/teammember/getTeammemberByRole',
    verifyToken,
    controller.getTeammemberByRole
  );
};
