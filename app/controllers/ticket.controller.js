const { createLogManually } = require('../middlewares/createLog');
const Ticket = require('../models/ticketModel');
const User = require('../models/user.model');
const TaskComment = require('../models/taskCommentModel');
const { sendNotification } = require('../services/oneSignalService');

exports.getAllTickets = async (req, res) => {
  try {
    const currentUser = req.user?._id || req.userId || req.body?.userId;
    const userWithRoles = await User.findById(currentUser)
      .populate('roles')
      .select('roles')
      .lean();

    const isAdmin =
      userWithRoles?.roles?.name !== 'Client' ||
      userWithRoles?.roles?.name !== 'Site Engineer';

    const { search, page = 1, limit = 10 } = req.query;
    const searchRegex = search ? new RegExp(search, 'i') : null;

    const pageNum = parseInt(page, 10) || 1;
    const limitNum = parseInt(limit, 10) || 10;
    const skip = (pageNum - 1) * limitNum;

    const pipeline = [];

    pipeline.push({
      $sort: { createdAt: -1 },
    });

    // Only restrict if not Admin
    if (!isAdmin) {
      pipeline.push({
        $match: {
          $or: [{ assignMember: currentUser }, { issueMember: currentUser }],
        },
      });
    }

    // Lookup assignMember & assignedBy
    pipeline.push(
      {
        $lookup: {
          from: 'users',
          localField: 'assignMember',
          foreignField: '_id',
          as: 'assignMember',
        },
      },
      {
        $lookup: {
          from: 'users',
          localField: 'assignedBy',
          foreignField: '_id',
          as: 'assignedBy',
        },
      },
      { $unwind: { path: '$assignMember', preserveNullAndEmptyArrays: true } },
      { $unwind: { path: '$assignedBy', preserveNullAndEmptyArrays: true } },

      // Lookup roles
      {
        $lookup: {
          from: 'roles',
          localField: 'assignMember.roles',
          foreignField: '_id',
          as: 'assignMember.roles',
        },
      },
      {
        $lookup: {
          from: 'roles',
          localField: 'assignedBy.roles',
          foreignField: '_id',
          as: 'assignedBy.roles',
        },
      },

      // Lookup comments
      {
        $lookup: {
          from: 'comments',
          localField: 'comments',
          foreignField: '_id',
          as: 'comments',
        },
      },

      // Lookup users for comments
      {
        $lookup: {
          from: 'users',
          localField: 'comments.createdBy',
          foreignField: '_id',
          as: 'commentUsers',
        },
      },

      // Merge commentUsers into comments
      {
        $addFields: {
          comments: {
            $map: {
              input: '$comments',
              as: 'comment',
              in: {
                $mergeObjects: [
                  '$$comment',
                  {
                    createdBy: {
                      $arrayElemAt: [
                        {
                          $filter: {
                            input: '$commentUsers',
                            as: 'cu',
                            cond: { $eq: ['$$cu._id', '$$comment.createdBy'] },
                          },
                        },
                        0,
                      ],
                    },
                  },
                ],
              },
            },
          },
        },
      }
    );

    // Global search
    if (searchRegex) {
      pipeline.push({
        $match: {
          $or: [
            { title: searchRegex },
            { description: searchRegex },
            { status: searchRegex },
            { siteID: searchRegex },
            { query: searchRegex },

            { 'assignMember.username': searchRegex },
            { 'assignMember.firstname': searchRegex },
            { 'assignMember.lastname': searchRegex },

            { 'assignedBy.username': searchRegex },
            { 'assignedBy.firstname': searchRegex },
            { 'assignedBy.lastname': searchRegex },

            { 'assignMember.roles.name': searchRegex },
            { 'assignedBy.roles.name': searchRegex },
          ],
        },
      });
    }

    // Projection (remove sensitive fields)
    pipeline.push({
      $project: {
        'assignMember.token': 0,
        'assignMember.password': 0,
        'assignMember.refreshToken': 0,
        'assignMember.loginOtp': 0,
        'assignMember.phone': 0,
        'assignMember.email': 0,
        'assignMember.country': 0,
        'assignMember.city': 0,
        'assignMember.state': 0,
        'assignMember.userStatus': 0,
        'assignMember.isExit': 0,

        'assignedBy.token': 0,
        'assignedBy.password': 0,
        'assignedBy.refreshToken': 0,
        'assignedBy.loginOtp': 0,
        'assignedBy.phone': 0,
        'assignedBy.email': 0,
        'assignedBy.country': 0,
        'assignedBy.city': 0,
        'assignedBy.state': 0,
        'assignedBy.userStatus': 0,
        'assignedBy.isExit': 0,

        commentUsers: 0,
      },
    });

    // Pagination
    pipeline.push({
      $facet: {
        metadata: [{ $count: 'total' }],
        data: [{ $skip: skip }, { $limit: limitNum }],
      },
    });

    const result = await Ticket.aggregate(pipeline);

    const tickets = result[0]?.data || [];
    const total = result[0]?.metadata[0]?.total || 0;

    return res.status(200).json({
      success: true,
      data: tickets,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    console.error('Error fetching tickets:', error);
    return res.status(500).json({
      success: false,
      message: 'Could not fetch tickets',
      error:
        process.env.NODE_ENV === 'development' ? error.stack : error.message,
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
        path: 'assignMember assignedBy',
        select: 'firstname lastname employeeID playerIds',
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

    await sendNotification({
      users: [ticket.assignedBy],
      title: 'Ticket Reassigned',
      message: `Ticket assigned to new member: ${newMember.firstname} ${newMember.lastname} (${newMember.employeeID}) from ${ticket.assignMember.firstname} ${ticket.assignMember.lastname}`,
      data: { page: 'tickets', id: ticket._id },
    });

    await sendNotification({
      users: [ticket.issueMember],
      title: 'Ticket Reassigned',
      message: `Ticket reassigned to you: ${ticket.title} at site ${ticket.siteID} from ${ticket.assignMember.firstname} ${ticket.assignMember.lastname}`,
      data: { page: 'tickets', id: ticket._id },
    });

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
