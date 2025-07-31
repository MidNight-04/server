// const ConstructionStep = require('../models/ConstructionStep');
// const db = require('../models');
// const CheckList = db.checkList;
// const xlsx = require('xlsx');

// exports.addConstructionStep = async (req, res) => {
//   const { name, priority } = req.body;
//   const find = await ConstructionStep.find({ name: name.trim() });
//   if (find?.length > 0) {
//     res.json({
//       status: 200,
//       message: 'Priority already exist',
//     });
//   } else {
//     const workbook = xlsx.readFile(req.files.file[0].path, { type: 'buffer' });
//     // const sheetName = workbook.SheetNames[0];
//     // const sheet = workbook.Sheets[sheetName];

//     // Convert sheet to JSON array
//     const data = xlsx.utils.sheet_to_json(workbook.Sheets.Sheet1);

//     const arraySave = [];
//     if (data.length > 0) {
//       for (let i = 0; i < data?.length; i++) {
//         arraySave.push({
//           point: data[i].point,
//           content: data[i].content,
//           duration: data[i].duration ? data[i].duration : '',
//           issueMember: data[i].issueMember
//             ? data[i].issueMember.split('/').filter(role => role.trim() !== '')
//             : [],
//           checkList: data[i].checkList ? data[i].checkList : 'no',
//           checkListName: data[i].checkListName ? data[i].checkListName : '',
//         });
//         if (data[i].checkList?.toLowerCase() === 'yes') {
//           const dataUpload = {
//             checkListStep: name,
//             name: data[i].checkListName,
//             checkListNumber: data[i].point,
//             checkList: [],
//           };
//           let Check = new CheckList(dataUpload);
//           Check.save();
//         }
//       }
//       const createData = new ConstructionStep({
//         name: name,
//         priority: priority,
//         points: arraySave,
//       });
//       createData
//         .save()
//         .then(() => {
//           res.json({
//             status: 201,
//             message: 'Record created successfully',
//           });
//         })
//         .catch(err => {
//           // console.error('Error saving data:', err);
//           res.json({
//             status: 400,
//             message: 'Error while record create',
//           });
//         });
//     } else {
//       res.json({
//         message: 'No data present in file...',
//         status: 400,
//       });
//     }
//   }
// };

// exports.getConstructionStep = async (req, res) => {
//   try {
//     const steps = await ConstructionStep.find({}).sort({ order: 1 });
//     res.status(200).json({
//       data: steps,
//     });
//   } catch (err) {
//     console.error('Error fetching construction steps:', err);
//     res.status(500).json({
//       message: 'There was a problem in getting the list of steps',
//     });
//   }
// };

// exports.deleteConstructionStepById = (req, res) => {
//   const id = req.params.id;
//   ConstructionStep.deleteOne({ _id: id }, (err, dealer) => {
//     if (err) {
//       res
//         .status(500)
//         .send({ message: 'The requested data could not be fetched' });
//       return;
//     }
//     res.status(200).send({
//       message: 'Record delete successfully',
//       status: 200,
//     });
//     return;
//   });
// };

// exports.addNewFieldConstructionStepById = async (req, res) => {
//   const {
//     id,
//     previousPoint,
//     newField,
//     checkList,
//     checkListName,
//     duration,
//     issueMember,
//   } = req.body;
//   // console.log(req.body);
//   try {
//     var findData = await ConstructionStep.find({ _id: id });
//     var newObj = {
//       point: parseInt(previousPoint) + 1,
//       content: newField,
//       issueMember: issueMember,
//       duration: duration,
//       checkList: checkList,
//       checkListName: checkListName,
//       checkListPoint: [],
//       finalStatus: [{ status: 'Pending', image: [], date: '' }],
//       approvalTask: [],
//       dailyTask: [],
//     };
//     var index = findData[0]?.points?.findIndex(
//       obj => obj.point === previousPoint
//     );
//     // console.log(index);
//     findData[0]?.points?.splice(index + 1, 0, newObj);
//     // Update 'point' numbers starting from the newly inserted object
//     for (var i = index + 2; i < findData[0]?.points?.length; i++) {
//       findData[0].points[i].point += 1;
//     }
//     ConstructionStep.updateOne(
//       { _id: id },
//       { $set: { points: findData[0]?.points } },
//       (err, data) => {
//         if (err) {
//           res.status(500).send({ message: 'Internal Server Error' });
//           return;
//         } else {
//           if (data.modifiedCount === 1) {
//             res.json({
//               status: 200,
//               message: 'New Field added successfully',
//             });
//           }
//         }
//       }
//     );
//   } catch (error) {
//     res.json({
//       status: 400,
//       message: 'Error while record create',
//     });
//   }
// };
// exports.deleteConstructionPointById = async (req, res) => {
//   const { id, point } = req.body;
//   try {
//     var findData = await ConstructionStep.find({ _id: id });
//     var index = findData[0]?.points?.findIndex(obj => obj.point === point);
//     findData[0]?.points?.splice(index, 1);
//     // Update 'point' numbers starting from the newly inserted object
//     for (let i = index; i < findData[0]?.points?.length; i++) {
//       findData[0].points[i].point -= 1;
//     }
//     ConstructionStep.updateOne(
//       { _id: id },
//       { $set: { points: findData[0]?.points } },
//       (err, data) => {
//         if (err) {
//           res.status(500).send({ message: 'Internal Server Error' });
//         } else {
//           if (data.modifiedCount === 1) {
//             res.json({
//               status: 200,
//               message: 'Field deleted successfully',
//             });
//           }
//         }
//       }
//     );
//   } catch (error) {
//     res.json({
//       status: 400,
//       message: 'Error while record delete',
//     });
//   }
// };

