const { type } = require("@testing-library/user-event/dist/type");
const mongoose = require("mongoose");

const taskModel = mongoose.model(
  "tasks",
  new mongoose.Schema(
    {
      title: String,
      description: String,
      issueMember: [],
      assignedBy: {
        name: {
          type: String,
        },
        employeeID: {
          type: String,
        },
      },
      siteID:String,
      category: String,
      priority: String,
      repeat: {},
      dueDate: String,
      file: [],
      audio: [],
      reminder: [],
      progress: {
        status: {
          type: String,
          default: "Pending",
        },
        date: {
          type: String,
          default: "",
        },
        image: {
          type: Array,
          default: [],
        },
      },
      adminStatus: {
        status: {
          type: String,
          default: "Pending",
        },
        date: {
          type: String,
          default: "",
        },
        image: {
          type: Array,
          default: [],
        },
      },
    },
    { timestamps: true }
  )
);

module.exports = taskModel;
