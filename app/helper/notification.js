const { teamUpdate } = require('../helper/reminder');
const User = require('../models/user.model');

exports.sendTeamNotification = async ({ recipient, sender, task }) => {
  if (!recipient || !sender || !task) return;

  const user = await User.findById(recipient);

  await teamUpdate({
    phone: user.phone,
    assignedTo: user.firstname + ' ' + user.lastname,
    assignedBy: sender.firstname,
    category: task.category,
    taskName: task.title,
    description: task.description,
    priority: task.priority,
    frequency:
      task.repeat.repeatType === 'norepeat' ? 'Once' : task.repeat.repeatType,
    dueDate: task.dueDate.toDateString(),
  });
};
