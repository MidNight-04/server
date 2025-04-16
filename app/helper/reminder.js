require('dotenv').config();
const axios = require('axios');
const Task = require('../models/task.model');
const TeamMember = require('../models/teamMember.model');

const WATI_API_URL =
  'https://live-mt-server.wati.io/15495/api/v1/sendTemplateMessage';

const API_KEY = process.env.WATI_API_KEY;

if (!API_KEY) {
  throw new Error('WATI_API_KEY is not set in the environment variables');
}

const sendWhatsAppMessage = async () => {
  try {
    const today = new Date();
    const teammembers = await TeamMember.find();
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
                  value: member.name,
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
                'Authorization': `Bearer ${API_KEY}`,
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

module.exports = sendWhatsAppMessage;

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
