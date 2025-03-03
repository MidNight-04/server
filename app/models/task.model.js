const { Schema, model } = require("mongoose");

const taskSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    issueMember: {
      type: Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    referenceModel: {
      type: String,
      enum: ["teammembers", "clients"],
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    siteID: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: "Project",
    },
    priority: {
      type: String,
      enum: ["Low", "Medium", "High"],
      default: "Low",
    },
    repeat: {
      repeatType: {
        type: String,
        enum: ["Once", "Hourly", "Daily", "Weekly", "Monthly"],
        default: "Once",
      },
      repeatValue: {
        type: String,
        default: "00:00",
        validate: {
          validator: v => {
            return /^([01][0-9]|2[0-3]):[0-5][0-9]$/.test(v);
          },
          message: props => `${props.value} is not a valid time!`,
        },
      },
    },
    dueDate: {
      type: Date,
    },
    image: [
      {
        type: String,
      },
    ],
    file: [
      {
        type: String,
      },
    ],
    audio: [
      {
        type: String,
      },
    ],
    reminder: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Complete"],
      default: "Pending",
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: "TaskComment",
      },
    ],
  },
  { timestamps: true }
);

taskSchema.index({
  "title": "text",
  "description": "text",
  "siteID": "text",
  "category": "text",
  "priority": "text",
  "assignedBy.name": "text",
  "assignedBy.employeeID": "text",
  "issueMember.name": "text",
  "issueMember.employeeID": "text",
  "repeat.repeatType": "text",
  "status": "text",
});

const taskModel = model("Tasks", taskSchema);

module.exports = taskModel;
