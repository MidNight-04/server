const config = require('../config/auth.config');
const db = require('../models');
const PaymentStages = db.paymentStages;
const xlsx = require('xlsx');
const axios = require('axios');
const { createLogManually } = require('../middlewares/createLog');

exports.addPaymentStages = async (req, res) => {
  const { floor } = req.body;
  const f = floor.split('+');
  const find = await PaymentStages.find({ floor: floor });
  if (find?.length > 0) {
    res.json({
      status: 200,
      message: 'Payment stages floor already exist',
    });
  } else {
    // const response = await axios.get(req.files.stages[0]?.location, {
    //   responseType: "arraybuffer",
    // });
    // Parse Excel file
    const workbook = xlsx.readFile(req.files.file[0].path, { type: 'buffer' });
    // Access first sheet
    // const sheetName = workbook.SheetNames[0];
    // const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array
    const data = xlsx.utils.sheet_to_json(workbook.Sheets.Sheet1);

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
        .then(async () => {
          await createLogManually(
            req,
            `Created payment stages for floor ${floor}.`
          );
          res.json({
            status: 201,
            message: 'Record created successfully',
          });
        })
        .catch(err => {
          // console.error('Error saving data:', err);
          res.json({
            status: 400,
            message: 'Error while record create',
          });
        });
    } else {
      res.json({
        message: 'No data present in file...',
        status: 400,
      });
    }
  }
};
exports.getPaymentStages = (req, res) => {
  PaymentStages.find({}).then((stage, err) => {
    if (err) {
      res.status(500).send({
        message: 'Internal service error',
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
  PaymentStages.deleteOne({ _id: id }, async (err, dealer) => {
    await createLogManually(
      req,
      `Deleted payment stages for floor ${dealer.floor}.`
    );
    if (err) {
      res
        .status(500)
        .send({ message: 'The requested data could not be fetched' });
      return;
    }
    res.status(200).send({
      message: 'Record delete successfully',
      status: 200,
    });
    return;
  });
};

exports.updatePaymentStagePointById = async (req, res) => {
  const { id, prevPayment, prevStage, payment, stage } = req.body;
  const paymentStagesData = await PaymentStages.findById(id);
  if (!paymentStagesData) {
    return res.status(404).json({ message: 'Payment stages not found' });
  }
  await PaymentStages.updateOne(
    { _id: id, 'stages.payment': prevPayment, 'stages.stage': prevStage },
    {
      $set: {
        'stages.$.payment': parseFloat(payment),
        'stages.$.stage': stage,
      },
    }
  )
    .then(async () => {
      await createLogManually(
        req,
        `Updated payment stage point for floor ${paymentStagesData.floor} from ${prevPayment} to ${payment} and from ${prevStage} to ${stage}.`
      );
      res.json({
        status: 200,
        message: 'Payment stage update successfully',
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: 'Error on update payment stage',
      });
      console.error('Error updating payment:', err);
    });
};
exports.addNewPaymentStagePointById = async (req, res) => {
  const { id, payment, stage } = req.body;
  const newObj = {
    payment: parseFloat(payment),
    stage: stage,
  };
  await PaymentStages.updateOne({ _id: id }, { $push: { stages: newObj } })
    .then(async result => {
      await createLogManually(
        req,
        `Added new payment stage point for floor ${result.floor}.`
      );
      res.json({
        status: 200,
        message: 'New Payment stage add successfully',
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: 'Error on add payment stage',
      });
      console.error('Error add payment stage point:', err);
    });
};
exports.deletePaymentStagePointById = async (req, res) => {
  const { id, payment, stage } = req.body;
  const delObj = {
    payment: parseFloat(payment),
    stage: stage,
  };
  const paymentStagesData = await PaymentStages.findById(id);
  if (!paymentStagesData) {
    return res.status(404).json({ message: 'Payment stages not found' });
  }
  await PaymentStages.updateOne({ _id: id }, { $pull: { stages: delObj } })
    .then(async () => {
      await createLogManually(
        req,
        `Deleted payment stage point for floor ${paymentStagesData.floor} from ${payment} to ${payment} and from ${stage} to ${stage}.`
      );
      res.json({
        status: 200,
        message: 'Payment stage point deleted successfully',
      });
    })
    .catch(err => {
      res.json({
        status: 400,
        message: 'Error on delete payment stage point',
      });
      console.error('Error deleting payment stage point:', err);
    });
};
