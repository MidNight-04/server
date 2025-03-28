const mongoose = require("mongoose");

const projectModel = mongoose.model(
  "projects",
  new mongoose.Schema(
    {
      project_name: String,
      siteID: String,
      project_location: String,
      client: Object,
      floor: String,
      area: String,
      cost: Number,
      date: String,
      duration: String,
      extension: {
        type: Number,
        default: 0,
      },
      forceMajeure: [],
      project_admin: [],
      project_manager: [],
      sr_engineer: [],
      site_engineer: [],
      accountant: [],
      operation: [],
      sales: [],
      contractor: [],
      openTicket: [],
      project_status: [
        {
          name: String,
          priority: String,
          step: [
            {
              taskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Tasks",
              },
              point: Number,
              duration: Number,
            },
          ],
        },
      ],
      inspections: [],
    },
    { timestamps: true }
  )
);

module.exports = projectModel;
