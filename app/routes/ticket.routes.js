const controller = require("../controllers/ticket.controller");

module.exports = function (app) {
  app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Headers", "Origin, Content-Type, Accept");
    next();
  });
  app.get("/api/tickets/getalltickets", controller.getAllTickets);
  app.get("/api/tickets/gettickets/:id", controller.getTicketsByClientId);
  app.get("/api/tickets/getmembertickets/:id", controller.getTicketsByMemberId);
};
