const db = require('../models');
const FloorModel = db.floors;
const { createLogManually } = require('../middlewares/createLog');

exports.addProjectFloor = (req, res) => {
  let data = {
    name: req.body.name,
  };
  // console.log(data)
  const findFloor = FloorModel.find({ name: req.body.name });
  if (findFloor?.length > 0) {
    res.status(200).send({ message: 'Record already exist' });
  } else {
    let Floor = new FloorModel(data);
    Floor.save(async (err, result) => {
      await createLogManually(req, `Created floor ${data.name}.`);
      if (err) {
        res.status(500).send({ message: 'Could not create Floor' });
        return;
      } else {
        console.log(result);
        res.status(201).send({ message: 'Record created Successfuly' });
      }
      return;
    });
  }
};

exports.getAllProjectFloor = (req, res) => {
  FloorModel.find({}).then((Floor, err) => {
    if (err) {
      res.status(500).send({
        message: 'There was a problem in getting the list of Floor',
      });
      return;
    }
    if (Floor) {
      res.status(200).send({
        message: 'List of Floor fetched successfuly',
        data: Floor,
      });
    }
  });
  return;
};

exports.deleteProjectFloorById = async (req, res) => {
  try {
    const id = req.params.id;

    const floor = await FloorModel.findById(id);
    if (!floor) {
      return res.status(404).send({ message: 'Floor not found' });
    }

    await FloorModel.deleteOne({ _id: id });

    await createLogManually(req, `Deleted floor ${floor.name}.`);

    return res.status(200).send({
      message: 'Record deleted successfully',
      status: 200,
    });
  } catch (err) {
    console.error('Error deleting floor:', err);
    return res.status(500).send({
      message: 'An error occurred while deleting the floor',
    });
  }
};

exports.getProjectFloorById = (req, res) => {
  const id = req.params.id;
  FloorModel.findById(id, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: 'Could not find id to get details' });
      return;
    }
    if (data) {
      res.status(200).send({ data: data });
    }
  });
};

exports.updateProjectFloorById = async (req, res) => {
  try {
    const { id, floor } = req.body;

    const updated = await FloorModel.updateOne({ _id: id }, { name: floor });

    if (updated.matchedCount === 0) {
      return res.status(404).send({ message: 'Floor not found' });
    }

    await createLogManually(req, `Updated floor ${floor}.`);

    return res.status(200).send({ message: 'Updated successfully' });
  } catch (err) {
    console.error('Error updating floor:', err);
    return res.status(500).send({
      message: 'Could not update floor details',
    });
  }
};
