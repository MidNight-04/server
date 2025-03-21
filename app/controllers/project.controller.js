const db = require("../models");
const Project = db.projects;
const Process = db.constructionsteps;
const PaymentStages = db.paymentStages;
const ProjectPaymentStages = db.projectPaymentStages;
const ProjectPaymentDetails = db.projectPaymentDetails;
const ProjectRole = db.projectroles;
const axios = require("axios");
const PaytmChecksum = require("../helper/PaytmChecksum");
const PayProjects = db.projectPay;
const Task = db.task;
const CheckList = db.checkList;
const TeamMember = db.teammembers;
const ProjectLog = db.projectlogs;
const { ObjectId } = require("mongoose").Types;
const uploadImage = require("../middlewares/uploadImage");
const awsS3 = require("../middlewares/aws-s3");
const { response } = require("express");
// Make sure to import ObjectId

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = "0" + dd;
if (mm < 10) mm = "0" + mm;
let formatedtoday = yyyy + "-" + mm + "-" + dd;

const changeTime = () => {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = today.getMonth() + 1;
  let dd = today.getDate();
  if (dd < 10) dd = "0" + dd;
  if (mm < 10) mm = "0" + mm;
  let final = yyyy + "-" + mm + "-" + dd;
  return final;
};

exports.deleteStatusImage = async (req, res) => {
  try {
    const { _id, url, name, point, content } = req.body;

    const prod = await Project.findById(_id);

    if (!prod) {
      return res.status(404).send({ message: "Project not found" });
    }

    const projectStatusIndex = prod.project_status.findIndex(
      item => item.name === name
    );

    if (projectStatusIndex === -1) {
      return res.status(404).send({ message: "Project status not found" });
    }

    const stepIndex = prod.project_status[projectStatusIndex].step.findIndex(
      item => item.content === content && item.point === parseInt(point)
    );

    if (stepIndex === -1) {
      return res.status(404).send({ message: "Step not found" });
    }

    const imageIndex = prod.project_status[projectStatusIndex].step[
      stepIndex
    ].finalStatus[0].image.findIndex(item => item.url === url);

    if (imageIndex === -1) {
      return res.status(404).send({ message: "Image not found" });
    }

    await awsS3.deleteFile(url.split(".com/")[1]);

    prod.project_status[projectStatusIndex].step[
      stepIndex
    ].finalStatus[0].image.splice(imageIndex, 1);

    await prod.save();

    res.send({ message: "Image removed successfully" });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: "Error while removing image" });
  }
};

exports.addProject = async (req, res) => {
  const { uploadData } = req.body;
  const findproject = await Project.find({ siteID: uploadData.siteID });
  if (findproject?.length > 0) {
    res.status(200).send({ message: "Project already exist with siteID" });
  } else {
    const allStep = await Process.find();
    const flr = uploadData?.floor?.split("+");
    var projectArray = [];
    for (let i = 0; i < allStep?.length; i++) {
      if (allStep[i]?.priority === "2") {
        for (let j = 0; j <= parseInt(flr[1]); j++) {
          projectArray.push({
            name:
              j === 0
                ? flr[0] === "S"
                  ? "Stilt"
                  : "Ground Floor"
                : `Floor ${j}`,
            priority: parseInt(allStep[i]?.priority) + j,
            step: allStep[i]?.points,
          });
        }
      } else if (allStep[i]?.priority === "1") {
        projectArray.push({
          name: allStep[i]?.name,
          priority: 1,
          step: allStep[i]?.points,
        });
      } else {
        projectArray.push({
          name: allStep[i]?.name,
          priority: parseInt(flr[1]) + 3,
          step: allStep[i]?.points,
        });
      }
    }

    const dataAdd = {
      project_name: uploadData.name,
      siteID: uploadData.siteID,
      project_location: uploadData.location,
      client: uploadData.client,
      floor: uploadData.floor,
      area: uploadData.area,
      cost: parseInt(uploadData.cost),
      date: uploadData.date,
      duration: uploadData.duration,
      project_manager: uploadData.manager,
      sr_engineer: uploadData.sr_engineer,
      site_engineer: uploadData.engineer,
      contractor: uploadData.contractor,
      operation: uploadData.operation,
      sales: uploadData.sales,
      project_admin: uploadData.admin,
      accountant: uploadData.accountant,
      openTicket: [],
      project_status: projectArray,
      inspections: [],
    };

    const findStage = await PaymentStages.find({ floor: uploadData.floor });
    if (findStage?.length > 0) {
      const stages = findStage[0]?.stages?.map(item => ({
        ...item,
        paymentStatus: "Not Due Yet",
        paymentDueDate: "",
        installments: [],
      }));
      const stageData = {
        siteID: uploadData.siteID,
        clientID: uploadData?.client?.id,
        floor: findStage[0]?.floor,
        stages: stages,
      };
      let payStage = new ProjectPaymentStages(stageData);

      const uniqueRoleIds = await TeamMember.distinct("role");
      const uniqueRoles = await ProjectRole.find({
        _id: { $in: uniqueRoleIds },
      }).then(response => {
        const array = response.map(item => item.name);
        return array;
      });

      payStage.save((err, result) => {
        if (err) {
          console.log(err);
          res.status(500).send({ message: "Could not create record" });
          return;
        } else {
          projectArray.forEach(element => {
            element.step?.forEach(async el => {
              if (el.checkList === "yes") {
                dataAdd["inspections"]?.push({
                  checkListStep: element.name,
                  name: el.checkListName,
                  checkListNumber: el.point,
                  checkList: [],
                  passed: false,
                });
              }

              let issueMember;
              let referenceModel;

              const task = {
                title: el.content,
                description: el.content,
                assignedBy: uploadData.assignedID,
                siteID: uploadData.siteID,
                dueDate: changeTime(),
                // reminder: JSON.parse(req.body.reminder),
              };
              for (i = 0; i < el.issueMember?.length; i++) {
                if (el.issueMember[i]?.toLowerCase() === "admin") {
                  issueMember = uploadData.assignedID;
                }
                const roleIndex = uniqueRoles.findIndex(
                  role =>
                    role.toLowerCase() === el.issueMember[i]?.toLowerCase()
                );
                if (roleIndex !== -1) {
                  switch (uniqueRoles[roleIndex].toLowerCase()) {
                    case "admin":
                      issueMember = uploadData?.admin;
                      referenceModel = "teammembers";
                      break;
                    case "manager":
                      issueMember = uploadData?.manager;
                      referenceModel = "teammembers";
                      break;
                    case "architect":
                      issueMember = uploadData?.architect;
                      referenceModel = "teammembers";
                      break;
                    case "sr. engineer":
                      issueMember = uploadData?.sr_engineer;
                      referenceModel = "teammembers";
                      break;
                    case "site engineer":
                      issueMember = uploadData?.engineer;
                      referenceModel = "teammembers";
                      break;
                    case "accountant":
                      issueMember = uploadData?.accountant;
                      referenceModel = "teammembers";
                      break;
                    case "operations":
                      issueMember = uploadData?.operation;
                      referenceModel = "teammembers";
                      break;
                    case "sales":
                      issueMember = uploadData?.sales;
                      referenceModel = "teammembers";
                      break;
                    default:
                      break;
                  }
                } else if (el.issueMember[i]?.toLowerCase() === "client") {
                  issueMember = uploadData?.client;
                  referenceModel = "clients";
                }
              }
              task["issueMember"] = issueMember;
              task["referenceModel"] = referenceModel;
              await Task.create(task);
            });
          });
          let project = new Project(dataAdd);
          project.save((err, result) => {
            if (err) {
              console.log(err);
              res.status(500).send({ message: "Could not create record" });
              return;
            } else {
              res
                .status(201)
                .send({ message: "Record created Successfuly", status: 201 });
            }
            return;
          });
        }
      });
    } else {
      res.json({
        message: `First create payment stage for G+${uploadData.floor} floor`,
        status: 204,
      });
    }
  }
};
// let result = await TeamMembers.findOne({ _id: objectId });

