const express = require("express");
const cors = require("cors");
const cookieSession = require("cookie-session");
const morgan = require("morgan");
const bodyParser = require("body-parser");
const app = express();
const path = require("path");
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));
var corsOptions = {
  origin: "*",
};

app.use(cors());

// parse requests of content-type - application/x-www-form-urlencoded
app.use(express.urlencoded({ extended: true }));

// This has been done to parse the content-type of application/json requests
app.use(express.json());

app.use(
  bodyParser.urlencoded({
    extended: false,
  })
);
app.use(bodyParser.json());

app.use(
  morgan(":method :url :status :res[content-length] - :response-time ms")
);

app.use(
  cookieSession({
    name: "thikedaar-cookie",
    secret: "COOKIE_SECRET", // should use as secret environment variable
    httpOnly: true,
  })
);

const db = require("./app/models");
const dbConfig = require("./app/config/db.config");

// mongodb+srv://thikedaar:thikedaarapptest@cluster0-thikedaar.mapykyh.mongodb.net/test
// mongodb+srv://${dbConfig.HOST}:${dbConfig.PORT}@talesgram.wtiwt.mongodb.net/test
// console.log(`mongodb+srv://${dbConfig.HOST}:${dbConfig.PORT}@${dbConfig.url}.mongodb.net/${dbConfig.DB}`);
db.mongoose
  .connect(
    `mongodb+srv://${dbConfig.HOST}:${dbConfig.PORT}@${dbConfig.url}.mongodb.net/${dbConfig.DB}`,
    {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    }
  )
  .then(() => {
    console.log("Successfully connected to MongoDb");
  })
  .catch(err => {
    console.error("There was an error connecting to the database:", err);
    process.exit();
  });

// creating a simple route for the start of the application
// app.get('/', (req, res) => {
//     res.json({ message: 'welcome to thikedaar application' });
// });
// app.get("/api/client/project-document/view", async(req,res)=>{
//     console.log(req.query.pdfURL)
// })

app.use(express.static(__dirname));
app.use("/", express.static(path.join(__dirname, "dist")));
app.use("/files", express.static(path.join(__dirname, "files")));

require("./app/routes/auth.routes")(app);
require("./app/routes/user.routes")(app);
require("./app/routes/architect.routes")(app);
require("./app/routes/admin.routes")(app);
require("./app/routes/design.routes")(app);
require("./app/routes/dealer.routes")(app);
require("./app/routes/category.routes")(app);
require("./app/routes/aigenerateddesign.routes")(app);
require("./app/routes/notification.routes")(app);
require("./app/routes/projectrole.routes")(app);
require("./app/routes/teammember.routes")(app);
require("./app/routes/project.routes")(app);
require("./app/routes/floor.routes")(app);
require("./app/routes/process.routes")(app);
require("./app/routes/contractor.routes")(app);
require("./app/routes/client.routes")(app);
require("./app/routes/projectMaterial.route")(app);
require("./app/routes/projectAddress.routes")(app);
require("./app/routes/projectOrder.routes")(app);
require("./app/routes/projectDocument.routes")(app);
require("./app/routes/checkList.routes")(app);
require("./app/routes/paymentStages.routes")(app);
require("./app/routes/projectPaymentStage.routes")(app);
require("./app/routes/projectPaymentDetails.routes")(app);
require("./app/routes/projectPay.routes")(app);
require("./app/routes/payProjectNotification.routes")(app);
require("./app/routes/task.routes")(app);
require("./app/routes/taskCategory.routes")(app);
require("./app/routes/projectLog.routes")(app);
require("./app/routes/rolesRoutes")(app);

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});
