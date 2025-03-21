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
              point: Number,
              content: String,
              issueMember: [],
              duration: Number,
              checkList: String,
              checkListName: String,
              forceMajeure: {
                type: Boolean,
                default: false,
              },
              checkListPoint: [],
              finalStatus: [{ status: String, image: [], date: String }],
              approvalTask: [],
              dailyTask: [],
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
