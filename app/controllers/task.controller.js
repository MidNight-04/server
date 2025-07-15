const db = require('../models');
const Task = db.task;
const TaskComment = require('../models/taskCommentModel');
const Checklist = require('../models/projectCheckList.model');
const Project = db.projects;
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Ticket = require('../models/ticketModel');
const Client = require('../models/client.model');
const awsS3 = require('../middlewares/aws-s3');
// const { updateTaskAndReschedule } = require('../helper/schedule');
const {
  assignedNotification,
  clientUpdate,
  teamUpdate,
} = require('../helper/reminder');
const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');
const { sendTeamNotification } = require('../helper/notification');
const { activateNextSteps } = require('../helper/nextStepActivator');

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;
let formatedtoday = yyyy + '-' + mm + '-' + dd;

const limit = 10;

exports.addTask = async (req, res) => {
  try {
    const {
      title,
      description,
      member,
      assignedID,
      category,
      priority,
      repeatType,
      repeatTime,
      dueDate,
      reminder,
    } = req.body;

    // Upload files
    const images = await uploadToS3AndExtractUrls(req.files?.image, 'task');
    const files = await uploadToS3AndExtractUrls(req.files?.docs, 'task');
    const audio =
      (await uploadToS3AndExtractUrls(req.files?.audio, 'task'))?.[0] || null;

    // Create task object
    const task = {
      title,
      description,
      issueMember: member,
      assignedBy: assignedID,
      category,
      priority,
      isActive: true,
      assignedOn: new Date(),
      repeat: {
        repeatType,
        repeatTime,
      },
      dueDate,
      file: files,
      image: images,
      audio,
      reminder: JSON.parse(reminder),
    };

    // Fetch users
    const [assignedBy, issueMember] = await Promise.all([
      User.findById(assignedID),
      User.findById(member),
    ]);

    if (!assignedBy || !issueMember) {
      return res
        .status(404)
        .json({ message: 'Assigned or Issue user not found' });
    }

    const savedTask = await Task.create(task);

    assignedNotification({
      phone: issueMember.phone,
      assignedTo: issueMember.firstname + ' ' + issueMember?.lastname,
      assignedBy: assignedBy.firstname + ' ' + assignedBy?.lastname,
      category: task.category,
      taskName: task.title,
      description: task.description,
      priority: task.priority,
      assignedOn: new Date(),
      frequency:
        task.repeat.repeatType === 'norepeat' ? 'Once' : task.repeat.repeatType,
      dueDate: new Date(task.dueDate).toDateString(),
    });

    res.status(201).json({
      status: 201,
      message: 'Task created successfully',
      data: savedTask,
    });
  } catch (error) {
    console.error('Error creating task:', error);
    res
      .status(500)
      .json({ message: 'There was a problem while creating the task' });
  }
};

exports.getAllTask = (req, res) => {
  Task.find({})
    .limit(limit)
    .skip(limit * req.body.page)
    .sort({ createdAt: -1 })
    .populate(['issueMember', 'assignedBy'])
    .exec()
    .then((task, err) => {
      if (err) {
        res.status(500).send({
          message: 'There was a problem in getting the list of task',
        });
        return;
      }
      if (task) {
        res.status(200).send({
          message: 'List of tak fetched successfuly',
          data: task,
        });
      }
    });
  return;
};

exports.getTaskByEmployeeId = async (req, res) => {
  const { id } = req.params;
  const { page } = req.body;

  try {
    const tasks = await Task.find({ issueMember: id, isActive: true })
      .limit(limit)
      .skip(limit * page)
      .sort({ createdAt: -1 })
      .populate(['issueMember', 'assignedBy'])
      .exec();

    if (!tasks) {
      return res.status(404).send({
        message: 'No tasks found for the given employee ID',
      });
    }

    res.status(200).send({
      message: 'List of tasks fetched successfully',
      data: tasks,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Error while getting tasks by employee ID',
    });
  }
};

exports.taskUpdateByMember = async (req, res) => {
  const { status, date, id } = req.body;
  let updateFiles = [];
  // console.log(req.body)
  try {
    if (req.files.image) {
      for (let i = 0; i < req.files.image.length; i++) {
        updateFiles.push(req.files.image[i].location);
      }
    }
    const filter = { _id: id };
    const update = {
      $set: {
        'progress.status': status,
        'progress.date': date,
        'progress.image': updateFiles,
      },
    };
    // console.log(filter,update)
    const result = await Task.updateOne(filter, update);
    // console.log(result)
    if (result.matchedCount === 0) {
      // console.log('No document found with the given filter.');
      res.json({
        status: 200,
        message: 'No document found with the given data.',
      });
    } else {
      // console.log('Document updated successfully.');
      res.json({
        status: 200,
        message: 'Task updated successfully by Employee.',
      });
    }
  } catch (error) {
    // console.log(error)
    res.json({
      status: 400,
      message: 'Error while update task status by Employee',
    });
  }
};

