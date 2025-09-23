const db = require('../models');
const Task = db.task;
const TaskComment = require('../models/taskCommentModel');
const Checklist = require('../models/projectCheckList.model');
const Project = db.projects;
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Ticket = require('../models/ticketModel');
const awsS3 = require('../middlewares/aws-s3');
const Joi = require('joi');
// const { updateTaskAndReschedule } = require('../helper/schedule');
const {
  assignedNotification,
  clientUpdate,
  teamUpdate,
} = require('../helper/reminder');
const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');
const { sendTeamNotification } = require('../helper/notification');
const { activateNextSteps } = require('../helper/nextStepActivator');
const { createLogManually } = require('../middlewares/createLog');
const { getDateRange } = require('../helper/dateRange');
const { groupTasksByDate } = require('../utils/groupTask');

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

    await createLogManually(
      req,
      `Created task ${task.title}, ${task.description} assigned to ${
        issueMember.firstname + ' ' + issueMember?.lastname
      } with priority ${task.priority} and category ${
        task.category
      } and due date ${new Date(task.dueDate).toDateString({
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })}`,
      task?.siteID,
      savedTask?._id
    );

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

    const ticket = await Ticket.findById(id)
      .populate({
        path: 'assignMember assignedBy',
        select:
          '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        populate: {
          path: 'roles',
          model: 'Role',
          select: 'name',
        },
      })
      .populate({
        path: 'comments',
        model: 'TaskComment',
        options: { sort: { createdAt: -1 } },
        populate: {
          path: 'createdBy',
          model: 'User',
          select:
            '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        },
      })
      .lean(); // improves performance if not modifying doc

    if (!ticket) {
      return res.status(404).json({
        status: 404,
        message: 'Ticket not found',
      });
    }

    return res.status(200).json({
      status: 200,
      data: {
        ticket,
        siteId: ticket.siteID,
      },
    });
  } catch (error) {
    console.error('Error fetching ticket:', error);
    return res.status(500).json({
      status: 500,
      message: 'Error while getting ticket',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
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

// Validation schema (Joi)
const commentSchema = Joi.object({
  taskId: Joi.string().required(),
  type: Joi.string()
    .valid(
      'In Progress',
      'Complete',
      'Comment',
      'Closed',
      'Reopened',
      'Task Updated'
    )
    .required(),
  comment: Joi.string().allow('').optional(),
  userId: Joi.string().required(),
  isWorking: Joi.string().valid('yes', 'no').optional(),
  material: Joi.string().valid('yes', 'no').optional(),
  workers: Joi.number().min(0).optional(),
});

// Allowed mimetypes
const IMAGE_MIMES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
const DOC_MIMES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'text/plain',
  'application/zip',
];

// File helpers
function normalizeAndFilterFiles(fileItem) {
  if (!fileItem) return [];
  return Array.isArray(fileItem) ? fileItem : [fileItem];
}
function filterImages(files) {
  return normalizeAndFilterFiles(files).filter(f =>
    IMAGE_MIMES.includes(f.mimetype)
  );
}
function filterDocs(files) {
  return normalizeAndFilterFiles(files).filter(f =>
    DOC_MIMES.includes(f.mimetype)
  );
}
function filterAudio(files) {
  return normalizeAndFilterFiles(files).filter(f =>
    f.mimetype?.startsWith('audio/')
  );
}

exports.taskAddComment = async (req, res) => {
  let session;
  try {
    // ✅ Validate body with Joi
    const { error, value } = commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });

    if (error) {
      return res.status(400).send({
        message: 'Validation error',
        errors: error.details.map(d => d.message),
      });
    }

    const {
      taskId,
      type,
      comment = '',
      userId,
      isWorking,
      material,
      workers,
    } = value;

    // Ensure task & user exist
    const task = await Task.findById(taskId).populate('issueMember');
    const member = await User.findById(userId);
    if (!task || !member) {
      return res.status(404).send({ message: 'Task or user not found' });
    }

    // ---- File upload (validate + upload) ----
    const imageFiles = filterImages(req.files?.image);
    const docFiles = filterDocs(req.files?.docs);
    const audioFiles = filterAudio(req.files?.audio);

    const images =
      imageFiles.length > 0 ? await uploadToS3AndExtractUrls(imageFiles) : [];
    const files =
      docFiles.length > 0 ? await uploadToS3AndExtractUrls(docFiles) : [];
    const audio =
      audioFiles.length > 0
        ? (await uploadToS3AndExtractUrls(audioFiles))?.[0] ?? null
        : null;

    const senderName = `${member.firstname || ''} ${
      member.lastname || ''
    }`.trim();

    // Queue notifications (send after commit)
    const notificationQueue = [];

    if (task.category === 'Project') {
      const project = await Project.findOne({ siteID: task.siteID }).populate(
        'sr_engineer'
      );
      const sr = project?.sr_engineer?.[0];
      if (sr && sr.toString() !== userId) {
        notificationQueue.push({
          recipient: sr,
          sender: senderName,
          taskId: task._id,
        });
      }
    } else {
      if (task.assignedBy) {
        const assignedBy = await User.findById(task.assignedBy);
        if (assignedBy && assignedBy._id.toString() !== userId) {
          notificationQueue.push({
            recipient: assignedBy._id,
            sender: senderName,
            taskId: task._id,
          });
        }
      }
      if (task.issueMember && task.issueMember._id.toString() !== userId) {
        notificationQueue.push({
          recipient: task.issueMember._id,
          sender: senderName,
          taskId: task._id,
        });
      }
    }

    // ---- Transaction ----
    session = await mongoose.startSession();
    session.startTransaction();

    const taskInSession = await Task.findById(taskId).session(session);
    if (!taskInSession) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .send({ message: 'Task not found (during transaction)' });
    }

    // ✅ Handle completion progression
    if (type === 'Complete') {
      const project = await Project.findOne({
        siteID: taskInSession.siteID,
      }).session(session);
      if (project) {
        const allSteps = project.project_status.flatMap(ps => ps.step || []);
        const idx = allSteps.findIndex(
          s => s.taskId?.toString() === taskInSession._id.toString()
        );

        if (idx !== -1) {
          const nextSteps = allSteps.slice(idx + 1, idx + 3);
          const today = new Date();
          for (const step of nextSteps) {
            if (!step?.taskId) continue;
            const t = await Task.findById(step.taskId).session(session);
            if (t && !t.isActive) {
              const dueDate = new Date(today);
              dueDate.setDate(today.getDate() + (t.duration || 0));
              await Task.findByIdAndUpdate(
                step.taskId,
                { $set: { isActive: true, assignedOn: today, dueDate } },
                { session }
              );
            }
          }
        }
        taskInSession.completedOn = new Date();
      }
    }

    // ✅ Task status updates
    if (type === 'Reopened') {
      taskInSession.status = 'In Progress';
    } else if (
      type === 'Complete' ||
      (type === 'In Progress' && taskInSession.status !== 'Overdue')
    ) {
      taskInSession.status = type;
    }

    // ✅ Build comment
    const newCommentObj = {
      comment: comment.trim(),
      type,
      createdBy: userId,
      taskId,
      images,
      audio,
      file: files,
    };

    if (type === 'In Progress') {
      if (!taskInSession.isActive) {
        taskInSession.isActive = true;
        taskInSession.assignedOn = new Date();
        const due = new Date();
        due.setDate(due.getDate() + (taskInSession.duration || 0));
        taskInSession.dueDate = due;
      }
      newCommentObj.siteDetails = {
        isWorking: isWorking === 'yes',
        materialAvailable: material === 'yes',
        workers: workers ?? null,
      };
    }

    const createdComment = await TaskComment.create([newCommentObj], {
      session,
    });
    const savedComment = createdComment[0];

    taskInSession.comments.push(savedComment._id);
    taskInSession.updatedOn = new Date();
    await taskInSession.save({ session });

    // ✅ Logging
    const logParts = ['Added new comment'];
    if (comment.trim()) logParts.push(`text: "${comment}"`);
    if (images.length > 0) logParts.push(`+ ${images.length} image(s)`);
    if (files.length > 0) logParts.push(`+ ${files.length} file(s)`);
    if (audio) logParts.push(`+ audio`);

    await createLogManually(req, logParts.join(', '), task.siteID, task._id);

    await session.commitTransaction();
    session.endSession();

    // ✅ Send notifications after commit
    for (const n of notificationQueue) {
      try {
        await sendTeamNotification({
          recipient: n.recipient,
          sender: n.sender,
          task: taskInSession,
        });
      } catch (err) {
        console.error('Notification error (post-commit):', err);
      }
    }

    res.status(200).send({
      message: 'Comment added successfully',
      comment: savedComment,
      task: {
        _id: taskInSession._id,
        status: taskInSession.status,
        isActive: taskInSession.isActive,
        assignedOn: taskInSession.assignedOn,
        dueDate: taskInSession.dueDate,
        updatedOn: taskInSession.updatedOn,
      },
    });
  } catch (error) {
    console.error('Error adding comment:', error);
    try {
      if (session && session.inTransaction()) {
        await session.abortTransaction();
        session.endSession();
      }
    } catch (abortErr) {
      console.error('Error aborting transaction:', abortErr);
    }
    res
      .status(500)
      .send({ message: 'Error while adding comment', error: error.message });
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

    const task = await Task.findById(comment.taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
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

    await createLogManually(
      req,
      `Deleted task comment image of comment: ${comment.comment}  task name: ${task.title} project name: ${task.siteID}`,
      task?.siteID,
      task?._id
    );

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
    await createLogManually(
      req,
      `Deleted task comment ${comment.comment} of task ${task.title} of project ${task.siteID}`,
      task?.siteID,
      task?._id
    );
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
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
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
    await createLogManually(
      req,
      `Approved task comment ${comment.comment} of task ${task.title} of project ${task.siteID}`,
      task?.siteID,
      task?._id
    );
    res.status(200).send({ message: 'Comment approved successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while approving comment' });
  }
};