//       if (!result) {
//           result = await Client.findOne({ _id: objectId });
//       }

exports.getAllProject = (req, res) => {
  Project.find({}).then((project, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of project",
      });
      return;
    }
    if (project) {
      res.status(200).send({
        message: "List of project fetched successfuly",
        data: project,
      });
    }
  });
  return;
};

exports.getProjectByMember = (req, res) => {
  // console.log(req.params.id)
  Project.find({
    $or: [
      { "project_manager.employeeID": req.params.id },
      { "site_engineer.employeeID": req.params.id },
      { "contractor.employeeID": req.params.id },
      { "accountant.employeeID": req.params.id },
      { "operation.employeeID": req.params.id },
      { "project_admin.employeeID": req.params.id },
      { "sr_engineer.employeeID": req.params.id },
      { "sales.employeeID": req.params.id },
    ],
  }).then((project, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of project",
      });
      return;
    }
    if (project) {
      // console.log(project)
      res.status(200).send({
        message: "List of project fetched successfuly",
        data: project,
      });
    }
  });
};

exports.getProjectByClientId = (req, res) => {
  Project.find({ client: req.params.id }).then((project, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of project",
      });
      return;
    }
    if (project) {
      // console.log(project)
      res.status(200).send({
        message: "List of project fetched successfuly",
        data: project,
      });
    }
  });
};

