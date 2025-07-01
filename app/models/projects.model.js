const mongoose = require('mongoose');

const projectSchema = new mongoose.Schema(
    {
      project_name: String,
      siteID: String,
      project_location: String,
      branch: {
      type: String,
      trim: true,
      },
      client: {
        type:mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
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
      // project_manager: [],
      sr_engineer: [],
      site_engineer: [],
      architect: [],
      // sr_architect: [],
      accountant: [],
      operation: [],
      sales: [],
      contractor: [],
      openTicket: [
        {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Tickets',
        },
      ],
      project_status: [
        {
          name: String,
          priority: String,
          step: [
            {
              taskId: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'Tasks',
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

projectSchema.methods.deleteProjectById = async function(id) {
  try {
    const project = await this.model('projects').findOne({ _id: id });
    if (!project) {
      throw new Error(`Project with id ${id} not found`);
    }
    await Promise.all([
      this.model('tasks').deleteMany({ siteID: project.siteID }),
      this.model('paymentStages').deleteOne({ siteID: project.siteID }),
      this.model('projectpaymentdetails').deleteMany({ siteID: project.siteID }),
      project.remove()
    ]);
  } catch (error) {
    console.error(error);
    throw error;
  }
}

// projectSchema.methods.deleteProjectById = async function(id) {
//   try {
//     const project = await this.model('projects').findOne({ _id: id });
//     if (project) {
//       await Promise.all([
//         this.model('tasks').deleteMany({ siteID: project.siteID }),
//         this.model('paymentStages').deleteOne({ siteID: project.siteID }),
//         this.model('projectpaymentdetails').deleteMany({siteID: project.siteID})
//       ]);
//       await project.remove();
//     }
//   } catch (error) {
//     console.error(error);
//     throw error;
//   }
// }

const Project = mongoose.model('projects', projectSchema);

module.exports = Project;
