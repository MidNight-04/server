require('dotenv').config();
const axios = require('axios');
const Task = require('../models/task.model');
const TeamMember = require('../models/teamMember.model');
const { task } = require('../models');

const WATI_API_URL =
  'https://live-mt-server.wati.io/15495/api/v1/sendTemplateMessage';

const API_KEY = process.env.WATI_API_KEY;

if (!API_KEY) {
  throw new Error('WATI_API_KEY is not set in the environment variables');
}

const sendWhatsAppMessage = async () => {
  try {
    const today = new Date();
    const teammembers = await User.find();
    const allPromises = [];

    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Sunday
    startOfWeek.setHours(0, 0, 0, 0);

    const endOfWeek = new Date(today);
    endOfWeek.setDate(today.getDate() + (6 - today.getDay())); // Saturday
    endOfWeek.setHours(23, 59, 59, 999);

    for (const member of teammembers) {
      const tasks = await Task.find({
        issueMember: member._id,
        isActive: true,
        status: { $ne: 'Complete' },
      });

      if (tasks.length > 0) {
        const overdueTasks = tasks.filter(
          task => task.status === 'Overdue'
        ).length;
        const pendingTasks = tasks.filter(
          task => task.status === 'Pending'
        ).length;
        const inProgressTasks = tasks.filter(
          task => task.status === 'In Progress'
        ).length;
        const thisWeekTasks = tasks
          .filter(task => task.status === 'This Week')
          .filter(task => {
            const endDate = new Date(task.dueDate);
            return endDate >= startOfWeek && endDate <= endOfWeek;
          }).length;

        if (member.phone) {
          const promise = axios.post(
            `${WATI_API_URL}?whatsappNumber=${member.phone}`,

            {
              template_name: 'morning_reminder',
              broadcast_name: 'morning_reminder_070420251410',
              parameters: [
                {
                  name: 'user_name',
                  value: member.firstname + ' ' + member.lastname,
                },
                {
                  name: 'overdue',
                  value: overdueTasks,
                },
                {
                  name: 'inProgress',
                  value: inProgressTasks,
                },
                {
                  name: 'pending',
                  value: pendingTasks,
                },
                {
                  name: 'thisWeek',
                  value: thisWeekTasks,
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
          allPromises.push(promise);
        } else {
          console.warn(`No phone number found for member: ${member.name}`);
        }
      } else {
        console.log(`No active tasks found for ${member.name}`);
      }
    }

    const results = await Promise.allSettled(allPromises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        console.log(`Message sent successfully to ${teammembers[index].name}`);
      } else {
        console.error(
          `Failed to send message to ${teammembers[index].name}: ${result.reason}`
        );
      }
    });

    return results;
  } catch (error) {
    throw new Error(`Failed to send messages: ${error.message}`);
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
      dueDate: { $gte: startOfDay, $lte: endOfDay },
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

        const assignedBy =
          task.assignedBy?.firstname + ' ' + task.assignedBy?.lastname ||
          'Admin';
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

module.exports = {
  sendWhatsAppMessage,
  assignedNotification,
  dueDateNotification,
  clientUpdate,
  teamUpdate,
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