exports.deleteTaskByAdmin = async (req, res) => {
  const id = req.params.id;
  // console.log("calllllllll")
  Task.deleteOne({ _id: id }, (err, dealer) => {
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

exports.taskUpdateByAdmin = async (req, res) => {
  const { status, date, id } = req.body;
  let updateFiles = [];
  // console.log(req.body)
  try {
    if (req.files.image) {
      for (let i = 0; i < req.files.image.length; i++) {
        updateFiles.push(req.files.image[i].location);
      }
    }
    const filter = { _id: id };
    const update = {
      $set: {
        'adminStatus.status': status,
        'adminStatus.date': date,
        'adminStatus.image': updateFiles,
      },
    };
    // console.log(filter,update)
    const result = await Task.updateOne(filter, update);
    // console.log(result)
    if (result.matchedCount === 0) {
      // console.log('No document found with the given filter.');
      res.json({
        status: 200,
        message: 'No document found with the given data.',
      });
    } else {
      // console.log('Document updated successfully.');
      res.json({
        status: 200,
        message: 'Task updated successfully by Admin.',
      });
    }
  } catch (error) {
    // console.log(error)
    res.json({
      status: 400,
      message: 'Error while update task status by Admin',
    });
  }
};

exports.getAllProjectTaskByClient = async (req, res) => {
  try {
    await Project.find({ client: req.params.id, isActive: true })
      .populate({
        path: 'openTicket',
        model: 'Tickets',
        populate: {
          path: 'assignMember',
          model: 'User',
          select: '_id name employeeID',
        },
      })
      .select({
        _id: 1,
        siteID: 1,
        openTicket: 1,
      })
      .lean()
      .exec()
      .then((ticket, err) => {
        if (err) {
          res.status(500).send({
            message: 'There was a problem in getting the list of task',
          });
          return;
        }
        if (ticket) {
          res.status(200).send({
            message: 'List of tak fetched successfuly',
            data: ticket,
          });
        }
      });
  } catch (error) {
    res.json({
      status: 400,
      message: 'Error while get task of client',
    });
  }
};

exports.getAllProjectTickets = async (req, res) => {
  try {
    const ticket = await Project.find().populate({
      path: 'openTicket',
      populate: {
        path: 'assignMember',
        model: 'User',
      },
    });
    if (ticket?.length > 0) {
      res.json({
        status: 200,
        data: ticket,
      });
    } else {
      res.json({
        status: 200,
        message: 'No ticket raised by client',
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: 'Error while get ticket of client',
    });
  }
};

exports.getTicketByTicketId = async (req, res) => {
  try {
    const { id } = req.params;
    const project = await Project.aggregate([
      {
        $match: {
          openTicket: mongoose.Types.ObjectId(id),
        },
      },
    ]);
    const ticket = await Ticket.findById(id)
      .populate('assignMember')
      .populate({
        path: 'comments',
        model: 'TaskComment',
      })
      .populate({
        path: 'assignedBy',
        model: 'clients',
      });

    if (!ticket) {
      return res.status(404).send({
        message: 'Ticket not found',
      });
    }
    // Check if we found any tickets
    if (ticket) {
      res.json({
        status: 200,
        data: {
          ticket,
          siteId: project.siteID,
        },
      });
    } else {
      res.json({
        status: 200,
        message: 'No ticket found',
        data: [],
      });
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(400).json({
      status: 400,
      message: 'Error while getting ticket',
    });
  }
};

exports.getAllProjectTaskByMember = async (req, res) => {
  try {
    const ticket = await Ticket.find({
      assignMember: mongoose.Types.ObjectId(req.params.id),
    }).populate([
      {
        path: 'assignMember',
        model: 'User',
      },
      {
        path: 'assignedBy',
        model: 'clients',
      },
    ]);
    if (ticket?.length > 0) {
      res.json({
        status: 200,
        data: ticket,
      });
    } else {
      res.json({
        status: 200,
        message: 'No ticket raised by client',
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: 'Error while get task of client',
    });
  }
};

exports.getTaskByid = async (req, res) => {
  try {
    const { id } = req.params;

    const task = await Task.findById(id)
      .populate([
        {
          path: 'assignedBy',
          model: 'User',
          select: '_id firstname lastname roles',
        },
        {
          path: 'issueMember',
          model: 'User',
          select: '_id firstname lastname roles',
        },
        {
          path: 'comments',
          options: { sort: { createdAt: -1 } },
          populate: { path: 'createdBy', model: 'User' },
        },
      ])
      .exec();

    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    res.status(200).send({
      message: 'Task fetched successfully',
      data: task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Error while getting task by id',
    });
  }
};

exports.searchTask = async (req, res) => {
  try {
    const { searchTerm } = req.params;
    const searchQuery = [
      { title: { $regex: searchTerm, $options: 'i' } },
      { description: { $regex: searchTerm, $options: 'i' } },
      { category: { $regex: searchTerm, $options: 'i' } },
      { priority: { $regex: searchTerm, $options: 'i' } },
      { 'assignedBy.name': { $regex: searchTerm, $options: 'i' } },
      { 'issueMember.name': { $regex: searchTerm, $options: 'i' } },
      { 'issueMember.employeeID': { $regex: searchTerm, $options: 'i' } },
      { 'assignedBy.employeeID': { $regex: searchTerm, $options: 'i' } },
      { 'repeat.repeatType': { $regex: searchTerm, $options: 'i' } },
      { 'progress.status': { $regex: searchTerm, $options: 'i' } },
    ];
    const task = await Task.find({ $or: searchQuery });
    if (task.length === 0) {
      return res.status(404).send({
        message: 'Task not found',
      });
    }
    res.status(200).send({
      message: 'Task fetched successfully',
      data: task,
    });
  } catch (error) {
    console.error(error);
    res.status(500).send({
      message: 'Error while getting task',
    });
  }
};

exports.taskAddComment = async (req, res) => {
  try {
    const { taskId, type, comment, userId, isWorking, material, workers } =
      req.body;

    if (!taskId || !type || !comment || !userId) {
      return res.status(400).send({ message: 'Required fields missing.' });
    }

    const task = await Task.findById(taskId).populate('issueMember');
    const member = await User.findById(userId);
    if (!task || !member)
      return res.status(404).send({ message: 'Task or user not found' });

    // Upload files
    const images = await uploadToS3AndExtractUrls(req.files?.image);
    const files = await uploadToS3AndExtractUrls(req.files?.docs);
    const audio =
      (await uploadToS3AndExtractUrls(req.files?.audio))?.[0] || null;

    // Notification logic
    if (task.category === 'Project') {
      const project = await Project.findOne({ siteID: task.siteID }).populate(
        'sr_engineer'
      );
      const sr = project?.sr_engineer?.[0];
      if (sr && sr !== userId) {
        sendTeamNotification({
          recipient: sr,
          sender: member.firstname + ' ' + member?.lastname,
          task,
        });
      }
    } else {
      const assignedBy = await User.findById(task.assignedBy);
      if (assignedBy && assignedBy._id.toString() !== userId) {
        sendTeamNotification({
          recipient: assignedBy,
          sender: member.firstname + ' ' + member?.lastname,
          task,
        });
      }

      const issueMember = task.issueMember;
      if (issueMember && issueMember._id.toString() !== userId) {
        sendTeamNotification({
          recipient: issueMember,
          sender: member.firstname + ' ' + member?.lastname,
          task,
        });
      }
    }

    // Handle completion step progression
    if (type === 'Complete') {
      const project = await Project.findOne({ siteID: task.siteID });
      if (project) await activateNextSteps(task, project);
    }

    // Task status updates
    if (type === 'Reopened') {
      task.status = 'In Progress';
    } else if (
      type === 'Complete' ||
      (type === 'In Progress' && task.status !== 'Overdue')
    ) {
      task.status = type;
    }

    // Create comment
    const newComment = {
      comment,
      type,
      createdBy: userId,
      taskId,
      images,
      audio,
      file: files,
    };

    if (type === 'In Progress') {
      newComment.siteDetails = {
        isWorking: isWorking === 'yes',
        materialAvailable: material === 'yes',
        workers,
      };
    }

    const savedComment = await TaskComment.create(newComment);
    if (!savedComment)
      return res.status(500).send({ message: 'Failed to save comment' });

    task.comments.push(savedComment._id);
    task.updatedOn = new Date().toISOString();
    await task.save();

    res.status(200).send({ message: 'Comment added successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error while adding comment' });
  }
};

exports.editTask = async (req, res) => {
  try {
    const { id, title, description, issueMember, dueDate } = req.body;
    const task = await Task.findById(id);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    task.title = title;
    task.description = description;
    task.issueMember = issueMember;
    task.dueDate = dueDate;
    await task.save();
    res.status(200).send({ message: 'Task updated successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error while updating task' });
  }
};

exports.deleteTaskCommentImage = async (req, res) => {
  try {
    const { commentId, imageUrl } = req.body;

    if (!commentId || !imageUrl) {
      return res.status(400).send({ message: 'Missing commentId or imageUrl' });
    }

    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).send({ message: 'Comment not found' });
    }

    const imageUrlParts = imageUrl.split('.com/');
    if (imageUrlParts.length < 2) {
      return res.status(400).send({ message: 'Invalid image URL format' });
    }

    // Delete the image from S3
    const imagePath = imageUrlParts[1];
    try {
      await awsS3.deleteFile(imagePath);
    } catch (s3Error) {
      console.error('S3 deletion error:', s3Error);
      return res
        .status(500)
        .send({ message: 'Failed to delete image from S3' });
    }

    const result = await TaskComment.updateOne(
      { _id: commentId },
      { $pull: { images: imageUrl } }
    );

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'Image not found in comment' });
    }

    res.status(200).send({ message: 'Comment image deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while deleting comment image' });
  }
};

exports.deleteTaskComment = async (req, res) => {
  try {
    const { commentId } = req.body;
    if (!commentId) {
      return res.status(400).send({ message: 'Missing commentId' });
    }
    const comment = await TaskComment.findById(commentId);
    if (!comment) {
      return res.status(404).send({ message: 'Comment not found' });
    }
    const result = await TaskComment.deleteOne({ _id: commentId });
    if (result.deletedCount === 0) {
      return res.status(404).send({ message: 'Comment not found' });
    }
    const task = await Task.findById(comment.taskId);
    if (task) {
      const update = { $pull: { comments: commentId } };
      await Task.updateOne({ _id: task._id }, update);
    }
    res.status(200).send({ message: 'Comment deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while deleting comment' });
  }
};

exports.approveTaskComment = async (req, res) => {
  try {
    const { commentId, userId, taskId, siteID } = req.body;
    if (!commentId) {
      return res.status(400).send({ message: 'Missing commentId' });
    }
    const comment = await TaskComment.findById(commentId).populate({
      path: 'createdBy',
      model: User,
    });
    if (!comment) {
      return res.status(404).send({ message: 'Comment not found' });
    }
    if (comment.approved.isApproved) {
      return res.status(400).send({ message: 'Comment already approved' });
    }
    const client = await Project.findOne({ siteID: siteID })
      .select('client')
      .populate('client');
    const task = await Task.findById(taskId);
    await TaskComment.updateOne(
      { _id: commentId },
      {
        $set: {
          'approved.isApproved': true,
          'approved.approvedBy': userId,
          'approved.approvedOn': Date.now(),
        },
      }
    );
    await clientUpdate({
      clientName: client.client.firstname,
      phone: client.client.phone,
      issueMember: comment.createdBy.name,
      taskName: task.title,
      status: task.status,
      dueDate: task.dueDate.toDateString() || task.createdAt.toDateString(),
      remarks: comment.comment,
    });
    res.status(200).send({ message: 'Comment approved successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while approving comment' });
  }
};

exports.reassignTask = async (req, res) => {
  try {
    const { taskId, userId, newAssigneeId } = req.body;
    const newAssignee = await User.findById(newAssigneeId);
    const comment = await TaskComment.create({
      taskId,
      type: 'Task Updated',
      comment: `Task reassigned to ${newAssignee.name}.`,
      createdBy: userId,
    });
    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          issueMember: newAssigneeId,
          'reassigned.isReassigned': true,
          'reassigned.assignedTo': newAssigneeId,
          'reassigned.assignedBy': userId,
          'reassigned.assignedOn': Date.now(),
        },
        $push: {
          comments: comment._id,
        },
      }
    );
    res.status(200).send({ message: 'Task reassigned successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while reassigning task' });
  }
};

