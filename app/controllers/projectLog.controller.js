const db = require("../models");
const config = require("../config/auth.config");
const ProjectLog = db.projectlogs;

exports.addLog = (req, res) => {
    let files = [];
    // console.log(req.files)
    if (req.files.file) {
      for (let i = 0; i < req.files.file.length; i++) {
        files.push(req.files.file[i].location);
      }
    }
    const log = {
      log: req.body.chatLog,
      file: files,
      date:req.body.date,
      siteID:req.body.siteID,
      member: {
        name: req.body.userName,
        Id: req.body.userId,
      },
    };
    // console.log(task)
    ProjectLog.create(log).then((logSave, err) => {
      if (err) {
        res.status(500).send({ message: "There was problelm while create log" });
        return;
      } else {
        res.status(201).send({
          status: 201,
          message: "Log created successfully",
          data: logSave,
        });
      }
    });
  };

exports.getAllLog = async (req, res) => {
  await ProjectLog.find({}).then((log, err) => {
    if (err) {
      return res.status(500).send({
        message: "There was a problem in getting the list of log",
      });
      return;
    }
    if (log) {
      return res.status(200).send({
        message: "List of log fetched successfuly",
        data: log,
      });
    }
  });
  return;
};

exports.getLogBySiteId = async (req, res) => {
  const id = req.params.id;
//   console.log("callllll--",id);
  const log = await ProjectLog.find({ siteID: id });
  if (log?.length > 0) {
    return res.status(200).send({
      message: "List of log fetched successfuly",
      data: log,
    });
  }
  return res.status(200).send({
    message: "No log found",
    data: [],
  });
};
