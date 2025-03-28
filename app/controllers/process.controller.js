const config = require("../config/auth.config");
const db = require("../models");
const Process = db.constructionsteps;
const CheckList = db.checkList;
const xlsx = require("xlsx");
const axios = require("axios");

exports.addConstructionStep = async (req, res) => {
  const { name, priority } = req.body;
  const find = await Process.find({ name: name.trim() });
  if (find?.length > 0) {
    res.json({
      status: 200,
      message: "Priority already exist",
    });
  } else {
    //   console.log(req.files);
    const response = await axios.get(req.files.points[0]?.location, {
      responseType: "arraybuffer",
    });
    // Parse Excel file
    const workbook = xlsx.read(response.data, { type: "buffer" });
    // Access first sheet
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Convert sheet to JSON array
    const data = xlsx.utils.sheet_to_json(sheet);

    //   console.log("Excel Data:", data);
    var arraySave = [];
    if (data.length > 0) {
      for (let i = 0; i < data?.length; i++) {
        arraySave.push({
          point: data[i].point,
          content: data[i].content,
          duration: data[i].duration ? data[i].duration : "",
          issueMember: data[i].issueMember
            ? data[i].issueMember.split("/").filter(role => role.trim() !== "")
            : [],
          checkList: data[i].checkList ? data[i].checkList : "no",
          checkListName: data[i].checkListName ? data[i].checkListName : "",
        });
        if (data[i].checkList?.toLowerCase() === "yes") {
          const dataUpload = {
            checkListStep: name,
            name: data[i].checkListName,
            checkListNumber: data[i].point,
            checkList: [],
          };
          let Check = new CheckList(dataUpload);
          Check.save();
        }
      }
      const createData = new Process({
        name: name,
        priority: priority,
        points: arraySave,
      });
      createData
        .save()
        .then(() => {
          res.json({
            status: 201,
            message: "Record created successfully",
          });
        })
        .catch(err => {
          // console.error('Error saving data:', err);
          res.json({
            status: 400,
            message: "Error while record create",
          });
        });
    } else {
      res.json({
        message: "No data present in file...",
        status: 400,
      });
    }
  }
};
exports.getConstructionStep = (req, res) => {
  Process.find({}).then((step, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of role",
      });
      return;
    }
    if (step) {
      res.status(200).send({
        // message: "List of role fetched successfuly",
        data: step,
      });
    }
  });
  return;
};
exports.deleteConstructionStepById = (req, res) => {
  const id = req.params.id;
  Process.deleteOne({ _id: id }, (err, dealer) => {
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
exports.addNewFieldConstructionStepById = async (req, res) => {
  const {
    id,
    previousPoint,
    newField,
    checkList,
    checkListName,
    duration,
    issueMember,
  } = req.body;
  // console.log(req.body);
  try {
    var findData = await Process.find({ _id: id });
    var newObj = {
      point: parseInt(previousPoint) + 1,
      content: newField,
      issueMember: issueMember,
      duration: duration,
      checkList: checkList,
      checkListName: checkListName,
      checkListPoint: [],
      finalStatus: [{ status: "Pending", image: [], date: "" }],
      approvalTask: [],
      dailyTask: [],
    };
    var index = findData[0]?.points?.findIndex(
      obj => obj.point === previousPoint
    );
    // console.log(index);
    findData[0]?.points?.splice(index + 1, 0, newObj);
    // Update 'point' numbers starting from the newly inserted object
    for (var i = index + 2; i < findData[0]?.points?.length; i++) {
      findData[0].points[i].point += 1;
    }
    Process.updateOne(
      { _id: id },
      { $set: { points: findData[0]?.points } },
      (err, data) => {
        if (err) {
          res.status(500).send({ message: "Internal Server Error" });
          return;
        } else {
          if (data.modifiedCount === 1) {
            res.json({
              status: 200,
              message: "New Field added successfully",
            });
          }
        }
      }
    );
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while record create",
    });
  }
};
exports.deleteConstructionPointById = async (req, res) => {
  const { id, point } = req.body;
  // console.log(req.body);
  try {
    var findData = await Process.find({ _id: id });
    var index = findData[0]?.points?.findIndex(obj => obj.point === point);
    findData[0]?.points?.splice(index, 1);
    // Update 'point' numbers starting from the newly inserted object
    for (let i = index; i < findData[0]?.points?.length; i++) {
      findData[0].points[i].point -= 1;
    }
    Process.updateOne(
      { _id: id },
      { $set: { points: findData[0]?.points } },
      (err, data) => {
        if (err) {
          res.status(500).send({ message: "Internal Server Error" });
        } else {
          if (data.modifiedCount === 1) {
            res.json({
              status: 200,
              message: "Field deleted successfully",
            });
          }
        }
      }
    );
  } catch (error) {
    res.json({
      status: 400,
      message: "Error while record delete",
    });
  }
};
