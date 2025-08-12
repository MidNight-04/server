const db = require('../models');
const config = require('../config/auth.config');
const ProjectLog = db.projectlogs;

exports.addLog = (req, res) => {
  let files = [];
  // console.log(req.files)
  if (req.files.file) {
    for (let i = 0; i < req.files.file.length; i++) {
      files.push(req.files.file[i].location);
    }
  }
  const log = {
    log: req.body.chatLog,
    file: files,
    date: req.body.date,
    siteID: req.body.siteID,
    member: {
      name: req.body.userName,
      Id: req.body.userId,
    },
  };
  // console.log(task)
  ProjectLog.create(log).then((logSave, err) => {
    if (err) {
      res.status(500).send({ message: 'There was problelm while create log' });
      return;
    } else {
      res.status(201).send({
        status: 201,
        message: 'Log created successfully',
        data: logSave,
      });
    }
  });
};

// exports.getAllLog = async (req, res) => {
//   try {
//     const page = parseInt(req.query.page) || 1;
//     const limit = parseInt(req.query.limit) || 10;
//     const skip = (page - 1) * limit;

//     const [logs, total] = await Promise.all([
//       ProjectLog.find({})
//         .sort({ createdAt: -1 })
//         .skip(skip)
//         .limit(limit)
//         .populate({
//           path: 'userId',
//           select: 'firstname lastname employeeId profileImage',
//         }),
//       ProjectLog.countDocuments(),
//     ]);

//     console.log({
//       message: 'Logs fetched successfully',
//       data: logs,
//       page,
//       totalPages: Math.ceil(total / limit),
//       totalLogs: total,
//     });

//     return res.status(200).send({
//       message: 'Logs fetched successfully',
//       data: logs,
//       page,
//       totalPages: Math.ceil(total / limit),
//       totalLogs: total,
//     });
//   } catch (error) {
//     console.error('Error fetching logs:', error);
//     return res.status(500).send({
//       message: 'There was a problem in getting the list of logs',
//     });
//   }
// };

exports.getAllLog = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ProjectLog.countDocuments();
    const logs = await ProjectLog.find({})
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'firstname lastname employeeId profileImage',
      });

    const hasNextPage = skip + logs.length < total;
    return res.status(200).send({
      data: logs,
      nextPage: hasNextPage ? page + 1 : null,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of logs',
    });
  }
};

exports.getLogBySiteId = async (req, res) => {
  try {
    const id = req.params.id;
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const skip = (page - 1) * limit;

    const total = await ProjectLog.countDocuments({ siteID: id });

    const logs = await ProjectLog.find({ siteID: id })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate({
        path: 'userId',
        select: 'firstname lastname employeeId profileImage',
      });

    const hasNextPage = skip + logs.length < total;

    return res.status(200).send({
      data: logs,
      nextPage: hasNextPage ? page + 1 : null,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of logs',
    });
  }
};
