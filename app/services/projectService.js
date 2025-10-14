const mongoose = require('mongoose');
const Project = require('../models/projects.model');
const Task = require('../models/task.model');
const { createLogManually } = require('../middlewares/createLog');
const { sendNotification } = require('../services/oneSignalService');

async function deleteProjectPoint({ id, name, point, duration, req }) {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // 1. Fetch project with steps
    const project = await Project.findOne({ siteID: id })
      .populate({
        path: 'project_status',
        populate: {
          path: 'step',
          populate: { path: 'taskId', model: Task },
        },
      })
      .populate({
        path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
        model: 'User',
        select: 'playerIds',
      })
      .session(session);

    if (!project) {
      throw new Error('Project not found');
    }

    const projectStatus = project.project_status.find(
      status => status.name === name
    );
    if (!projectStatus) {
      throw new Error('Project Status not found');
    }

    const stepIndex = projectStatus.step.findIndex(
      step => parseInt(step.point) === parseInt(point)
    );
    if (stepIndex === -1) {
      throw new Error('Step not found');
    }

    const stepToRemove = projectStatus.step[stepIndex];

    // 2. Calculate extension adjustment
    let extension = 0;
    if (stepToRemove.taskId?.forceMajeure) {
      // extension = Math.max(project.extension - duration, 0);
      extension = Math.max(project.extension - duration, duration);
    }

    // 3. Remove step
    const updatePayload = {
      $pull: { 'project_status.$[status].step': { point } },
    };

    if (stepToRemove.taskId?.forceMajeure) {
      updatePayload.$unset = { forceMajeure: '' };
      updatePayload.$inc = { extension: -extension };
    }

    const updateResult = await Project.updateOne(
      { siteID: id, 'project_status.name': name },
      updatePayload,
      {
        session,
        arrayFilters: [{ 'status.name': name }],
      }
    );

    if (updateResult.modifiedCount === 0) {
      throw new Error('No changes were made to the project');
    }

    // 4. Reindex points
    await Project.updateOne(
      { siteID: id, 'project_status.name': name },
      {
        $inc: {
          'project_status.$[status].step.$[step].point': -1,
        },
      },
      {
        session,
        arrayFilters: [
          { 'status.name': name },
          { 'step.point': { $gt: parseInt(point) } },
        ],
      }
    );

    // 5. Delete task
    if (stepToRemove.taskId?._id) {
      await Task.findByIdAndDelete(stepToRemove.taskId._id, { session });
    }

    const logMessage = `Deleted step ${name} - Point ${point} from project ${id}`;

    // 6. Log action
    await createLogManually(
      req,
      logMessage,
      id,
      stepToRemove.taskId._id,
      session
    );

    const allPlayerIds = [
      project.project_admin[0],
      project.architect[0],
      project.accountant[0],
      project.sr_engineer[0],
      project.site_engineer[0],
      project.operation[0],
      project.sales[0],
    ];

    await sendNotification({
      users: allPlayerIds,
      title: 'New Point Added',
      message: logMessage,
      data: { route: 'projects', id },
    });

    // Commit transaction
    await session.commitTransaction();
    session.endSession();

    return { status: 200, message: 'Point removed successfully' };
  } catch (error) {
    // Rollback
    await session.abortTransaction();
    session.endSession();
    throw error;
  }
}

module.exports = { deleteProjectPoint };
