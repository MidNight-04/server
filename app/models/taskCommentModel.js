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
    file: {
      type: String,
      default: null,
    },
    image: [
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
      enum: ["teammembers", "User"],
      default: "teammembers",
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
