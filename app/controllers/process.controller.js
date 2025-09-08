const ConstructionStep = require('../models/ConstructionStep');
const db = require('../models');
const CheckList = db.checkList;
const xlsx = require('xlsx');
const { createLogManually } = require('../middlewares/createLog');

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
    await createLogManually(req, `Deleted construction step ${step.name}.`);
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

    const step = await ConstructionStep.findById(id);
    if (!step) {
      return res.status(404).json({ message: 'Construction step not found' });
    }

    const prevPointNum = Number(previousPoint);
    const index = step.points.findIndex(p => p.point === prevPointNum);

    if (index === -1) {
      return res
        .status(400)
        .json({ message: `Point ${previousPoint} not found in step` });
    }

    const newPoint = {
      point: prevPointNum + 1,
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

    // Insert new point
    step.points.splice(index + 1, 0, newPoint);

    // Reassign point numbers to keep them sequential
    step.points.forEach((p, idx) => {
      p.point = idx + 1;
    });

    await step.save();

    await createLogManually(
      req,
      `Added new field "${newField}" to construction step "${step.name}".`
    );

    res.status(200).json({ message: 'New field added successfully' });
  } catch (err) {
    console.error('Add Field Error:', err);
    res
      .status(500)
      .json({ message: 'Error while adding field', error: err.message });
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
    await createLogManually(req, `Reordered construction steps.`);
    res.status(200).json({ message: 'Steps reordered successfully' });
  } catch (err) {
    console.error('Reorder Error:', err);
    res.status(500).json({ message: 'Internal server error' });
  }
};
