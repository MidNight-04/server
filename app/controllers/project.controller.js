/** @format */

const db = require('../models');
const Project = db.projects;
const Role = db.role;
const Process = db.constructionsteps;
const PaymentStages = db.paymentStages;
const ProjectPaymentStages = db.projectPaymentStages;
const ProjectPaymentDetails = db.projectPaymentDetails;
const Ticket = require('../models/ticketModel');
const TaskComment = require('../models/taskCommentModel');
const User = require('../models/user.model');
const { default: mongoose } = require('mongoose');
const axios = require('axios');
const PaytmChecksum = require('../helper/PaytmChecksum');
const PayProjects = db.projectPay;
const Task = db.task;
const CheckList = db.checkList;
const ProjectLog = db.projectlogs;
const uploadImage = require('../middlewares/uploadImage');
const awsS3 = require('../middlewares/aws-s3');
const dayjs = require('dayjs');
const ConstructionStep = require('../models/ConstructionStep');
const { updateTaskAndReschedule } = require('../helper/schedule');
const {
  createLogManually,
  createLogManual,
} = require('../middlewares/createLog');
const { deleteProjectPoint } = require('../services/projectService');
const {
  ticketUpdateNotification,
  sendNewTicketNotification,
} = require('../helper/notification');
const { sendNotification } = require('../services/oneSignalService');

let today = new Date();
let yyyy = today.getFullYear();
let mm = today.getMonth() + 1;
let dd = today.getDate();
if (dd < 10) dd = '0' + dd;
if (mm < 10) mm = '0' + mm;
let formatedtoday = yyyy + '-' + mm + '-' + dd;

const changeTime = () => {
  let today = new Date();
  let yyyy = today.getFullYear();
  let mm = today.getMonth() + 1;
  let dd = today.getDate();
  if (dd < 10) dd = '0' + dd;
  if (mm < 10) mm = '0' + mm;
  let final = yyyy + '-' + mm + '-' + dd;
  return final;
};

const roleMap = {
  'Site Engineer': 'engineer',
  'Sr. Engineer': 'sr_engineer',
  Operations: 'operation',
  'Site Manager': 'operation',
  Sales: 'sales',
  Accountant: 'accountant',
  Architect: 'architect',
  Admin: 'admin',
  Contractor: 'contractor',
  Client: 'client',
};

// -----------------------------
// Helpers
// -----------------------------
function parseFloorStructure(floorStr = '') {
  const parts = floorStr.split('+').filter(Boolean);

  const basementLevels = [];
  let groundType = 'G';
  let floorCount = 0;

  for (let part of parts) {
    if (part === 'B') part = 'B1'; // default basement
    if (/^B\d+$/.test(part)) {
      basementLevels.push(parseInt(part.replace('B', ''), 10));
    } else if (part === 'S' || part === 'G') {
      groundType = part;
    } else if (!isNaN(Number(part))) {
      floorCount = parseInt(part, 10);
    }
  }

  basementLevels.sort((a, b) => b - a);
  return { basementLevels, groundType, floorCount };
}

function generateFloorLabels({ basementLevels, groundType, floorCount }) {
  const labels = [];

  if (basementLevels.length === 1) {
    labels.push('Basement');
  } else if (basementLevels.length > 1) {
    for (const level of basementLevels) {
      labels.push(`Basement ${level}`);
    }
  }

  labels.push(groundType === 'S' ? 'Stilt' : 'Ground Floor');

  for (let i = 1; i <= floorCount; i++) {
    labels.push(`Floor ${i}`);
  }

  return labels;
}

function createProjectSteps(allSteps, floorLabels) {
  return allSteps
    .flatMap(step => {
      if (step.priority === '2') {
        return floorLabels.map((label, i) => ({
          name: label,
          priority: parseInt(step.priority, 10) + i,
          step: step.points,
        }));
      }

      const defaultPriority =
        step.priority === '1'
          ? 1
          : parseInt(step.priority, 10) + floorLabels.length;

      return [
        {
          name: step.name,
          priority: defaultPriority,
          step: step.points,
        },
      ];
    })
    .sort((a, b) => a.priority - b.priority);
}

function mapTaskChecklist(el, allChecklist) {
  if (el.checkList?.toLowerCase() !== 'yes') return null;

  const check = allChecklist.find(c => c.name === el.checkListName);
  if (!check) return null;

  const checklistItems = check.checkList.map(item => ({
    heading: item.heading,
    points: item.points.map(point => ({
      ...point,
      isChecked: null,
      image: '',
    })),
  }));

  return {
    id: check._id,
    step: check.checkListStep,
    name: check.name,
    number: check.checkListNumber,
    items: checklistItems,
  };
}

async function generateTasks(
  projectStepArray,
  allChecklist,
  data,
  assignedBy,
  session
) {
  const taskIds = [];

  for (let i = 0; i < projectStepArray.length; i++) {
    const tasks = {
      name: projectStepArray[i].name,
      priority: projectStepArray[i].priority,
      step: [],
    };

    const tasksToSave = projectStepArray[i].step.map((el, idx) => {
      const checklistDetails = mapTaskChecklist(el, allChecklist);

      const rawRole = el.issueMember?.[0];
      const mappedRoleKey = roleMap[rawRole];
      const memberId = data[mappedRoleKey];

      return {
        title: el.content,
        branch: data.branch,
        description: el.content,
        stepName: projectStepArray[i].name,
        assignedBy: assignedBy[0]._id,
        duration: el.duration !== '' ? el.duration : 0,
        point: idx,
        dueDate: i === 0 && idx === 0 ? dayjs().add(el.duration, 'day') : null,
        siteID: data.siteID,
        isActive: i === 0 && idx === 0,
        assignedOn: i === 0 && idx === 0 ? new Date() : null,
        checkList: checklistDetails,
        issueMember: memberId,
      };
    });

    const savedTasks = await Task.insertMany(tasksToSave, { session });
    tasks.step = savedTasks.map(task => ({
      taskId: task._id,
      point: task.point ?? null,
      duration: task.duration,
    }));
    taskIds.push(tasks);
  }

  return taskIds;
}