exports.getTodayTaskById = async (req, res) => {
  const { start, end } = getTodayRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;

  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for today', page);
};

exports.getYesterdayTaskById = async (req, res) => {
  const { start, end } = getYesterdayRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for yesterday', page);
};

exports.getTomorrowTaskById = async (req, res) => {
  const { start, end } = getTomorrowRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for tomorrow', page);
};

exports.getThisWeekTaskById = async (req, res) => {
  const { start, end } = getWeekRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for this week', page);
};

exports.getLastWeekTaskById = async (req, res) => {
  const { start, end } = getWeekRange(-7);
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;
  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };

  if (userId) {
    query.issueMember = userId;
  }

  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for last week', page);
};

exports.nextWeekTaskById = async (req, res) => {
  const { start, end } = getWeekRange(7);
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for next week', page);
};

exports.thisMonthTaskById = async (req, res) => {
  const { start, end } = getMonthRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for this month', page);
};

exports.getLastMonthTaskById = async (req, res) => {
  const { start, end } = getMonthRange(-1);
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for last month', page);
};

exports.getNextMonthTaskById = async (req, res) => {
  const { start, end } = getMonthRange(1);
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }

  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for next month', page);
};

exports.getThisYearTaskById = async (req, res) => {
  const { start, end } = getYearRange();
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;
  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }
  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for this year', page);
};