// exports.reorderSteps = async (req, res) => {
//   try {
//     const { steps } = req.body;

//     if (!Array.isArray(steps)) {
//       return res.status(400).json({ message: 'Invalid steps format' });
//     }

//     const bulkOps = steps.map((step, index) => ({
//       updateOne: {
//         filter: { _id: step._id },
//         update: { $set: { order: index } },
//       },
//     }));

//     await ConstructionStep.bulkWrite(bulkOps);

//     return res.json({ message: 'Steps reordered successfully' });
//   } catch (err) {
//     console.error('Reorder error:', err);
//     res.status(500).json({ message: 'Internal server error' });
//   }
// };

const ConstructionStep = require('../models/ConstructionStep');
const db = require('../models');
const CheckList = db.checkList;
const xlsx = require('xlsx');

exports.addConstructionStep = async (req, res) => {
  try {
    const { name, priority, order = 0 } = req.body;
    const existing = await ConstructionStep.findOne({ name: name.trim() });

    if (existing) {
      return res
        .status(200)
        .json({ message: 'Step with the same name already exists' });
    }

    const workbook = xlsx.readFile(req.files.file[0].path, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const data = xlsx.utils.sheet_to_json(workbook.Sheets[sheetName]);

    if (!data.length) {
      return res.status(400).json({ message: 'No data present in file...' });
    }

    const arraySave = [];
    for (let i = 0; i < data.length; i++) {
      const point = {
        point: data[i].point,
        content: data[i].content,
        duration: data[i].duration || '',
        issueMember: data[i].issueMember
          ? data[i].issueMember.split('/').filter(role => role.trim())
          : [],
        checkList: data[i].checkList || 'no',
        checkListName: data[i].checkListName || '',
      };
      arraySave.push(point);

      if ((data[i].checkList || '').toLowerCase() === 'yes') {
        const checkListEntry = new CheckList({
          checkListStep: name,
          name: data[i].checkListName,
          checkListNumber: data[i].point,
          checkList: [],
        });
        await checkListEntry
          .save()
          .catch(err => console.error('Checklist save error:', err));
      }
    }

    const newStep = new ConstructionStep({
      name,
      priority,
      order: order,
      points: arraySave,
    });
    await newStep.save();
    await createLogManually(
      req,
      `Created construction step ${name} with priority ${priority}.`
    );

    res.status(201).json({ message: 'Record created successfully' });
  } catch (err) {
    console.error('Add Step Error:', err);
    res.status(400).json({ message: 'Error while creating record' });
  }
};

exports.getConstructionStep = async (req, res) => {
  try {
    const steps = await ConstructionStep.find({}).sort({ order: 1 });
    res.status(200).json({ data: steps });
  } catch (err) {
    console.error('Fetch Error:', err);
    res
      .status(500)
      .json({ message: 'There was a problem in getting the list of steps' });
  }
};

exports.deleteConstructionStepById = async (req, res) => {
  try {
    const { id } = req.params;
    const step = await ConstructionStep.findOne({ _id: id });
    await ConstructionStep.deleteOne({ _id: id });
    await createLogManually(
      req,
      `Deleted construction step ${step.name}.`
    );
    res.status(200).json({ message: 'Record deleted successfully' });
  } catch (err) {
    console.error('Delete Error:', err);
    res
      .status(500)
      .json({ message: 'The requested data could not be deleted' });
  }
};

exports.addNewFieldConstructionStepById = async (req, res) => {
  try {
    const {
      id,
      previousPoint,
      newField,
      checkList,
      checkListName,
      duration,
      issueMember,
    } = req.body;
    const step = await ConstructionStep.findOne({ _id: id });

    const newPoint = {
      point: parseInt(previousPoint) + 1,
      content: newField,
      duration,
      issueMember,
      checkList,
      checkListName,
      checkListPoint: [],
      finalStatus: [{ status: 'Pending', image: [], date: '' }],
      approvalTask: [],
      dailyTask: [],
    };

    const index = step.points.findIndex(p => p.point === previousPoint);
    step.points.splice(index + 1, 0, newPoint);

    for (let i = index + 2; i < step.points.length; i++) {
      step.points[i].point += 1;
    }

    await step.save();
    await createLogManually(
      req,
      `Added new field ${newField} to construction step ${step.name}.`
    );
    res.status(200).json({ message: 'New Field added successfully' });
  } catch (err) {
    console.error('Add Field Error:', err);
    res.status(400).json({ message: 'Error while adding field' });
  }
};

exports.deleteConstructionPointById = async (req, res) => {
  try {
    const { id, point } = req.body;
    const step = await ConstructionStep.findOne({ _id: id });

    const index = step.points.findIndex(p => p.point === point);
    step.points.splice(index, 1);

    for (let i = index; i < step.points.length; i++) {
      step.points[i].point -= 1;
    }

    await step.save();
    await createLogManually(
      req,
      `Deleted field ${point} from construction step ${step.name}.`
    );
    res.status(200).json({ message: 'Field deleted successfully' });
  } catch (err) {
    console.error('Delete Field Error:', err);
    res.status(400).json({ message: 'Error while deleting field' });
  }
};

exports.reorderSteps = async (req, res) => {
  try {
    const { steps } = req.body;
    if (!Array.isArray(steps)) {
      return res.status(400).json({ message: 'Invalid steps format' });
    }

    const bulkOps = steps.map((step, index) => ({
      updateOne: {
        filter: { _id: step._id },
        update: { $set: { order: index } },
      },
    }));

    await ConstructionStep.bulkWrite(bulkOps);
    await createLogManually(
      req,
      `Reordered construction steps.`
    );
    res.status(200).json({ message: 'Steps reordered successfully' });
  } catch (err) {
    console.error('Reorder Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