async function savePaymentStages(paymentStages, data, session) {
  const stages = paymentStages.stages.map(item => ({
    ...item,
    paymentStatus: 'Not Due Yet',
    paymentDueDate: '',
    installments: [],
  }));

  const paymentStageData = {
    siteID: data.siteID,
    clientID: data.client,
    floor: paymentStages.floor,
    stages,
  };

  const payStage = new ProjectPaymentStages(paymentStageData);
  await payStage.save({ session });
}

function buildInspections(projectStepArray) {
  const inspections = [];

  projectStepArray.forEach(project => {
    project.step.forEach(el => {
      if (el.checkList?.toLowerCase() === 'yes') {
        inspections.push({
          checkListStep: project.name,
          name: el.checkListName,
          checkListNumber: el.point,
          checkList: [],
          passed: false,
        });
      }
    });
  });

  return inspections;
}

function buildProjectData(data, taskIds, inspections) {
  return {
    project_name: data.name,
    siteID: data.siteID,
    project_location: data.location,
    branch: data.branch,
    client: data.client,
    floor: data.floor,
    area: data.area,
    cost: parseInt(data.cost, 10),
    date: data.date,
    duration: data.duration,
    sr_engineer: data.sr_engineer,
    site_engineer: data.engineer,
    contractor: data.contractor,
    operation: data.operation,
    sales: data.sales,
    project_admin: data.admin,
    architect: data.architect,
    accountant: data.accountant,
    openTicket: [],
    project_status: taskIds,
    inspections,
  };
}

// -----------------------------

exports.addProject = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { data } = req.body;

    // Check if project with same siteID already exists
    const existingProject = await Project.findOne({
      siteID: data.siteID,
    }).lean();
    if (existingProject) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(409)
        .json({ message: 'Project already exists with siteID' });
    }

    // Get admin role and assignedBy users
    const role = await Role.findOne({ name: 'admin' }).lean();
    const assignedBy = await User.find({ role: role._id }).select('_id').lean();
    const allSteps = await ConstructionStep.find().sort({ order: 1 }).lean();
    const allChecklist = await CheckList.find().lean();

    // Floor parsing
    const { basementLevels, groundType, floorCount } = parseFloorStructure(
      data?.floor
    );
    const floorLabels = generateFloorLabels({
      basementLevels,
      groundType,
      floorCount,
    });

    // Steps + Tasks
    const projectStepArray = createProjectSteps(allSteps, floorLabels);
    const taskIds = await generateTasks(
      projectStepArray,
      allChecklist,
      data,
      assignedBy,
      session
    );

    // Payment Stages
    const paymentStages = await PaymentStages.findOne({
      floor: data.floor.toString(),
    }).lean();
    if (!paymentStages) {
      await session.abortTransaction();
      session.endSession();
      return res.status(400).json({
        message: `First create payment stage for ${data.floor} floor`,
      });
    }
    await savePaymentStages(paymentStages, data, session);

    // Inspections
    const inspections = buildInspections(projectStepArray);

    // Project Document
    const projectData = buildProjectData(data, taskIds, inspections);
    const newProject = new Project(projectData);
    await newProject.save({ session });

    // Commit all changes
    await session.commitTransaction();
    session.endSession();

    // Log after commit
    await createLogManually(
      req,
      `Created project ${projectData.project_name} with siteID ${projectData.siteID}`,
      projectData.siteID
    );

    res
      .status(201)
      .json({ message: 'Project created successfully', status: 201 });
  } catch (error) {
    // Rollback
    await session.abortTransaction();
    session.endSession();
    console.error('Error creating project:', error);
    res.status(500).json({ message: 'Internal Server Error' });
  }
};

exports.deleteStatusImage = async (req, res) => {
  try {
    const { _id, url, name, point, content } = req.body;

    const prod = await Project.findById(_id);

    if (!prod) {
      return res.status(404).send({ message: 'Project not found' });
    }

    const projectStatusIndex = prod.project_status.findIndex(
      item => item.name === name
    );

    if (projectStatusIndex === -1) {
      return res.status(404).send({ message: 'Project status not found' });
    }

    const stepIndex = prod.project_status[projectStatusIndex].step.findIndex(
      item => item.content === content && item.point === parseInt(point)
    );

    if (stepIndex === -1) {
      return res.status(404).send({ message: 'Step not found' });
    }

    const imageIndex = prod.project_status[projectStatusIndex].step[
      stepIndex
    ].finalStatus[0].image.findIndex(item => item.url === url);

    if (imageIndex === -1) {
      return res.status(404).send({ message: 'Image not found' });
    }

    await awsS3.deleteFile(url.split('.com/')[1]);

    prod.project_status[projectStatusIndex].step[
      stepIndex
    ].finalStatus[0].image.splice(imageIndex, 1);

    await prod.save();

    await createLogManually(
      req,
      `Deleted status image ${name} at point ${point} for content ${content} of project ${prod.project_name}`,
      prod.siteID
    );

    res.send({ message: 'Image removed successfully' });
  } catch (error) {
    console.error(error);
    res.status(500).send({ message: 'Error while removing image' });
  }
};