exports.getLastYearTaskById = async (req, res) => {
  const { start, end } = getYearRange(-1);
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;
  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }
  const assignedTo = req.body?.assignedTo;
  if (assignedTo) {
    query.issueMember = assignedTo;
  }

  const category = req.body?.category;
  if (category) {
    query.category = category;
  }

  const repeatType = req.body?.repeat;
  if (repeatType) {
    query['repeat.repeatType'] = repeatType;
  }

  await fetchTasks(res, query, 'No tasks found for last year', page);
};

exports.getTaskByDateById = async (req, res) => {
  const { date } = req.params;
  const targetDate = new Date(date);
  const start = new Date(targetDate.setHours(0, 0, 0, 0));
  const end = new Date(targetDate.setHours(23, 59, 59, 999));
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }
  await fetchTasks(res, query, 'No tasks found for the given date', page);
};

exports.getTaskByDateRangeById = async (req, res) => {
  const { startDate, endDate } = req.params;
  const userId = req.body?.userId;
  const assignedBy = req.body?.assignedId;
  const page = req.body?.page;

  const query = {
    isActive: true,
    dueDate: { $gte: new Date(startDate), $lte: new Date(endDate) },
  };
  if (userId) {
    query.issueMember = userId;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }
  await fetchTasks(res, query, 'No tasks found for the given date range', page);
};
//add branch in task model and while creating task
exports.customFilters = async (req, res) => {
  const userId = req.body?.userId;
  const page = req.body?.page;
  const selectedCategory = req.body?.selectedCategory;
  const assignedBy = req.body?.assignedBy;
  const assignedTo = req.body?.assignedTo;
  const frequency = req.body?.frequency;
  const priority = req.body?.priority;
  const filter = req.body?.filter;
  const siteId = req.body?.siteId;
  const withComments = req.body?.withComments;
  const branch = req.body?.branch;

  let start;
  let end;

  switch (filter) {
    case 'Today':
      ({ start, end } = getTodayRange());
      break;
    case 'Yesterday':
      ({ start, end } = getYesterdayRange());
      break;
    case 'Tomorrow':
      ({ start, end } = getTomorrowRange());
      break;
    case 'This Week':
      ({ start, end } = getWeekRange());
      break;
    case 'Last Week':
      ({ start, end } = getWeekRange(-7));
      break;
    case 'Next Week':
      ({ start, end } = getWeekRange(7));
      break;
    case 'This Month':
      ({ start, end } = getMonthRange());
      break;
    case 'Last Month':
      ({ start, end } = getMonthRange(-1));
      break;
    case 'Next Month':
      ({ start, end } = getMonthRange(1));
      break;
    case 'This Year':
      ({ start, end } = getYearRange());
    // default:
    //   ({ start, end } = getWeekRange());
  }

  const query = {
    isActive: true,
    dueDate: { $gte: start, $lte: end },
  };

  if (userId) {
    query.issueMember = userId;
  }
  if (selectedCategory) {
    query.category = selectedCategory;
  }
  if (assignedBy) {
    query.assignedBy = assignedBy;
  }
  if (assignedTo) {
    query.issueMember = assignedTo;
  }
  if (frequency) {
    query['repeat.repeatType'] = frequency;
  }
  if (priority) {
    query.priority = priority;
  }
  if (withComments) {
    query.comments = { $exists: true, $not: { $size: 0 } };
  }
  if (siteId) {
    query.siteID = siteId;
  }
  if (branch) {
    query.branch = branch;
  }

  await fetchTasks(res, query, page);
};