exports.deleteProjectById = (req, res) => {
  const id = req.params.id;
  Project.deleteOne({ siteID: id }, async (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    await ProjectPaymentStages.deleteMany({ siteID: id });
    await Task.deleteMany({ siteID: id });
    await ProjectPaymentDetails.deleteMany({ siteID: id });
    await ProjectLog.deleteMany({ siteID: id });
    res.status(200).send({
      message: "Record delete successfully",
      status: 200,
    });
    return;
  });
};
exports.addProjectMember = async (req, res) => {
  try {
    const { data } = req.body;
    // console.log(data);
    const newData = {
      project_admin: data.project_admin,
      project_manager: data.project_manager,
      site_engineer: data.site_engineer,
      sr_engineer: data.sr_engineer,
      accountant: data.accountant,
      operation: data.operation,
      sales: data.sales,
      contractor: data.contractor,
    };

    // Function to check if all fields in newData are blank
    function areAllFieldsBlank(item) {
      return Object.values(item).every(
        array => Array.isArray(array) && array.length === 0
      );
    }
    console.log(areAllFieldsBlank(newData));
    if (areAllFieldsBlank(newData)) {
      return res.send({
        message: "All data fields are blank. No operation performed.",
        status: 400,
      });
    } else {
      const siteID = data?.siteID;
      const existingDocument = await Project.findOne({ siteID });
      let alreadyExists = false;

      // Check if the new data is already present in the respective roles
      const roles = [
        "project_admin",
        "project_manager",
        "site_engineer",
        "sr_engineer",
        "accountant",
        "contractor",
        "sales",
        "operation",
      ];
      roles.forEach(role => {
        if (newData[role].length > 0) {
          // console.log(existingDocument);
          const existingRoleData = existingDocument[role];
          // console.log(existingRoleData);
          newData[role].forEach(newEntry => {
            if (
              existingRoleData?.some(
                existingEntry =>
                  existingEntry.employeeID === newEntry.employeeID
              )
            ) {
              alreadyExists = true;
            }
          });
        }
      });
      if (alreadyExists) {
        return res.send({ message: "Record already exist", status: 204 });
      } else {
        // Push new data to the respective arrays if not already present
        roles.forEach(async role => {
          if (newData[role].length > 0) {
            await Project.updateOne(
              { siteID },
              { $push: { [role]: { $each: newData[role] } } }
            );
          }
        });
        return res
          .status(200)
          .send({ message: "Record added successfully", status: 200 });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Error on add record", status: 500 });
  }
};
exports.deleteProjectMember = async (req, res) => {
  try {
    const { siteID, employeeID } = req.body;
    console.log(siteID, employeeID);
    // Find the document with the given siteID
    const existingDocument = await Project.findOne({ siteID });

    let memberFound = false;

    // Check if the role is valid
    const roles = [
      "project_admin",
      "project_manager",
      "site_engineer",
      "accountant",
      "sr_engineer",
      "sales",
      "contractor",
      "operation",
    ];

    for (const role of roles) {
      if (existingDocument[role].length > 0) {
        const memberIndex = existingDocument[role].findIndex(
          member => member.employeeID === employeeID
        );

        if (memberIndex !== -1) {
          // If the member is found in this role, remove it
          await Project.updateOne(
            { siteID },
            { $pull: { [role]: { employeeID } } }
          );
          memberFound = true;
        }
      }
    }
    if (!memberFound) {
      return res
        .status(404)
        .send({ message: "Member not found.", status: 404 });
    }
    return res.status(200).send({ message: "Member removed", status: 200 });
  } catch (error) {
    return res
      .status(500)
      .send({ message: "Error on remove record", status: 500 });
  }
};
exports.getProjectById = (req, res) => {
  const id = req.params.id;
  Project.find({ siteID: id })
    .populate({
      path: "project_admin project_manager site_engineer accountant sr_engineer sales operation",
      model: "teammembers",
      populate: {
        path: "role",
        model: "projectroles",
      },
    })
    .then(data => {
      if (!data) {
        res.status(404).send({ message: "Project not found" });
        return;
      }
      res.status(200).send({ data: data, status: 200 });
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({ message: "Could not find id to get details" });
    });
};
``;

exports.updateProjectById = (req, res) => {
  const { id, name, role, phone, address } = req.body;
  const data = { name: name, role: role, phone: phone, address: address };
  Project.updateOne({ siteID: id }, data, (err, updated) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: "Could not find id to update details" });
      return;
    }
    if (updated) {
      res.status(200).send({ message: "Updated Successfuly" });
    }
  });
};
exports.updateProjectTaskByMember = async (req, res) => {
  const { id, name, point, content, status, date, activeUser, userName } =
    req.body;
  // console.log(req.body);
  let profileFiles = [];

  if (req.files?.image?.length > 0) {
    for (let i = 0; i < req.files.image?.length; i++) {
      profileFiles.push(req.files.image[i].location);
    }
  }
  try {
    // Find the project document by _id
    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.json({
        status: 200,
        message: "Project not found",
      });
    } else {
      // Update the status in the project_status array
      const statusIndex = project.project_status.findIndex(
        st => st.name === name
      );
      if (statusIndex !== -1) {
        let updateStep = project.project_status[statusIndex].step.find(step => {
          return step.point === parseInt(point) && step.content === content;
        });
        if (updateStep) {
          // updateStep.finalStatus[0].status = status;
          // updateStep.finalStatus[0].image = profileFiles;
          // updateStep.finalStatus[0].date = date;
          updateStep.dailyTask?.push({
            image: profileFiles,
            status: status,
            date: date,
          });
        }
      }
      // Save the updated project document
      await project.save();
      await Task.updateOne(
        { siteID: id, title: content, description: content },
        {
          $set: {
            "progress.status": status,
            "progress.date": date,
            "progress.image": profileFiles,
          },
        }
      );

      const logData = {
        log: `<span style="color: black;">${content} ->> update </span> ->> <em style="color: green">${status}</em>`,
        file: profileFiles,
        date: date,
        siteID: id,
        member: {
          name: userName,
          Id: activeUser,
        },
      };
      const logSave = new ProjectLog(logData);
      await logSave.save();
      return res.json({
        status: 200,
        message: "Project work updated successfully",
      });
    }
  } catch (err) {
    console.log(err);
    return res.json({
      status: 400,
      message: "Error while update project work approval",
    });
  }
};