exports.getAllProject = async (req, res) => {
  try {
    mongoose.set('strictPopulate', false); // optional, depending on your schema strictness

    const projects = await Project.find({})
      .populate({
        path: 'project_status',
        populate: {
          path: 'step',
          populate: {
            path: 'taskId',
            model: 'Tasks',
            populate: [
              {
                path: 'issueMember',
                model: 'User',
                select: '-password -token -refreshToken -loginOtp',
                populate: {
                  path: 'roles',
                },
              },
              {
                path: 'assignedBy',
                model: 'User',
                select: '-password -token -refreshToken -loginOtp',
                populate: {
                  path: 'roles',
                },
              },
            ],
          },
        },
      })
      .lean();

    return res.status(200).send({
      message: 'List of project fetched successfully',
      data: projects,
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    return res.status(500).send({
      message: 'There was a problem in getting the list of projects',
      error: err.message,
    });
  }
};

exports.getProjectByMember = (req, res) => {
  mongoose.set('strictPopulate', false);
  Project.find({
    $or: [
      // { project_manager: req.params.id },
      { site_engineer: req.params.id },
      { contractor: req.params.id },
      { accountant: req.params.id },
      { operation: req.params.id },
      { project_admin: req.params.id },
      { sr_engineer: req.params.id },
      { sales: req.params.id },
      { architect: req.params.id },
    ],
  })
    .populate({
      path: 'project_status',
      populate: {
        path: 'step',
        populate: {
          path: 'taskId',
          model: Task,
          populate: [
            {
              path: 'issueMember',
              model: User,
              select: '-password -token -refreshToken -loginOtp',
              populate: {
                path: 'roles',
              },
            },
            {
              path: 'assignedBy',
              model: User,
              select: '-password -token -refreshToken -loginOtp',
              populate: {
                path: 'roles',
              },
            },
          ],
        },
      },
    })
    .then((project, err) => {
      if (err) {
        res.status(500).send({
          message: 'There was a problem in getting the list of project',
        });
        return;
      }
      if (project) {
        // console.log(project)
        res.status(200).send({
          message: 'List of project fetched successfuly',
          data: project,
        });
      }
    });
};

exports.getProjectByClientId = async (req, res) => {
  try {
    const projects = await Project.find({ client: req.params.id })
      .populate({
        path: 'project_status',
        populate: {
          path: 'step',
          populate: {
            path: 'taskId',
            model: 'Tasks',
            populate: [
              {
                path: 'issueMember',
                model: 'User',
                select: '-password -token -refreshToken -loginOtp',
                populate: {
                  path: 'roles',
                },
              },
              {
                path: 'assignedBy',
                model: 'User',
                select: '-password -token -refreshToken -loginOtp',
                populate: {
                  path: 'roles',
                },
              },
            ],
          },
        },
      })
      .lean();

    if (!projects || projects.length === 0) {
      return res.status(404).send({
        message: 'No projects found for the given client ID',
        data: projects,
      });
    }

    res.status(200).send({
      message: 'List of projects fetched successfully',
      data: projects,
    });
  } catch (err) {
    console.error('Error fetching projects:', err);
    res.status(500).send({
      message: 'There was a problem getting the list of projects',
      error: err.message,
    });
  }
};

exports.deleteProjectById = async (req, res) => {
  try {
    const id = req.params.id;
    const project = await Project.findOne({ siteID: id });
    if (!project) {
      return res.status(404).send({ message: 'Project not found' });
    }
    const deleteOperations = [
      Project.deleteOne({ siteID: id }),
      ProjectPaymentStages.deleteMany({ siteID: id }),
      Task.deleteMany({ siteID: id }),
      ProjectPaymentDetails.deleteMany({ siteID: id }),
      Ticket.deleteMany({ siteID: id }),
      ProjectLog.deleteMany({ siteID: id }),
    ];
    await Promise.all(deleteOperations);
    await createLogManually(
      req,
      `Deleted project ${project.project_name} with siteID ${project.siteID}`,
      project.siteID
    );
    res.status(200).send({
      message: 'Record deleted successfully',
      status: 200,
    });
  } catch (err) {
    console.error(err);
    res.status(500).send({ message: 'Error while deleting project' });
  }
};

exports.addProjectMember = async (req, res) => {
  try {
    const { data } = req.body;
    const newData = {
      project_admin: data.project_admin,
      // project_manager: data.project_manager,
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

    if (areAllFieldsBlank(newData)) {
      return res.send({
        message: 'All data fields are blank. No operation performed.',
        status: 400,
      });
    } else {
      const siteID = data?.siteID;
      const existingDocument = await Project.findOne({ siteID });
      let alreadyExists = false;

      // Check if the new data is already present in the respective roles
      const roles = [
        'project_admin',
        'project_manager',
        'site_engineer',
        'sr_engineer',
        'accountant',
        'contractor',
        'sales',
        'operation',
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
        return res.send({ message: 'Record already exist', status: 204 });
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
          .send({ message: 'Record added successfully', status: 200 });
      }
    }
  } catch (error) {
    return res
      .status(500)
      .send({ message: 'Error on add record', status: 500 });
  }
};

exports.deleteProjectMember = async (req, res) => {
  try {
    const { siteID, employeeID } = req.body;
    // Find the document with the given siteID
    const existingDocument = await Project.findOne({ siteID });

    let memberFound = false;

    // Check if the role is valid
    const roles = [
      'project_admin',
      'project_manager',
      'site_engineer',
      'accountant',
      'sr_engineer',
      'sales',
      'contractor',
      'operation',
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
        .send({ message: 'Member not found.', status: 404 });
    }
    return res.status(200).send({ message: 'Member removed', status: 200 });
  } catch (error) {
    return res
      .status(500)
      .send({ message: 'Error on remove record', status: 500 });
  }
};

exports.getProjectById = (req, res) => {
  const id = req.params.id;
  mongoose.set('strictPopulate', false);
  Project.find({ siteID: id })
    .populate({
      // path: 'project_admin project_manager site_engineer accountant sr_engineer sales operation architect',
      path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
      model: 'User',
      populate: {
        path: 'role',
        model: 'projectroles',
      },
    })
    .populate({
      path: 'project_status',
      populate: {
        path: 'step',
        populate: {
          path: 'taskId',
          model: Task,
          populate: [
            {
              path: 'issueMember',
              model: 'User',
              select: '-password -token -refreshToken -loginOtp',
              populate: {
                path: 'roles',
              },
            },
            {
              path: 'assignedBy',
              model: 'User',
              select: '-password -token -refreshToken -loginOtp',
              populate: {
                path: 'roles',
              },
            },
          ],
        },
      },
    })
    .populate({
      path: 'openTicket',
      model: 'Tickets',
    })
    .then(data => {
      if (!data) {
        res.status(404).send({ message: 'Project not found' });
        return;
      }
      res.status(200).send({ data: data, status: 200 });
    })
    .catch(err => {
      console.log(err);
      res.status(500).send({ message: 'Could not find id to get details' });
    });
};

// exports.getProjectById = async (req, res) => {
//   try {
//     const id = req.params.id;
//     mongoose.set('strictPopulate', false);

//     // Find a single project by siteID
//     const project = await Project.findOne({ siteID: id })
//       .populate({
//         path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
//         model: 'User',
//         populate: {
//           path: 'role',
//           model: 'projectroles',
//         },
//       })
//       .populate({
//         path: 'project_status',
//         populate: {
//           path: 'step',
//           populate: {
//             path: 'taskId',
//             model: 'Tasks',
//             populate: [
//               {
//                 path: 'issueMember',
//                 model: 'User',
//                 select: '-password -token -refreshToken -loginOtp',
//                 populate: { path: 'roles' },
//               },
//               {
//                 path: 'assignedBy',
//                 model: 'User',
//                 select: '-password -token -refreshToken -loginOtp',
//                 populate: { path: 'roles' },
//               },
//             ],
//           },
//         },
//       })
//       .populate({
//         path: 'openTicket',
//         model: 'Tickets',
//       });

//     if (!project) {
//       return res.status(404).send({ message: 'Project not found' });
//     }

//     res.status(200).send({ data: project, status: 200 });
//   } catch (err) {
//     console.error(err);
//     res.status(500).send({
//       message: 'Could not find id to get details',
//       error: err.message,
//     });
//   }
// };

exports.updateProjectById = (req, res) => {
  const { id, name, role, phone, address } = req.body;
  const data = { name: name, role: role, phone: phone, address: address };
  Project.updateOne({ siteID: id }, data, (err, updated) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: 'Could not find id to update details' });
      return;
    }
    if (updated) {
      res.status(200).send({ message: 'Updated Successfuly' });
    }
  });
};

