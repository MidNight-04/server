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
//     const limit = parseInt(req.query.limit) || 20;
//     const skip = (page - 1) * limit;

//     const total = await ProjectLog.countDocuments();
//     const logs = await ProjectLog.find({})
//       .sort({ createdAt: -1 })
//       .skip(skip)
//       .limit(limit)
//       .populate({
//         path: 'userId',
//         select: 'firstname lastname employeeId profileImage',
//       });

//     const hasNextPage = skip + logs.length < total;
//     return res.status(200).send({
//       data: logs,
//       nextPage: hasNextPage ? page + 1 : null,
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
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const search = req.query.search || '';
    const startDate = req.query.startDate
      ? new Date(req.query.startDate)
      : null;
    const endDate = req.query.endDate ? new Date(req.query.endDate) : null;

    // Build match conditions
    const matchConditions = [];

    // Global search
    if (search) {
      matchConditions.push({
        $or: [
          { action: { $regex: search, $options: 'i' } },
          { siteID: { $regex: search, $options: 'i' } },
          { 'user.firstname': { $regex: search, $options: 'i' } },
          { 'user.lastname': { $regex: search, $options: 'i' } },
          { 'user.employeeId': { $regex: search, $options: 'i' } },
        ],
      });
    }

    // Date filter
    if (startDate && endDate) {
      matchConditions.push({
        createdAt: { $gte: startDate, $lte: endDate },
      });
    } else if (startDate) {
      matchConditions.push({ createdAt: { $gte: startDate } });
    } else if (endDate) {
      matchConditions.push({ createdAt: { $lte: endDate } });
    }

    const matchStage =
      matchConditions.length > 0
        ? { $match: { $and: matchConditions } }
        : { $match: {} };

    // Aggregation pipeline
    const pipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      matchStage,
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          action: 1,
          log: 1,
          date: 1,
          siteID: 1,
          taskId: 1,
          ticketId: 1,
          createdAt: 1,
          updatedAt: 1,
          'user._id': 1,
          'user.firstname': 1,
          'user.lastname': 1,
          'user.employeeId': 1,
          'user.profileImage': 1,
        },
      },
    ];

    const logs = await ProjectLog.aggregate(pipeline);

    // Count total with same filters
    const countPipeline = [
      {
        $lookup: {
          from: 'users',
          localField: 'userId',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: { path: '$user', preserveNullAndEmptyArrays: true } },
      matchStage,
      { $count: 'total' },
    ];

    const countResult = await ProjectLog.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    const totalPages = Math.ceil(total / limit);
    const hasNextPage = page < totalPages;

    return res.status(200).send({
      data: logs,
      currentPage: page,
      nextPage: hasNextPage ? page + 1 : null,
      totalPages,
      totalItems: total,
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    return res.status(500).send({
      message: 'There was a problem in getting the list of logs',
      error: error.message,
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