const getTodayRange = () => {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getYesterdayRange = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  yesterday.setHours(0, 0, 0, 0);
  const end = new Date(yesterday);
  end.setHours(23, 59, 59, 999);
  return { start: yesterday, end };
};

const getTomorrowRange = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  tomorrow.setHours(0, 0, 0, 0);
  const end = new Date(tomorrow);
  end.setHours(23, 59, 59, 999);
  return { start: tomorrow, end };
};

const getWeekRange = (offset = 0) => {
  const today = new Date();
  const currentDay = today.getDay();
  const start = new Date(today);
  start.setDate(today.getDate() - currentDay + offset * 7);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(start.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getMonthRange = (offset = 0) => {
  const today = new Date();
  const start = new Date(today.getFullYear(), today.getMonth() + offset, 1);
  const end = new Date(today.getFullYear(), today.getMonth() + offset + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

const getYearRange = (offset = 0) => {
  const now = new Date();
  const year = now.getFullYear() + offset;
  const start = new Date(year, 3, 1, 0, 0, 0, 0); // April 1 of current year
  const end = new Date(year + 1, 2, 31, 23, 59, 59, 999); // March 31 of next year
  return { start, end };
};

const fetchTasks = async (res, filters, page = 0, limit = 10) => {
  try {
    // const tasks = await Task.find(filters)
    //   .sort({ dueDate: 1 })
    //   .limit(limit)
    //   .skip(limit * page)
    //   .populate(['issueMember', 'assignedBy'])
    //   .exec();
    const tasks = await Task.find(filters)
      .sort({ dueDate: 1 })
      .populate([
        {
          path: 'assignedBy',
          model: 'User',
          select: '_id firstname lastname roles',
        },
        {
          path: 'issueMember',
          model: 'User',
          select: '_id firstname lastname roles',
        },
        'comments',
        {
          path: 'comments',
          populate: {
            path: 'createdBy',
          },
        },
      ])
      .exec();

    res.status(200).send(tasks);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while fetching tasks' });
  }
};

exports.getTask = async (req, res) => {
  const task = await Task.find({
    isActive: true,
    comments: { $exists: true, $not: { $size: 0 } },
  }).populate([
    'issueMember',
    'assignedBy',
    'comments',
    {
      path: 'comments',
      populate: {
        path: 'createdBy',
      },
    },
  ]);
  res.status(200).send(task);
};

exports.customDashboardFilters = async (req, res) => {
  try {
    const userId = req.body?.userId;
    const page = req.body?.page;
    const selectedCategory = req.body?.selectedCategory;
    const assignedBy = req.body?.assignedBy;
    const assignedTo = req.body?.assignedTo;
    const frequency = req.body?.frequency;
    const priority = req.body?.priority;
    const filter = req.body?.filter;
    const siteId = req.body?.siteId;
    const branch = req.body?.branch;

    let start;
    let end;

    switch (filter) {
      case 'Today':
        ({ start, end } = getTodayRange());
        break;
      case 'Yesterday':
        ({ start, end } = getYesterdayRange());
        break;
      case 'Tomorrow':
        ({ start, end } = getTomorrowRange());
        break;
      case 'This Week':
        ({ start, end } = getWeekRange());
        break;
      case 'Last Week':
        ({ start, end } = getWeekRange(-7));
        break;
      case 'Next Week':
        ({ start, end } = getWeekRange(7));
        break;
      case 'This Month':
        ({ start, end } = getMonthRange());
        break;
      case 'Last Month':
        ({ start, end } = getMonthRange(-1));
        break;
      case 'Next Month':
        ({ start, end } = getMonthRange(1));
        break;
      case 'This Year':
        ({ start, end } = getYearRange());
      default:
        ({ start, end } = getWeekRange());
    }

    const query = {
      isActive: true,
      // status:"In Progress",
      dueDate: { $gte: start, $lte: end },
      siteID: { $exists: true },
    };

    if (userId) {
      query.issueMember = userId;
    }
    if (selectedCategory) {
      query.category = selectedCategory;
    }
    if (assignedBy) {
      query.assignedBy = assignedBy;
    }
    if (assignedTo) {
      query.issueMember = assignedTo;
    }
    if (frequency) {
      query['repeat.repeatType'] = frequency;
    }
    if (priority) {
      query.priority = priority;
    }
    // if (withComments) {
    //   query.comments = { $exists: true, $not: { $size: 0 } };
    // }
    if (siteId) {
      query.siteID = siteId;
    }

    if (branch) {
      query.branch = branch;
    }

    await fetchTasks(res, query, page);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while fetching tasks' });
  }
};

// exports.delegatedTasks = async (req, res) => {
//   try {
//     const userId = req.body?.userId;
//     const page = req.body?.page;
//     const selectedCategory = req.body?.selectedCategory;
//     const assignedBy = req.body?.assignedBy;
//     const assignedTo = req.body?.assignedTo;
//     const frequency = req.body?.frequency;
//     const priority = req.body?.priority;
//     const filter = req.body?.filter;
//     const siteId = req.body?.siteId;
//     const branch = req.body?.branch;

//     let start;
//     let end;

//     switch (filter) {
//       case 'Today':
//         ({ start, end } = getTodayRange());
//         break;
//       case 'Yesterday':
//         ({ start, end } = getYesterdayRange());
//         break;
//       case 'Tomorrow':
//         ({ start, end } = getTomorrowRange());
//         break;
//       case 'This Week':
//         ({ start, end } = getWeekRange());
//         break;
//       case 'Last Week':
//         ({ start, end } = getWeekRange(-7));
//         break;
//       case 'Next Week':
//         ({ start, end } = getWeekRange(7));
//         break;
//       case 'This Month':
//         ({ start, end } = getMonthRange());
//         break;
//       case 'Last Month':
//         ({ start, end } = getMonthRange(-1));
//         break;
//       case 'Next Month':
//         ({ start, end } = getMonthRange(1));
//         break;
//       case 'This Year':
//         ({ start, end } = getYearRange());
//       default:
//         ({ start, end } = getWeekRange());
//     }

//     const query = {
//       isActive: true,
//       dueDate: { $gte: start, $lte: end },
//     };

//     if (userId) {
//       query.assignedBy = userId;
//     }
//     if (selectedCategory) {
//       query.category = selectedCategory;
//     }
//     if (assignedBy) {
//       query.assignedBy = assignedBy;
//     }
//     if (assignedTo) {
//       query.issueMember = assignedTo;
//     }
//     if (frequency) {
//       query['repeat.repeatType'] = frequency;
//     }
//     if (priority) {
//       query.priority = priority;
//     }
//     if (siteId) {
//       query.siteID = siteId;
//     }

//     if (branch) {
//       query.branch = branch;
//     }

//     await fetchTasks(res, query, page);
//   } catch (error) {
//     console.error('Server error:', error);
//     res.status(500).send({ message: 'Error while fetching tasks' });
//   }
// };

const PAGE_SIZE = 10;

exports.delegatedTasks = async (req, res) => {
  try {
    const {
      userId,
      page = 1,
      selectedCategory,
      assignedBy,
      assignedTo,
      frequency,
      priority,
      filter,
      siteId,
      branch,
    } = req.body;

    let start, end;

    switch (filter) {
      case 'Today':
        ({ start, end } = getTodayRange());
        break;
      case 'Yesterday':
        ({ start, end } = getYesterdayRange());
        break;
      case 'Tomorrow':
        ({ start, end } = getTomorrowRange());
        break;
      case 'This Week':
        ({ start, end } = getWeekRange());
        break;
      case 'Last Week':
        ({ start, end } = getWeekRange(-7));
        break;
      case 'Next Week':
        ({ start, end } = getWeekRange(7));
        break;
      case 'This Month':
        ({ start, end } = getMonthRange());
        break;
      case 'Last Month':
        ({ start, end } = getMonthRange(-1));
        break;
      case 'Next Month':
        ({ start, end } = getMonthRange(1));
        break;
      case 'This Year':
        ({ start, end } = getYearRange());
        break;
      default:
        ({ start, end } = getWeekRange());
    }

    const query = {
      isActive: true,
      dueDate: { $gte: start, $lte: end },
    };

    if (userId) query.assignedBy = userId;
    if (selectedCategory) query.category = selectedCategory;
    if (assignedBy) query.assignedBy = assignedBy;
    if (assignedTo) query.issueMember = assignedTo;
    if (frequency) query['repeat.repeatType'] = frequency;
    if (priority) query.priority = priority;
    if (siteId) query.siteID = siteId;
    if (branch) query.branch = branch;

    const skip = (page - 1) * PAGE_SIZE;

    const [tasks, total] = await Promise.all([
      Task.find(query)
        .sort({ dueDate: 1 })
        .skip(skip)
        .limit(PAGE_SIZE)
        .populate([
          {
            path: 'assignedBy',
            model: 'User',
            select: '_id firstname lastname roles',
          },
          {
            path: 'issueMember',
            model: 'User',
            select: '_id firstname lastname roles',
          },
          'comments',
          {
            path: 'comments',
            populate: {
              path: 'createdBy',
            },
          },
        ]),
      Task.countDocuments(query),
    ]);

    const hasMore = skip + tasks.length < total;

    return res.status(200).json({
      tasks,
      hasMore,
      page,
    });
  } catch (error) {
    console.error('Server error:', error);
    return res.status(500).json({ message: 'Error while fetching tasks' });
  }
};

exports.addChecklist = async (req, res) => {
  try {
    const { taskId, checklistId } = req.body;
    const checklist = await Checklist.findById(checklistId);
    if (!checklist) {
      return res.status(404).send({ message: 'Checklist not found' });
    }
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    const checklistItems = checklist.checkList.map(item => ({
      heading: item.heading,
      points: item.points.map(point => ({
        ...point,
        isChecked: null,
        image: '',
      })),
    }));

    const checklistDetails = {
      id: checklist._id,
      step: checklist.checkListStep,
      name: checklist.name,
      number: checklist.checkListNumber,
      items: checklistItems,
    };

    if (task.checkList.id === checklist._id) {
      return res
        .status(400)
        .send({ message: 'Checklist already assigned to task' });
    }
    if (task.checkList.id !== checklist._id) {
      await Task.updateOne(
        { _id: taskId },
        {
          $set: {
            checkList: checklistDetails,
          },
        }
      );
      res.send({ message: 'Checklist Added successfully' });
    }
  } catch (error) {
    console.error('Error adding checklist:', error);
    res.status(500).send({ message: 'Error adding checklist' });
  }
};

exports.updateChecklistPoint = async (req, res) => {
  try {
    const { taskId, updatedChecklist } = req.body;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          checkList: updatedChecklist,
        },
      }
    );
    res.send({ message: 'Checklist updated successfully' });
  } catch (error) {
    console.error('Error updating checklist:', error);
    res.status(500).send({ message: 'Error updating checklist' });
  }
};

exports.deleteChecklist = async (req, res) => {
  try {
    const { taskId } = req.body;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          checkList: {},
        },
      }
    );
    res.send({ message: 'Checklist deleted successfully' });
  } catch (error) {
    console.error('Error deleting checklist:', error);
    res.status(500).send({ message: 'Error deleting checklist' });
  }
};

