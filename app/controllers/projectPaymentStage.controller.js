const db = require('../models');
const PaymentStages = db.projectPaymentStages;
const { createLogManually } = require('../middlewares/createLog');

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

exports.getPaymentStagesBySiteID = (req, res) => {
  const { id } = req.params;
  PaymentStages.find({ siteID: id }).then((stage, err) => {
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
          'stages.$[elem].paymentStatus': status,
        },
        $push: {
          'stages.$[elem].installments': data,
        },
      },
      { arrayFilters: [{ 'elem.stage': stage }], new: true }
    );
    if (!payment) {
      res.status(404).send({
        message: 'Payment stage not found',
      });
      return;
    }
    await createLogManually(
      req,
      `Updated payment stage ${stage} for siteID ${id}.`,
      id
    );
    res.status(200).send({
      data: payment,
    });
  } catch (err) {
    console.error('Error updating payment stage:', err);
    res.status(500).send({
      message: 'Internal service error',
    });
  }
};

exports.getPaymentStagesBySiteIDClientID = (req, res) => {
  const { siteID } = req.body;
  PaymentStages.find({ siteID: siteID }).then((stage, err) => {
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
exports.deletePaymentStages = async (req, res) => {
  try {
    const id = req.params.id;
    const stage = await PaymentStages.findById(id);
    if (!stage) {
      return res.status(404).send({ message: 'Payment stage not found' });
    }
    await PaymentStages.deleteOne({ _id: id });
    await createLogManually(
      req,
      `Deleted payment stage for siteID ${stage.siteID}`,
      stage.siteID
    );

    return res.status(200).send({
      message: 'Record deleted successfully',
      status: 200,
    });
  } catch (err) {
    console.error('Error deleting payment stage:', err);
    return res.status(500).send({
      message: 'The requested data could not be deleted',
    });
  }
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

  try {
    const updateResult = await PaymentStages.updateOne(
      {
        _id: id,
        'stages.payment': prevPayment,
        'stages.stage': prevStage,
      },
      {
        $set: {
          'stages.$.payment': parseFloat(payment),
          'stages.$.stage': stage,
        },
      }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        status: 404,
        message: 'No matching payment stage found to update',
      });
    }

    await createLogManually(
      req,
      `Updated payment stage "${stage}" (was "${prevStage}") for siteID ${siteID}.`,
      siteID
    );

    return res.status(200).json({
      status: 200,
      message: 'Payment stage updated successfully',
    });
  } catch (err) {
    console.error('Error updating payment stage:', err);
    return res.status(500).json({
      status: 500,
      message: 'Error updating payment stage',
    });
  }
};

exports.addNewPaymentStagePointById = async (req, res) => {
  const { id, payment, stage, date, siteID, userName, activeUser } = req.body;

  const newObj = {
    payment: parseFloat(payment),
    stage: stage,
    paymentStatus: 'Not Due Yet',
    paymentDueDate: '',
    installments: [],
  };

  try {
    const updateResult = await PaymentStages.updateOne(
      { _id: id },
      { $push: { stages: newObj } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        status: 404,
        message: 'No matching record found to update',
      });
    }

    await createLogManually(
      req,
      `Added new payment stage point "${stage}" with amount ${payment} for siteID ${siteID}.`,
      siteID
    );

    return res.status(200).json({
      status: 200,
      message: 'New payment stage added successfully',
    });
  } catch (err) {
    console.error('Error adding payment stage point:', err);
    return res.status(500).json({
      status: 500,
      message: 'Error adding payment stage',
    });
  }
};

exports.deletePaymentStagePointById = async (req, res) => {
  const { id, payment, stage, siteID } = req.body;

  const delObj = {
    payment: parseFloat(payment),
    stage,
  };

  try {
    const updateResult = await PaymentStages.updateOne(
      { _id: id },
      { $pull: { stages: delObj } }
    );

    if (updateResult.modifiedCount === 0) {
      return res.status(404).json({
        status: 404,
        message: 'No matching payment stage point found to delete',
      });
    }

    await createLogManually(
      req,
      `Deleted payment stage point "${stage}" with ${payment} for siteID ${siteID}.`,
      siteID
    );

    return res.status(200).json({
      status: 200,
      message: 'Payment stage point deleted successfully',
    });
  } catch (err) {
    console.error('Error deleting payment stage point:', err);
    return res.status(500).json({
      status: 500,
      message: 'Error deleting payment stage point',
    });
  }
};
