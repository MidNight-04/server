const {
  teamUpdate,
  updateTicketStatus,
  sendNewTicketUpdate,
} = require('../helper/reminder');
const User = require('../models/user.model');

exports.sendTeamNotification = async ({ recipient, sender, task }) => {
  if (!recipient || !sender || !task) return;

  const user = await User.findById(recipient);

  await teamUpdate({
    phone: user.phone,
    assignedTo: user.firstname + ' ' + user.lastname,
    assignedBy: sender,
    category: task.category,
    taskName: task.title,
    description: task.description,
    priority: task.priority,
    frequency:
      task.repeat.repeatType === 'norepeat' ? 'Once' : task.repeat.repeatType,
    dueDate: task.dueDate.toDateString(),
  });
};

exports.ticketUpdateNotification = async ({ recipient, sender, id, title }) => {
  if (!recipient || !sender || !id || !title) return;

  const user = await User.findById(recipient);

  await updateTicketStatus({
    phone: '+91' + user.phone,
    name: user.firstname + ' ' + user.lastname,
    teammember: sender,
    id,
    title,
  });
};

exports.sendNewTicketNotification = async ({
  recipient,
  sender, // person raising the ticket
  id,
  title,
  siteId,
  clientName,
  step,
  query,
  date,
}) => {
  if (
    !recipient ||
    !sender ||
    !id ||
    !title ||
    !siteId ||
    !clientName ||
    !step ||
    !query ||
    !date
  ) {
    console.warn('⚠ Missing required parameters for sendNewTicketNotification');
    return;
  }

  try {
    const user = await User.findById(recipient).lean();
    if (!user) {
      console.warn(`⚠ No user found with ID: ${recipient}`);
      return;
    }

    await sendNewTicketUpdate({
      phone: '+91' + user.phone,
      issueMember: `${user.firstname} ${user.lastname}`,
      username: sender,
      id,
      title,
      siteId,
      clientName,
      step,
      query,
      date,
    });
  } catch (error) {
    console.error('❌ Error in sendNewTicketNotification:', error);
  }
};