exports.updateProjectTaskByMember = async (req, res) => {
  const { id, name, point, content, status, date, activeUser, userName } =
    req.body;
  // console.log(req.body);
  let images = [];

  // if (req.files?.image?.length > 0) {
  //   for (let i = 0; i < req.files.image?.length; i++) {
  //     profileFiles.push(req.files.image[i].location);
  //   }
  // }

  if (req.files?.image?.length > 0) {
    await awsS3
      .uploadFiles(req.files?.image, `project_update`)
      .then(async data => {
        const profileFiles = data.map(file => {
          const url =
            'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key;
          return url;
        });
        images.push(...profileFiles);
      });
  }

  try {
    // Find the project document by _id
    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.json({
        status: 200,
        message: 'Project not found',
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
            image: images,
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
            'progress.status': status,
            'progress.date': date,
            'progress.image': profileFiles,
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
        message: 'Project work updated successfully',
      });
    }
  } catch (err) {
    console.log(err);
    return res.json({
      status: 400,
      message: 'Error while update project work approval',
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

    // if (req.files?.image?.length > 0) {
    //   for (let i = 0; i < req.files.image?.length; i++) {
    //     if (typeof req.files.image[i] === 'string') {
    //       profileFiles.push({
    //         image: req.files.image[i],
    //         isApproved: false,
    //       });
    //     } else {
    //       profileFiles.push({
    //         url: req.files.image[i].location,
    //         isApproved: false,
    //       });
    //     }
    //   }
    // }

    if (req.files?.image?.length > 0) {
      await awsS3
        .uploadFiles(req.files?.image, `project_update`)
        .then(async data => {
          const images = data.map(file => {
            const url =
              'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' +
              file.s3key;
            const obj = {
              url: url,
              isApproved: false,
            };
            return obj;
          });
          profileFiles.push(...images);
        });
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
        message: 'Project not found',
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
          siteID: id,
          'inspections.checkListStep': name,
          'inspections.name': checkListName,
          'inspections.checkListNumber': parseInt(point),
        },
        {
          $set: {
            'inspections.$.passed': true,
          },
        }
      );
    }

    await Task.updateOne(
      { siteID: id, title: content, description: content },
      {
        $set: {
          'adminStatus.status': status,
          'adminStatus.date': date,
          'adminStatus.image': profileFiles,
        },
      }
    );

    await logCreate.save();
    await project.save();

    return res.json({
      status: 200,
      message: 'Project work approval updated successfully',
    });
  } catch (err) {
    return res.json({
      status: 400,
      message: 'Error while update project work approval',
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
        if (typeof req.files.image[i] === 'string') {
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
        message: 'Project not found',
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
          siteID: id,
          'inspections.checkListStep': name,
          'inspections.name': checkListName,
          'inspections.checkListNumber': parseInt(point),
        },
        {
          $set: {
            'inspections.$.passed': true,
          },
        }
      );
    }

    await Task.updateOne(
      { siteID: id, title: content, description: content },
      {
        $set: {
          'adminStatus.status': status,
          'adminStatus.date': date,
          'adminStatus.image': profileFiles,
        },
      }
    );

    await logCreate.save();
    await project.save();

    return res.json({
      status: 200,
      message: 'Project work approval updated successfully',
    });
  } catch (err) {
    console.error(err);
    return res.json({
      status: 400,
      message: 'Error while update project work approval',
      error: err.message,
    });
  }
};