exports.reassignTask = async (req, res) => {
  try {
    const { taskId, userId, newAssigneeId } = req.body;
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }
    const newAssignee = await User.findById(newAssigneeId);
    const comment = await TaskComment.create({
      taskId,
      type: 'Task Updated',
      comment: `Task reassigned to ${newAssignee.firstname} ${newAssignee.lastname}.`,
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
    await createLogManually(
      req,
      `Reassigned task ${task.title} of project ${task.siteID} to ${newAssignee.firstname} ${newAssignee.lastname} (${newAssignee.employeeID})`,
      task?.siteID,
      task?._id
    );
    res.status(200).send({ message: 'Task reassigned successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while reassigning task' });
  }
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

exports.customFilters = async (req, res) => {
  try {
    const {
      userId,
      page = 0,
      limit = 10,
      selectedCategory,
      assignedBy,
      assignedTo,
      frequency,
      priority,
      filter,
      siteId,
      withComments,
      branch,
    } = req.body;

    const { start, end } = getDateRange(filter);

    // --- Build match conditions ---
    const match = { isActive: true, dueDate: { $gte: start, $lte: end } };

    if (userId && assignedTo) match.issueMember = { $in: [userId, assignedTo] };
    else if (userId) match.issueMember = userId;
    else if (assignedTo) match.issueMember = assignedTo;

    if (selectedCategory) match.category = selectedCategory;
    if (assignedBy) match.assignedBy = assignedBy;
    if (frequency) match['repeat.repeatType'] = frequency;
    if (priority) match.priority = priority;
    if (withComments) match.comments = { $exists: true, $not: { $size: 0 } };
    if (siteId) match.siteID = siteId;
    if (branch) match.branch = branch;

    // --- Aggregation pipeline ---
    const pipeline = [
      { $match: match },

      // Lookup users
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'assignedBy',
        },
      },
      { $unwind: { path: '$assignedBy', preserveNullAndEmptyArrays: true } },

      {
        $lookup: {
          from: 'users',
          localField: 'issueMember',
          foreignField: '_id',
          as: 'issueMember',
        },
      },
      { $unwind: { path: '$issueMember', preserveNullAndEmptyArrays: true } },

      // Lookup comments
      {
        $lookup: {
          from: 'comments',
          localField: 'comments',
          foreignField: '_id',
          as: 'comments',
        },
      },

      // --- Safe date conversion and computed fields ---
      {
        $addFields: {
          updatedDate: {
            $convert: {
              input: { $ifNull: ['$updatedOn', '$updatedAt'] },
              to: 'date',
              onError: new Date(0),
              onNull: new Date(0),
            },
          },
          dueDateSafe: {
            $convert: {
              input: '$dueDate',
              to: 'date',
              onError: new Date(0),
              onNull: new Date(0),
            },
          },
          employeeName: {
            $concat: [
              { $ifNull: ['$issueMember.firstname', ''] },
              ' ',
              { $ifNull: ['$issueMember.lastname', ''] },
            ],
          },
        },
      },
      {
        $addFields: {
          month: {
            $dateToString: { date: '$updatedDate', format: '%B %Y' },
          },
          date: {
            $dateToString: { date: '$updatedDate', format: '%B %d, %Y' },
          },
          inTime: {
            $cond: [
              {
                $and: [
                  { $eq: ['$status', 'Complete'] },
                  { $lte: ['$updatedDate', '$dueDateSafe'] },
                ],
              },
              true,
              false,
            ],
          },
        },
      },

      // --- Facet for pagination, counts, and groupings ---
      {
        $facet: {
          paginatedTasks: [
            { $sort: { dueDateSafe: 1 } },
            { $skip: page * limit },
            { $limit: limit },
          ],
          statusCounts: [
            {
              $group: {
                _id: null,
                Overdue: {
                  $sum: { $cond: [{ $eq: ['$status', 'Overdue'] }, 1, 0] },
                },
                Pending: {
                  $sum: { $cond: [{ $eq: ['$status', 'Pending'] }, 1, 0] },
                },
                InProgress: {
                  $sum: { $cond: [{ $eq: ['$status', 'In Progress'] }, 1, 0] },
                },
                Complete: {
                  $sum: { $cond: [{ $eq: ['$status', 'Complete'] }, 1, 0] },
                },
                InTime: {
                  $sum: {
                    $cond: [
                      { $and: [{ $eq: ['$status', 'Complete'] }, '$inTime'] },
                      1,
                      0,
                    ],
                  },
                },
                Delayed: {
                  $sum: {
                    $cond: [
                      {
                        $and: [
                          { $eq: ['$status', 'Complete'] },
                          { $not: '$inTime' },
                        ],
                      },
                      1,
                      0,
                    ],
                  },
                },
              },
            },
          ],
          groupedByMonth: [
            {
              $group: {
                _id: '$month',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
          groupedByDate: [
            {
              $group: {
                _id: '$date',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
          groupedByEmployee: [
            {
              $group: {
                _id: '$employeeName',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
          groupedByCategory: [
            {
              $group: {
                _id: '$category',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
          groupedByCategoryAndUserId: [
            {
              $match: {
                'issueMember._id': userId
                  ? new mongoose.Types.ObjectId(userId)
                  : null,
              },
            },
            {
              $group: {
                _id: '$category',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
          groupedByOverdueByEmployee: [
            { $match: { status: 'Overdue' } },
            {
              $group: {
                _id: '$employeeName',
                tasks: { $push: '$$ROOT' },
              },
            },
          ],
        },
      },
    ];

    const result = await Task.aggregate(pipeline).exec();
    const data = result[0] || {};

    res.status(200).json({
      tasks: data.paginatedTasks || [],
      statusCounts: data.statusCounts?.[0] || {},
      groupedData: {
        groupedByMonth: (data.groupedByMonth || []).map(g => ({
          month: g._id,
          obj: g.tasks,
        })),
        groupedByDate: (data.groupedByDate || []).map(g => ({
          date: g._id,
          obj: g.tasks,
        })),
        groupedByEmployee: (data.groupedByEmployee || []).map(g => ({
          employee: g._id,
          obj: g.tasks,
        })),
        groupedByCategory: (data.groupedByCategory || []).map(g => ({
          category: g._id,
          obj: g.tasks,
        })),
        groupedByCategoryAndUserId: (data.groupedByCategoryAndUserId || []).map(
          g => ({
            category: g._id,
            userId,
            obj: g.tasks,
          })
        ),
        groupedByOverdueByEmployee: (data.groupedByOverdueByEmployee || []).map(
          g => ({
            employee: g._id,
            obj: g.tasks,
          })
        ),
      },
    });
  } catch (error) {
    console.error('Error in customFilters:', error);
    res.status(500).json({ message: 'Server error while fetching tasks' });
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
    } = req.body || {};

    const { start, end } = getDateRange(filter);

    // Base query
    const query = {
      isActive: true,
      dueDate: { $gte: start, $lte: end },
      siteID: { $exists: true },
      category: 'Project',
    };

    // Dynamically add filters
    const filters = {
      ...(userId && { issueMember: userId }),
      ...(selectedCategory && { category: selectedCategory }),
      ...(assignedBy && { assignedBy }),
      ...(assignedTo && { issueMember: assignedTo }), // NOTE: overrides userId if both exist
      ...(frequency && { 'repeat.repeatType': frequency }),
      ...(priority && { priority }),
      ...(siteId && { siteID: siteId }),
      ...(branch && { branch }),
    };

    Object.assign(query, filters);

    // Fetch filtered tasks
    await fetchTasks(res, query, page);
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error while fetching tasks' });
  }
};

const PAGE_SIZE = 10;

exports.delegatedTasks = async (req, res) => {
  try {
    const {
      userId,
      page = 1,
      pageSize = PAGE_SIZE, // frontend can override
      selectedCategory,
      assignedBy,
      assignedTo,
      frequency,
      priority,
      filter,
      siteId,
      branch,
      search, // <-- global search
    } = req.body;

    const { start, end } = getDateRange(filter);

    const matchStage = {
      isActive: true,
      dueDate: { $gte: start, $lte: end },
    };

    if (userId) matchStage.assignedBy = new mongoose.Types.ObjectId(userId);
    if (selectedCategory) matchStage.category = selectedCategory;
    if (assignedBy)
      matchStage.assignedBy = new mongoose.Types.ObjectId(assignedBy);
    if (assignedTo)
      matchStage.issueMember = new mongoose.Types.ObjectId(assignedTo);
    if (frequency) matchStage['repeat.repeatType'] = frequency;
    if (priority) matchStage.priority = priority;
    if (siteId) matchStage.siteID = new mongoose.Types.ObjectId(siteId);
    if (branch) matchStage.branch = branch;

    const skip = (page - 1) * pageSize;

    const pipeline = [
      { $match: matchStage },
      { $sort: { dueDate: 1 } },

      // populate assignedBy
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'assignedBy',
        },
      },
      { $unwind: { path: '$assignedBy', preserveNullAndEmptyArrays: true } },

      // populate issueMember
      {
        $lookup: {
          from: 'users',
          localField: 'issueMember',
          foreignField: '_id',
          as: 'issueMember',
        },
      },
      { $unwind: { path: '$issueMember', preserveNullAndEmptyArrays: true } },

      // populate comments with createdBy directly
      {
        $lookup: {
          from: 'comments',
          let: { commentIds: '$comments' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$commentIds'] } } },
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
              },
            },
            {
              $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true },
            },
          ],
          as: 'comments',
        },
      },
    ];

    // 🔍 Global search (task fields + user names)
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: regex },
            { description: regex },
            { priority: regex },
            { status: regex },
            { 'assignedBy.firstname': regex },
            { 'assignedBy.lastname': regex },
            { 'issueMember.firstname': regex },
            { 'issueMember.lastname': regex },
          ],
        },
      });
    }

    pipeline.push(
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pageSize }],
          total: [{ $count: 'count' }],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
          statusCounts: {
            $map: {
              input: ['Pending', 'In Progress', 'Complete', 'Overdue'],
              as: 'status',
              in: {
                status: '$$status',
                count: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: '$statusCounts',
                                cond: { $eq: ['$$this._id', '$$status'] },
                              },
                            },
                            as: 'sc',
                            in: '$$sc.count',
                          },
                        },
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      }
    );

    const result = await Task.aggregate(pipeline);
    const tasks = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    const statusCounts = result[0]?.statusCounts || [];

    res.status(200).json({
      success: true,
      tasks,
      total,
      totalPages,
      page,
      pageSize,
      statusCounts,
    });
  } catch (error) {
    console.error('Error while fetching delegated tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error while fetching delegated tasks',
      error: error.message,
    });
  }
};

