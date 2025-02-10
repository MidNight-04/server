const config = require("../config/auth.config");
const db = require("../models");
const PaymentStages = db.paymentStages;
const xlsx = require("xlsx");
const axios = require("axios");

exports.addPaymentStages = async (req, res) => {
  const { floor } = req.body;
  const find = await PaymentStages.find({ floor: floor });
  if (find?.length > 0) {
    res.json({
      status: 200,
      message: "Payment stages floor already exist",
    });
  } else {
    //   console.log(req.files);
    const response = await axios.get(req.files.stages[0]?.location, {
      responseType: "arraybuffer",
    });
    // Parse Excel file
    const workbook = xlsx.read(response.data, { type: "buffer" });
    // Access first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array
    const data = xlsx.utils.sheet_to_json(sheet);

    //   console.log("Excel Data:", data);
    var arraySave = [];
    if (data.length > 0) {
      for (let i = 0; i < data?.length; i++) {
        arraySave.push({
          payment: data[i].payment,
          stage: data[i].stages,
        });
      }
      const createData = new PaymentStages({
        floor: floor,
        stages: arraySave,
      });
      createData
        .save()
        .then(() => {
          res.json({
            status: 201,
            message: "Record created successfully",
          });
        })
        .catch((err) => {
          // console.error('Error saving data:', err);
          res.json({
            status: 400,
            message: "Error while record create",
          });
        });
    } else {
      res.json({
        message: "No data present in file...",
        status: 400,
      });
    }
  }
};
exports.getPaymentStages = (req, res) => {
  PaymentStages.find({}).then((stage, err) => {
    if (err) {
      res.status(500).send({
        message: "Internal service error",
      });
      return;
    }
    if (stage) {
      res.status(200).send({
        data: stage,
      });
    }
  });
  return;
};
exports.deletePaymentStages = (req, res) => {
  const id = req.params.id;
  PaymentStages.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Record delete successfully",
      status: 200,
    });
    return;
  });
};
exports.updatePaymentStagePointById = async (req, res) => {
  const { id, prevPayment, prevStage, payment, stage } = req.body;
  await PaymentStages.updateOne(
    { _id: id, "stages.payment": prevPayment, "stages.stage": prevStage },
    {
      $set: {
        "stages.$.payment": parseFloat(payment),
        "stages.$.stage": stage,
      },
    }
  )
    .then(() => {
      res.json({
        status: 200,
        message: "Payment stage update successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: 400,
        message: "Error on update payment stage",
      });
      console.error("Error updating payment:", err);
    });
};
exports.addNewPaymentStagePointById = async (req, res) => {
  const { id, payment, stage } = req.body;
  const newObj = {
    payment: parseFloat(payment),
    stage: stage,
  };
  await PaymentStages.updateOne({ _id: id }, { $push: { stages: newObj } })
    .then(() => {
      res.json({
        status: 200,
        message: "New Payment stage add successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: 400,
        message: "Error on add payment stage",
      });
      console.error("Error add payment stage point:", err);
    });
};
exports.deletePaymentStagePointById = async(req, res) => {
    const { id, payment, stage } = req.body;
  const delObj = {
    payment: parseFloat(payment),
    stage: stage,
  };
  await PaymentStages.updateOne({ _id: id }, { $pull: { stages: delObj } })
    .then(() => {
      res.json({
        status: 200,
        message: "Payment stage point deleted successfully",
      });
    })
    .catch((err) => {
      res.json({
        status: 400,
        message: "Error on delete payment stage point",
      });
      console.error("Error deleting payment stage point:", err);
    });
};
