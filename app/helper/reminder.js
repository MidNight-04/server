require('dotenv').config();
const axios = require('axios');
const Task = require('../models/task.model');
const User = require('../models/user.model');
const Role = require('../models/role.model');
const pLimit = require('p-limit');

const WATI_API_URL =
  'https://live-mt-server.wati.io/15495/api/v1/sendTemplateMessage';

const API_KEY = process.env.WATI_API_KEY;

if (!API_KEY) {
  throw new Error('WATI_API_KEY is not set in the environment variables');
}

// const sendWhatsAppMessage = async () => {
//   try {
//     const today = new Date();
//     const client = await Role.findOne({ name: 'Client' });
//     const teammembers = await User.find({
//       isActive: true,
//       roles: { $ne: client._id }, // excludes users where roles contains client._id
//       $and: [
//         { dueDate: { $exists: true } }, // dueDate must exist
//         { dueDate: { $ne: null } }, // dueDate not null
//       ],
//     });

//     const allPromises = [];

//     const startOfWeek = new Date(today);
//     startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
//     startOfWeek.setHours(0, 0, 0, 0);

//     const endOfWeek = new Date(today);
//     endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
//     endOfWeek.setHours(23, 59, 59, 999);

//     for (const member of teammembers) {
//       const tasks = await Task.find({
//         issueMember: member._id,
//         isActive: true,
//         status: { $ne: 'Complete' },
//       });

//       if (tasks.length > 0) {
//         const overdueTasks = tasks.filter(
//           task => task.status === 'Overdue'
//         ).length;
//         const pendingTasks = tasks.filter(
//           task => task.status === 'Pending'
//         ).length;
//         const inProgressTasks = tasks.filter(
//           task => task.status === 'In Progress'
//         ).length;
//         const thisWeekTasks = tasks
//           .filter(task => task.status === 'This Week')
//           .filter(task => {
//             const endDate = new Date(task.dueDate);
//             return endDate >= startOfWeek && endDate <= endOfWeek;
//           }).length;

//         if (member.phone) {
//           const promise = axios.post(
//             `${WATI_API_URL}?whatsappNumber=${member.phone}`,

//             {
//               template_name: 'morning_reminder',
//               broadcast_name: 'morning_reminder_070420251410',
//               parameters: [
//                 {
//                   name: 'user_name',
//                   value: member.firstname + ' ' + member.lastname,
//                 },
//                 {
//                   name: 'overdue',
//                   value: overdueTasks,
//                 },
//                 {
//                   name: 'inProgress',
//                   value: inProgressTasks,
//                 },
//                 {
//                   name: 'pending',
//                   value: pendingTasks,
//                 },
//                 {
//                   name: 'thisWeek',
//                   value: thisWeekTasks,
//                 },
//               ],
//             },
//             {
//               headers: {
//                 'Content-Type': 'application/json',
//                 Authorization: `Bearer ${API_KEY}`,
//               },
//             }
//           );
//           allPromises.push(promise);
//         } else {
//           console.warn(`No phone number found for member: ${member.name}`);
//         }
//       } else {
//         console.log(`No active tasks found for ${member.name}`);
//       }
//     }

//     const results = await Promise.allSettled(allPromises);

//     results.forEach((result, index) => {
//       if (result.status === 'fulfilled') {
//         console.log(`Message sent successfully to ${teammembers[index].name}`);
//       } else {
//         console.error(
//           `Failed to send message to ${teammembers[index].name}: ${result.reason}`
//         );
//       }
//     });

//     return results;
//   } catch (error) {
//     throw new Error(`Failed to send messages: ${error.message}`);
//   }
// };

const limit = pLimit(10);

