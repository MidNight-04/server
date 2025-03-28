const { Schema, model } = require("mongoose");

const taskCommentSchema = new Schema(
  {
    taskId: {
      type: Schema.Types.ObjectId,
      ref: "Tasks",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["In Progress", "Complete", "Comment", "Closed", "Reopened"],
      required: true,
    },
    comment: {
      type: String,
      required: true,
      trim: true,
    },
    file: [
      {
        type: String,
        default: null,
      },
    ],
    images: [
      {
        type: String,
        default: null,
      },
    ],
    audio: {
      type: String,
      default: null,
    },
    createdBy: {
      type: Schema.Types.ObjectId,
      refPath: "referenceModel",
      required: true,
    },
    referenceModel: {
      type: String,
      enum: ["teammembers", "User", "clients"],
      default: "teammembers",
    },
    approved: {
      isApproved: {
        type: Boolean,
        default: false,
      },
      approvedBy: {
        type: Schema.Types.ObjectId,
        ref: "referenceModel",
      },
      approvedOn: {
        type: Date,
      },
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

const TaskComment = model("TaskComment", taskCommentSchema);

module.exports = TaskComment;
