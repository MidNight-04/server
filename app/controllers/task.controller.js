const db = require('../models');
const Task = db.task;
const TaskComment = require('../models/taskCommentModel');
const TeamMembers = require('../models/teamMember.model');
const Checklist = require('../models/projectCheckList.model');
const Project = db.projects;
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Ticket = require('../models/ticketModel');
const Client = require('../models/client.model');
const awsS3 = require('../middlewares/aws-s3');
const { updateTaskAndReschedule } = require('../helper/schedule');
const {
  assignedNotification,
  clientUpdate,
  teamUpdate,
} = require('../helper/reminder');

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;
let formatedtoday = yyyy + '-' + mm + '-' + dd;

const limit = 10;

exports.addTask = async (req, res) => {
  // let files = [];
  // let audios = [];
  // if (req.files.file) {
  //   for (let i = 0; i < req.files.file.length; i++) {
  //     files.push(req.files.file[i].location);
  //   }
  // }
  // if (req.files.audio) {
  //   for (let i = 0; i < req.files.audio.length; i++) {
  //     audios.push(req.files.audio[i].location);
  //   }
  // }
  const images = [];
  const files = [];
  let audioFile;

  if (req.files?.image?.length > 0) {
    await awsS3.uploadFiles(req.files?.image, `task`).then(async data => {
      const profileFiles = data.map(file => {
        const url =
          'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key;
        return url;
      });
      images.push(...profileFiles);
    });
  }

  if (req.files?.docs?.length > 0) {
    await awsS3.uploadFiles(req.files?.docs, `task`).then(async data => {
      const documents = data.map(file => {
        const url =
          'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key;
        return url;
      });
      files.push(...documents);
    });
  }

  if (req.files?.audio) {
    await awsS3.uploadFiles(req.files?.audio, `task`).then(async data => {
      audioFile =
        'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + data[0].s3key;
    });
  }

  const referenceModel = await getReferenceModel(req.body.assignedID);

  const task = {
    title: req.body.title,
    description: req.body.description,
    issueMember: req.body.member,
    assignedBy: req.body.assignedID,
    userRef: referenceModel,
    category: req.body.category,
    priority: req.body.priority,
    isActive: true,
    assignedOn: new Date(),
    repeat: {
      repeatType: req.body.repeatType,
      repeatTime: req.body.repeatTime,
    },
    dueDate: req.body.dueDate,
    file: files,
    image: images,
    audio: audioFile,
    reminder: JSON.parse(req.body.reminder),
    referenceModel: 'teammembers',
  };

  let assignedBy = await User.findOne({ _id: req.body.assignedID });

  if (!assignedBy) {
    assignedBy = await TeamMembers.findById(req.body.assignedID);
  }

  const issueMember = await TeamMembers.findById(req.body.member);

  Task.create(task).then((taskSave, err) => {
    if (err) {
      res.status(500).send({ message: 'There was problelm while create task' });
      return;
    } else {
      assignedNotification({
        phone: issueMember.phone,
        assignedTo: issueMember.name,
        assignedBy: assignedBy.name,
        category: task.category,
        taskName: task.title,
        description: task.description,
        priority: task.priority,
        frequency:
          task.repeat.repeatType === 'norepeat'
            ? 'Once'
            : task.repeat.repeatType,
        dueDate: new Date(task.dueDate).toDateString(),
      });
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
    const ticket = await Ticket.find({
      assignMember: mongoose.Types.ObjectId(req.params.id),
    }).populate([
      {
        path: 'assignMember',
        model: 'teammembers',
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
        'assignedBy',
        'issueMember',
        {
          path: 'comments',
          populate: {
            path: 'createdBy',
          },
          options: { sort: { createdAt: -1 } },
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
    const { taskId, type, comment, userId, isWorking, material, workers } =
      req.body;
    // const profileFiles =
    //   req.files?.image?.map((file) =>
    //     typeof file === 'string' ? file : file.location
    //   ) || [];
    // const audioFile = req.files?.audio?.[0]?.location;

    const images = [];
    const files = [];
    let audioFile;

    if (req.files?.image?.length > 0) {
      await awsS3
        .uploadFiles(req.files?.image, `taskComments`)
        .then(async data => {
          const profileFiles = data.map(file => {
            const url =
              'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' +
              file.s3key;
            return url;
          });
          images.push(...profileFiles);
        });
    }

    if (req.files?.docs?.length > 0) {
      await awsS3
        .uploadFiles(req.files?.docs, `taskComments`)
        .then(async data => {
          const documents = data.map(file => {
            const url =
              'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' +
              file.s3key;
            return url;
          });
          files.push(...documents);
        });
    }

    if (req.files?.audio) {
      await awsS3
        .uploadFiles(req.files?.audio, `taskComments`)
        .then(async data => {
          audioFile =
            'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' +
            data[0].s3key;
        });
    }

    let task = await Task.findById(taskId).populate(['issueMember']);

    let member = await TeamMembers.findById(userId);

    if (!member) {
      member = await User.findById(userId);
    }

    if (task.category === 'Project') {
      if (!task) {
        return res.status(404).send({ message: 'Task not found' });
      }
      const siteId = task.siteID;
      const seniorEngineer = await Project.findOne({ siteID: siteId })
        .select('sr_engineer')
        .populate({
          path: 'sr_engineer',
          model: 'teammembers',
        });

      if (
        seniorEngineer.sr_engineer[0]._id.toString() !==
        mongoose.Types.ObjectId(userId).toString()
      ) {
        teamUpdate({
          phone: seniorEngineer.sr_engineer[0].phone,
          assignedTo: seniorEngineer.sr_engineer[0].name,
          assignedBy: member.name,
          category: task.category,
          taskName: task.title,
          description: task.description,
          priority: task.priority,
          frequency:
            task.repeat.repeatType === 'norepeat'
              ? 'Once'
              : task.repeat.repeatType,
          dueDate: task.dueDate.toDateString(),
        });
      }
    } else {
      task = await Task.findById(taskId).populate(['issueMember']);
      let assignedBy = await TeamMembers.findById(task.assignedBy);

      if (!assignedBy) {
        assignedBy = await User.findById(task.assignedBy);
      }

      if (
        assignedBy._id.toString() !== mongoose.Types.ObjectId(userId).toString()
      ) {
        teamUpdate({
          phone: assignedBy.phone,
          assignedTo: assignedBy.name,
          assignedBy: member.name,
          category: task.category,
          taskName: task.title,
          description: task.description,
          priority: task.priority,
          frequency:
            task.repeat.repeatType === 'norepeat'
              ? 'Once'
              : task.repeat.repeatType,
          dueDate: task.dueDate.toDateString(),
        });
      }

      if (
        task.issueMember._id.toString() !==
        mongoose.Types.ObjectId(userId).toString()
      ) {
        teamUpdate({
          phone: task.issueMember.phone,
          assignedTo: task.issueMember.name,
          assignedBy: member.name,
          category: task.category || '',
          taskName: task.title,
          description: task.description,
          priority: task.priority,
          frequency:
            task.repeat.repeatType === 'norepeat'
              ? 'Once'
              : task.repeat.repeatType,
          dueDate: task.dueDate.toDateString(),
        });
      }
    }

    const referenceModel = await getReferenceModel(userId);
    if (!referenceModel) {
      return res.status(404).send({ message: 'User not found' });
    }

    if (type === 'Complete') {
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
                const taskToActivate = await Task.findById(taskId).populate(
                  'issueMember'
                );
                if (taskToActivate) {
                  const dueDate = new Date(today);
                  dueDate.setDate(today.getDate() + taskToActivate.duration);
                  await updateTaskAndReschedule(taskId, { dueDate: dueDate });
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
                  assignedNotification({
                    phone: taskToActivate.issueMember.phone,
                    assignedTo: taskToActivate.issueMember.name,
                    assignedBy: 'Admin',
                    category: taskToActivate.category,
                    taskName: taskToActivate.title,
                    description: taskToActivate.description,
                    priority: taskToActivate.priority,
                    frequency:
                      taskToActivate.repeat.repeatType === 'norepeat'
                        ? 'Once'
                        : task.repeat.repeatType,
                    dueDate: dueDate.toDateString(),
                  });
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
    }

    if (
      type === 'Complete' ||
      (task.status !== 'Overdue' && type === 'In Progress')
    ) {
      task.status = type;
    }

    if (type === 'Reopened') {
      task.status = 'In Progress';
    }

    const newComment = {
      comment,
      type,
      createdBy: userId,
      referenceModel,
      taskId,
      images: images,
      audio: audioFile,
      file: files,
    };

    if (type === 'In Progress') {
      newComment.siteDetails = {
        isWorking: isWorking === 'yes' ? true : false,
        materialAvailable: material === 'yes' ? true : false,
        workers,
      };
    }

    const data = await TaskComment.create(newComment);
    if (!data) {
      return res.status(404).send({ message: 'Comment not created' });
    }

    task.comments.push(data._id);
    task.updatedOn = new Date().toISOString();
    await task.save();

    res.status(200).send({ message: 'Comment added successfully' });
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
    const comment = await TaskComment.findById(commentId).populate('createdBy');
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
    const referenceModel = await getReferenceModel(userId);
    if (!referenceModel) {
      return res.status(404).send({ message: 'User not found' });
    }
    await TaskComment.updateOne(
      { _id: commentId },
      {
        $set: {
          'approved.isApproved': true,
          'approved.approvedBy': userId,
          'approved.approveRef': referenceModel,
          'approved.approvedOn': Date.now(),
        },
      }
    );
    await clientUpdate({
      clientName: client.client.name,
      phone: client.client.phone,
      issueMember: comment.createdBy.name,
      taskName: task.title,
      status: task.status,
      dueDate: task.dueDate.toDateString(),
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
    let user = await User.findById(userId);
    let referenceModel = 'User';
    if (!user) {
      user = await TeamMembers.findById(userId);
      referenceModel = 'teammembers';
    }
    const newAssignee = await TeamMembers.findById(newAssigneeId);
    const comment = await TaskComment.create({
      taskId,
      type: 'Task Updated',
      comment: `Task reassigned to ${newAssignee.name}.`,
      createdBy: userId,
      referenceModel: referenceModel,
    });
    await Task.updateOne(
      { _id: taskId },
      {
        $set: {
          issueMember: newAssigneeId,
          referenceModel: 'teammembers',
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
    referenceModel: { $nin: ['clients', 'users'] },
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
        'issueMember',
        'assignedBy',
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
                await updateTaskAndReschedule(taskId, { dueDate: dueDate });
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