const sendWhatsAppMessage = async () => {
  try {
    const today = new Date();
    const client = await Role.findOne({ name: 'Client' });

    if (!client) {
      console.warn('⚠️ Client role not found, skipping message sending.');
      return [];
    }

    const teammembers = await User.find({
      isActive: true,
      roles: { $ne: client._id },
      dueDate: { $exists: true, $ne: null },
    });

    if (!teammembers.length) {
      console.log('No active team members with due dates found.');
      return [];
    }

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay()));
    endOfWeek.setHours(23, 59, 59, 999);

    const processMember = async member => {
      try {
        const tasks = await Task.find({
          issueMember: member._id,
          isActive: true,
          status: { $ne: 'Complete' },
        });

        if (!tasks.length) {
          console.log(
            `No active tasks for ${member.firstname} ${member.lastname}`
          );
          return { member, status: 'no-tasks' };
        }

        const overdueTasks = tasks.filter(t => t.status === 'Overdue').length;
        const pendingTasks = tasks.filter(t => t.status === 'Pending').length;
        const inProgressTasks = tasks.filter(
          t => t.status === 'In Progress'
        ).length;
        const thisWeekTasks = tasks.filter(t => {
          const due = new Date(t.dueDate);
          return (
            t.status === 'This Week' && due >= startOfWeek && due <= endOfWeek
          );
        }).length;

        if (!member.phone) {
          console.warn(
            `No phone number for ${member.firstname} ${member.lastname}`
          );
          return { member, status: 'no-phone' };
        }

        await axios.post(
          `${WATI_API_URL}?whatsappNumber=${member.phone}`,
          {
            template_name: 'morning_reminder',
            broadcast_name: 'morning_reminder_070420251410',
            parameters: [
              {
                name: 'user_name',
                value: `${member.firstname} ${member.lastname}`,
              },
              { name: 'overdue', value: overdueTasks },
              { name: 'inProgress', value: inProgressTasks },
              { name: 'pending', value: pendingTasks },
              { name: 'thisWeek', value: thisWeekTasks },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${API_KEY}`,
            },
          }
        );

        console.log(
          `Message sent to ${member.firstname} ${member.lastname}`
        );
        return { member, status: 'sent' };
      } catch (err) {
        console.error(
          `Error sending to ${member.firstname} ${member.lastname}:`,
          err.message
        );
        return { member, status: 'failed', error: err.message };
      }
    };

    // Use p-limit to control concurrency
    const tasks = teammembers.map(member => limit(() => processMember(member)));

    const results = await Promise.allSettled(tasks);

    return results.map(res =>
      res.status === 'fulfilled'
        ? res.value
        : { status: 'failed', error: res.reason?.message }
    );
  } catch (err) {
    console.error('Fatal error in sendWhatsAppMessage:', err.message);
    return [{ status: 'fatal', error: err.message }];
  }
};

const assignedNotification = async ({
  phone,
  assignedTo,
  assignedBy,
  category,
  taskName,
  description,
  priority,
  frequency,
  dueDate,
}) => {
  try {
    const msg = await axios.post(
      `${WATI_API_URL}?whatsappNumber=${phone}`,
      {
        template_name: 'task_assigned',
        broadcast_name: 'task_assigned_040620251728',
        parameters: [
          {
            name: 'assignedTo',
            value: assignedTo,
          },
          {
            name: 'assignedBy',
            value: assignedBy,
          },
          {
            name: 'category',
            value: category,
          },
          {
            name: 'taskName',
            value: taskName,
          },
          {
            name: 'description',
            value: description,
          },
          {
            name: 'priority',
            value: priority,
          },
          {
            name: 'frequency',
            value: frequency,
          },
          {
            name: 'dueDate',
            value: dueDate,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    console.log('Message sent:', msg.data);
  } catch (error) {
    console.error(
      'Error sending message:',
      error.response?.data || error.message
    );
  }
};

const dueDateNotification = async () => {
  try {
    const startOfDay = new Date();
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date();
    endOfDay.setHours(23, 59, 59, 999);

    const tasks = await Task.find({
      isActive: true,
      status: { $ne: 'Complete' },
      $and: [
        { dueDate: { $exists: true } },
        { dueDate: { $gte: startOfDay, $lte: endOfDay } },
      ],
    }).populate(['issueMember', 'assignedBy']);

    for (const task of tasks) {
      try {
        const assignedTo =
          task.issueMember.firstname + ' ' + task.issueMember.lastname;
        const phone = task.issueMember.phone;
        const category = task.category;
        const taskName = task.title;
        const description = task.description;
        const priority = task.priority;
        const frequency =
          task.repeat.repeatType === 'norepeat'
            ? 'Once'
            : task.repeat.repeatType;
        const dueDate = task.dueDate.toISOString().split('T')[0];
        const msg = await axios.post(
          `${WATI_API_URL}?whatsappNumber=${phone}`,
          {
            template_name: 'due_date',
            broadcast_name: 'due_date_050620251146',
            parameters: [
              { name: 'name', value: assignedTo },
              { name: 'category', value: category },
              { name: 'taskName', value: taskName },
              { name: 'description', value: description },
              { name: 'priority', value: priority },
              { name: 'frequency', value: frequency },
              { name: 'dueDate', value: dueDate },
            ],
          },
          {
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${API_KEY}`,
            },
          }
        );
        console.log('Message sent:', msg.data);
      } catch (taskError) {
        console.error(
          `Error sending message for task "${task.title}":`,
          taskError.response?.data || taskError.message
        );
      }
    }
  } catch (error) {
    console.error(
      'Error fetching tasks:',
      error.response?.data || error.message
    );
  }
};

