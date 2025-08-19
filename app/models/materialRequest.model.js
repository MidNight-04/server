import mongoose from 'mongoose';

const itemSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1'],
  },
});

const receivedItemSchema = new mongoose.Schema({
  materialId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Material',
    required: true,
  },
  quantityReceived: {
    type: Number,
    required: true,
    min: [1, 'Quantity received must be at least 1'],
  },
  receivedBy: {
    type: mongoose.Schema.Types.ObjectId,
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

const MaterialRequestSchema = new mongoose.Schema(
  {
    siteId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Site',
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
    orderedItems: {
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
        'rejected',
        'completed',
        'received',
        'partially received',
      ],
      default: 'pending',
    },
    requestedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  { timestamps: true }
);

// Merge duplicate material entries before saving
MaterialRequestSchema.pre('save', function (next) {
  if (this.receivedItems?.length) {
    const merged = [];

    this.receivedItems.forEach(item => {
      const existing = merged.find(
        m => m.materialId.toString() === item.materialId.toString()
      );

      if (existing) {
        // Merge quantity
        existing.quantityReceived += item.quantityReceived;

        // Keep latest date if newer
        if (item.receivedAt > existing.receivedAt) {
          existing.receivedAt = item.receivedAt;
        }
      } else {
        merged.push({ ...item.toObject() });
      }
    });

    this.receivedItems = merged;
  }

  next();
});

// Auto-update status before saving
MaterialRequestSchema.pre('save', function (next) {
  if (!this.orderedItems?.length) return next();

  const totalOrdered = this.orderedItems.reduce(
    (sum, item) => sum + item.quantity,
    0
  );
  const totalReceived = this.receivedItems.reduce(
    (sum, item) => sum + item.quantityReceived,
    0
  );

  if (totalReceived === 0) {
    this.status = 'pending';
  } else if (totalReceived < totalOrdered) {
    this.status = 'partially received';
  } else if (totalReceived >= totalOrdered) {
    this.status = 'received';
  }

  next();
});

export default mongoose.models.MaterialRequest ||
  mongoose.model('MaterialRequest', MaterialRequestSchema);
