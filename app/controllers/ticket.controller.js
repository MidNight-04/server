const { createLogManually } = require('../middlewares/createLog');
const Ticket = require('../models/ticketModel');
const User = require('../models/user.model');
const TaskComment = require('../models/taskCommentModel');

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find()
      .populate({
        path: 'assignMember assignedBy',
        select:
          '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        populate: {
          path: 'roles',
          model: 'Role',
          select: 'name',
        },
      })
      .populate({
        path: 'comments',
        populate: {
          path: 'createdBy',
          model: 'User',
          select:
            '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        },
      })
      .lean();

    return res.status(200).json({ success: true, data: tickets });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch tickets',
      error: error.message,
    });
  }
};

exports.getTicketsByClientId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ message: 'Client ID is required' });
    }
    const tickets = await Ticket.find({ assignedBy: id })
      .populate({
        path: 'assignMember assignedBy',
        select:
          '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        populate: {
          path: 'roles',
          model: 'Role',
          select: 'name',
        },
      })
      .lean();
    if (!tickets || tickets.length === 0) {
      return res
        .status(404)
        .send({ message: 'No tickets found for the client' });
    }
    res.status(200).send({ data: tickets });
  } catch (err) {
    res
      .status(500)
      .send({ message: 'Error fetching tickets', error: err.message });
  }
};

exports.getTicketsByMemberId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ message: 'Client ID is required' });
    }
    const tickets = await Ticket.find({ assignMember: id })
      .populate({
        path: 'assignMember assignedBy',
        select:
          '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        populate: {
          path: 'roles',
          model: 'Role',
          select: 'name',
        },
      })
      .lean();
    if (!tickets || tickets.length === 0) {
      return res
        .status(404)
        .send({ message: 'No tickets found for the client' });
    }
    res.status(200).send({ data: tickets });
  } catch (err) {
    res
      .status(500)
      .send({ message: 'Error fetching tickets', error: err.message });
  }
};

exports.getTicketBySiteId = async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!siteId?.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Site ID is required',
      });
    }

    const tickets = await Ticket.find({ siteID: siteId })
      .populate({
        path: 'assignMember assignedBy',
        select:
          '-token -password -refreshToken -loginOtp -phone -email -country -city -state -userStatus -isExit',
        populate: {
          path: 'roles',
          model: 'Role',
          select: 'name',
        },
      })
      .lean();

    if (!tickets?.length) {
      return res.status(404).json({
        success: false,
        message: `No tickets found for site ID: ${siteId}`,
        data: [],
      });
    }

    return res.status(200).json({
      success: true,
      count: tickets.length,
      data: tickets,
    });
  } catch (err) {
    console.error('Error fetching tickets:', err);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while fetching tickets',
      error: err.message,
    });
  }
};

exports.changeIssueMember = async (req, res) => {
  try {
    const { ticketId, newMemberId } = req.body;
    const userId = req.body?.userId || req.userId || req.user?._id;

    if (!ticketId || !newMemberId) {
      return res.status(400).json({
        success: false,
        message: 'Ticket ID and new member ID are required',
      });
    }

    const [ticket, newMember] = await Promise.all([
      Ticket.findById(ticketId).populate({
        path: 'assignMember',
        select: 'firstname lastname employeeID',
      }),
      User.findById(newMemberId).lean(),
    ]);

    if (!ticket) {
      return res.status(404).json({
        success: false,
        message: `Ticket not found with ID: ${ticketId}`,
      });
    }

    if (!newMember) {
      return res.status(404).json({
        success: false,
        message: `New member not found with ID: ${newMemberId}`,
      });
    }

    // Create comment
    const commentText = `Ticket assigned to new member: ${newMember.firstname} ${newMember.lastname} (${newMember.employeeID}) from ${ticket.assignMember.firstname} ${ticket.assignMember.lastname} (${ticket.assignMember.employeeID})`;

    // Update ticket
    ticket.assignMember = newMemberId;

    const comment = await new TaskComment({
      comment: commentText,
      type: 'Task Updated',
      createdBy: userId,
      taskId: ticketId,
    }).save();

    // Push comment to ticket
    ticket.comments.push(comment._id);

    await ticket.save();

    // Create log
    await createLogManually(
      req,
      `${commentText} for Query: ${ticket.query} | Site ID: ${ticket.siteID}`,
      ticket.siteID
    );

    // Return populated ticket
    const updatedTicket = await Ticket.findById(ticketId)
      .populate('assignMember', 'firstname lastname employeeID')
      .populate({
        path: 'comments',
        populate: { path: 'createdBy', select: 'firstname lastname' },
      })
      .lean();

    return res.status(200).json({
      success: true,
      message: 'Ticket assigned to new member successfully',
      data: updatedTicket,
    });
  } catch (error) {
    console.error('Error changing issue member:', error);
    return res.status(500).json({
      success: false,
      message: 'Internal Server Error while changing issue member',
      error: error.message,
    });
  }
};
