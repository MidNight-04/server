const Log = require('../models/projectLog.model');

exports.createLog = logInput => async (req, res, next) => {
  try {
    const userId = req.body?.userId || req.userId || req.user?._id;
    const logMessage =
      typeof logInput === 'function' ? await logInput(req, res) : logInput;

    if (!logMessage) {
      console.warn('createLog: No log message provided.');
      return next();
    }

    const log = new Log({
      log: logMessage,
      userId,
      siteID: req.body?.projectId || req.body?.siteID,
      date: new Date(),
    });


    // await log.save();
    next();
  } catch (err) {
    console.error('Error creating log:', err);
    next(err);
  }
};

exports.createLogManually = async (req, logMessage, siteId, taskId) => {
  try {
    if (!logMessage) {
      console.warn('createLogManually: Missing logMessage.');
      return;
    }
    const userId = req.body?.userId || req.userId || req.user?._id;
    const siteID = siteId || req.body?.projectId || req.body?.siteID;

    const log = new Log({
      log: logMessage,
      userId,
      siteID,
      taskId,
      date: new Date(),
    });

    await log.save();
  } catch (error) {
    console.error('Error creating log:', error.message);
  }
};