exports.updateImageStatus = async (req, res) => {
  try {
    const { id, name, point, userName, userId, url } = req.body;
    const project = await Project.findOne({ siteID: id });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const statusIndex = project.project_status.findIndex(
      item => item.name === name
    );
    if (statusIndex === -1) {
      return res.status(404).json({ message: 'Project status not found' });
    }

    const stepIndex = project.project_status[statusIndex].step.findIndex(
      item => item.point === parseInt(point, 10)
    );
    if (stepIndex === -1) {
      return res.status(404).json({ message: 'Step not found' });
    }

    const finalStatus =
      project.project_status[statusIndex].step[stepIndex].finalStatus;
    if (!finalStatus || finalStatus.length === 0) {
      return res.status(404).json({ message: 'Final status not found' });
    }

    const imageIndex = finalStatus[0].image.findIndex(item => item.url === url);
    if (imageIndex === -1) {
      return res.status(404).json({ message: 'Image not found' });
    }

    finalStatus[0].image[imageIndex].isApproved = true;
    finalStatus[0].image[imageIndex].approvedBy = { userId, userName };
    project.markModified('project_status');

    await project.save();
    await createLogManually(
      req,
      `Updated image status of ${name} at point ${point} for content ${content} of project ${project.project_name}`,
      project.siteID
    );

    return res.json({
      status: 200,
      message: 'Project image updated successfully.',
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: 'Error while updating image status' });
  }
};

exports.deleteImage = async (req, res) => {
  const { url } = req.body;
  console.log(url);
  uploadImage.deleteFile(url).then(res => console.log(res));
};

