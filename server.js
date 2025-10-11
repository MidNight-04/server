require('dotenv').config();
const express = require('express');
const http = require('http');
const cors = require('cors');
const morgan = require('morgan');
// const rateLimit = require('express-rate-limit');
const cron = require('node-cron');
const path = require('path');
const { init } = require('./socket');

const sessionMiddleware = require('./app/middlewares/sessionMiddleware');
const {
  sendWhatsAppMessage,
  dueDateNotification,
} = require('./app/helper/reminder');

const Task = require('./app/models/task.model');
const db = require('./app/models');

const app = express();
const server = http.createServer(app);
const io = init(server);

app.use(cors({ origin: '*' }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(
  morgan(':method :url :status :res[content-length] - :response-time ms')
);

// Rate limiter
// app.use(rateLimit({
//   windowMs: 15 * 60 * 1000,
//   max: 100,
//   message: 'Too many requests from this IP, please try again later.',
//   standardHeaders: true,
//   legacyHeaders: false,
// }));

app.use(sessionMiddleware);

db.mongoose
  .connect(process.env.MONGODB_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => console.log('Connected to MongoDB'))
  .catch(err => {
    console.error('MongoDB connection error:', err);
    process.exit(1);
  });

// Cron Jobs
// cron.schedule('* * * * *', async () => {
//   try {
//     console.log('Running daily 9 AM reminder...');
//     await sendWhatsAppMessage();
//     await dueDateNotification();
//   } catch (error) {
//     console.error('Cron job error:', error);
//   }
// });
cron.schedule('0 9 * * *', async () => {
  try {
    console.log('⏳ Running daily 9 AM reminder...');
    // await sendWhatsAppMessage();
    await dueDateNotification();
  } catch (error) {
    console.error('❌ Cron job error:', error);
  }
});

cron.schedule('*/30 * * * *', async () => {
  try {
    const filter = {
      isActive: true,
      dueDate: { $lt: new Date() },
      status: { $nin: ['Overdue', 'Complete'] },
    };
    const update = { status: 'Overdue' };
    await Task.updateMany(filter, update);
  } catch (error) {
    console.error('Task update error:', error.message);
  }
});

app.use(express.static(__dirname));
app.use('/', express.static(path.join(__dirname, 'dist')));
app.use('/files', express.static(path.join(__dirname, 'files')));

const registerRoutes = routes => routes.forEach(route => require(route)(app));

registerRoutes([
  './app/routes/auth.routes',
  './app/routes/user.routes',
  './app/routes/architect.routes',
  './app/routes/admin.routes',
  './app/routes/design.routes',
  './app/routes/dealer.routes',
  './app/routes/category.routes',
  './app/routes/aigenerateddesign.routes',
  './app/routes/notification.routes',
  './app/routes/projectrole.routes',
  './app/routes/teammember.routes',
  './app/routes/project.routes',
  './app/routes/floor.routes',
  './app/routes/process.routes',
  './app/routes/contractor.routes',
  './app/routes/client.routes',
  './app/routes/projectMaterial.route',
  './app/routes/projectAddress.routes',
  './app/routes/projectOrder.routes',
  './app/routes/projectDocument.routes',
  './app/routes/checkList.routes',
  './app/routes/paymentStages.routes',
  './app/routes/projectPaymentStage.routes',
  './app/routes/projectPaymentDetails.routes',
  './app/routes/projectPay.routes',
  './app/routes/payProjectNotification.routes',
  './app/routes/task.routes',
  './app/routes/taskCategory.routes',
  './app/routes/projectLog.routes',
  './app/routes/rolesRoutes',
  './app/routes/ticket.routes',
  './app/routes/materialRequest.routes',
  './app/routes/vendor.routes',
  './app/routes/material.routes',
  './app/routes/purpose.routes',
  './app/routes/signUp.routes',
]);

app.use('*', (_, res) => {
  res.status(404).json({ message: 'API route not found' });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
