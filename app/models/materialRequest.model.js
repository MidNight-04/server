const { Schema, model } = require('mongoose');

const itemSchema = new Schema({
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity must be greater than 0'],
    validate: {
      validator: function (v) {
        return !isNaN(v) && v > 0;
      },
      message: props => `${props.value} is not a valid quantity`,
    },
  },
  unit: {
    type: String,
    required: true,
  },
  rate: {
    type: Number,
  },
  // vendor: {
  //   _id: {
  //     type: Schema.Types.ObjectId,
  //     ref: 'Vendor',
  //   },
  //   foreignKey: { type: String },
  // },
  vendor: {
    type: String,
  },
});

const receivedItemSchema = new Schema({
  item: {
    type: Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [0.01, 'Quantity received must be greater than 0'],
  },
  receivedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  receivedAt: {
    type: Date,
    default: Date.now,
  },
  remarks: {
    type: String,
    trim: true,
  },
  image: {
    type: String,
    default: null,
  },
  video: {
    type: String,
    default: null,
  },
});

const requestUpdates = new Schema({
  status: String,
  updatedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
  },
  updatedAt: { type: Date, default: Date.now },
  remarks: String,
});

const approvalSchema = new Schema({
  level: { type: Number, required: true },
  approverId: { type: Schema.Types.ObjectId, ref: 'User' },
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending',
  },
  approvedAt: Date,
});

const MaterialRequestSchema = new Schema(
  {
    site: {
      type: Schema.Types.ObjectId,
      ref: 'projects',
      required: true,
    },
    purpose: {
      type: String,
      required: true,
      trim: true,
    },
    priority: {
      type: String,
      enum: ['low', 'medium', 'high'],
      required: true,
    },
    materials: {
      type: [itemSchema],
      validate: {
        validator: function (arr) {
          return arr.length > 0;
        },
        message: 'At least one material is required',
      },
    },
    receivedItems: {
      type: [receivedItemSchema],
      default: [],
    },
    status: {
      type: String,
      enum: [
        'pending',
        'approved',
        'order placed',
        'rejected',
        'completed',
        'received',
        'partially received',
      ],
      default: 'pending',
    },
    updates: {
      type: [requestUpdates],
      default: [],
    },
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requiredBefore: {
      type: Date,
      required: true,
    },
    expectedDeliveryDate: {
      type: Date,
    },
    approvals: {
      type: [approvalSchema],
      default: [
        { level: 1, status: 'pending' },
        { level: 2, status: 'pending' },
      ],
    },
  },
  { timestamps: true }
);

function calculateRequestStatus(materials = [], receivedItems = []) {
  const EPSILON = 1e-6; // tolerance for floating point

  const getId = x =>
    (x?.materialId || x?.item?._id || x?.item || x?._id || x?.id)?.toString?.();

  const getOrderedQty = m =>
    Number(m?.orderedQty ?? m?.quantity ?? m?.qty ?? 0);

  const getReceivedQty = r =>
    Number(r?.quantityReceived ?? r?.receivedQty ?? r?.quantity ?? r?.qty ?? 0);

  const ordered = new Map();
  for (const m of materials) {
    const id = getId(m);
    if (!id) continue;
    ordered.set(id, (ordered.get(id) || 0) + getOrderedQty(m));
  }

  const received = new Map();
  for (const r of receivedItems) {
    const id = getId(r);
    if (!id) continue;
    received.set(id, (received.get(id) || 0) + getReceivedQty(r));
  }

  if (ordered.size === 0) return 'pending';

  let anyReceived = false;
  let allComplete = true;

  for (const [id, ordQty] of ordered.entries()) {
    const recQty = received.get(id) || 0;
    if (recQty > EPSILON) anyReceived = true;
    if (recQty + EPSILON < ordQty) allComplete = false;
  }

  if (allComplete && anyReceived) return 'completed';
  if (anyReceived) return 'partially received';
  return 'pending';
}

// Use this instead of the three separate hooks above if preferred
// MaterialRequestSchema.pre('save', function (next) {
//   const now = new Date();
//   let statusChanged = false;
//   if (this.materials?.length || this.receivedItems?.length) {
//     const newStatus = calculateRequestStatus(
//       this.materials,
//       this.receivedItems
//     );
//     if (this.status !== newStatus) {
//       this.status = newStatus;
//       statusChanged = true;
//     }
//   }
//   if (statusChanged) {
//     this.lastUpdated = now;
//   }

//   next();
// });

MaterialRequestSchema.pre('save', function (next) {
  const now = new Date();
  const manualStatus = this.status?.toLowerCase();

  // Step 1: Calculate material-based status (pending, partially received, completed)
  let receivingStatus = calculateRequestStatus(
    this.materials,
    this.receivedItems
  );

  // Step 2: Combine approval + receiving logic
  // Priority: rejection > order/approval > receiving
  let finalStatus = 'pending';

  if (manualStatus === 'rejected') {
    finalStatus = 'rejected';
  } else if (manualStatus === 'order placed') {
    if (receivingStatus === 'completed') {
      finalStatus = 'completed';
    } else if (receivingStatus === 'partially received') {
      finalStatus = 'partially received';
    } else {
      finalStatus = 'order placed';
    }
  } else if (manualStatus === 'approved') {
    // When approved but not yet ordered or received
    finalStatus = 'approved';
  } else {
    // Fallback to receiving-based logic for unapproved requests
    finalStatus = receivingStatus;
  }

  // Step 3: Update only if status actually changes
  if (this.status !== finalStatus) {
    this.status = finalStatus;
    this.lastUpdated = now;
  }

  next();
});

module.exports = model('MaterialRequest', MaterialRequestSchema);
