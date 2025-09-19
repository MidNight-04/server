const mongoose = require('mongoose');
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
  const { siteID, stage, payment, newStage, newPayment } = req.body;
  const session = await mongoose.startSession();

  try {
    let responsePayload;

    const useTransaction = typeof session.startTransaction === 'function';

    if (useTransaction) {
      await session.withTransaction(async () => {
        responsePayload = await updateStageAndLog({
          req,
          siteID,
          stage,
          payment,
          newStage,
          newPayment,
          session,
        });
      });
    } else {
      // fallback: just call update without transaction
      responsePayload = await updateStageAndLog({
        req,
        siteID,
        stage,
        payment,
        newStage,
        newPayment,
      });
    }

    return res.status(responsePayload.status).json(responsePayload);
  } catch (err) {
    console.error('Error updating payment stage:', err);
    return res.status(500).json({
      status: 500,
      message: 'Error updating payment stage',
      error: err.message,
    });
  } finally {
    session.endSession();
  }
};

// Helper function for updating stage + creating log
async function updateStageAndLog({
  req,
  siteID,
  stage,
  payment,
  newStage,
  newPayment,
  session,
}) {
  // Find the document
  const paymentStageDoc = await PaymentStages.findOne({
    siteID,
  }).session(session || null);
  if (!paymentStageDoc) {
    return { status: 404, message: 'Payment stage document not found' };
  }

  // Find the exact stage point
  const stagePoint = paymentStageDoc.stages.find(
    s => s.stage === stage && s.payment === parseFloat(payment)
  );
  if (!stagePoint) {
    return {
      status: 404,
      message: 'No matching payment stage point found to update',
    };
  }

  const oldStage = stagePoint.stage;
  const oldPayment = stagePoint.payment;

  // Atomic update in DB
  const updateResult = await PaymentStages.updateOne(
    {
      siteID,
      'stages.stage': stage,
      'stages.payment': parseFloat(payment),
    },
    {
      $set: {
        'stages.$.stage': newStage || oldStage,
        'stages.$.payment': newPayment ? parseFloat(newPayment) : oldPayment,
      },
    },
    session ? { session } : {}
  );

  if (updateResult.modifiedCount === 0) {
    return { status: 404, message: 'No matching stage found to update' };
  }

  // Create log
  await createLogManually(
    req,
    `Updated payment stage for siteID ${siteID}: Stage "${oldStage}" → "${
      newStage || oldStage
    }", Payment "${oldPayment}" → "${newPayment || oldPayment}"`,
    siteID,
    null,
    session
  );

  return { status: 200, message: 'Payment stage point updated successfully' };
}

exports.addNewPaymentStagePointById = async (req, res) => {
  const { id, newPayment, newStage, siteID } = req.body;
  const session = await mongoose.startSession();

  const newObj = {
    payment: parseFloat(newPayment),
    stage: newStage,
    paymentStatus: 'Not Due Yet',
    paymentDueDate: '',
    installments: [],
  };

  try {
    let responsePayload;

    await session.withTransaction(async () => {
      const updateResult = await PaymentStages.updateOne(
        { _id: id },
        { $push: { stages: newObj } },
        { session }
      );

      if (updateResult.modifiedCount === 0) {
        responsePayload = {
          status: 404,
          message: 'No matching record found to update',
        };
        await session.abortTransaction();
        return;
      }

      await createLogManually(
        req,
        req.user?._id,
        `Added new payment stage point "${newStage}" with amount ${newPayment} for siteID ${siteID}.`,
        siteID,
        null,
        session
      );

      responsePayload = {
        status: 200,
        message: 'New payment stage added successfully',
      };
    });

    return res.status(responsePayload.status).json(responsePayload);
  } catch (err) {
    console.error('Error adding payment stage point:', err);
    return res.status(500).json({
      status: 500,
      message: 'Error adding payment stage',
      error: err.message,
    });
  } finally {
    session.endSession();
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