exports.clientQueryForProject = async (req, res) => {
  const {
    id, // siteID
    step, // step
    point,
    content,
    assignedBy, // user ID of the person raising the ticket
    assignMember, // user ID of the assignee
    work,
    query,
  } = req.body;

  let profileFiles = [];

  // Upload images if provided
  if (req.files?.image?.length > 0) {
    const uploaded = await awsS3.uploadFiles(req.files.image, `client_query`);
    const images = uploaded.map(
      file => `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
    );
    profileFiles.push(...images);
  }

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const project = await Project.findOne({ siteID: id })
      .populate('client')
      .session(session);

    if (!project) {
      await session.abortTransaction();
      session.endSession();
      return res
        .status(404)
        .json({ status: 404, message: 'Project not found' });
    }

    // Create new ticket
    const ticket = new Ticket({
      step,
      siteID: id,
      point,
      content,
      query,
      work,
      assignedBy,
      assignMember,
      image: profileFiles,
    });

    const savedTicket = await ticket.save({ session });

    // Add to project's open tickets
    await Project.updateOne(
      { siteID: id },
      { $push: { openTicket: savedTicket._id } },
      { session }
    );

    // Commit DB changes first
    await session.commitTransaction();
    session.endSession();

    // Send notification AFTER commit (so DB state is guaranteed)
    const user = await User.findById(assignedBy);
    const dateTime = new Date();

    await sendNewTicketNotification({
      recipient: assignMember,
      sender: `${user.firstname + ' ' + user.lastname}`.trim(),
      id: savedTicket._id.toString().slice(0, 6),
      title: content,
      siteId: id,
      clientName: project.client
        ? project.client.firstname + ' ' + project.client.lastname
        : '',
      step,
      query,
      date: dateTime.toLocaleString('en-IN', {
        weekday: 'short',
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      }),
    });

    const assignUser = await User.findById(assignMember);

    const allPlayerIds = [assignUser];

    const logMessage = `New ticket raised for site ID ${id} at step ${step} - ${content}`;

    await sendNotification({
      users: allPlayerIds,
      title: 'Ticket Assigned',
      message: logMessage,
      data: { route: 'tickets', id },
    });

    res.json({ status: 200, message: 'Client ticket raised successfully' });
  } catch (err) {
    await session.abortTransaction();
    session.endSession();
    console.error('❌ Error in clientQueryForProject:', err);
    res
      .status(400)
      .json({ status: 400, message: 'Error while raising ticket by client' });
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
      siteID: id,
      'inspections.checkListStep': checkListStep,
      'inspections.name': name,
      'inspections.checkListNumber': number,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $push: {
        'inspections.$.checkList': checkList[0],
      },
    };
    // Perform the update
    const result = await Project.updateOne(filter, updateOperation);
    await createLogManually(
      req,
      `Added new point ${name} to project ${siteID}`,
      siteID
    );
    // console.log(result);
    if (result.modifiedCount === 1) {
      return res.json({
        status: 200,
        message: 'New point added successfully',
      });
    } else {
      res.json({
        status: 400,
        message: 'Error on add new point',
      });
    }
  } catch (error) {
    res.json({
      status: 400,
      message: 'Error while record create',
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
        siteID: id,
        'inspections.checkListStep': checkListStep,
        'inspections.name': name,
        'inspections.checkListNumber': number,
        'inspections.checkList.heading': heading,
      },
      [
        {
          $set: {
            inspections: {
              $map: {
                input: '$inspections',
                as: 'inspection',
                in: {
                  $mergeObjects: [
                    '$$inspection',
                    {
                      checkList: {
                        $map: {
                          input: '$$inspection.checkList',
                          as: 'checkList',
                          in: {
                            $cond: {
                              if: { $eq: ['$$checkList.heading', heading] },
                              then: {
                                $mergeObjects: [
                                  '$$checkList',
                                  {
                                    points: {
                                      $concatArrays: [
                                        '$$checkList.points',
                                        [{ point: point, status: status }],
                                      ],
                                    },
                                  },
                                ],
                              },
                              else: '$$checkList',
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
    await createLogManually(
      req,
      `Added new extra point ${name} (${point}) to project ${siteID}`,
      siteID
    );
    return res.json({
      message: 'New extra point added successfully',
      status: 200,
    });
  } catch (error) {
    // console.log(error);
    res.json({
      status: 400,
      message: 'Error while record update',
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
        siteID: id,
        'inspections.checkListStep': checkListStep,
        'inspections.name': name,
        'inspections.checkListNumber': number,
        'inspections.checkList.heading': heading,
      },
      [
        {
          $set: {
            inspections: {
              $map: {
                input: '$inspections',
                as: 'inspection',
                in: {
                  $mergeObjects: [
                    '$$inspection',
                    {
                      checkList: {
                        $map: {
                          input: '$$inspection.checkList',
                          as: 'checkList',
                          in: {
                            $cond: {
                              if: { $eq: ['$$checkList.heading', heading] },
                              then: {
                                $mergeObjects: [
                                  '$$checkList',
                                  {
                                    points: {
                                      $filter: {
                                        input: '$$checkList.points',
                                        as: 'point',
                                        cond: { $ne: ['$$point.point', point] },
                                      },
                                    },
                                  },
                                ],
                              },
                              else: '$$checkList',
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
    await createLogManually(
      req,
      `Deleted extra point ${name} (${point}) from project ${siteID}`,
      siteID
    );
    return res.json({
      message: 'Point deleted successfully',
      status: 200,
    });
  } catch (error) {
    res.json({
      status: 400,
      message: 'Error while delete point',
    });
  }
};

exports.filterData = async (req, res) => {
  const { searchData } = req.query;
  const regex = new RegExp(searchData, 'i'); // 'i' for case-insensitive matching
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
          message: 'There was a problem in getting the list of project',
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: 'List of project fetched successfuly',
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
          message: 'There was a problem in getting the list of project',
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: 'List of project fetched successfuly',
          data: project,
        });
      }
    });
  }
};

exports.filterMemberData = async (req, res) => {
  const { searchData, memberId } = req.query;
  const regex = new RegExp(searchData, 'i'); // 'i' for case-insensitive matching
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
            { 'project_manager.employeeID': memberId },
            { 'site_engineer.employeeID': memberId },
            { 'contractor.employeeID': memberId },
            { 'accountant.employeeID': memberId },
            { 'sr_engineer.employeeID': memberId },
            { 'sales.employeeID': memberId },
            { 'operation.employeeID': memberId },
            { 'project_admin.employeeID': memberId },
          ],
        },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: 'There was a problem in getting the list of project',
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: 'List of project fetched successfuly',
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
            { 'project_manager.employeeID': memberId },
            { 'site_engineer.employeeID': memberId },
            { 'contractor.employeeID': memberId },
            { 'accountant.employeeID': memberId },
            { 'sr_engineer.employeeID': memberId },
            { 'sales.employeeID': memberId },
            { 'operation.employeeID': memberId },
            { 'project_admin.employeeID': memberId },
          ],
        },
      ],
    }).then((project, err) => {
      if (err) {
        res.status(500).send({
          message: 'There was a problem in getting the list of project',
        });
        return;
      }
      if (project) {
        res.status(200).send({
          message: 'List of project fetched successfuly',
          data: project,
        });
      }
    });
  }
};

exports.initiatePayment = (req, res) => {
  const { orderId, payAmount, callbackUrl, currency, activeUser } = req.body;

  // Sandbox Credentials
  let mid = 'WBJIwm08119302462954'; // Merchant ID
  let mkey = 'Ipb3#Bx%3RdHmr#M'; // Merchant Key
  var paytmParams = {};

  paytmParams.body = {
    requestType: 'Payment',
    mid: mid,
    websiteName: 'DEFAULT',
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
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
        headers: {
          'Content-Type': 'application/json',
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
  let mid = 'WBJIwm08119302462954'; // Merchant ID
  let mkey = 'Ipb3#Bx%3RdHmr#M'; // Merchant Key

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
        method: 'post',
        maxBodyLength: Infinity,
        url: `https://securegw.paytm.in/v3/order/status`,
        headers: {
          'Content-Type': 'application/json',
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

          if (contactType == 'Project Payment') {
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
                  message: 'Payment Done Successfully',
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
            message: 'Error on payment',
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
    prevPoint,
    activeUser,
  } = req.body;

  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const project = await Project.findOne({ siteID: id }).populate({
      path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
      model: 'User',
      select: 'playerIds',
    });

    if (!project) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Project not found' });
    }

    // 2. Find target step
    const targetStatus = project.project_status.find(
      status => status.name === stepName
    );
    if (!targetStatus) {
      await session.abortTransaction();
      return res.status(404).json({ message: 'Project step not found' });
    }

    // 3. Find insert index
    const stepIndex = targetStatus.step.findIndex(
      s => parseInt(s.point) === parseInt(prevPoint)
    );
    if (stepIndex === -1) {
      await session.abortTransaction();
      return res
        .status(404)
        .json({ message: 'Previous point not found in step' });
    }

    // 4. Handle duration (if force majeure)
    let dur = duration;
    if (!duration && forceMajeure?.isForceMajeure) {
      dur =
        (new Date(forceMajeure.endForceDate) -
          new Date(forceMajeure.startForceDate)) /
          (1000 * 60 * 60 * 24) +
        1;
    }

    // 5. Create Task
    const newTaskPayload = {
      title: pointName,
      description: pointName,
      assignedBy: activeUser,
      duration: dur,
      siteID: id,
      forceMajeure: !!forceMajeure?.isForceMajeure,
      checkList: {
        checkList: checkList?.toLowerCase() === 'yes',
        checkListName,
        checkListPoint: [],
      },
      issueMember,
    };

    if (Boolean(forceMajeure.isForceMajeure)) {
      const date = new Date();
      date.setDate(date.getDate() + dur);
      newTaskPayload.dueDate = date.toISOString().split('T')[0];
    }

    const newTask = await Task.create([newTaskPayload], { session });
    const task = newTask[0];

    // 6. Insert new step
    const newStepEntry = {
      taskId: task._id,
      point: parseInt(prevPoint) + 1,
      duration: dur,
    };

    targetStatus.step.splice(stepIndex + 1, 0, newStepEntry);
    for (let i = stepIndex + 2; i < targetStatus.step.length; i++) {
      targetStatus.step[i].point += 1;
    }

    // 7. Build update query
    const updateQuery = {
      $set: { 'project_status.$.step': targetStatus.step },
    };

    if (forceMajeure?.isForceMajeure) {
      updateQuery.$push = {
        forceMajeure: {
          reason: pointName,
          duration: dur,
          startDate: forceMajeure.startForceDate,
          endDate: forceMajeure.endForceDate,
        },
      };
      updateQuery.$inc = { extension: dur };
    }

    const updateResult = await Project.updateOne(
      { siteID: id, 'project_status.name': stepName },
      updateQuery,
      { session }
    );

    if (updateResult.modifiedCount !== 1) {
      throw new Error('No changes were made to the project');
    }

    // 8. Handle checklist if enabled
    if (checkList?.toLowerCase() === 'yes') {
      const checklistData = {
        checkListStep: stepName,
        name: checkListName,
        checkListNumber: newStepEntry.point,
        checkList: [],
      };
      await CheckList.create([checklistData], { session });
      await Project.updateOne(
        { siteID: id },
        { $push: { inspections: checklistData } },
        { session }
      );
    }

    const logMessage = forceMajeure?.isForceMajeure
      ? `Added new point (force majeure: ${dur} days) to ${stepName} - ${pointName} in project ${id}`
      : `Added new point ${pointName} to ${stepName} in project ${id}`;

    const allPlayerIds = [
      project.project_admin[0],
      project.architect[0],
      project.accountant[0],
      project.sr_engineer[0],
      project.site_engineer[0],
      project.operation[0],
      project.sales[0],
    ];

    await sendNotification({
      users: allPlayerIds,
      title: 'New Point Added',
      message: logMessage,
      data: { route: 'projects', id },
    });

    // 9. Log
    await createLogManually(req, logMessage, id, null, session);

    // 10. Commit transaction
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({ message: 'New Field added successfully' });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('AddNewProjectPoint Error:', error);
    return res
      .status(400)
      .json({ message: 'Error while adding new point', error: error.message });
  }
};

exports.DeleteProjectPoint = async (req, res) => {
  const { id, name, point, duration } = req.body;

  try {
    const result = await deleteProjectPoint({ id, name, point, duration, req });
    res.json(result);
  } catch (error) {
    console.error('Error while removing point:', {
      error: error.message,
      stack: error.stack,
      projectId: id,
      point,
    });

    res.status(500).json({
      message: 'Error while removing point',
      error: error.message,
    });
  }
};

exports.ProjectStepDelete = async (req, res) => {
  try {
    const { id, name } = req.body;

    if (!id || !name) {
      return res
        .status(400)
        .json({ message: 'Site ID and step name are required' });
    }

    const project = await Project.findOne({ siteID: id }).populate({
      path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
      model: 'User',
      select: 'playerIds',
    });

    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }

    const stepIndex = project.project_status.findIndex(
      step => step.name === name
    );
    if (stepIndex === -1) {
      return res.status(404).json({ message: 'Step not found in project' });
    }

    const stepToRemove = project.project_status[stepIndex];

    // Safely map tasks to delete
    if (Array.isArray(stepToRemove.step) && stepToRemove.step.length > 0) {
      const tasksToDelete = stepToRemove.step.map(subStep => ({
        siteID: id,
        title: subStep?.content,
        description: subStep?.content,
        category: 'project',
      }));

      await Task.deleteMany({ $or: tasksToDelete });
    }

    project.project_status.splice(stepIndex, 1);
    await project.save();
    const logMessage = `Deleted step ${name} from project ${id}`;
    await createLogManually(req, logMessage, id);

    const allPlayerIds = [
      project.project_admin[0],
      project.architect[0],
      project.accountant[0],
      project.sr_engineer[0],
      project.site_engineer[0],
      project.operation[0],
      project.sales[0],
    ];

    await sendNotification({
      users: allPlayerIds,
      title: 'Step Removed From Project',
      message: logMessage,
      data: { route: 'projects', id },
    });

    return res.status(200).json({ message: 'Step removed successfully' });
  } catch (error) {
    console.error('Error while removing step:', error);
    return res.status(500).json({
      message: 'Internal server error while removing step',
      error: error.message,
    });
  }
};

