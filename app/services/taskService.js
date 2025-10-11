const db = require('../models');
const Task = db.task;
const TaskComment = require('../models/taskCommentModel');
const Project = db.projects;
const mongoose = require('mongoose');
const User = require('../models/user.model');
const Joi = require('joi');
const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');
const { createLogManually } = require('../middlewares/createLog');
const dayjs = require('dayjs');
const { sendNotification } = require('../services/oneSignalService');

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
  isForce: Joi.string().valid('yes', 'no').optional(),
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

exports.addCommentToTask = async req => {
  let session;
  try {
    // --- 1️⃣ Validate Input ---
    const { error, value } = commentSchema.validate(req.body, {
      abortEarly: false,
      stripUnknown: true,
    });
    if (error) {
      const messages = error.details.map(d => d.message);
      throw { status: 400, message: 'Validation error', errors: messages };
    }

    const {
      taskId,
      type,
      comment = '',
      userId,
      isWorking,
      isForce,
      material,
      workers,
    } = value;

    // --- 2️⃣ Ensure task & user exist ---
    const [task, member] = await Promise.all([
      Task.findById(taskId).populate('issueMember'),
      User.findById(userId),
    ]);
    if (!task || !member)
      throw { status: 404, message: 'Task or user not found' };

    // --- 3️⃣ Handle Force Majeure ---
    if (isForce === 'yes') {
      const project = await Project.findOne({ siteID: task.siteID }).populate({
        path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
        model: 'User',
        select: 'playerIds',
      });

      if (!project) throw { status: 404, message: 'Project not found' };

      const today = dayjs().startOf('day');
      const alreadyExists = project.forceMajeure?.some(item => {
        const start = dayjs(item.startDate).startOf('day');
        const end = dayjs(item.endDate).startOf('day');
        return start.isSame(today, 'day') && end.isSame(today, 'day');
      });

      if (alreadyExists) {
        throw {
          status: 400,
          message: 'Force majeure for today already exists',
        };
      }

      project.forceMajeure.push({
        startDate: today.toDate(),
        endDate: today.toDate(),
        duration: 1,
        reason: comment,
      });

      project.extension = (project.extension || 0) + 1;
      await project.save();
    }

    // --- 4️⃣ Handle File Uploads ---
    const imageFiles = filterImages(req.files?.image);
    const docFiles = filterDocs(req.files?.docs);
    const audioFiles = filterAudio(req.files?.audio);

    const [images, files, audio] = await Promise.all([
      imageFiles.length > 0 ? uploadToS3AndExtractUrls(imageFiles) : [],
      docFiles.length > 0 ? uploadToS3AndExtractUrls(docFiles) : [],
      audioFiles.length > 0
        ? uploadToS3AndExtractUrls(audioFiles).then(a => a?.[0] ?? null)
        : null,
    ]);

    const senderName = `${member.firstname || ''} ${
      member.lastname || ''
    }`.trim();

    // --- 5️⃣ Notify Stakeholders ---
    const notifyUsers = [];
    if (task.category === 'Project') {
      const project = await Project.findOne({ siteID: task.siteID }).populate({
        path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
        model: 'User',
        select: 'playerIds',
      });

      const sr = project?.sr_engineer?.[0];
      if (sr && sr.toString() !== userId) notifyUsers.push(sr);
    } else {
      if (task.assignedBy?.toString() !== userId)
        notifyUsers.push(task.assignedBy);
      if (task.issueMember && task.issueMember._id.toString() !== userId)
        notifyUsers.push(task.issueMember);
    }

    if (notifyUsers.length) {
      await sendNotification({
        users: notifyUsers,
        title: 'Task Update',
        message: `${senderName} added an update to "${task.title}" at site "${task.siteID}".`,
        data: { route: 'tasks', id: task._id },
      });
    }

    // --- 6️⃣ Start Transaction ---
    session = await mongoose.startSession();
    session.startTransaction();

    const taskInSession = await Task.findById(taskId).session(session);
    if (!taskInSession)
      throw { status: 404, message: 'Task not found during transaction' };

    // --- 7️⃣ Handle Completion Progression ---
    if (type === 'Complete') {
      const project = await Project.findOne({
        siteID: taskInSession.siteID,
      }).session(session);
      if (project) {
        const allSteps = project.project_status.flatMap(ps => ps.step || []);
        const currentIndex = allSteps.findIndex(
          s => s.taskId?.toString() === taskInSession._id.toString()
        );

        if (currentIndex !== -1) {
          const nextSteps = allSteps.slice(currentIndex + 1, currentIndex + 3);
          const today = new Date();

          for (const step of nextSteps) {
            if (!step?.taskId) continue;
            const t = await Task.findById(step.taskId).session(session);
            if (t && !t.isActive) {
              const dueDate = dayjs(today)
                .add(t.duration || 0, 'day')
                .toDate();
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

    // --- 8️⃣ Update Task Status ---
    switch (type) {
      case 'Reopened':
        taskInSession.status = 'In Progress';
        break;
      case 'Complete':
      case 'In Progress':
        if (taskInSession.status !== 'Overdue' || type === 'Complete')
          taskInSession.status = type;
        break;
    }

    // --- 9️⃣ Create Comment ---
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
        const today = new Date();
        const dueDate = dayjs(today)
          .add(taskInSession.duration || 0, 'day')
          .toDate();
        Object.assign(taskInSession, {
          isActive: true,
          assignedOn: today,
          dueDate,
        });
      }

      newCommentObj.siteDetails = {
        isWorking: isWorking === 'yes',
        materialAvailable: material === 'yes',
        workers: workers ?? null,
      };
    }

    const [createdComment] = await TaskComment.create([newCommentObj], {
      session,
    });
    taskInSession.comments.push(createdComment._id);
    taskInSession.updatedOn = new Date();
    await taskInSession.save({ session });

    // --- 🔟 Log Entry ---
    const logDetails = [
      'Added new comment',
      comment.trim() && `text: "${comment}"`,
      images.length && `+ ${images.length} image(s)`,
      files.length && `+ ${files.length} file(s)`,
      audio && `+ audio`,
    ]
      .filter(Boolean)
      .join(', ');

    await createLogManually(req, logDetails, task.siteID, task._id);

    await session.commitTransaction();
    session.endSession();

    return {
      message: 'Comment added successfully',
      comment: createdComment,
      task: {
        _id: taskInSession._id,
        status: taskInSession.status,
        isActive: taskInSession.isActive,
        assignedOn: taskInSession.assignedOn,
        dueDate: taskInSession.dueDate,
        updatedOn: taskInSession.updatedOn,
      },
    };
  } catch (error) {
    if (session) {
      try {
        if (session.inTransaction()) await session.abortTransaction();
      } finally {
        session.endSession();
      }
    }
    if (error.status) throw error; // custom handled errors
    throw {
      status: 500,
      message: 'Error while adding comment',
      error: error.message,
    };
  }
};
