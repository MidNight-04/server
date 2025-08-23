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
    min: [1, 'Quantity must be at least 1'],
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
    min: [1, 'Quantity received must be at least 1'],
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
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    requiredBefore: {
      type: Date,
      required: true,
    },
  },
  { timestamps: true }
);

/**
 * Merge duplicate received items before saving
 */
// MaterialRequestSchema.pre('save', function (next) {
//   if (this.receivedItems?.length) {
//     const merged = [];

//     this.receivedItems.forEach(item => {
//       const existing = merged.find(
//         m => m.item?.toString() === item.item?.toString()
//       );

//       if (existing) {
//         existing.quantity += item.quantity; // quantity field, not quantityReceived
//         if (item.receivedAt > existing.receivedAt) {
//           existing.receivedAt = item.receivedAt;
//         }
//       } else {
//         merged.push(item.toObject ? item.toObject() : { ...item });
//       }
//     });

//     this.receivedItems = merged;
//   }

//   next();
// });

// /**
//  * Auto-update status before saving
//  */
// MaterialRequestSchema.pre('save', function (next) {
//   if (!this.materials?.length) return next();

//   const totalOrdered = this.materials.reduce(
//     (sum, item) => sum + item.quantity,
//     0
//   );
//   const totalReceived = this.receivedItems.reduce(
//     (sum, item) => sum + item.quantity,
//     0
//   );

//   if (totalReceived === 0) {
//     this.status = 'pending';
//   } else if (totalReceived < totalOrdered) {
//     this.status = 'partially received';
//   } else if (totalReceived >= totalOrdered) {
//     this.status = 'received';
//   }

//   next();
// });

// --- helper: robustly compute request status ---
function calculateRequestStatus(materials = [], receivedItems = []) {
  // Extract an ID from various possible shapes
  const getId = x =>
    (x?.materialId || x?.item?._id || x?.item || x?._id || x?.id)?.toString?.();

  // Normalize qty fields (supports several common names)
  const getOrderedQty = m =>
    Number(m?.orderedQty ?? m?.quantity ?? m?.qty ?? 0);

  const getReceivedQty = r =>
    Number(r?.quantityReceived ?? r?.receivedQty ?? r?.quantity ?? r?.qty ?? 0);

  // Map of ordered quantities per material
  const ordered = new Map();
  for (const m of materials) {
    const id = getId(m);
    if (!id) continue;
    ordered.set(id, (ordered.get(id) || 0) + getOrderedQty(m));
  }

  // Map of total received quantities per material (merges multiple receipts)
  const received = new Map();
  for (const r of receivedItems) {
    const id = getId(r);
    if (!id) continue;
    received.set(id, (received.get(id) || 0) + getReceivedQty(r));
  }

  if (ordered.size === 0) return 'pending'; // nothing to compare against

  let anyReceived = false;
  let allComplete = true;

  for (const [id, ordQty] of ordered.entries()) {
    const recQty = received.get(id) || 0;
    if (recQty > 0) anyReceived = true;
    if (recQty < ordQty) allComplete = false; // treat >= as complete (over-receipt counts as complete)
  }

  if (allComplete && anyReceived) return 'completed';
  if (anyReceived) return 'partial';
  return 'pending';
}

/**
 * Merge duplicate received items before saving
 * This prevents duplicate entries for the same material
 */
MaterialRequestSchema.pre('save', function (next) {
  if (this.receivedItems?.length) {
    this.receivedItems = mergeReceivedItems(this.receivedItems);
  }
  next();
});

/**
 * Auto-update status based on received vs ordered quantities
 * This ensures status is always accurate
 */
MaterialRequestSchema.pre('save', function (next) {
  if (this.materials?.length || this.receivedItems?.length) {
    const newStatus = calculateRequestStatus(
      this.materials,
      this.receivedItems
    );

    // Only update status if it's different to avoid unnecessary saves
    if (this.status !== newStatus) {
      this.status = newStatus;
    }
  }
  next();
});

/**
 * Update lastUpdated timestamp when receivedItems are modified
 */
MaterialRequestSchema.pre('save', function (next) {
  if (this.isModified('receivedItems')) {
    this.lastUpdated = new Date();
  }
  next();
});

// Alternative: Combined pre-save hook for better performance
// Use this instead of the three separate hooks above if preferred
MaterialRequestSchema.pre('save', function (next) {
  const now = new Date();
  let statusChanged = false;

  // Merge duplicate received items
  if (this.receivedItems?.length) {
    const originalLength = this.receivedItems.length;
    this.receivedItems = mergeReceivedItems(this.receivedItems);

    // Update timestamp if items were modified
    if (
      this.isModified('receivedItems') ||
      originalLength !== this.receivedItems.length
    ) {
      this.lastUpdated = now;
    }
  }

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