exports.myTasks = async (req, res) => {
  try {
    const {
      userId,
      page = 1,
      pageSize = PAGE_SIZE, // frontend can override
      selectedCategory,
      assignedBy,
      assignedTo,
      frequency,
      priority,
      filter,
      siteId,
      branch,
      search, // <-- global search
    } = req.body;

    const { start, end } = getDateRange(filter);

    const matchStage = {
      isActive: true,
      dueDate: { $gte: start, $lte: end },
    };

    if (userId) matchStage.issueMember = new mongoose.Types.ObjectId(userId);
    if (selectedCategory) matchStage.category = selectedCategory;
    if (assignedBy)
      matchStage.assignedBy = new mongoose.Types.ObjectId(assignedBy);
    if (assignedTo)
      matchStage.issueMember = new mongoose.Types.ObjectId(assignedTo);
    if (frequency) matchStage['repeat.repeatType'] = frequency;
    if (priority) matchStage.priority = priority;
    if (siteId) matchStage.siteID = new mongoose.Types.ObjectId(siteId);
    if (branch) matchStage.branch = branch;

    const skip = (page - 1) * pageSize;

    const pipeline = [
      { $match: matchStage },
      { $sort: { dueDate: 1 } },

      // populate assignedBy
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'assignedBy',
        },
      },
      { $unwind: { path: '$assignedBy', preserveNullAndEmptyArrays: true } },

      // populate issueMember
      {
        $lookup: {
          from: 'users',
          localField: 'issueMember',
          foreignField: '_id',
          as: 'issueMember',
        },
      },
      { $unwind: { path: '$issueMember', preserveNullAndEmptyArrays: true } },

      // populate comments with createdBy directly
      {
        $lookup: {
          from: 'comments',
          let: { commentIds: '$comments' },
          pipeline: [
            { $match: { $expr: { $in: ['$_id', '$$commentIds'] } } },
            {
              $lookup: {
                from: 'users',
                localField: 'createdBy',
                foreignField: '_id',
                as: 'createdBy',
              },
            },
            {
              $unwind: { path: '$createdBy', preserveNullAndEmptyArrays: true },
            },
          ],
          as: 'comments',
        },
      },
    ];

    // 🔍 Global search (task fields + user names)
    if (search && search.trim() !== '') {
      const regex = new RegExp(search.trim(), 'i');
      pipeline.push({
        $match: {
          $or: [
            { title: regex },
            { description: regex },
            { priority: regex },
            { status: regex },
            { 'assignedBy.firstname': regex },
            { 'assignedBy.lastname': regex },
            { 'issueMember.firstname': regex },
            { 'issueMember.lastname': regex },
          ],
        },
      });
    }

    pipeline.push(
      {
        $facet: {
          data: [{ $skip: skip }, { $limit: pageSize }],
          total: [{ $count: 'count' }],
          statusCounts: [
            {
              $group: {
                _id: '$status',
                count: { $sum: 1 },
              },
            },
          ],
        },
      },
      {
        $project: {
          data: 1,
          total: { $ifNull: [{ $arrayElemAt: ['$total.count', 0] }, 0] },
          statusCounts: {
            $map: {
              input: ['Pending', 'In Progress', 'Complete', 'Overdue'],
              as: 'status',
              in: {
                status: '$$status',
                count: {
                  $ifNull: [
                    {
                      $arrayElemAt: [
                        {
                          $map: {
                            input: {
                              $filter: {
                                input: '$statusCounts',
                                cond: { $eq: ['$$this._id', '$$status'] },
                              },
                            },
                            as: 'sc',
                            in: '$$sc.count',
                          },
                        },
                        0,
                      ],
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      }
    );

    const result = await Task.aggregate(pipeline);
    const tasks = result[0]?.data || [];
    const total = result[0]?.total || 0;
    const totalPages = Math.ceil(total / pageSize);
    const statusCounts = result[0]?.statusCounts || [];

    res.status(200).json({
      success: true,
      tasks,
      total,
      totalPages,
      page,
      pageSize,
      statusCounts,
    });
  } catch (error) {
    console.error('Error while fetching delegated tasks:', error);
    res.status(500).json({
      success: false,
      message: 'Error while fetching delegated tasks',
      error: error.message,
    });
  }
};

// exports.myTasks = async (req, res) => {
//   try {
//     const {
//       userId,
//       page = 1,
//       selectedCategory,
//       assignedBy,
//       frequency,
//       priority,
//       filter,
//       siteId,
//       branch,
//       query = '',
//     } = req.body;

//     const { start, end } = getDateRange(filter);

//     // Base filters
//     const matchStage = {
//       isActive: true,
//       dueDate: { $gte: start, $lte: end },
//     };

//     if (userId) matchStage.issueMember = new mongoose.Types.ObjectId(userId);
//     if (selectedCategory) matchStage.category = selectedCategory;
//     if (assignedBy)
//       matchStage.assignedBy = new mongoose.Types.ObjectId(assignedBy);
//     if (frequency) matchStage['repeat.repeatType'] = frequency;
//     if (priority) matchStage.priority = priority;
//     if (siteId) matchStage.siteID = new mongoose.Types.ObjectId(siteId);
//     if (branch) matchStage.branch = branch;

//     // Global search
//     if (query && query.trim() !== '') {
//       matchStage.$or = [
//         { title: { $regex: query, $options: 'i' } },
//         { description: { $regex: query, $options: 'i' } },
//       ];
//     }

//     const skip = (page - 1) * PAGE_SIZE;

//     const pipeline = [
//       { $match: matchStage },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'assignedBy',
//           foreignField: '_id',
//           as: 'assignedBy',
//         },
//       },
//       { $unwind: { path: '$assignedBy', preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'issueMember',
//           foreignField: '_id',
//           as: 'issueMember',
//         },
//       },
//       { $unwind: { path: '$issueMember', preserveNullAndEmptyArrays: true } },
//       {
//         $lookup: {
//           from: 'comments',
//           localField: 'comments',
//           foreignField: '_id',
//           as: 'comments',
//         },
//       },
//       {
//         $lookup: {
//           from: 'users',
//           localField: 'comments.createdBy',
//           foreignField: '_id',
//           as: 'commentCreators',
//         },
//       },
//       {
//         $addFields: {
//           comments: {
//             $map: {
//               input: '$comments',
//               as: 'c',
//               in: {
//                 $mergeObjects: [
//                   '$$c',
//                   {
//                     createdBy: {
//                       $arrayElemAt: [
//                         {
//                           $filter: {
//                             input: '$commentCreators',
//                             as: 'u',
//                             cond: { $eq: ['$$u._id', '$$c.createdBy'] },
//                           },
//                         },
//                         0,
//                       ],
//                     },
//                   },
//                 ],
//               },
//             },
//           },
//         },
//       },
//       {
//         $facet: {
//           data: [
//             { $sort: { dueDate: 1 } },
//             { $skip: skip },
//             { $limit: PAGE_SIZE },
//           ],
//           totalCount: [{ $count: 'count' }],
//         },
//       },
//     ];

//     const result = await Task.aggregate(pipeline);

//     const tasks = result[0]?.data || [];
//     const total = result[0]?.totalCount[0]?.count || 0;
//     const hasMore = skip + tasks.length < total;

//     return res.status(200).json({
//       tasks,
//       hasMore,
//       page,
//     });
//   } catch (error) {
//     console.error('Server error:', error);
//     return res.status(500).json({ message: 'Error while fetching tasks' });
//   }
// };

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

    await createLogManually(
      req,
      `Added checklist ${checklist.name} to task ${task.title} of project ${task.siteID}`,
      task?.siteID,
      task?._id
    );

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
    await createLogManually(
      req,
      `Updated checklist ${updatedChecklist.name} of task ${task.title} of project ${task.siteID}`,
      task?.siteID,
      task?._id
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
    await createLogManually(
      req,
      `Deleted checklist of task ${task.title} of project ${task.siteID}`,
      task?.siteID,
      task?._id
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
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const project = await Project.findOne({ siteID: task.siteID });
    if (!project) {
      return res.status(404).json({ message: 'Project not found for task' });
    }

    const taskDate = new Date(date);

    let duration = 0;
    const activateTask = async tId => {
      const taskToActivate = await Task.findById(tId);
      if (taskToActivate) {
        const dueDate = new Date(today); // Ensure duration is set
        duration = duration + taskToActivate.duration;
        dueDate.setDate(taskDate.getDate() + duration);

        await Task.findByIdAndUpdate(
          tId,
          {
            $set: {
              isActive: true,
              assignedOn: taskDate,
              dueDate,
            },
          },
          { new: true }
        );
      }
    };

    // Flatten all steps across statuses in sequential order
    const allSteps = project.project_status.flatMap(ps => ps.step);

    // Find current task index
    const currentIndex = allSteps.findIndex(
      s => s.taskId.toString() === task._id.toString()
    );

    if (currentIndex === -1) {
      return res
        .status(404)
        .json({ message: 'Task not found in project steps' });
    }

    // Get next 2 steps if available
    const nextSteps = allSteps.slice(currentIndex + 1, currentIndex + 3);

    for (const step of nextSteps) {
      if (step?.taskId) {
        await activateTask(step.taskId);
      }
    }

    // Mark current task as complete
    task.status = 'Complete';
    task.updatedOn = date ? new Date(date) : taskDate;
    await task.save();

    // Log the action
    await createLogManually(
      req,
      `Manually closed task ${task.title} of project ${task.siteID}`,
      task.siteID,
      task._id
    );

    return res.status(200).json({ message: 'Task closed successfully' });
  } catch (error) {
    console.error('Error closing task:', error);
    return res.status(500).json({ message: 'Error while closing task' });
  }
};

exports.dashboardFilter = async (req, res) => {
  try {
    const {
      userId,
      page = 1,
      selectedCategory,
      assignedTo,
      frequency,
      priority,
      filter,
      siteId,
      branch,
      limit = 20,
    } = req.body;

    const { start, end } = getDateRange(filter);

    const projectQuery = {};
    if (siteId) projectQuery.siteID = siteId;
    if (branch) projectQuery.branch = branch;

    const taskMatch = {
      isActive: true,
      status: { $ne: 'Complete' },
    };

    // if (start && end) {
    //   taskMatch.dueDate = { $gte: start, $lte: end };
    // }

    if (userId) taskMatch.assignedBy = userId;
    if (assignedTo) taskMatch.issueMember = assignedTo;
    if (selectedCategory) taskMatch.category = selectedCategory;
    if (frequency) taskMatch['repeat.repeatType'] = frequency;
    if (priority) taskMatch.priority = priority;

    const skip = (page - 1) * limit;

    const projects = await Project.find(projectQuery)
      .select('siteID name project_status branch')
      .skip(skip)
      .limit(limit)
      .populate([
        {
          path: 'project_status',
          populate: {
            path: 'step',
            populate: {
              path: 'taskId',
              match: taskMatch,
              populate: [
                {
                  path: 'issueMember',
                  model: 'User',
                  select: '_id firstname lastname roles',
                  populate: {
                    path: 'roles',
                    model: 'Role',
                    select: '_id name',
                  },
                },
                {
                  path: 'comments',
                  populate: {
                    path: 'createdBy',
                    model: 'User',
                    // select: '_id firstname lastname roles',
                    populate: {
                      path: 'roles',
                      model: 'Role',
                      select: '_id name',
                    },
                  },
                },
              ],
            },
          },
        },
      ])
      .lean();

    const tasks = projects
      .map(project => {
        const activeTasks = project.project_status.flatMap(status => {
          return (status.step || [])
            .filter(step => step?.taskId)
            .map(step => {
              const task = step.taskId;
              return {
                branch: project.branch,
                siteID: project.siteID,
                stepName: status.name,
                _id: task._id,
                title: task.title || '',
                description: task.description || '',
                dueDate: task.dueDate || null,
                status: task.status || '',
                issueMember: task.issueMember || [],
                comments: task.comments || [],
              };
            });
        });

        // return {
        //   projectId: project.siteID,
        //   activeTasks,
        // };
        return activeTasks;
      })
      .flat();

    res.status(200).json({
      page,
      limit,
      totalProjects: tasks.length,
      tasks,
    });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).json({ message: 'Error while fetching tasks' });
  }
};

// exports.dashboardFilter = async (req, res) => {
//   try {
//     const {
//       userId,
//       page = 1,
//       limit = 200,
//       selectedCategory,
//       assignedTo,
//       frequency,
//       priority,
//       filter,
//       siteId,
//       branch,
//     } = req.body;

//     const siteIds = await Project.find();

//     const { start, end } = getDateRange(filter);

//     const matchTask = {
//       'task.isActive': true,
//       'task.status': { $ne: 'Complete' },
//     };

//     if (userId) matchTask['task.assignedBy'] = userId;
//     if (assignedTo && assignedTo.trim() !== '') {
//       matchTask['task.issueMember'] = new mongoose.Types.ObjectId(assignedTo);
//     }
//     if (selectedCategory && selectedCategory.trim() !== '') {
//       matchTask['task.category'] = selectedCategory;
//     }
//     if (frequency && frequency.trim() !== '') {
//       matchTask['task.repeat.repeatType'] = frequency;
//     }
//     if (priority && priority.trim() !== '') {
//       matchTask['task.priority'] = priority;
//     }
//     // if (start && end) {
//     //   const startDate = new Date(start);
//     //   const endDate = new Date(end);
//     //   if (!isNaN(startDate) && !isNaN(endDate)) {
//     //     matchTask['task.dueDate'] = { $gte: startDate, $lte: endDate };
//     //   }
//     // }

//     console.log(start, end);
//     // Similarly, for projects
//     const matchProject = {};
//     if (siteId && siteId.trim() !== '') matchProject.siteID = siteId;
//     if (branch && branch.trim() !== '') matchProject.branch = branch;

//     const skip = (page - 1) * limit;

//     const tasksAggregation = await Project.aggregate([
//       { $match: matchProject || {} },
//       { $unwind: '$project_status' }, // Unwind project_status array
//       { $unwind: '$project_status.step' }, // Unwind step array
//       {
//         $lookup: {
//           // Lookup task details
//           from: 'tasks',
//           localField: 'project_status.step.taskId',
//           foreignField: '_id',
//           as: 'task',
//         },
//       },
//       { $unwind: '$task' }, // Flatten task array
//       { $match: matchTask }, // Apply task filters
//       {
//         $lookup: {
//           // Populate issueMember
//           from: 'users',
//           localField: 'task.issueMember',
//           foreignField: '_id',
//           as: 'task.issueMember',
//         },
//       },
//       {
//         $lookup: {
//           // Populate comments.createdBy
//           from: 'comments',
//           localField: 'task.comments',
//           foreignField: '_id',
//           as: 'task.comments',
//         },
//       },
//       {
//         $lookup: {
//           // Populate roles inside comments.createdBy
//           from: 'roles',
//           localField: 'task.comments.createdBy.roles',
//           foreignField: '_id',
//           as: 'task.comments.createdBy.roles',
//         },
//       },
//       {
//         $project: {
//           // Select needed fields
//           branch: 1,
//           siteID: 1,
//           stepName: '$project_status.name',
//           _id: '$task._id',
//           title: '$task.title',
//           description: '$task.description',
//           dueDate: '$task.dueDate',
//           status: '$task.status',
//           issueMember: '$task.issueMember',
//           comments: '$task.comments',
//         },
//       },
//       { $sort: { dueDate: 1 } }, // Optional sorting
//       { $skip: skip },
//       { $limit: limit },
//     ]);

//     // Total tasks count for pagination
//     const totalCountAgg = await Project.aggregate([
//       { $match: matchProject },
//       { $unwind: '$project_status' },
//       { $unwind: '$project_status.step' },
//       {
//         $lookup: {
//           from: 'tasks',
//           localField: 'project_status.step.taskId',
//           foreignField: '_id',
//           as: 'task',
//         },
//       },
//       { $unwind: '$task' },
//       { $match: matchTask },
//       { $count: 'totalTasks' },
//     ]);

//     const totalTasks = totalCountAgg[0]?.totalTasks || 0;

//     const groupedTasks = groupTasksByDate(tasksAggregation, siteIds, {
//       activeFilter: req.body.filter || 'This Month',
//     });

//     res.status(200).json({
//       page,
//       limit,
//       totalTasks,
//       tasks: tasksAggregation,
//     });
//   } catch (error) {
//     console.error('Server error:', error);
//     res.status(500).json({ message: 'Error while fetching tasks' });
//   }
// };
