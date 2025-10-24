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
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'Vendor',
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
MaterialRequestSchema.pre('save', function (next) {
  const now = new Date();
  let statusChanged = false;

  // Update status based on quantities
  if (this.materials?.length || this.receivedItems?.length) {
    const newStatus = calculateRequestStatus(
      this.materials,
      this.receivedItems
    );
    if (this.status !== newStatus) {
      this.status = newStatus;
      statusChanged = true;
    }
  }

  // Set lastUpdated if status changed
  if (statusChanged) {
    this.lastUpdated = now;
  }

  next();
});

module.exports = model('MaterialRequest', MaterialRequestSchema);
