const config = require("../config/auth.config");
const db = require("../models");
const PaymentStages = db.projectPaymentStages;
const ProjectLog = db.projectlogs;
const xlsx = require("xlsx");
const axios = require("axios");

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

exports.getPaymentStagesBySiteID = (req, res) => {
  const { id } = req.params;
  PaymentStages.find({ siteID: id }).then((stage, err) => {
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

exports.updatePaymentStagesBySiteID = async (req, res) => {
  try {
    const { id } = req.params;
    const { paymentDate, amount, mode, remarks, stage, status } = req.body;
    const data = {
      paymentDate,
      amount,
      mode,
      remarks,
    };

    const payment = await PaymentStages.findOneAndUpdate(
      { siteID: id },
      {
        $set: {
          "stages.$[elem].paymentStatus": status,
        },
        $push: {
          "stages.$[elem].installments": data,
        },
      },
      { arrayFilters: [{ "elem.stage": stage }], new: true }
    );
    if (!payment) {
      res.status(404).send({
        message: "Payment stage not found",
      });
      return;
    }
    res.status(200).send({
      data: payment,
    });
  } catch (err) {
    console.error("Error updating payment stage:", err);
    res.status(500).send({
      message: "Internal service error",
    });
  }
};

exports.getPaymentStagesBySiteIDClientID = (req, res) => {
  const { siteID } = req.body;
  PaymentStages.find({ siteID: siteID }).then((stage, err) => {
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
  const {
    id,
    prevPayment,
    prevStage,
    payment,
    stage,
    date,
    siteID,
    userName,
    activeUser,
  } = req.body;
  await PaymentStages.updateOne(
    { "_id": id, "stages.payment": prevPayment, "stages.stage": prevStage },
    {
      $set: {
        "stages.$.payment": parseFloat(payment),
        "stages.$.stage": stage,
      },
    }
  )
    .then(async () => {
      const logData = {
        log: `<span style="color: black;">${stage} (${payment}%) payment stage</span> ->> <em style="color: green">update</em>`,
        file: [],
        date: date,
        siteID: siteID,
        member: {
          name: userName,
          Id: activeUser,
        },
      };
      const logSave = new ProjectLog(logData);
      await logSave.save();
      res.json({
        status: 200,
        message: "Payment stage update successfully",
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: "Error on update payment stage",
      });
      console.error("Error updating payment:", err);
    });
};
exports.addNewPaymentStagePointById = async (req, res) => {
  const { id, payment, stage, date, siteID, userName, activeUser } = req.body;
  const newObj = {
    payment: parseFloat(payment),
    stage: stage,
    paymentStatus: "Not Due Yet",
    paymentDueDate: "",
    installments: []
    };
  await PaymentStages.updateOne({ _id: id }, { $push: { stages: newObj } })
    .then(async () => {
      // const logData = {
      //   log: `<span style="color: black;">${stage} (${payment}%) payment stage</span> ->> <em style="color: green">added</em>`,
      //   file: [],
      //   date: date,
      //   siteID: siteID,
      //   member: {
      //     name: userName,
      //     Id: activeUser,
      //   },
      // };
      // const logSave = new ProjectLog(logData);
      // await logSave.save();
      return res.json({
        status: 200,
        message: "New Payment stage add successfully",
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: "Error on add payment stage",
      });
      console.error("Error add payment stage point:", err);
    });
};
exports.deletePaymentStagePointById = async (req, res) => {
  const { id, payment, stage, date, siteID, userName, activeUser } = req.body;
  const delObj = {
    payment: parseFloat(payment),
    stage: stage,
  };
  await PaymentStages.updateOne({ _id: id }, { $pull: { stages: delObj } })
    .then(async () => {
      const logData = {
        log: `<span style="color: black;">${stage} (${payment}%) payment stage</span> ->> <em style="color: green">delete</em>`,
        file: [],
        date: date,
        siteID: siteID,
        member: {
          name: userName,
          Id: activeUser,
        },
      };
      const logSave = new ProjectLog(logData);
      await logSave.save();
      return res.json({
        status: 200,
        message: "Payment stage point deleted successfully",
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: "Error on delete payment stage point",
      });
      console.error("Error deleting payment stage point:", err);
    });
};
