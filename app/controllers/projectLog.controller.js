const db = require('../models');
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

exports.getAllLog = async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 20);
    const skip = (page - 1) * limit;

    const { search = '', filter = '', startDate, endDate } = req.query;

    // Base match for pre-lookup fields (only those in ProjectLog)
    const preLookupMatch = {};

    // Date filtering
    if (startDate || endDate) {
      preLookupMatch.createdAt = {};
      if (startDate) preLookupMatch.createdAt.$gte = new Date(startDate);
      if (endDate) preLookupMatch.createdAt.$lte = new Date(endDate);
    }

    // Category filter
    if (filter === 'task') {
      preLookupMatch.taskId = { $exists: true, $ne: null };
    } else if (filter === 'projects') {
      preLookupMatch.siteID = { $exists: true, $ne: null };
    } else if (filter === 'tickets') {
      preLookupMatch.ticketId = { $exists: true, $ne: null };
    } else if (filter === 'materials') {
      preLookupMatch.materialRequestId = { $exists: true, $ne: null };
    }

    const lookupUser = {
      $lookup: {
        from: 'users',
        localField: 'userId',
        foreignField: '_id',
        as: 'user',
      },
    };
    const unwindUser = {
      $unwind: { path: '$user', preserveNullAndEmptyArrays: true },
    };

    // Build post-lookup match (for search)
    const postLookupMatch = {};
    if (search) {
      postLookupMatch.$or = [
        { action: { $regex: search, $options: 'i' } },
        { siteID: { $regex: search, $options: 'i' } },
        { 'user.firstname': { $regex: search, $options: 'i' } },
        { 'user.lastname': { $regex: search, $options: 'i' } },
        { 'user.employeeId': { $regex: search, $options: 'i' } },
      ];
    }

    // Get paginated logs
    const logs = await ProjectLog.aggregate([
      { $match: preLookupMatch },
      lookupUser,
      unwindUser,
      ...(search ? [{ $match: postLookupMatch }] : []),
      { $sort: { createdAt: -1 } },
      { $skip: skip },
      { $limit: limit },
      {
        $project: {
          _id: 1,
          action: 1,
          log: 1,
          siteID: 1,
          taskId: 1,
          ticketId: 1,
          materialRequestId: 1,
          createdAt: 1,
          'user._id': 1,
          'user.firstname': 1,
          'user.lastname': 1,
          'user.employeeId': 1,
          'user.profileImage': 1,
        },
      },
    ]);

    // Accurate count (same filters, no skip/limit)
    const countPipeline = [
      { $match: preLookupMatch },
      lookupUser,
      unwindUser,
      ...(search ? [{ $match: postLookupMatch }] : []),
      { $count: 'total' },
    ];
    const countResult = await ProjectLog.aggregate(countPipeline);
    const total = countResult[0]?.total || 0;

    // Category counts (unfiltered)
    const [totalLogs, totalTasks, totalTickets, totalProjects, totalMaterials] =
      await Promise.all([
        ProjectLog.countDocuments(),
        ProjectLog.countDocuments({ taskId: { $exists: true, $ne: null } }),
        ProjectLog.countDocuments({ ticketId: { $exists: true, $ne: null } }),
        ProjectLog.countDocuments({ siteID: { $exists: true, $ne: null } }),
        ProjectLog.countDocuments({
          materialRequestId: { $exists: true, $ne: null },
        }),
      ]);

    // Response
    res.status(200).json({
      data: logs,
      pagination: {
        currentPage: page,
        totalPages: Math.ceil(total / limit),
        totalItems: total,
        nextPage: page * limit < total ? page + 1 : null,
      },
      counts: {
        totalLogs,
        totalTasks,
        totalTickets,
        totalProjects,
        totalMaterials,
      },
    });
  } catch (error) {
    console.error('Error fetching logs:', error);
    res.status(500).json({
      message: 'Error fetching logs',
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
