const { Schema, model } = require("mongoose");

const ticketSchema = new Schema(
  {
    step: {
      type: String,
      trim: true,
    },
    point: {
      type: String,
      trim: true,
    },
    content: {
      type: String,
      trim: true,
    },
    query: {
      type: String,
      trim: true,
    },
    date: {
      type: Date,
      default: Date.now,
    },
    work: {
      type: String,
      trim: true,
    },
    assignMember: {
      type: Schema.Types.ObjectId,
      refPath: "referenceModel",
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      refPath: "clients",
    },
    referenceModel: {
      type: String,
      default: "teammembers",
      enum: ["teammembers", "clients"],
    },
    siteID: {
      type: String,
      trim: true,
    },
    image: [
      {
        type: String,
      },
    ],
    status: {
      type: String,
      enum: ["Pending", "In Progress", "Complete", "Closed", "Reopened"],
      default: "Pending",
    },
    completedOn: {
      type: Date,
      default: "",
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

const ticketModel = model("Tickets", ticketSchema);

module.exports = ticketModel;
