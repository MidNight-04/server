const {
  teamUpdate,
  updateTicketStatus,
  sendNewTicketUpdate,
} = require('../helper/reminder');
const User = require('../models/user.model');

exports.sendTeamNotification = async ({ recipient, sender, task }) => {
  try {
    // Validate required arguments
    if (!recipient || !sender || !task) {
      console.warn('sendTeamNotification: Missing required parameters.');
      return;
    }

    // Fetch recipient details
    const user = await User.findById(recipient).lean();
    if (!user) {
      console.warn(
        `sendTeamNotification: User with ID ${recipient} not found.`
      );
      return;
    }

    // Prepare notification payload
    const payload = {
      phone: user.phone,
      assignedTo: `${user.firstname || ''} ${user.lastname || ''}`.trim(),
      assignedBy: sender,
      category: task.category || 'Uncategorized',
      taskName: task.title || 'Untitled Task',
      description: task.description || '',
      priority: task.priority || 'Normal',
      frequency:
        task?.repeat?.repeatType === 'norepeat'
          ? 'Once'
          : task?.repeat?.repeatType || 'Unknown',
      dueDate: task.dueDate
        ? new Date(task.dueDate).toLocaleDateString('en-IN', {
            weekday: 'short',
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          })
        : 'No Due Date',
    };

    // Send team update notification
    await teamUpdate(payload);
  } catch (err) {
    console.error('Error sending team notification:', err);
  }
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
