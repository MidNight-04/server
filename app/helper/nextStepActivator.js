const Task = require('../models/task.model');
const assignedNotification = require('./notification');

exports.activateNextSteps = async (task, project) => {
  const statuses = project.project_status;
  const today = new Date();

  const activateTask = async taskId => {
    const taskToActivate = await Task.findById(taskId).populate('issueMember');
    if (taskToActivate) {
      const dueDate = new Date(today);
      dueDate.setDate(today.getDate() + taskToActivate.duration);
      await Task.findByIdAndUpdate(taskId, {
        $set: { isActive: true, assignedOn: today, dueDate },
      });
      assignedNotification({
        phone: taskToActivate.issueMember.phone,
        assignedTo:
          taskToActivate.issueMember.firstname +
          ' ' +
          taskToActivate.issueMember?.lastname,
        assignedBy: 'Admin',
        category: taskToActivate.category,
        taskName: taskToActivate.title,
        description: taskToActivate.description,
        priority: taskToActivate.priority,
        frequency:
          taskToActivate.repeat.repeatType === 'norepeat'
            ? 'Once'
            : taskToActivate.repeat.repeatType,
        dueDate: dueDate.toDateString(),
      });
    }
  };

  for (let i = 0; i < statuses.length; i++) {
    const steps = statuses[i].step;
    for (let j = 0; j < steps.length; j++) {
      if (steps[j].taskId.toString() === task._id.toString()) {
        let next = steps[j + 1]?.taskId || statuses[i + 1]?.step?.[0]?.taskId;
        let nextNext =
          steps[j + 2]?.taskId || statuses[i + 1]?.step?.[1]?.taskId;
        if (next) await activateTask(next);
        if (nextNext) await activateTask(nextNext);
        return;
      }
    }
  }
};