exports.updateTicket = async (req, res) => {
  const session = await Ticket.startSession();
  let ticket, createdBy; // declare outside so available later

  try {
    await session.withTransaction(async () => {
      const userId = req.user?._id || req.userId || req.body?.userId;
      const { ticketId } = req.params;
      const { type, comment } = req.body;

      // --- Upload files first (outside transaction is safer) ---
      const uploadPromises = [
        req.files?.image?.length
          ? awsS3.uploadFiles(req.files.image, 'client_query')
          : [],
        req.files?.docs?.length
          ? awsS3.uploadFiles(req.files.docs, 'client_query')
          : [],
        req.files?.audio?.length
          ? awsS3.uploadFiles(req.files.audio, 'client_query')
          : [],
      ];

      const [imagesUploaded, docsUploaded, audioUploaded] = await Promise.all(
        uploadPromises
      );

      const uploadedImages = imagesUploaded.map(
        file =>
          `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
      );
      const uploadedDocs = docsUploaded.map(
        file =>
          `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
      );
      const uploadedAudio = audioUploaded[0]
        ? `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${audioUploaded[0].s3key}`
        : null;

      // --- Fetch ticket + creator ---
      ticket = await Ticket.findById(ticketId).session(session);
      if (!ticket) throw new Error('Ticket not found');

      await ticket.populate({
        path: 'assignMember assignedBy',
        select: 'firstname lastname playerIds',
      });

      createdBy = await User.findById(userId).session(session);

      // --- Create comment ---
      const [commentDoc] = await TaskComment.create(
        [
          {
            taskId: ticketId,
            type,
            comment,
            images: uploadedImages,
            file: uploadedDocs,
            audio: uploadedAudio,
            createdBy: userId,
          },
        ],
        { session }
      );

      // --- Update ticket ---
      const updateData = { $push: { comments: commentDoc._id } };
      if (type !== 'Comment' && type !== ticket.status) {
        updateData.$set = { status: type };
      }
      await Ticket.updateOne({ _id: ticketId }, updateData, { session });

      const logMessage = `Updated posted on ticket ${ticket.step} - ${ticket.content} of project ${ticket.siteID}.`;

      // --- Log ---
      await createLogManual({
        req,
        logMessage,
        siteId: ticket.siteID,
        ticketId: ticket._id,
        session,
      });

      const allPlayerIds = [ticket.assignMember, ticket.assignedBy];

      await sendNotification({
        users: allPlayerIds,
        title: 'Ticket Updated',
        message: logMessage,
        data: { route: 'tickets', id: ticket._id },
      });
    });

    // --- Notifications (outside transaction) ---
    const userId = req.user?._id || req.userId || req.body?.userId;
    const isAssignedByUser = ticket.assignedBy._id.toString() === userId;

    await ticketUpdateNotification({
      recipient: isAssignedByUser
        ? ticket.assignMember._id
        : ticket.assignedBy._id,
      sender: `${createdBy.firstname} ${createdBy.lastname}`.trim(),
      id: ticket._id.toString().slice(0, 6),
      title: `${ticket.step}, ${ticket.content}`,
    });

    return res.json({ status: 200, message: 'Ticket updated successfully' });
  } catch (error) {
    console.error('Error updating ticket:', error);
    return res.status(500).json({
      status: 500,
      message: 'Error while updating ticket status',
      error: error.message,
    });
  } finally {
    session.endSession();
  }
};

