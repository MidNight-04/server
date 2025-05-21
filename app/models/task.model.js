const { Schema, model } = require('mongoose');

const taskSchema = new Schema(
  {
    title: {
      type: String,
      trim: true,
    },
    branch:{
      type: String,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    stepName:{
      type:String,
    },
    duration: { type: Number, default: 1 },
    point: {
      type: Number,
    },
    forceMajeure: {
      type: Boolean,
      default: false,
    },
    issueMember: {
      type: Schema.Types.ObjectId,
      refPath: 'referenceModel',
    },
    referenceModel: {
      type: String,
      enum: ['teammembers', 'clients'],
    },
    assignedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    subscribedMembers: [
      {
        type: Schema.Types.ObjectId,
        ref: 'teammembers',
      },
    ],
    siteID: {
      type: String,
      trim: true,
    },
    category: {
      type: String,
      trim: true,
      default: 'Project',
    },
    checkList: {
      type: Object,   
      default: {}
    },
    priority: {
      type: String,
      enum: ['Low', 'Medium', 'High'],
      default: 'Low',
    },
    repeat: {
      repeatType: {
        type: String,
        enum: ['norepeat', 'Hourly', 'Daily', 'Weekly', 'Monthly'],
        default: 'norepeat',
      },
      repeatValue: {
        type: String,
        default: '00:00',
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
      default: null,
    },
    isActive: {
      type: Boolean,
      default: false,
    },
    assignedOn: {
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
    audio: { type: String },
    reminder: [],
    status: {
      type: String,
      enum: ['Pending', 'In Progress', 'Complete', 'Overdue'],
      default: 'Pending',
    },
    updatedOn: {
      //completed on Date
      type: String,
      default: null,
    },
    comments: [
      {
        type: Schema.Types.ObjectId,
        ref: 'TaskComment',
      },
    ],
    reassigned: {
      isReassigned: {
        type: Boolean,
        default: false,
      },
      assignedTo: {
        type: Schema.Types.ObjectId,
      },
      assignedBy: {
        type: Schema.Types.ObjectId,
      },
      assignedOn: {
        type: Date,
      },
    },
  },
  { timestamps: true }
);

taskSchema.index({
  'title': 'text',
  'description': 'text',
  'siteID': 'text',
  'category': 'text',
  'priority': 'text',
  'assignedBy.name': 'text',
  'assignedBy.employeeID': 'text',
  'issueMember.name': 'text',
  'issueMember.employeeID': 'text',
  'repeat.repeatType': 'text',
  'status': 'text',
});

const taskModel = model('Tasks', taskSchema);

module.exports = taskModel;
