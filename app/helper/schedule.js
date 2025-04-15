const Task = require('../models/task.model');
const schedule = require('node-schedule');

const scheduledTasks = new Map(); // { taskId: scheduledJob }

const scheduleTask = task => {
  const dueDate = new Date(task.dueDate);
  const runAt = new Date(dueDate.getTime() - 30 * 60 * 1000);
  const now = new Date();
  if (runAt <= now) {
    console.log(
      `Skipping scheduling task "${task.title}" because the run time has passed.`
    );
    return;
  }

  // Cancel old job if exists
  if (scheduledTasks.has(task._id.toString())) {
    const oldJob = scheduledTasks.get(task._id.toString());
    oldJob.cancel();
    console.log(`Cancelled old scheduled job for task "${task.title}"`);
  }

  // Schedule new job
  const job = schedule.scheduleJob(runAt, async () => {
    console.log(
      `Running scheduled task "${task.title}" 30 minutes before due time.`
    );

    // Remove from map after running
    scheduledTasks.delete(task._id.toString());
  });

  // Save the job reference
  scheduledTasks.set(task._id.toString(), job);

  console.log(`Scheduled task "${task.title}" to run at ${runAt}`);
};

const loadAndScheduleAllTasks = async () => {
  try {
    const tasks = await Task.find({ isActive: true });
    tasks.forEach(scheduleTask);
  } catch (error) {
    console.error('Error loading tasks:', error.message);
  }
};

const updateTaskAndReschedule = async (taskId, updateFields) => {
  try {
    const task = await Task.findByIdAndUpdate(taskId, updateFields, {
      new: true,
    });
    if (task) {
      scheduleTask(task);
    }
  } catch (error) {
    console.error('Error updating and rescheduling task:', error.message);
  }
};

module.exports = { loadAndScheduleAllTasks, updateTaskAndReschedule };
