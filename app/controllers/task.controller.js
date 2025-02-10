const db = require("../models");
const Task = db.task;
const Project = db.projects;
const mongoose = require("mongoose");

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = "0" + dd;
if (mm < 10) mm = "0" + mm;
let formatedtoday = yyyy + "-" + mm + "-" + dd;

exports.addTask = (req, res) => {
  let files = [];
  let audios = [];
  // console.log(req.files)
  if (req.files.file) {
    for (let i = 0; i < req.files.file.length; i++) {
      files.push(req.files.file[i].location);
    }
  }
  if (req.files.audio) {
    for (let i = 0; i < req.files.audio.length; i++) {
      audios.push(req.files.audio[i].location);
    }
  }
  const task = {
    title: req.body.title,
    description: req.body.description,
    issueMember: [{ name: req.body.memberName, employeeID: req.body.member }],
    assignedBy: {
      name: req.body.assignedName,
      employeeID: req.body.assignedID,
    },
    category: req.body.category,
    priority: req.body.priority,
    repeat: {
      repeatType: req.body.repeatType,
      repeatTime: req.body.repeatTime,
    },
    dueDate: req.body.dueDate,
    file: files,
    audio: audios,
    reminder: JSON.parse(req.body.reminder || "[]"),
    progress: {
      status: "Pending",
      image: [],
      date: "",
    },
    adminStatus: {
      status: "Pending",
      image: [],
      date: "",
    },
  };
  // console.log(task)
  Task.create(task).then((taskSave, err) => {
    if (err) {
      res.status(500).send({ message: "There was problelm while create task" });
      return;
    } else {
      res.status(201).send({
        status: 201,
        message: "Task created successfully",
        data: taskSave,
      });
    }
  });
};

exports.getAllTask = (req, res) => {
  Task.find({}).then((task, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of task",
      });
      return;
    }
    if (task) {
      res.status(200).send({
        message: "List of tak fetched successfuly",
        data: task,
      });
    }
  });
  return;
};

exports.getTaskByEmployeeId = async (req, res) => {
  Task.find({ "issueMember.employeeID": req.params.id }).then((task, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of task",
      });
      return;
    }
    // console.log(task)
    if (task) {
      res.status(200).send({
        message: "List of tak fetched successfuly",
        data: task,
      });
    }
  });
  return;
};
exports.taskUpdateByMember = async (req, res) => {
  const { status, date, id } = req.body;
  let updateFiles = [];
  // console.log(req.body)
  try {
    if (req.files.image) {
      for (let i = 0; i < req.files.image.length; i++) {
        updateFiles.push(req.files.image[i].location);
      }
    }
    const filter = { _id: id };
    const update = {
      $set: {
        "progress.status": status,
        "progress.date": date,
        "progress.image": updateFiles,
      },
    };
    // console.log(filter,update)
    const result = await Task.updateOne(filter, update);
    // console.log(result)
    if (result.matchedCount === 0) {
      // console.log('No document found with the given filter.');
      res.json({
        status: 200,
        message: "No document found with the given data.",
      });
    } else {
      // console.log('Document updated successfully.');
      res.json({
        status: 200,
        message: "Task updated successfully by Employee.",
      });
    }
  } catch (error) {
    // console.log(error)
    res.json({
      status: 400,
      message: "Error while update task status by Employee",
    });
  }
};
exports.deleteTaskByAdmin = async (req, res) => {
  const id = req.params.id;
  // console.log("calllllllll")
  Task.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Record delete successfully",
      status: 200,
    });
    return;
  });
};

exports.taskUpdateByAdmin = async (req, res) => {
  const { status, date, id } = req.body;
  let updateFiles = [];
  // console.log(req.body)
  try {
    if (req.files.image) {
      for (let i = 0; i < req.files.image.length; i++) {
        updateFiles.push(req.files.image[i].location);
      }
    }
    const filter = { _id: id };
    const update = {
      $set: {
        "adminStatus.status": status,
        "adminStatus.date": date,
        "adminStatus.image": updateFiles,
      },
    };
    // console.log(filter,update)
    const result = await Task.updateOne(filter, update);
    // console.log(result)
    if (result.matchedCount === 0) {
      // console.log('No document found with the given filter.');
      res.json({
        status: 200,
        message: "No document found with the given data.",
      });
    } else {
      // console.log('Document updated successfully.');
      res.json({
        status: 200,
        message: "Task updated successfully by Admin.",
      });
    }
  } catch (error) {
    // console.log(error)
    res.json({
      status: 400,
      message: "Error while update task status by Admin",
    });
  }
};
exports.getAllProjectTaskByClient = async (req, res) => {
  try {
    const ticket = await Project.find({
      "client.id": req.params.id,
    });
    if (ticket?.length > 0) {
      res.json({
        status: 200,
        data: ticket,
      });
    } else {
      res.json({
        status: 200,
        message: "No ticket raised by client",
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while get task of client",
    });
  }
};

exports.getAllProjectTickets = async (req, res) => {
  try {
    const ticket = await Project.find();
    if (ticket?.length > 0) {
      res.json({
        status: 200,
        data: ticket,
      });
    } else {
      res.json({
        status: 200,
        message: "No ticket raised by client",
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while get ticket of client",
    });
  }
};

exports.getTicketByTicketId = async (req, res) => {
  try {
    const { id } = req.params;

    // Use aggregation to find the ticket by its ID
    const ticket = await Project.aggregate([
      {
        $match: {
          "openTicket._id": mongoose.Types.ObjectId(id),
        },
      },
      {
        $project: {
          matchedTicket: {
            $filter: {
              input: "$openTicket",
              as: "ticket",
              cond: {
                $eq: ["$$ticket._id", mongoose.Types.ObjectId(id)],
              },
            },
          },
        },
      },
    ]);

    // Check if we found any tickets
    if (ticket.length > 0 && ticket[0].matchedTicket.length > 0) {
      // Add the extra object to the matchedTicket array
      const response = ticket[0].matchedTicket.map((tick) => ({
        ...tick,
        projectId: ticket[0]?._id, // Add your extra property here
      }));

      res.json({
        status: 200,
        data: response,
      });
    } else {
      res.json({
        status: 200,
        message: "No ticket found",
        data: [],
      });
    }
  } catch (error) {
    console.error(error); // Log the error for debugging
    res.status(400).json({
      status: 400,
      message: "Error while getting ticket",
    });
  }
};

exports.getAllProjectTaskByMember = async (req, res) => {
  try {
    // console.log(req.params.id)
    const ticket = await Project.find({
      "openTicket.assignMember": { $elemMatch: { employeeID: req.params.id } },
    });
    // console.log("find ticket---",ticket)
    if (ticket?.length > 0) {
      res.json({
        status: 200,
        data: ticket,
      });
    } else {
      res.json({
        status: 200,
        message: "No ticket raised by client",
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while get task of client",
    });
  }
};
