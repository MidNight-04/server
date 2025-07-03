const { verifySignUp } = require('../middlewares');
const controller = require('../controllers/auth.controller');
const { uploadImage } = require('../middlewares/uploadImage');
const uploader = require('../middlewares/fileUploader');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });

  app.post(
    '/api/auth/signup',
    [
      verifySignUp.checkDuplicateUserNameOrEmail,
      verifySignUp.checkRolesExisted,
    ],
    controller.signup
  );

  app.post(
    '/api/user/update-profile',
    // uploadImage.fields([
    //     {
    //         name: 'profileImage', maxCount: 10
    //     }
    // ]),
    uploader,
    controller.updateProfile
  );
  app.post('/api/auth/signin-otp', controller.signinOtp);
  app.post('/api/auth/signin', controller.signin);
  app.put('/api/auth/updateuser', verifyToken, uploader, controller.updateUser);
  app.post('/api/auth/forgot-password', controller.forgotPassword);
  app.post('/api/auth/change-password', verifyToken, controller.changePassword);

  app.post('/api/auth/signout', controller.signout);

  app.get('/api/users', verifyToken, isSenior, controller.getallusers);
  app.post(
    '/api/users/createuser',
    verifyToken,
    isSenior,
    uploader,
    controller.createUser
  );
  app.delete(
    '/api/users/delete/:id',
    verifyToken,
    isSenior,
    controller.deleteUserById
  );
  // get single user profile by id
  app.get(
    '/api/user/single-profile/:id',
    verifyToken,
    controller.singleProfile
  );
  app.post('/api/user/details', verifyToken, controller.getUsersDetails);
  // login after otp verification
  app.post('/api/auth/login', controller.login);
  // getcities list for
  app.post('/api/auth/getCities', verifyToken, controller.getCities);
  app.post('/api/auth/getStates', verifyToken, controller.getStates);
  // complete profile api
  app.post(
    '/api/auth/completeProfile',
    verifyToken,
    controller.completeProfile
  );
  // get user details
  app.get('/api/auth/getProfile', verifyToken, controller.getProfile);

  // application api
  app.get('/api/user/getprofileData', controller.getprofileData);
  app.get('/api/user/getProfileDetail', controller.getProfileDetail);

  // wishlist api for design
  app.post('/api/user/addWishList', controller.addWishList);
  app.post('/api/user/getWishlist', controller.getWishlist);

  // wishlist api for product
  app.post('/api/user/addProductWishList', controller.addProductWishList);
  app.post('/api/user/getProductWishlist', controller.getProductWishlist);

  // Address api
  app.post(
    '/api/user/add-address',
    uploadImage.fields([]),
    controller.addAddress
  );
  app.post(
    '/api/user/update-address',
    uploadImage.fields([]),
    controller.updateAddress
  );
  app.post('/api/user/delete-address', controller.deleteAddress);
  app.post('/api/user/get-address', controller.getAddress);

  // likelist api
  app.post('/api/user/addLikeList', controller.addLikeList);
  // app.get("/api/user/getLikelist", controller.getLikelist);

  // Request for phone number api
  app.post('/api/user/get-request', controller.getRequest);
  app.post('/api/user/request-phone-number', controller.requestPhoneNumber);
  app.post(
    '/api/user/update-request-phone-number',
    controller.requestUpdatePhoneNumber
  );

  // Next Status api
  app.post('/api/user/get-next-status', controller.getNextStatus);
  app.post('/api/user/create-next-status', controller.createNextStatus);
  app.post('/api/user/update-next-status', controller.updateNextStatus);

  app.get('/api/user/getDesigns', controller.getDesign);
  app.post('/api/user/initiate-payment', controller.initiatePayment);
  app.post('/api/user/verify-payment', controller.verifyPayment);
  app.post('/api/user/make-payment-cod', controller.verifyPaymentCOD);
  app.post('/api/user/order-details', controller.orderDetails);
  app.post('/api/user/order-details/data', controller.orderDetailsByData);
  app.post(
    '/api/user/update-order-status',
    uploadImage.fields([
      {
        name: 'invoicefiles',
        maxCount: 10,
      },
    ]),
    controller.updateOrderStatus
  );
  app.post('/api/user/enquiry-details', controller.enquiryDetails);
  app.post('/api/user/send-delivery-otp', controller.sendDeliveryOtp);

  app.post(
    '/api/user/get-product-rating-by-id',
    controller.getProductRatingById
  );
  app.post(
    '/api/user/get-rating-by-product-id',
    controller.getRatingByProductId
  );
  app.post('/api/user/post-product-rating', controller.postProductRating);
  app.get('/api/user/get-product-rating', controller.getProductRating);
  app.post('/api/user/delete-product-rating', controller.deleteProductRating);
  app.post('/api/user/update-product-rating', controller.updateProductRating);
};
