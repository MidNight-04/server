const db = require('../models');
const Task = db.task;
const TaskComment = require('../models/taskCommentModel');
const TeamMembers = require('../models/teamMember.model');
const Project = db.projects;
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Ticket = require('../models/ticketModel');
const Client = require('../models/client.model');
const awsS3 = require('../middlewares/aws-s3');

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;
let formatedtoday = yyyy + '-' + mm + '-' + dd;

const limit = 10;

exports.addTask = (req, res) => {
  let files = [];
  let audios = [];
  if (req.files.file) {
    for (let i = 0; i < req.files.file.length; i++) {
      files.push(req.files.file[i].location);
    }
  }
  if (req.files.audio) {
    for (let i = 0; i < req.files.audio.length; i++) {
      audios.push(req.files.audio[i].location);
    }
  }
  const task = {
    title: req.body.title,
    description: req.body.description,
    issueMember: req.body.member,
    assignedBy: req.body.assignedID,
    category: req.body.category,
    priority: req.body.priority,
    repeat: {
      repeatType: req.body.repeatType,
      repeatTime: req.body.repeatTime,
    },
    dueDate: req.body.dueDate,
    file: files,
    audio: audios,
    reminder: JSON.parse(req.body.reminder),
  };

  Task.create(task).then((taskSave, err) => {
    if (err) {
      res.status(500).send({ message: 'There was problelm while create task' });
      return;
    } else {
      res.status(201).send({
        status: 201,
        message: 'Task created successfully',
        data: taskSave,
      });
    }
  });
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
    const tasks = await Task.find({ issueMember: id })
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
    await Project.find({ client: req.params.id })
      .populate({
        path: 'openTicket',
        model: 'Tickets',
        populate: {
          path: 'assignMember',
          model: 'teammembers',
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
        model: 'teammembers',
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
    // console.log(req.params.id)
    const ticket = await Project.find({
      'openTicket.assignMember': { $elemMatch: { employeeID: req.params.id } },
    });
    // console.log("find ticket---",ticket)
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
        'assignedBy',
        'issueMember',
        {
          path: 'comments',
          populate: {
            path: 'createdBy',
          },
        },
      ])
      .exec()
      .then(task => {
        if (!task) {
          throw new Error('Task not found');
        }
        return task;
      })
      .catch(error => {
        throw error;
      });
    if (!task) {
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
    const { taskId, type, comment, userId } = req.body;
    const profileFiles =
      req.files?.image?.map(file =>
        typeof file === 'string' ? file : file.location
      ) || [];

    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).send({ message: 'Task not found' });
    }

    const referenceModel = await getReferenceModel(userId);
    if (!referenceModel) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (type === 'Complete' || type === 'In Progress') {
      task.status = type;
    }

    const newComment = {
      comment,
      type,
      createdBy: userId,
      referenceModel,
      taskId,
      images: profileFiles,
      audio: req.files?.audio[0]?.location,
    };

    const data = await TaskComment.create(newComment);
    if (!data) {
      return res.status(404).send({ message: 'Comment not created' });
    }

    task.comments.push(data._id);
    task.updatedOn = new Date().toISOString();
    await task.save();

    res.status(200).send({ message: 'Comment added successfully', data });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error while adding comment' });
  }
};

const getReferenceModel = async userId => {
  const models = [
    { model: TeamMembers, referenceModel: 'teammembers' },
    { model: User, referenceModel: 'User' },
    { model: Client, referenceModel: 'clients' },
  ];

  for (const { model, referenceModel } of models) {
    const user = await model.findById(userId);
    if (user) {
      return referenceModel;
    }
  }

  return null;
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

    // Remove the image reference from the comment
    const update = { $pull: { images: imageUrl } };
    const result = await TaskComment.updateOne({ _id: commentId }, update);

    if (result.modifiedCount === 0) {
      return res.status(404).send({ message: 'Image not found in comment' });
    }

    res.status(200).send({ message: 'Comment image deleted successfully' });
  } catch (error) {
    console.error('Server error:', error);
    res.status(500).send({ message: 'Error while deleting comment image' });
  }
};