const clientUpdate = async ({
  phone,
  clientName,
  dueDate,
  taskName,
  status,
  remarks,
  issueMember,
}) => {
  try {
    const msg = await axios.post(
      `${WATI_API_URL}?whatsappNumber=${phone}`,
      {
        template_name: 'task_client_update',
        broadcast_name: 'task_client_update_060620251145',
        parameters: [
          {
            name: 'clientName',
            value: clientName,
          },
          {
            name: 'issueMember',
            value: issueMember,
          },
          {
            name: 'taskName',
            value: taskName,
          },
          {
            name: 'status',
            value: status,
          },
          {
            name: 'dueDate',
            value: dueDate,
          },
          {
            name: 'remarks',
            value: remarks,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    console.log('Message sent:', msg.data);
  } catch (error) {
    console.error(
      'Error sending message:',
      error.response?.data || error.message
    );
  }
};

const teamUpdate = async ({
  phone,
  assignedTo,
  assignedBy,
  category,
  taskName,
  description,
  priority,
  dueDate,
  frequency,
}) => {
  try {
    const msg = await axios.post(
      `${WATI_API_URL}?whatsappNumber=${phone}`,
      {
        template_name: 'team_update',
        broadcast_name: 'team_update_060620251754',
        parameters: [
          { name: 'assignedTo', value: assignedTo },
          { name: 'assignedBy', value: assignedBy },
          { name: 'category', value: category },
          { name: 'taskName', value: taskName },
          { name: 'description', value: description },
          { name: 'priority', value: priority },
          { name: 'frequency', value: frequency },
          { name: 'dueDate', value: dueDate },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
    console.log('Message sent:', msg.data);
  } catch (error) {
    console.error(
      'Error sending message:',
      error.response?.data || error.message
    );
  }
};

const updateTicketStatus = async ({ phone, name, teammember, id, title }) => {
  try {
    const msg = await axios.post(
      `${WATI_API_URL}?whatsappNumber=${phone}`,
      {
        template_name: 'ticket_update',
        broadcast_name: 'ticket_update_060820251648',
        parameters: [
          {
            name: 'name',
            value: name,
          },
          {
            name: 'teammember',
            value: teammember,
          },
          {
            name: 'id',
            value: id,
          },
          {
            name: 'title',
            value: title,
          },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );
  } catch (error) {
    console.error(
      'Error sending message:',
      error.response?.data || error.message
    );
  }
};

const sendNewTicketUpdate = async ({
  phone,
  username,
  id,
  title,
  siteId,
  issueMember,
  clientName,
  step,
  query,
  date,
}) => {
  try {
    // Log the payload for debugging
    console.log('📢 Sending New Ticket Notification:', {
      phone,
      username,
      id,
      title,
      siteId,
      clientName,
      step,
      query,
      date,
    });

    const response = await axios.post(
      `${WATI_API_URL}?whatsappNumber=${phone}`,
      {
        template_name: 'ticket_raised', // <-- name in your WATI template
        broadcast_name: 'ticket_raised_060820251802',
        parameters: [
          { name: 'issueMember', value: issueMember },
          { name: 'username', value: username },
          { name: 'id', value: id },
          { name: 'title', value: title },
          { name: 'siteId', value: siteId },
          { name: 'clientName', value: clientName },
          { name: 'step', value: step },
          { name: 'query', value: query },
          { name: 'date', value: date },
        ],
      },
      {
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${API_KEY}`,
        },
      }
    );

    console.log('✅ New ticket notification sent:', response.data);
  } catch (error) {
    console.error(
      '❌ Error sending new ticket notification:',
      error.response?.data || error.message
    );
  }
};

module.exports = {
  sendWhatsAppMessage,
  assignedNotification,
  dueDateNotification,
  clientUpdate,
  teamUpdate,
  updateTicketStatus,
  sendNewTicketUpdate,
};

// app.post('/send-message', async (req, res) => {
//   try {
//     const { phoneNumber, message } = req.body;
//     if (!phoneNumber || !message) {
//       return res
//         .status(400)
//         .json({ error: 'phoneNumber and message are required' });
//     }
//     const response = await sendWhatsAppMessage(phoneNumber, message);
//     res.json({ success: true, message: 'Message sent!', data: response });
//   } catch (error) {
//     res.status(500).json({ error: 'Failed to send message' });
//   }
// });
