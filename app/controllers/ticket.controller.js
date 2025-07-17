const Ticket = require('../models/ticketModel');

exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({}).populate({
      path: 'assignMember',
      modal: 'User',
    });
    res.status(200).send({ data: tickets });
  } catch (err) {
    res
      .status(500)
      .send({ message: 'Could not fetch tickets', error: err.message });
  }
};

exports.getTicketsByClientId = async (req, res) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).send({ message: 'Client ID is required' });
    }
    const tickets = await Ticket.find({ assignedBy: id });
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
    const tickets = await Ticket.find({ assignMember: id });
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

    const tickets = await Ticket.find({ siteId }).populate({
      path: 'assignMember',
      model: 'User',
      select: '-token -password -refreshToken -loginOtp',
      options: { lean: true },
      populate: {
        path: 'roles',
        model: 'Role',
        select: 'name',
      }
    }).lean();

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
