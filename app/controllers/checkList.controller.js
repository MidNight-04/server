const config = require("../config/auth.config");
const db = require("../models");
const CheckList = db.checkList;
const xlsx = require("xlsx");
const axios = require("axios");

exports.addCheckList = async (req, res) => {
  const { name, checkList } = req.body;
  const data = {
    name: name,
    checkList: checkList,
  };
  const find = CheckList.find({ name: req.body.name });
  if (find?.length > 0) {
    res.status(200).send({ message: "Record already exist" });
  } else {
    let Check = new CheckList(data);
    Check.save((err, result) => {
      if (err) {
        res.status(500).send({ message: "Could not create checklist" });
        return;
      } else {
        console.log(result);
        res.status(201).send({ message: "Record created Successfuly" });
      }
      return;
    });
  }
};
exports.getAllCheckList = (req, res) => {
  CheckList.find({}).then((data, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the checklist",
      });
      return;
    }
    if (data) {
      res.status(200).send({
        message: "List of checklist fetched successfuly",
        data: data,
      });
    }
  });
  return;
};
exports.addNewPointById = async (req, res) => {
  const { id, name, checkList } = req.body;
  try {
    const filter = {
      _id: id,
      name: name,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $push: {
        checkList: checkList[0],
      },
    };
    // Perform the update
    const result = await CheckList.updateOne(filter, updateOperation);
    // console.log(result);
    if (result.modifiedCount === 1) {
      res.json({
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
  const { id, name, heading, point } = req.body;
  console.log(req.body);
  try {
    const filter = {
      _id: id,
      name: name,
      "checkList.heading": heading,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $push: {
        "checkList.$.points": { point: point },
      },
    };
    // Perform the update
    const result = await CheckList.updateOne(filter, updateOperation);
    if (result.modifiedCount === 1) {
      res.json({
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
      message: "Error while record update",
    });
  }
};
exports.deletePointById = async (req, res) => {
  const { id, name, heading, point } = req.body;
  // console.log(req.body);
  try {
    const filter = {
      _id: id,
      name: name,
      "checkList.heading": heading,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $pull: {
        "checkList.$.points": { point: point },
      },
    };
    // Perform the update
    CheckList.updateOne(filter, updateOperation)
      .then((result) => {
        res.json({
          status: 200,
          message: "New point deleted successfully",
        });
      })
      .catch((error) => {
        res.json({
          status: 400,
          message: "Error on delete point",
        });
      });
    // console.log(result);
    // if (result.modifiedCount === 1) {
    //   res.json({
    //     status: 200,
    //     message: "New Field added successfully",
    //   });
    // } else {
    //   res.json({
    //     status: 400,
    //     message: "Error on add new point",
    //   });
    // }
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while record delete",
    });
  }
};
exports.addNewHeadingById = async (req, res) => {
  const { id, name, newField } = req.body;
  // console.log(req.body);
  try {
    const filter = {
      _id: id,
      name: name,
    };
    // Construct the update operation to push a new point
    const updateOperation = {
      $push: {
        checkList: { heading: newField, points: [] },
      },
    };
    // Perform the update
    const result = await CheckList.updateOne(filter, updateOperation);
    // console.log(result);
    if (result.modifiedCount === 1) {
      res.json({
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
exports.deleteCheckListById = (req, res) => {
  const id = req.params.id;
  CheckList.deleteOne({ _id: id }, (err, dealer) => {
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
