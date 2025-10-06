const MaterialRequest = require('../models/materialRequest.model.js');
const Material = require('../models/material.model.js');
const mongoose = require('mongoose');
const awsS3 = require('../middlewares/aws-s3');

exports.createMaterialRequest = async (req, res) => {
  try {
    const { siteId, purpose, priority, materials, date } = req.body;
    const requestedBy = req.user?._id || req.userId || req.body?.userId;

    // Validate required fields
    if (
      !siteId ||
      !purpose ||
      !priority ||
      !Array.isArray(materials) ||
      materials.length === 0
    ) {
      return res.status(400).json({
        message:
          'siteId, purpose, priority, and at least one material are required.',
      });
    }

    // Validate materials
    const formattedMaterials = materials.map(m => {
      if (!m.materialId || !m.quantity) {
        throw new Error('Each material must have materialId and quantity.');
      }
      return {
        item: m.materialId,
        quantity: Number(m.quantity),
        unit: m.unit || null,
      };
    });

    const newRequest = new MaterialRequest({
      site: siteId,
      purpose,
      priority,
      materials: formattedMaterials,
      requiredBefore: date ? new Date(date) : null,
      requestedBy,
    });

    const savedRequest = await newRequest.save();

    // Optional: populate before returning
    await savedRequest.populate([
      { path: 'site', select: 'name location' },
      { path: 'materials.item', select: 'name unit' },
      { path: 'requestedBy', select: 'username email' },
    ]);

    res.status(201).json({
      message: 'Material request created successfully.',
      request: savedRequest,
    });
  } catch (error) {
    console.error('Error creating material request:', error.message);
    res.status(500).json({
      message: 'Server error creating material request.',
      error: error.message,
    });
  }
};

exports.getMaterialRequestById = async (req, res) => {
  try {
    const order = await MaterialRequest.findById(req.params.id)
      .populate([
        {
          path: 'materials.item',
          select: 'name unit price',
        },
        {
          path: 'requestedBy',
          select:
            'firstname lastname employeeId email phone profileImage roles',
        },
        {
          path: 'site',
          select: 'siteID',
        },
      ])
      .lean();

    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json(order);
  } catch (error) {
    console.error('Error fetching order:', error);
    res.status(500).json({ message: 'Server error fetching order.' });
  }
};

exports.updateMaterialRequest = async (req, res) => {
  try {
    const { siteId, purpose, priority, materials, date } = req.body;
    const requestedBy = req.user?._id || req.userId || req.body?.userId;

    // Validate materials if provided
    let formattedMaterials;
    if (materials && Array.isArray(materials)) {
      formattedMaterials = materials.map(m => {
        if (!m.materialId || !m.quantity) {
          throw new Error(
            'Each material must include materialId and quantity.'
          );
        }
        return {
          item: m.materialId,
          quantity: Number(m.quantity),
          unit: m.unit || null,
        };
      });
    }

    const updateData = {
      ...(siteId && { site: siteId }),
      ...(purpose && { purpose }),
      ...(priority && { priority }),
      ...(formattedMaterials && { materials: formattedMaterials }),
      ...(date && { requiredBefore: new Date(date) }),
      ...(requestedBy && { requestedBy }),
    };

    const updatedOrder = await MaterialRequest.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true }
    ).populate([
      {
        path: 'materials.item',
        select: 'name unit price',
      },
      {
        path: 'requestedBy',
        select: 'firstname lastname employeeId email phone profileImage roles',
      },
      {
        path: 'site',
        select: 'siteID',
      },
    ]);

    if (!updatedOrder) {
      return res.status(404).json({ message: 'Material request not found.' });
    }

    res.status(200).json({
      message: 'Material request updated successfully.',
      request: updatedOrder,
    });
  } catch (error) {
    console.error('Error updating material request:', error.message);
    res.status(500).json({
      message: 'Server error updating material request.',
      error: error.message,
    });
  }
};