exports.updateProjectStatusById = async (req, res) => {
  try {
    const {
      id,
      name,
      point,
      content,
      status,
      date,
      checkListName,
      chatLog,
      userName,
      userId,
    } = req.body;
    let profileFiles = [];

    if (req.files?.image?.length > 0) {
      for (let i = 0; i < req.files.image?.length; i++) {
        if (typeof req.files.image[i] === "string") {
          profileFiles.push({
            image: req.files.image[i],
            isApproved: false,
          });
        } else {
          profileFiles.push({
            url: req.files.image[i].location,
            isApproved: false,
          });
        }
      }
    }

    const logData = {
      log: `<span style="color: black;">${content}</span> ->> <em style="color: #fec20e;">${status}</em>`,
      file: profileFiles,
      siteID: id,
      date: date,
      member: {
        name: userName,
        Id: userId,
      },
    };

    const logCreate = new ProjectLog(logData);

    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.json({
        status: 200,
        message: "Project not found",
      });
    }

    const statusIndex = project.project_status.findIndex(
      st => st.name === name
    );

    if (statusIndex !== -1) {
      const updateStep = project.project_status[statusIndex].step.find(
        step => step.point === parseInt(point) && step.content === content
      );

      if (updateStep) {
        const images =
          project.project_status[statusIndex].step[point - 1].finalStatus[0]
            .image;

        updateStep.finalStatus[0].status = status;
        updateStep.finalStatus[0].image = [...images, ...profileFiles];
        updateStep.finalStatus[0].date = date;
        // updateStep.approvalTask?.push({
        //   approveImage: [...images, ...profileFiles],
        //   approveStatus: status,
        //   approveDate: date,
        // });
      }
    }

    if (checkListName) {
      await Project.updateOne(
        {
          "siteID": id,
          "inspections.checkListStep": name,
          "inspections.name": checkListName,
          "inspections.checkListNumber": parseInt(point),
        },
        {
          $set: {
            "inspections.$.passed": true,
          },
        }
      );
    }

    await Task.updateOne(
      { siteID: id, title: content, description: content },
      {
        $set: {
          "adminStatus.status": status,
          "adminStatus.date": date,
          "adminStatus.image": profileFiles,
        },
      }
    );

    await logCreate.save();
    await project.save();

    return res.json({
      status: 200,
      message: "Project work approval updated successfully",
    });
  } catch (err) {
    return res.json({
      status: 400,
      message: "Error while update project work approval",
    });
  }
};
exports.updateProjectStatusById = async (req, res) => {
  try {
    const {
      id,
      name,
      point,
      content,
      status,
      date,
      checkListName,
      chatLog,
      userName,
      userId,
    } = req.body;
    let profileFiles = [];

    if (req.files?.image?.length > 0) {
      for (let i = 0; i < req.files.image?.length; i++) {
        if (typeof req.files.image[i] === "string") {
          profileFiles.push({
            image: req.files.image[i],
            isApproved: false,
          });
        } else {
          profileFiles.push({
            url: req.files.image[i].location,
            isApproved: false,
          });
        }
      }
    }

    const logData = {
      log: `<span style="color: black;">${content}</span> ->> <em style="color: #fec20e;">${status}</em>`,
      file: profileFiles,
      siteID: id,
      date: date,
      member: {
        name: userName,
        Id: userId,
      },
    };

    const logCreate = new ProjectLog(logData);

    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.json({
        status: 200,
        message: "Project not found",
      });
    }

    const statusIndex = project.project_status.findIndex(
      st => st.name === name
    );

    if (statusIndex !== -1) {
      const updateStep = project.project_status[statusIndex].step.find(
        step => step.point === parseInt(point) && step.content === content
      );

      if (updateStep) {
        const images =
          project.project_status[statusIndex].step[point - 1].finalStatus[0]
            .image;

        updateStep.finalStatus[0].status = status;
        updateStep.finalStatus[0].image = [...images, ...profileFiles];
        updateStep.finalStatus[0].date = date;
      }
    }

    if (checkListName) {
      await Project.updateOne(
        {
          "siteID": id,
          "inspections.checkListStep": name,
          "inspections.name": checkListName,
          "inspections.checkListNumber": parseInt(point),
        },
        {
          $set: {
            "inspections.$.passed": true,
          },
        }
      );
    }

    await Task.updateOne(
      { siteID: id, title: content, description: content },
      {
        $set: {
          "adminStatus.status": status,
          "adminStatus.date": date,
          "adminStatus.image": profileFiles,
        },
      }
    );

    await logCreate.save();
    await project.save();

    return res.json({
      status: 200,
      message: "Project work approval updated successfully",
    });
  } catch (err) {
    console.error(err);
    return res.json({
      status: 400,
      message: "Error while update project work approval",
      error: err.message,
    });
  }
};