exports.manuallyCloseTask = async (req, res) => {
  try {
    const { taskId, date } = req.body;

    const task = await Task.findById(taskId);

    const project = await Project.findOne({ siteID: task.siteID });
    if (project) {
      const projectStatuses = project.project_status;

      for (let i = 0; i < projectStatuses.length; i++) {
        const projectStatus = projectStatuses[i];

        for (let j = 0; j < projectStatus.step.length; j++) {
          const step = projectStatus.step[j];

          if (step.taskId.toString() === task._id.toString()) {
            const today = new Date();

            const activateTask = async taskId => {
              const taskToActivate = await Task.findById(taskId);
              if (taskToActivate) {
                const dueDate = new Date(today);
                dueDate.setDate(today.getDate() + taskToActivate.duration);
                await Task.findByIdAndUpdate(
                  taskId,
                  {
                    $set: {
                      isActive: true,
                      assignedOn: today,
                      dueDate: dueDate,
                    },
                  },
                  { new: true }
                );
              }
            };

            // Find next steps
            let nextStep = projectStatus.step[j + 1];
            let nextNextStep = projectStatus.step[j + 2];

            // If no nextStep, try from next projectStatus
            if (!nextStep && projectStatuses[i + 1]) {
              nextStep = projectStatuses[i + 1].step[0];
            }
            // If no nextNextStep, try from next projectStatus
            if (
              projectStatus.step[j + 1] &&
              !projectStatus.step[j + 2] &&
              projectStatuses[i + 1]
            ) {
              nextNextStep = projectStatuses[i + 1].step[0];
            }

            // If no nextNextStep, try second step from next projectStatus
            if (!nextNextStep && projectStatuses[i + 1]) {
              nextNextStep = projectStatuses[i + 1].step[1];
            }

            // Activate steps if available
            if (nextStep?.taskId) {
              await activateTask(nextStep.taskId);
            }
            if (nextNextStep?.taskId) {
              await activateTask(nextNextStep.taskId);
            }

            break; // Found the task, no need to continue
          }
        }
      }
    }

    task.status = 'Complete';
    task.updatedOn = new Date(date).toISOString();
    await task.save();
    res.status(200).send({ message: 'Task Closed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error while adding comment' });
  }
};