exports.addMaterialToOrder = async (req, res) => {
  try {
    const { materialId, quantity, price } = req.body;

    if (!materialId || !quantity) {
      return res
        .status(400)
        .json({ message: 'Material ID and quantity are required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.materials.push({ materialId, quantity, price });
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error('Error adding material:', error);
    res.status(500).json({ message: 'Server error adding material.' });
  }
};

exports.removeMaterialFromOrder = async (req, res) => {
  try {
    const { materialId } = req.body;

    if (!materialId) {
      return res.status(400).json({ message: 'Material ID is required.' });
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    order.materials = order.materials.filter(
      item => item.materialId.toString() !== materialId
    );
    await order.save();

    res.status(200).json(order);
  } catch (error) {
    console.error('Error removing material:', error);
    res.status(500).json({ message: 'Server error removing material.' });
  }
};

exports.deleteOrder = async (req, res) => {
  try {
    const deletedOrder = await Order.findByIdAndDelete(req.params.id);

    if (!deletedOrder) {
      return res.status(404).json({ message: 'Order not found.' });
    }

    res.status(200).json({ message: 'Order deleted successfully.' });
  } catch (error) {
    console.error('Error deleting order:', error);
    res.status(500).json({ message: 'Server error deleting order.' });
  }
};

exports.getOrdersBySite = async (req, res) => {
  try {
    const siteId = req.params.siteId;
    const orders = await Order.find({ siteId })
      .populate('vendor', 'name contact')
      .populate('materials.materialId', 'name unit price');
    res.status(200).json(orders);
  } catch (error) {
    console.error('Error fetching orders for site:', error);
    res.status(500).json({ message: 'Server error fetching orders for site.' });
  }
};

// exports.receiveMaterials = async (req, res) => {
//   const { requestId } = req.params;
//   const { materials } = req.body;
//   const userId = req.user?._id || req.userId || req.body?.userId;

//   // --- Early validations (before session) ---
//   const validationError = validateRequestInput(userId, requestId, materials);
//   if (validationError) {
//     return res
//       .status(validationError.status)
//       .json({ message: validationError.message });
//   }

//   const materialsResult = normalizeAndValidateMaterials(materials);
//   if (materialsResult.error) {
//     return res.status(400).json({ message: materialsResult.error });
//   }

//   const materialsArray = materialsResult.data;
//   const materialIds = [...new Set(materialsArray.map(item => item.materialId))];

//   const invalidIds = materialIds.filter(
//     id => !mongoose.Types.ObjectId.isValid(id)
//   );
//   if (invalidIds.length > 0) {
//     return res.status(400).json({
//       message: `Invalid material IDs: ${invalidIds.join(', ')}`,
//     });
//   }

//   // --- Start session ---
//   const session = await mongoose.startSession();

//   try {
//     let responsePayload;

//     await session.withTransaction(async () => {
//       // --- DB Fetch ---
//       const [request, materials_db] = await Promise.all([
//         MaterialRequest.findById(requestId).session(session),
//         Material.find(
//           { _id: { $in: materialIds } },
//           { _id: 1, name: 1 }
//         ).session(session),
//       ]);

//       if (!request) {
//         throw { status: 404, message: 'Material request not found' };
//       }

//       const requestValidationError = validateRequestStatus(request);
//       if (requestValidationError) {
//         throw requestValidationError;
//       }

//       // --- Validation against existing data ---
//       const materialMap = new Map(materials_db.map(m => [m._id.toString(), m]));
//       const existingReceivedItems = new Map(
//         request.receivedItems.map(item => [item.item.toString(), item.quantity])
//       );
//       const orderedMap = new Map(
//         request.materials.map(m => [m.item.toString(), m.quantity])
//       );

//       const validationErrors = validateMaterialsForReceiving(
//         materialIds,
//         materialsArray,
//         materialMap,
//         existingReceivedItems,
//         orderedMap
//       );

//       if (validationErrors.length > 0) {
//         throw { status: 400, message: validationErrors.join('; ') };
//       }

//       // --- Prepare Updates ---
//       const { bulkUpdates, receivedItems, materialQuantities } =
//         prepareBatchOperations(materialsArray, userId);

//       // Apply to request document → .save() will trigger pre('save')
//       request.receivedItems.push(...receivedItems);
//       request.lastUpdated = new Date();
//       await request.save({ session }); // ⬅️ pre('save') runs here

//       // Update stock if needed
//       if (bulkUpdates.length > 0) {
//         await Material.bulkWrite(bulkUpdates, { session });
//       }

//       // Build response payload
//       const totalReceived = request.receivedItems.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       );
//       const totalOrdered = request.materials.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       );

//       responsePayload = {
//         message: `Successfully received ${materialsArray.length} material${
//           materialsArray.length > 1 ? 's' : ''
//         }`,
//         request: {
//           id: requestId,
//           status: request.status, // ✅ updated by pre('save')
//           receivedItemsCount: request.receivedItems.length,
//           totalReceived,
//           totalOrdered,
//           isCompleted: request.status === 'received',
//         },
//         processedItems: materialsArray.length,
//         stockUpdates: materialQuantities.size,
//       };
//     });

//     return res.status(200).json(responsePayload);
//   } catch (error) {
//     if (error.status) {
//       return res.status(error.status).json({ message: error.message });
//     }
//     return handleDatabaseError(error, res);
//   } finally {
//     session.endSession();
//   }
// };

// exports.receiveMaterials = async (req, res) => {
//   const { requestId } = req.params;
//   const userId = req.user?._id || req.userId || req.body?.userId;

//   try {
//     const { receivedDate, materials = [] } = req.body;

//     // --- Early validation ---
//     if (!materials.length) {
//       return res.status(400).json({ message: 'Materials array is required' });
//     }

//     // --- Normalize materials and attach uploaded files ---
//     const parsedMaterials = materials.map((item, index) => {
//       const material = {
//         materialId: item.materialId,
//         quantity: Number(item.quantity),
//         remarks: item.remarks || '',
//         receivedBy: userId,
//         receivedAt: receivedDate || new Date(),
//         image: [],
//         video: [],
//       };

//       if (req.files && req.files.length > 0) {
//         const base = `materials[${index}]`;

//         const relatedFiles = req.files.filter(f =>
//           f.fieldname.startsWith(base)
//         );

//         relatedFiles.forEach(async file => {
//           if (file.fieldname.includes('[image]')) {
//             const data = await awsS3.uploadFile(file, 'project_update');
//             const url = `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${data}`;
//             material.image = url;
//           } else if (file.fieldname.includes('[video]')) {
//             const data = await awsS3.uploadFiles(file, 'project_update');
//             const url = `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${data}`;
//             material.video = url;
//           }
//         }
//       );
//       }

//       return material;
//     });

//     console.log(materials);

//     // --- Input validation ---
//     const validationError = validateRequestInput(
//       userId,
//       requestId,
//       parsedMaterials
//     );
//     if (validationError) {
//       return res
//         .status(validationError.status)
//         .json({ message: validationError.message });
//     }

//     const materialsResult = normalizeAndValidateMaterials(parsedMaterials);
//     if (materialsResult.error) {
//       return res.status(400).json({ message: materialsResult.error });
//     }

//     const materialsArray = materialsResult.data;
//     const materialIds = [...new Set(materialsArray.map(m => m.materialId))];
//     const invalidIds = materialIds.filter(
//       id => !mongoose.Types.ObjectId.isValid(id)
//     );

//     if (invalidIds.length) {
//       return res.status(400).json({
//         message: `Invalid material IDs: ${invalidIds.join(', ')}`,
//       });
//     }

//     // --- Start transaction ---
//     const session = await mongoose.startSession();
//     let responsePayload;

//     await session.withTransaction(async () => {
//       const [request, materials_db] = await Promise.all([
//         MaterialRequest.findById(requestId).session(session),
//         Material.find(
//           { _id: { $in: materialIds } },
//           { _id: 1, name: 1 }
//         ).session(session),
//       ]);

//       if (!request)
//         throw { status: 404, message: 'Material request not found' };

//       const requestValidationError = validateRequestStatus(request);
//       if (requestValidationError) throw requestValidationError;

//       const materialMap = new Map(materials_db.map(m => [m._id.toString(), m]));
//       const existingReceivedItems = new Map(
//         request.receivedItems.map(item => [item.item.toString(), item.quantity])
//       );
//       const orderedMap = new Map(
//         request.materials.map(m => [m.item.toString(), m.quantity])
//       );

//       const validationErrors = validateMaterialsForReceiving(
//         materialIds,
//         materialsArray,
//         materialMap,
//         existingReceivedItems,
//         orderedMap
//       );

//       if (validationErrors.length) {
//         throw { status: 400, message: validationErrors.join('; ') };
//       }

//       // --- Prepare updates ---
//       const { bulkUpdates, receivedItems, materialQuantities } =
//         prepareBatchOperations(materialsArray, userId);

//       // Attach file metadata (optional)
//       receivedItems.forEach((item, i) => {
//         const mat = parsedMaterials[i];
//         if (mat.proofOfDelivery) {
//           item.proofOfDelivery = {
//             filename: mat.proofOfDelivery.originalname,
//             mimetype: mat.proofOfDelivery.mimetype,
//           };
//         }
//       });

//       // --- Save changes ---
//       request.receivedItems.push(...receivedItems);
//       request.lastUpdated = new Date();
//       await request.save({ session });

//       if (bulkUpdates.length) {
//         await Material.bulkWrite(bulkUpdates, { session });
//       }

//       const totalReceived = request.receivedItems.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       );
//       const totalOrdered = request.materials.reduce(
//         (sum, item) => sum + item.quantity,
//         0
//       );

//       responsePayload = {
//         message: `Successfully received ${materialsArray.length} material${
//           materialsArray.length > 1 ? 's' : ''
//         }`,
//         request: {
//           id: requestId,
//           status: request.status,
//           receivedItemsCount: request.receivedItems.length,
//           totalReceived,
//           totalOrdered,
//           isCompleted: request.status === 'received',
//         },
//         processedItems: materialsArray.length,
//         stockUpdates: materialQuantities.size,
//       };
//     });

//     session.endSession();
//     return res.status(200).json(responsePayload);
//   } catch (error) {
//     console.error('Error in receiveMaterials:', error);
//     if (error.status) {
//       return res.status(error.status).json({ message: error.message });
//     }
//     return handleDatabaseError(error, res);
//   }
// };

exports.receiveMaterials = async (req, res) => {
  const { requestId } = req.params;
  const userId = req.user?._id || req.userId || req.body?.userId;

  try {
    const { receivedDate, materials = [] } = req.body;

    // --- Early validation ---
    if (!materials.length) {
      return res.status(400).json({ message: 'Materials array is required' });
    }

    // --- Normalize materials and attach uploaded files ---
    const parsedMaterials = [];

    for (let index = 0; index < materials.length; index++) {
      const item = materials[index];

      const material = {
        materialId: item.materialId,
        quantity: Number(item.quantity),
        remarks: item.remarks || '',
        receivedBy: userId,
        receivedAt: receivedDate || new Date(),
        image: null,
        video: null,
      };

      if (req.files?.length) {
        const base = `materials[${index}]`;
        const relatedFiles = req.files.filter(f =>
          f.fieldname.startsWith(base)
        );

        const uploadPromises = relatedFiles.map(async file => {
          const data = await awsS3.uploadFile(file, 'project_update');
          const url = `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${data}`;

          if (file.fieldname.includes('[image]')) material.image = url;
          else if (file.fieldname.includes('[video]')) material.video = url;
        });

        await Promise.all(uploadPromises);
      }

      parsedMaterials.push(material);
    }

    // --- Input validation ---
    const validationError = validateRequestInput(
      userId,
      requestId,
      parsedMaterials
    );
    if (validationError) {
      return res
        .status(validationError.status)
        .json({ message: validationError.message });
    }

    const materialsResult = normalizeAndValidateMaterials(parsedMaterials);
    if (materialsResult.error) {
      return res.status(400).json({ message: materialsResult.error });
    }

    const materialsArray = materialsResult.data;
    const materialIds = [...new Set(materialsArray.map(m => m.materialId))];
    const invalidIds = materialIds.filter(
      id => !mongoose.Types.ObjectId.isValid(id)
    );

    if (invalidIds.length) {
      return res
        .status(400)
        .json({ message: `Invalid material IDs: ${invalidIds.join(', ')}` });
    }

    // --- Start transaction ---
    const session = await mongoose.startSession();
    let responsePayload;

    await session.withTransaction(async () => {
      const [request, materials_db] = await Promise.all([
        MaterialRequest.findById(requestId).session(session),
        Material.find(
          { _id: { $in: materialIds } },
          { _id: 1, name: 1 }
        ).session(session),
      ]);

      if (!request)
        throw { status: 404, message: 'Material request not found' };

      const requestValidationError = validateRequestStatus(request);
      if (requestValidationError) throw requestValidationError;

      const materialMap = new Map(materials_db.map(m => [m._id.toString(), m]));
      const existingReceivedItems = new Map(
        request.receivedItems.map(item => [item.item.toString(), item.quantity])
      );
      const orderedMap = new Map(
        request.materials.map(m => [m.item.toString(), m.quantity])
      );

      const validationErrors = validateMaterialsForReceiving(
        materialIds,
        materialsArray,
        materialMap,
        existingReceivedItems,
        orderedMap
      );

      if (validationErrors.length) {
        throw { status: 400, message: validationErrors.join('; ') };
      }

      // --- Prepare updates ---
      const { bulkUpdates, receivedItems, materialQuantities } =
        prepareBatchOperations(materialsArray, userId);

      // Attach file metadata (optional)
      receivedItems.forEach((item, i) => {
        const mat = parsedMaterials[i];
        console.log(mat);
        // Attach uploaded files
        if (mat.image?.length) item.image = mat.image;
        if (mat.video?.length) item.video = mat.video;
      });

      // --- Save changes ---
      request.receivedItems.push(...receivedItems);
      request.lastUpdated = new Date();
      await request.save({ session });

      if (bulkUpdates.length) {
        await Material.bulkWrite(bulkUpdates, { session });
      }

      const totalReceived = request.receivedItems.reduce(
        (sum, item) => sum + item.quantity,
        0
      );
      const totalOrdered = request.materials.reduce(
        (sum, item) => sum + item.quantity,
        0
      );

      responsePayload = {
        message: `Successfully received ${materialsArray.length} material${
          materialsArray.length > 1 ? 's' : ''
        }`,
        request: {
          id: requestId,
          status: request.status,
          receivedItemsCount: request.receivedItems.length,
          totalReceived,
          totalOrdered,
          isCompleted: request.status === 'received',
        },
        processedItems: materialsArray.length,
        stockUpdates: materialQuantities.size,
      };
    });

    session.endSession();
    return res.status(200).json(responsePayload);
  } catch (error) {
    console.error('Error in receiveMaterials:', error);
    if (error.status)
      return res.status(error.status).json({ message: error.message });
    return handleDatabaseError(error, res);
  }
};

exports.materialRequests = async (req, res) => {
  try {
    const {
      status,
      siteId,
      priority,
      requestedBy,
      query, // search text
      startDate,
      endDate,
      page = 1,
      limit = 20,
      sort = -1,
    } = req.query;

    const match = {};

    if (status) match.status = status;
    if (siteId) match.site = new mongoose.Types.ObjectId(siteId);
    if (priority) match.priority = priority;
    if (requestedBy)
      match.requestedBy = new mongoose.Types.ObjectId(requestedBy);

    if (startDate || endDate) {
      match.createdAt = {};
      if (startDate) match.createdAt.$gte = new Date(startDate);
      if (endDate) match.createdAt.$lte = new Date(endDate);
    }

    // ---------- Main Results Pipeline ----------
    const pipeline = [
      { $match: match },

      // --- Lookup materials for requested items ---
      {
        $lookup: {
          from: 'materials',
          localField: 'materials.item',
          foreignField: '_id',
          as: 'materialsData',
        },
      },
      {
        $addFields: {
          materials: {
            $map: {
              input: '$materials',
              as: 'm',
              in: {
                quantity: '$$m.quantity',
                unit: '$$m.unit',
                vendor: '$$m.vendor',
                material: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$materialsData',
                        as: 'md',
                        cond: { $eq: ['$$md._id', '$$m.item'] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { materialsData: 0 } },

      // --- Lookup materials for received items ---
      {
        $lookup: {
          from: 'materials',
          localField: 'receivedItems.item',
          foreignField: '_id',
          as: 'receivedMaterialsData',
        },
      },
      {
        $addFields: {
          receivedItems: {
            $map: {
              input: '$receivedItems',
              as: 'ri',
              in: {
                quantity: '$$ri.quantity',
                receivedAt: '$$ri.receivedAt',
                remarks: '$$ri.remarks',
                image: '$$ri.image', // uploaded image
                video: '$$ri.video', // uploaded video
                receivedBy: '$$ri.receivedBy',
                material: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$receivedMaterialsData',
                        as: 'rmd',
                        cond: { $eq: ['$$rmd._id', '$$ri.item'] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { receivedMaterialsData: 0 } },

      // --- Lookup receivedBy users ---
      {
        $lookup: {
          from: 'users',
          localField: 'receivedItems.receivedBy',
          foreignField: '_id',
          as: 'receivedUsers',
        },
      },
      {
        $addFields: {
          receivedItems: {
            $map: {
              input: '$receivedItems',
              as: 'ri',
              in: {
                quantity: '$$ri.quantity',
                receivedAt: '$$ri.receivedAt',
                remarks: '$$ri.remarks',
                image: '$$ri.image',
                video: '$$ri.video',
                material: '$$ri.material',
                receivedBy: {
                  $arrayElemAt: [
                    {
                      $filter: {
                        input: '$receivedUsers',
                        as: 'ru',
                        cond: { $eq: ['$$ru._id', '$$ri.receivedBy'] },
                      },
                    },
                    0,
                  ],
                },
              },
            },
          },
        },
      },
      { $project: { receivedUsers: 0 } },

      // --- Lookup requestedBy ---
      {
        $lookup: {
          from: 'users',
          localField: 'requestedBy',
          foreignField: '_id',
          as: 'requestedBy',
        },
      },
      { $unwind: { path: '$requestedBy', preserveNullAndEmptyArrays: true } },

      // --- Lookup site/project ---
      {
        $lookup: {
          from: 'projects',
          localField: 'site',
          foreignField: '_id',
          as: 'site',
        },
      },
      { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },

      // --- Global search ---
      ...(query
        ? [
            {
              $match: {
                $or: [
                  { purpose: { $regex: query, $options: 'i' } },
                  {
                    'materials.material.name': { $regex: query, $options: 'i' },
                  },
                  {
                    'receivedItems.material.name': {
                      $regex: query,
                      $options: 'i',
                    },
                  },
                  { 'site.name': { $regex: query, $options: 'i' } },
                  { 'site.siteID': { $regex: query, $options: 'i' } },
                  { 'requestedBy.firstname': { $regex: query, $options: 'i' } },
                  { 'requestedBy.lastname': { $regex: query, $options: 'i' } },
                  { 'requestedBy.email': { $regex: query, $options: 'i' } },
                  { 'requestedBy.phone': { $regex: query, $options: 'i' } },
                ],
              },
            },
          ]
        : []),

      // --- Final projection ---
      {
        $project: {
          createdAt: 1,
          updatedAt: 1,
          status: 1,
          purpose: 1,
          priority: 1,
          requiredBefore: 1,
          'site._id': 1,
          'site.siteID': 1,
          'site.name': 1,
          'requestedBy._id': 1,
          'requestedBy.firstname': 1,
          'requestedBy.lastname': 1,
          'requestedBy.employeeId': 1,
          'requestedBy.email': 1,
          'requestedBy.phone': 1,
          'requestedBy.profileImage': 1,
          'requestedBy.roles': 1,
          'materials.quantity': 1,
          'materials.unit': 1,
          'materials.vendor': 1,
          'materials.material._id': 1,
          'materials.material.name': 1,
          'materials.material.unit': 1,
          'materials.material.price': 1,
          'receivedItems.quantity': 1,
          'receivedItems.receivedAt': 1,
          'receivedItems.remarks': 1,
          'receivedItems.image': 1, // uploaded image
          'receivedItems.video': 1, // uploaded video
          'receivedItems.material._id': 1,
          'receivedItems.material.name': 1,
          'receivedItems.material.unit': 1,
          'receivedItems.material.price': 1,
          'receivedItems.receivedBy._id': 1,
          'receivedItems.receivedBy.firstname': 1,
          'receivedItems.receivedBy.lastname': 1,
        },
      },

      // --- Sort & paginate ---
      { $sort: { createdAt: sort === 'asc' ? 1 : -1 } },
      { $skip: (page - 1) * parseInt(limit) },
      { $limit: parseInt(limit) },
    ];

    const results = await MaterialRequest.aggregate(pipeline);

    // ---------- Total Count Pipeline ----------
    const totalPipeline = [
      { $match: match },

      {
        $lookup: {
          from: 'materials',
          localField: 'materials.item',
          foreignField: '_id',
          as: 'materialsData',
        },
      },
      {
        $lookup: {
          from: 'projects',
          localField: 'site',
          foreignField: '_id',
          as: 'site',
        },
      },
      { $unwind: { path: '$site', preserveNullAndEmptyArrays: true } },
      {
        $lookup: {
          from: 'users',
          localField: 'requestedBy',
          foreignField: '_id',
          as: 'requestedBy',
        },
      },
      { $unwind: { path: '$requestedBy', preserveNullAndEmptyArrays: true } },

      ...(query
        ? [
            {
              $match: {
                $or: [
                  { purpose: { $regex: query, $options: 'i' } },
                  { 'materialsData.name': { $regex: query, $options: 'i' } },
                  { 'site.name': { $regex: query, $options: 'i' } },
                  { 'site.siteID': { $regex: query, $options: 'i' } },
                  { 'requestedBy.firstname': { $regex: query, $options: 'i' } },
                  { 'requestedBy.lastname': { $regex: query, $options: 'i' } },
                  { 'requestedBy.email': { $regex: query, $options: 'i' } },
                  { 'requestedBy.phone': { $regex: query, $options: 'i' } },
                ],
              },
            },
          ]
        : []),

      { $count: 'total' },
    ];

    const total = await MaterialRequest.aggregate(totalPipeline);

    res.status(200).json({
      data: results,
      meta: {
        total: total[0]?.total || 0,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil((total[0]?.total || 0) / limit),
      },
    });
  } catch (error) {
    console.error('Error searching material requests:', error);
    res.status(500).json({
      message: error.message || 'Server error searching material requests.',
    });
  }
};

/* ------------ Validation + Helpers ------------ */

function validateRequestInput(userId, requestId, materials) {
  if (!userId) return { status: 401, message: 'User authentication required' };
  if (!mongoose.Types.ObjectId.isValid(requestId))
    return { status: 400, message: 'Invalid request ID format' };
  if (!materials) return { status: 400, message: 'Materials data is required' };
  return null;
}

function validateRequestStatus(request) {
  if (!request) return { status: 404, message: 'Material request not found' };

  if (!['approved', 'pending', 'partially received'].includes(request.status)) {
    return {
      status: 400,
      message: `Cannot receive materials for request with status: ${request.status}`,
    };
  }
  return null;
}

function validateMaterialsForReceiving(
  materialIds,
  materialsArray,
  materialMap,
  existingReceivedItems,
  orderedMap
) {
  const errors = [];

  // Missing materials
  const missingMaterials = materialIds.filter(id => !materialMap.has(id));
  if (missingMaterials.length > 0) {
    errors.push(`Materials not found: ${missingMaterials.join(', ')}`);
  }

  // Validate quantities against order
  for (const item of materialsArray) {
    const orderedQty = orderedMap.get(item.materialId) || 0;
    const alreadyReceived = existingReceivedItems.get(item.materialId) || 0;
    const newTotal = alreadyReceived + item.quantity;

    if (newTotal > orderedQty) {
      const materialName =
        materialMap.get(item.materialId)?.name || item.materialId;
      errors.push(
        `Cannot receive ${item.quantity} of ${materialName}. Already received: ${alreadyReceived}, Ordered: ${orderedQty}`
      );
    }
  }

  return errors;
}

function prepareBatchOperations(materialsArray, userId) {
  const materialQuantities = new Map();
  const receivedItems = [];
  const timestamp = new Date();

  for (const item of materialsArray) {
    const { materialId, quantity, remarks } = item;

    materialQuantities.set(
      materialId,
      (materialQuantities.get(materialId) || 0) + quantity
    );

    receivedItems.push({
      item: materialId,
      quantity,
      receivedBy: userId,
      remarks: remarks || '',
      receivedAt: timestamp,
    });
  }

  const bulkUpdates = Array.from(materialQuantities.entries()).map(
    ([materialId, totalQuantity]) => ({
      updateOne: {
        filter: { _id: materialId },
        update: { $inc: { stock: totalQuantity } },
      },
    })
  );

  return { bulkUpdates, receivedItems, materialQuantities };
}

function handleDatabaseError(error, res) {
  console.error('Error receiving materials:', error);

  // Handle specific errors with more detailed responses
  const errorHandlers = {
    11000: () =>
      res.status(409).json({
        message: 'Duplicate entry detected',
        error: 'DUPLICATE_ERROR',
      }),
    ValidationError: () =>
      res.status(400).json({
        message: 'Data validation failed',
        details:
          process.env.NODE_ENV === 'development' ? error.message : undefined,
      }),
    CastError: () =>
      res.status(400).json({
        message: 'Invalid data format',
        error: 'CAST_ERROR',
      }),
  };

  const handler = errorHandlers[error.code] || errorHandlers[error.name];
  if (handler) {
    return handler();
  }

  // Generic server error
  return res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? error.message : undefined,
  });
}

// function normalizeAndValidateMaterials(materials) {
//   if (!materials) {
//     return { error: 'Materials data is required' };
//   }

//   let materialsArray;

//   // Normalize input format
//   if (Array.isArray(materials)) {
//     materialsArray = materials;
//   } else if (
//     typeof materials === 'object' &&
//     materials.materialId &&
//     materials.quantity !== undefined
//   ) {
//     materialsArray = [materials];
//   } else {
//     return {
//       error:
//         'Invalid materials format. Expected array of materials or single material object',
//     };
//   }

//   if (materialsArray.length === 0) {
//     return { error: 'At least one material is required' };
//   }

//   if (materialsArray.length > 100) {
//     return { error: 'Maximum 100 materials can be processed at once' };
//   }

//   // Enhanced validation with detailed error messages
//   const validatedMaterials = [];
//   const errors = [];

//   materialsArray.forEach((item, index) => {
//     const itemErrors = validateMaterialItem(item, index + 1);
//     if (itemErrors.length > 0) {
//       errors.push(...itemErrors);
//     } else {
//       const qty = parseFloat(item.quantity);

//       if (isNaN(qty) || qty <= 0) {
//         errors.push(
//           `Invalid quantity at item #${index + 1}. Must be a positive number`
//         );
//       } else {
//         validatedMaterials.push({
//           ...item,
//           quantity: qty, // ✅ keep float instead of flooring
//         });
//       }
//     }
//   });

//   if (errors.length > 0) {
//     return { error: errors.join('; ') };
//   }

//   // Check for duplicate material IDs in the same request
//   const materialIds = validatedMaterials.map(item => item.materialId);
//   const duplicateIds = materialIds.filter(
//     (id, index) => materialIds.indexOf(id) !== index
//   );

//   if (duplicateIds.length > 0) {
//     return {
//       error: `Duplicate materials in request: ${[...new Set(duplicateIds)].join(
//         ', '
//       )}`,
//     };
//   }

//   return { data: validatedMaterials };
// }

function normalizeAndValidateMaterials(materials) {
  if (!materials) {
    return { error: 'Materials data is required' };
  }

  let materialsArray;

  // --- Normalize input format ---
  if (Array.isArray(materials)) {
    materialsArray = materials;
  } else if (
    typeof materials === 'object' &&
    materials.materialId &&
    materials.quantity !== undefined
  ) {
    materialsArray = [materials];
  } else {
    return {
      error:
        'Invalid materials format. Expected array of materials or single material object',
    };
  }

  if (materialsArray.length === 0) {
    return { error: 'At least one material is required' };
  }

  if (materialsArray.length > 100) {
    return { error: 'Maximum 100 materials can be processed at once' };
  }

  // --- Enhanced validation ---
  const validatedMaterials = [];
  const errors = [];

  materialsArray.forEach((item, index) => {
    const prefix = `Item #${index + 1}`;
    const itemErrors = [];

    // Check required fields
    if (!item.materialId) {
      itemErrors.push(`${prefix}: Missing materialId`);
    }

    if (item.quantity === undefined || item.quantity === null) {
      itemErrors.push(`${prefix}: Missing quantity`);
    }

    // Validate numeric quantity
    const qty = parseFloat(item.quantity);
    if (isNaN(qty) || qty <= 0) {
      itemErrors.push(`${prefix}: Invalid quantity. Must be > 0`);
    }

    // Optional file validation
    if (item.proofOfDelivery) {
      const proof = item.proofOfDelivery;
      if (
        !proof.mimetype ||
        !proof.originalname ||
        !proof.buffer ||
        typeof proof.buffer !== 'object'
      ) {
        itemErrors.push(`${prefix}: Invalid proofOfDelivery format`);
      }
    }

    if (itemErrors.length > 0) {
      errors.push(...itemErrors);
    } else {
      validatedMaterials.push({
        ...item,
        quantity: qty,
      });
    }
  });

  // If any errors, return early
  if (errors.length > 0) {
    return { error: errors.join('; ') };
  }

  // --- Check for duplicates ---
  const materialIds = validatedMaterials.map(item => item.materialId);
  const duplicateIds = materialIds.filter(
    (id, index) => materialIds.indexOf(id) !== index
  );

  if (duplicateIds.length > 0) {
    return {
      error: `Duplicate materials in request: ${[...new Set(duplicateIds)].join(
        ', '
      )}`,
    };
  }

  return { data: validatedMaterials };
}

function validateMaterialItem(item, itemNumber) {
  const errors = [];

  if (!item || typeof item !== 'object') {
    errors.push(`Item ${itemNumber}: Invalid item format`);
    return errors;
  }

  if (!item.materialId) {
    errors.push(`Item ${itemNumber}: Material ID is required`);
  }

  if (!item.quantity) {
    errors.push(`Item ${itemNumber}: Quantity is required`);
  } else if (typeof item.quantity !== 'number' || item.quantity <= 0) {
    errors.push(`Item ${itemNumber}: Quantity must be a positive number`);
  } else if (item.quantity > 10000) {
    errors.push(`Item ${itemNumber}: Quantity cannot exceed 10,000`);
  }

  if (item.remarks && typeof item.remarks !== 'string') {
    errors.push(`Item ${itemNumber}: Remarks must be a string`);
  }

  if (item.remarks && item.remarks.length > 500) {
    errors.push(`Item ${itemNumber}: Remarks cannot exceed 500 characters`);
  }

  return errors;
}
