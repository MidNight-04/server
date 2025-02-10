const db = require("../models");
const TaskCategoryModel = db.taskCategories;

exports.addCategory = async (req, res) => {
  let data = {
    name: req.body.data.name,
  };
  console.log(data);
  const findCategory = await TaskCategoryModel.find({ name: data.name });
  if (findCategory?.length > 0) {
    res
      .status(200)
      .send({ status: 204, message: "Record already exist with given name" });
  } else {
    let Category = new TaskCategoryModel(data);
    Category.save((err, result) => {
      if (err) {
        res.status(500).send({ message: "Could not create category" });
        return;
      } else {
        // console.log(result);
        res.status(201).send({ message: "Record created Successfuly" });
      }
      return;
    });
  }
};

exports.getAllCategory = async (req, res) => {
  TaskCategoryModel.find({}).then((category, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of category",
      });
      return;
    }
    if (category) {
      // console.log("category--",category)
      res.status(200).send({
        message: "List of Category fetched successfuly",
        data: category,
      });
    }
  });
  return;
};

exports.getTaskCategoryById = async (req, res) => {
  const id = req.params.id;
  TaskCategoryModel.findById(id, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: "Could not find id to get details" });
      return;
    }
    if (data) {
      res.status(200).send({ data: data, status: 200 });
    }
  });
};

exports.updateTaskCategoryById = async (req, res) => {
  const { id, name } = req.body;
  const data = {
    name: name,
  };
  TaskCategoryModel.updateOne({ _id: id }, data, (err, updated) => {
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

exports.deleteTaskCategoryById = async (req, res) => {
  const id = req.params.id;
  TaskCategoryModel.deleteOne({ _id: id }, (err, dealer) => {
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
