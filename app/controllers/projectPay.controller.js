const db  = require("../models")
const PayProject = db.projectPay;

exports.payDetailBySiteID = (req, res) => { 
    const {id}= req.params;
    // console.log("callllllllll",id)
    PayProject.find({siteID:id},(err, data) => {
        if (err) {
        //   console.log(err);
          res.status(500).send({ message: "Could not find id to get details" });
          return;
        }
        if (data) {
          res.status(200).send({data: data });
        }
      });
};