exports.updateImageStatus = async (req, res) => {
  try {
    const { id, name, point, userName, userId, url } = req.body;
    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const statusIndex = project.project_status.findIndex(
      item => item.name === name
    );
    if (statusIndex === -1) {
      return res.status(404).json({ message: "Project status not found" });
    }

    const stepIndex = project.project_status[statusIndex].step.findIndex(
      item => item.point === parseInt(point, 10)
    );
    if (stepIndex === -1) {
      return res.status(404).json({ message: "Step not found" });
    }

    const finalStatus =
      project.project_status[statusIndex].step[stepIndex].finalStatus;
    if (!finalStatus || finalStatus.length === 0) {
      return res.status(404).json({ message: "Final status not found" });
    }

    const imageIndex = finalStatus[0].image.findIndex(item => item.url === url);
    if (imageIndex === -1) {
      return res.status(404).json({ message: "Image not found" });
    }

    finalStatus[0].image[imageIndex].isApproved = true;
    finalStatus[0].image[imageIndex].approvedBy = { userId, userName };
    project.markModified("project_status");

    await project.save();

    return res.json({
      status: 200,
      message: "Project image updated successfully.",
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Error while updating image status" });
  }
};

exports.deleteImage = async (req, res) => {
  const { url } = req.body;
  console.log(url);
  uploadImage.deleteFile(url).then(res => console.log(res));
};

const Ticket = require("../models/ticketModel");
const TaskComment = require("../models/taskCommentModel");

exports.clientQueryForProject = async (req, res) => {
  const {
    id,
    name,
    point,
    content,
    assignedBy,
    assignMember,
    status,
    log,
    date,
  } = req.body;
  let profileFiles = [];
  let mems = [];
  // Create a date object for September 28, 2024
  const dateTime = new Date(date);

  // Get the current time
  const now = new Date();

  // Set the hours, minutes, seconds, and milliseconds of the date object to match the current time
  dateTime.setHours(
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
    now.getMilliseconds()
  );

  if (req.files.image) {
    for (let i = 0; i < req.files.image.length; i++) {
      profileFiles.push(req.files.image[i].location);
    }
  }
  try {
    const project = await Project.findOne({ siteID: id });
    if (!project) {
      res.json({
        status: 200,
        message: "Project not found",
      });
    } else {
      const ticket = new Ticket({
        step: name,
        siteID: id,
        point,
        content,
        query: log,
        date: dateTime,
        work: status,
        assignedBy,
        assignMember,
        image: profileFiles,
      });

      await ticket
        .save()
        .then(result => {
          Project.updateOne(
            { siteID: id },
            {
              $push: {
                openTicket: result._id,
              },
            }
          ).then(result => {
            res.json({
              status: 200,
              message: "Client ticket raised successfully",
            });
          });
        })
        .catch(err => {
          console.log(err);
          res.json({
            status: 400,
            message: "Error on raised ticket",
          });
        });
    }
  } catch (err) {
    console.log(err);
    res.json({
      status: 400,
      message: "Error while raised ticket by client",
    });
  }
};
exports.addNewPointById = async (req, res) => {
  const {
    id,
    checkListStep,
    name,
    number,
    checkList,
    date,
    siteID,
    userName,
    activeUser,
  } = req.body;
  try {
    const filter = {
      "siteID": id,
      "inspections.checkListStep": checkListStep,
      "inspections.name": name,
      "inspections.checkListNumber": number,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $push: {
        "inspections.$.checkList": checkList[0],
      },
    };
    // Perform the update
    const result = await Project.updateOne(filter, updateOperation);
    // console.log(result);
    if (result.modifiedCount === 1) {
      const logData = {
        log: `<span style="color: black;">${name}</span> ->> <em style="color: green">added</em>`,
        file: [],
        date: date,
        siteID: siteID,
        member: {
          name: userName,
          Id: activeUser,
        },
      };
      const logSave = new ProjectLog(logData);
      await logSave.save();
      return res.json({
        status: 200,
        message: "New point added successfully",
      });
    } else {
      res.json({
        status: 400,
        message: "Error on add new point",
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while record create",
    });
  }
};
exports.addNewExtraPointById = async (req, res) => {
  const {
    id,
    checkListStep,
    name,
    number,
    heading,
    point,
    status,
    date,
    siteID,
    userName,
    activeUser,
  } = req.body;
  // console.log("upcoming body--",req.body);
  try {
    await Project.updateOne(
      {
        "siteID": id,
        "inspections.checkListStep": checkListStep,
        "inspections.name": name,
        "inspections.checkListNumber": number,
        "inspections.checkList.heading": heading,
      },
      [
        {
          $set: {
            inspections: {
              $map: {
                input: "$inspections",
                as: "inspection",
                in: {
                  $mergeObjects: [
                    "$$inspection",
                    {
                      checkList: {
                        $map: {
                          input: "$$inspection.checkList",
                          as: "checkList",
                          in: {
                            $cond: {
                              if: { $eq: ["$$checkList.heading", heading] },
                              then: {
                                $mergeObjects: [
                                  "$$checkList",
                                  {
                                    points: {
                                      $concatArrays: [
                                        "$$checkList.points",
                                        [{ point: point, status: status }],
                                      ],
                                    },
                                  },
                                ],
                              },
                              else: "$$checkList",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]
    );
    // console.log("Update successful");
    const logData = {
      log: `<span style="color: black;">${name} (${point})</span> ->> <em style="color: green">added</em>`,
      file: [],
      date: date,
      siteID: siteID,
      member: {
        name: userName,
        Id: activeUser,
      },
    };
    const logSave = new ProjectLog(logData);
    await logSave.save();
    return res.json({
      message: "New extra point added successfully",
      status: 200,
    });
  } catch (error) {
    // console.log(error);
    res.json({
      status: 400,
      message: "Error while record update",
    });
  }
};

exports.deleteExtraPointById = async (req, res) => {
  try {
    const {
      id,
      checkListStep,
      heading,
      name,
      number,
      point,
      date,
      siteID,
      userName,
      activeUser,
    } = req.body;
    await Project.updateOne(
      {
        "siteID": id,
        "inspections.checkListStep": checkListStep,
        "inspections.name": name,
        "inspections.checkListNumber": number,
        "inspections.checkList.heading": heading,
      },
      [
        {
          $set: {
            inspections: {
              $map: {
                input: "$inspections",
                as: "inspection",
                in: {
                  $mergeObjects: [
                    "$$inspection",
                    {
                      checkList: {
                        $map: {
                          input: "$$inspection.checkList",
                          as: "checkList",
                          in: {
                            $cond: {
                              if: { $eq: ["$$checkList.heading", heading] },
                              then: {
                                $mergeObjects: [
                                  "$$checkList",
                                  {
                                    points: {
                                      $filter: {
                                        input: "$$checkList.points",
                                        as: "point",
                                        cond: { $ne: ["$$point.point", point] },
                                      },
                                    },
                                  },
                                ],
                              },
                              else: "$$checkList",
                            },
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      ]
    );
    const logData = {
      log: `<span style="color: black;">${name} (${point})</span> ->> <em style="color: green">delete</em>`,
      file: [],
      date: date,
      siteID: siteID,
      member: {
        name: userName,
        Id: activeUser,
      },
    };
    const logSave = new ProjectLog(logData);
    await logSave.save();
    return res.json({
      message: "Point deleted successfully",
      status: 200,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while delete point",
    });
  }
};

exports.filterData = async (req, res) => {
  const { searchData } = req.query;
  const regex = new RegExp(searchData, "i"); // 'i' for case-insensitive matching
  const searchNumber = Number(searchData);
  // Check if searchNumber is NaN
  const isNumber = isNaN(searchNumber);
  if (isNumber) {
    Project.find({
      $or: [
        { project_name: { $regex: regex } },
        { siteID: { $regex: regex } },
        { project_location: { $regex: regex } },
        { floor: { $regex: regex } },
        { area: { $regex: regex } },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: "There was a problem in getting the list of project",
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: "List of project fetched successfuly",
          data: project,
        });
      }
    });
  } else {
    Project.find({
      $or: [
        { project_name: { $regex: regex } },
        { siteID: { $regex: regex } },
        { project_location: { $regex: regex } },
        { floor: { $regex: regex } },
        { area: { $regex: regex } },
        { cost: searchNumber },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: "There was a problem in getting the list of project",
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: "List of project fetched successfuly",
          data: project,
        });
      }
    });
  }
};
exports.filterMemberData = async (req, res) => {
  const { searchData, memberId } = req.query;
  const regex = new RegExp(searchData, "i"); // 'i' for case-insensitive matching
  const searchNumber = Number(searchData);
  // Check if searchNumber is NaN
  const isNumber = isNaN(searchNumber);
  if (isNumber) {
    Project.find({
      $and: [
        {
          $or: [
            { project_name: { $regex: regex } },
            { siteID: { $regex: regex } },
            { project_location: { $regex: regex } },
            { floor: { $regex: regex } },
            { area: { $regex: regex } },
          ],
        },
        {
          $or: [
            { "project_manager.employeeID": memberId },
            { "site_engineer.employeeID": memberId },
            { "contractor.employeeID": memberId },
            { "accountant.employeeID": memberId },
            { "sr_engineer.employeeID": memberId },
            { "sales.employeeID": memberId },
            { "operation.employeeID": memberId },
            { "project_admin.employeeID": memberId },
          ],
        },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: "There was a problem in getting the list of project",
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: "List of project fetched successfuly",
          data: project,
        });
      }
    });
  } else {
    Project.find({
      $and: [
        {
          $or: [
            { project_name: { $regex: regex } },
            { siteID: { $regex: regex } },
            { project_location: { $regex: regex } },
            { floor: { $regex: regex } },
            { area: { $regex: regex } },
            { cost: searchNumber },
          ],
        },
        {
          $or: [
            { "project_manager.employeeID": memberId },
            { "site_engineer.employeeID": memberId },
            { "contractor.employeeID": memberId },
            { "accountant.employeeID": memberId },
            { "sr_engineer.employeeID": memberId },
            { "sales.employeeID": memberId },
            { "operation.employeeID": memberId },
            { "project_admin.employeeID": memberId },
          ],
        },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: "There was a problem in getting the list of project",
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: "List of project fetched successfuly",
          data: project,
        });
      }
    });
  }
};

exports.initiatePayment = (req, res) => {
  const { orderId, payAmount, callbackUrl, currency, activeUser } = req.body;

  // Sandbox Credentials
  let mid = "WBJIwm08119302462954"; // Merchant ID
  let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key
  var paytmParams = {};

  paytmParams.body = {
    requestType: "Payment",
    mid: mid,
    websiteName: "DEFAULT",
    orderId: orderId,
    callbackUrl: callbackUrl,
    txnAmount: {
      value: payAmount,
      currency: currency,
    },
    userInfo: {
      custId: activeUser,
    },
  };

  /*
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
   */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
    function (checksum) {
      console.log(checksum);

      paytmParams.head = {
        signature: checksum,
      };

      var post_data = JSON.stringify(paytmParams);

      let data = post_data;

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios
        .request(config)
        .then(response => {
          res.status(200).send({ data: response.data });
          return;
        })
        .catch(error => {
          console.log(error);
        });
    }
  );
};

// verify payment
exports.verifyPayment = (req, res) => {
  const {
    siteID,
    clientID,
    paymentStage,
    amount,
    orderId,
    contactType,
    projectDetails,
    paymentType,
  } = req.body;
  // Sandbox Credentials
  let mid = "WBJIwm08119302462954"; // Merchant ID
  let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key

  /* initialize an object */
  var paytmParams = {};

  /* body parameters */
  paytmParams.body = {
    /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
    mid: mid,

    /* Enter your order id which needs to be check status for */
    orderId: orderId,
  };

  /**
   * Generate checksum by parameters we have in body
   * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
   */
  PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
    function (checksum) {
      /* head parameters */
      paytmParams.head = {
        /* put generated checksum value here */
        signature: checksum,
      };

      /* prepare JSON string for request */
      var post_data = JSON.stringify(paytmParams);

      let data = post_data;

      let config = {
        method: "post",
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/v3/order/status`,
        headers: {
          "Content-Type": "application/json",
        },
        data: data,
      };

      axios
        .request(config)
        .then(response => {
          const query = {
            siteID,
            clientID,
            payStage: paymentStage,
            paymentAmount: amount,
            contactType,
            paymentType,
            paymentInformation: response.data,
            projectDetails,
          };

          if (contactType == "Project Payment") {
            const saveOrder = new PayProjects(query);
            saveOrder.save((err, orderSaved) => {
              console.log(err, orderSaved);
              if (err) {
                console.log(err);
                res.status(500).send({ message: err });
                return;
              }
              if (orderSaved) {
                res.send({
                  message: "Payment Done Successfully",
                  data: orderSaved,
                });
              }
              return;
            });
          }
        })
        .catch(error => {
          console.log(error);
          res.send({
            message: "Error on payment",
          });
        });
    }
  );
};

exports.AddNewProjectPoint = async (req, res) => {
  const {
    id,
    stepName,
    pointName,
    checkList,
    checkListName,
    forceMajeure,
    duration,
    issueMember,
    prevContent,
    prevPoint,
    userName,
    activeUser,
    uploadData,
    date,
  } = req.body;

  const member =
    issueMember.role.name === "Manager"
      ? "Project Manager"
      : issueMember.role.name;

  try {
    const findData = await Project.find({ siteID: id });
    const newObj = {
      point: parseInt(prevPoint) + 1,
      content: pointName,
      issueMember: member,
      duration: duration,
      checkList: checkList,
      forceMajeure: forceMajeure.isForceMajeure,
      checkListName: checkListName,
      checkListPoint: [],
      finalStatus: [{ status: "Pending", image: [], date: "" }],
      approvalTask: [],
      dailyTask: [],
    };
    var targetProjectIndex = findData[0]?.project_status.findIndex(
      status => status.name === stepName
    );

    // Find the index of the step within the targeted project_status
    var stepIndex =
      targetProjectIndex !== -1
        ? findData[0]?.project_status[targetProjectIndex]?.step?.findIndex(
            obj => obj.point === parseInt(prevPoint)
          )
        : -1;

    // If both indices are found, proceed to insert the new object into the step array
    if (targetProjectIndex !== -1 && stepIndex !== -1) {
      // Insert newObj at stepIndex + 1 in the step array of the targeted project_status object
      findData[0]?.project_status[targetProjectIndex]?.step?.splice(
        stepIndex + 1,
        0,
        newObj
      );
      // Update 'point' numbers starting from the newly inserted object
      for (
        var i = stepIndex + 2;
        i < findData[0]?.project_status[targetProjectIndex]?.step?.length;
        i++
      ) {
        findData[0].project_status[targetProjectIndex].step[i].point += 1;
      }
    } else {
      return res
        .status(404)
        .json({ message: "Step or Project Status not found" });
    }

    // console.log(findData[0]?.project_status[targetProjectIndex]?.step);

    if (forceMajeure.isForceMajeure) {
      const updateResult = await Project.updateOne(
        { "siteID": id, "project_status.name": stepName },
        {
          $set: {
            "project_status.$.step":
              findData[0].project_status[targetProjectIndex].step,
          },
          $push: {
            forceMajeure: {
              reason: pointName,
              duration,
              startDate: forceMajeure.startDate,
              endDate: forceMajeure.endDate,
            },
          },
          $inc: {
            extension: duration,
          },
        }
      );
    } else {
      const updateResult = await Project.updateOne(
        { "siteID": id, "project_status.name": stepName },
        {
          $set: {
            "project_status.$.step":
              findData[0].project_status[targetProjectIndex].step,
          },
          $inc: {
            extension: duration,
          },
        }
      );
    }

    if (updateResult.modifiedCount === 1) {
      if (checkList?.toLowerCase() === "yes") {
        const dataUpload = {
          checkListStep: stepName,
          name: checkListName,
          checkListNumber: newObj.point,
          checkList: [],
        };
        let Check = new CheckList(dataUpload);
        Check.save();
      }
      const task = {
        title: pointName,
        description: pointName,
        assignedBy: activeUser,
        referenceModel: "teammembers",
        siteID: id,
        priority: "High",
        dueDate: changeTime(),
      };

      task["issueMember"] = member;
      await Task.create(task);

      if (checkList?.toLowerCase() === "yes") {
        await Project.updateOne(
          { siteID: id },
          {
            $push: {
              inspections: {
                checkListStep: stepName,
                name: checkListName,
                checkListNumber: newObj.point,
                checkList: [],
              },
            },
          }
        );
      }
      return res.json({
        status: 200,
        message: "New Field added successfully",
      });
    } else {
      res.status(500).json({ message: "No changes were made to the project" });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while add new point",
    });
  }
};

// exports.DeleteProjectPoint = async (req, res) => {
//   const { id, name, point, content, checkList, checkListName, duration } =
//     req.body;

//   try {
//     const project = await Project.findOne({ siteID: id });

//     if (!project) {
//       return res.status(404).json({ message: "Project not found" });
//     }

//     const projectStatus = project.project_status.find(
//       status => status.name === name
//     );

//     if (!projectStatus) {
//       return res.status(404).json({ message: "Project Status not found" });
//     }

//     const stepIndex = projectStatus.step.findIndex(
//       step => step.point === point
//     );

//     if (stepIndex === -1) {
//       return res.status(404).json({ message: "Step not found" });
//     }

//     // Handle force majeure removal
//     const stepToRemove = projectStatus.step[stepIndex];

//     if (stepToRemove.forceMajeure) {
//       const fMIndex = project.forceMajeure.findIndex(
//         item => item.reason === stepToRemove.content
//       );

//       if (fMIndex !== -1) {
//         project.forceMajeure.splice(fMIndex, 1);
//       }
//     }

//     // Remove the step
//     projectStatus.step.splice(stepIndex, 1);

//     // Reorder points
//     projectStatus.step.forEach((step, index) => {
//       step.point = index + 1;
//     });

//     // MongoDB update
//     const updatePayload = {
//       $set: { "project_status.$.step": projectStatus.step },
//       $inc: { extension: -duration },
//     };

//     if (checkList?.toLowerCase() === "yes") {
//       updatePayload.$pull = {
//         inspections: {
//           checkListStep: name,
//           name: checkListName,
//           checkListNumber: point,
//         },
//       };
//     }

//     const updateResult = await Project.updateOne(
//       { "siteID": id, "project_status.name": name },
//       updatePayload
//     );

//     project.save();

//     if (updateResult.modifiedCount === 0) {
//       return res
//         .status(500)
//         .json({ message: "No changes were made to the project" });
//     }

//     if (checkList?.toLowerCase() === "yes") {
//       await CheckList.deleteMany({
//         checkListStep: name,
//         name: checkListName,
//         checkListNumber: point,
//       });
//     }

//     await Task.deleteMany({
//       siteID: id,
//       title: content,
//       description: content,
//       category: "project",
//     });

//     res.json({ status: 200, message: "Point removed successfully" });
//   } catch (error) {
//     console.error("Error while removing point:", error);
//     res
//       .status(500)
//       .json({ message: "Error while removing point", error: error.message });
//   }
// };

exports.DeleteProjectPoint = async (req, res) => {
  const { id, name, point, content, checkList, checkListName, duration } =
    req.body;

  try {
    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.status(404).json({ message: "Project not found" });
    }

    const projectStatus = project.project_status.find(
      status => status.name === name
    );

    if (!projectStatus) {
      return res.status(404).json({ message: "Project Status not found" });
    }

    const stepIndex = projectStatus.step.findIndex(
      step => step.point === point
    );

    if (stepIndex === -1) {
      return res.status(404).json({ message: "Step not found" });
    }

    const stepToRemove = projectStatus.step[stepIndex];

    // MongoDB Update Payload
    const updatePayload = {
      $pull: {
        "project_status.$[status].step": { point },
        ...(stepToRemove.forceMajeure && {
          forceMajeure: { reason: stepToRemove.content },
        }),
      },
      $inc: { extension: -duration },
    };

    if (checkList?.toLowerCase() === "yes") {
      updatePayload.$pull.inspections = {
        checkListStep: name,
        name: checkListName,
        checkListNumber: point,
      };
    }

    const updateResult = await Project.updateOne(
      { "siteID": id, "project_status.name": name },
      updatePayload,
      { arrayFilters: [{ "status.name": name }] }
    );

    if (updateResult.modifiedCount === 0) {
      return res
        .status(500)
        .json({ message: "No changes were made to the project" });
    }

    if (checkList?.toLowerCase() === "yes") {
      await CheckList.deleteMany({
        checkListStep: name,
        name: checkListName,
        checkListNumber: point,
      });
    }

    await Task.deleteMany({
      siteID: id,
      title: content,
      description: content,
      category: "project",
    });

    res.json({ status: 200, message: "Point removed successfully" });
  } catch (error) {
    console.error("Error while removing point:", error.stack);
    res.status(500).json({
      message: "Error while removing point",
      error: error.message,
    });
  }
};

exports.ProjectStepDelete = async (req, res) => {
  try {
    const { id, name, project_step, userName, activeUser } = req.body;

    // Combined update for project status and inspections
    const updateResult = await Project.updateOne(
      { siteID: id },
      {
        $pull: {
          project_status: { name },
          inspections: { checkListStep: name },
        },
      }
    );

    if (updateResult.modifiedCount === 1) {
      // Create an array of titles and descriptions to delete
      const tasksToDelete = project_step.map(step => ({
        siteID: id,
        title: step?.content,
        description: step?.content,
        category: "project",
      }));

      // Batch delete tasks
      await Task.deleteMany({ $or: tasksToDelete });

      // const logData = {
      //   log: `<span style="color: black;">${name}</span> ->> <em style="color: #fec20e;">Delete</em>`,
      //   file: [],
      //   date: date,
      //   siteID: id,
      //   member: {
      //     name: userName,
      //     Id: activeUser,
      //   },
      // };
      // const logSave = new ProjectLog(logData);
      // await logSave.save();
      return res.json({
        status: 200,
        message: "Step removed successfully",
      });
    } else {
      return res
        .status(500)
        .json({ message: "No changes were made to the project" });
    }
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      status: 500,
      message: "Error while removing step",
      error: error.message, // Include error message for debugging
    });
  }
};

exports.TicketUpdateByMember = async (req, res) => {
  try {
    let profileFiles = [];
    const { userId, ticketId, type, comment } = req.body;
    if (req.files && req.files.image) {
      for (let i = 0; i < req.files.image.length; i++) {
        profileFiles.push(req.files.image[i].location);
      }
    }
    try {
      const ticket = await Ticket.findById(ticketId);
      if (!ticket) {
        return res.status(404).json({ message: "Ticket not found" });
      }
      const comments = await TaskComment.create({
        taskId: ticketId,
        type,
        comment,
        image: profileFiles,
        createdBy: userId,
      });
      if (type === "Comment") {
        await ticket.updateOne({ $push: { comments: comments._id } });
      } else {
        await ticket.updateOne({ $set: { status: type } });
        await ticket.updateOne({ $push: { comments: comments._id } });
      }
      res.json({
        status: 200,
        message: "Ticket updated successfully",
      });
    } catch (error) {
      console.error(error);
      res.status(500).json({
        status: 500,
        message: "Error while update ticket status",
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).json({
      status: 500,
      message: "Error while update ticket status",
    });
  }
};
