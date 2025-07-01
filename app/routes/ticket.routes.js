const controller = require('../controllers/ticket.controller');
const { verifyToken, isSenior } = require('../middlewares/authJwt');

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header('Access-Control-Allow-Headers', 'Origin, Content-Type, Accept');
    next();
  });
  app.get('/api/tickets/getalltickets', verifyToken, controller.getAllTickets);
  app.get(
    '/api/tickets/gettickets/:id',
    verifyToken,
    controller.getTicketsByClientId
  );
  app.get(
    '/api/tickets/getmembertickets/:id',
    verifyToken,
    controller.getTicketsByMemberId
  );
};