exports.changeIssueMember = async (req, res) => {
  try {
    const { userId, siteId, issue: roleId, newMember } = req.body;

    if (!userId || !siteId || !roleId || !newMember) {
      return res.status(400).json({
        status: 400,
        message: 'Missing required fields: userId, siteId, issue, newMember',
      });
    }

    const role = await Role.findById(roleId);
    if (!role) {
      return res.status(404).json({ status: 404, message: 'Role not found' });
    }

    const issueMap = {
      Admin: 'project_admin',
      Manager: 'project_manager',
      'Sr. Engineer': 'sr_engineer',
      'Site Engineer': 'site_engineer',
      Accountant: 'accountant',
      Architect: 'architect',
      Operations: 'operation',
      Sales: 'sales',
    };

    const issueMemberField = issueMap[role.name];
    if (!issueMemberField) {
      return res
        .status(400)
        .json({ status: 400, message: 'Invalid issue role' });
    }

    const proj = await Project.findOne({ siteID: siteId });
    if (!proj) {
      return res
        .status(404)
        .json({ status: 404, message: 'Project not found' });
    }

    const oldMemberId = proj[issueMemberField]?.[0];
    if (!oldMemberId) {
      return res
        .status(404)
        .json({ status: 404, message: 'Old member not found in project' });
    }

    const [oldMember, newMemberData] = await Promise.all([
      User.findById(oldMemberId),
      User.findById(newMember),
    ]);

    if (!newMemberData) {
      return res
        .status(404)
        .json({ status: 404, message: 'New member not found' });
    }

    const comment = await TaskComment.create({
      type: 'Task Updated',
      comment: `Project ${role.name} was changed to ${newMemberData.firstname} ${newMemberData.lastname}, previously assigned to ${oldMember.firstname} ${oldMember.lastname}.`,
      createdBy: userId,
    });

    await Task.updateMany(
      {
        siteID: siteId,
        issueMember: oldMemberId,
        status: { $ne: 'Complete' },
      },
      {
        $set: { issueMember: newMember },
        $push: { comments: comment._id },
      }
    );

    const updatedProject = await Project.findOneAndUpdate(
      { siteID: siteId },
      { $set: { [issueMemberField]: newMember } },
      { new: true }
    );

    const logMessage = `Changed issue member (${role.name}) of project ${siteId} from ${oldMember.firstname} ${oldMember.lastname} to ${newMemberData.firstname} ${newMemberData.lastname}`;

    await createLogManually(req, logMessage, siteId);

    const allPlayerIds = [newMemberData, oldMember];

    await sendNotification({
      users: allPlayerIds,
      title: 'Project Updated',
      message: logMessage,
      data: { route: 'projects', id: siteId },
    });

    return res.status(200).json({
      status: 200,
      message: 'Issue member changed successfully',
      data: updatedProject,
    });
  } catch (error) {
    console.error('Error in changeIssueMember:', error);
    res.status(500).json({
      status: 500,
      message: 'Error while changing issue member',
      error: error.message,
    });
  }
};

exports.getAllSiteIds = async (req, res) => {
  try {
    const project = await Project.find({}).select(['siteID', 'date']);
    res.status(200).json({
      status: 200,
      message: 'All site IDs fetched successfully',
      data: project,
    });
  } catch (error) {
    console.error(error);
    res
      .status(500)
      .json({ status: 500, message: 'Error while getting all site IDs' });
  }
};

exports.getAllProjectIssueMembers = async (req, res) => {
  try {
    const { siteId } = req.params;

    if (!siteId) {
      return res.status(400).json({
        status: 400,
        message: 'Site ID is required',
      });
    }

    const memberRoles = [
      'project_admin',
      'sr_engineer',
      'site_engineer',
      'architect',
      'accountant',
      'operation',
      'sales',
    ];

    const populateOptions = memberRoles.map(role => ({
      path: role,
      model: 'User',
      select: 'employeeID firstname lastname roles',
      populate: {
        path: 'roles',
        model: 'Role',
        select: 'name',
      },
    }));

    const project = await Project.findOne({ siteID: siteId })
      .populate(populateOptions)
      .select(memberRoles.join(' '));

    if (!project) {
      return res.status(404).json({
        status: 404,
        message: 'Project not found',
      });
    }

    const allMembers = memberRoles.reduce((acc, role) => {
      if (Array.isArray(project[role])) {
        return acc.concat(project[role]);
      }
      return acc;
    }, []);

    return res.status(200).json({
      status: 200,
      data: allMembers,
    });
  } catch (error) {
    console.error('Error fetching project issue members:', error);
    return res.status(500).json({
      status: 500,
      message: 'Internal Server Error while fetching project issue members',
      error: error.message,
    });
  }
};
