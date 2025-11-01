const MaterialRequest = require('../models/materialRequest.model.js');
const Material = require('../models/material.model.js');
const Project = require('../models/projects.model.js');
const User = require('../models/user.model.js');
const mongoose = require('mongoose');
const awsS3 = require('../middlewares/aws-s3');
const { createLogManual } = require('../middlewares/createLog');
const { sendNotification } = require('../services/oneSignalService');

const level1 = ['accountant', 'operations', 'sr. engineer'];
const level2 = ['accountant', 'operations'];

exports.createMaterialRequest = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

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

    const savedRequest = await newRequest.save({ session });

    await savedRequest.populate([
      { path: 'site', select: 'name location siteID', session },
      { path: 'materials.item', select: 'name unit', session },
      {
        path: 'requestedBy',
        select: 'username email firstname lastname',
        session,
      },
    ]);

    const project = await Project.findById(siteId)
      .select('project_admin accountant sr_engineer operation')
      .populate({
        path: 'project_admin accountant sr_engineer operation',
        model: 'User',
        select: 'playerId',
        session,
      })
      .lean();

    const allUsers = [
      project.project_admin[0],
      project.accountant[0],
      project.sr_engineer[0],
      project.operation[0],
    ];

    const logMessage = `Material request created by ${
      savedRequest.requestedBy.firstname
    } ${savedRequest.requestedBy.lastname || ''} for site "${
      savedRequest.site.siteID || 'N/A'
    }" with ${formattedMaterials.length} item(s).`;

    await createLogManual({
      req,
      logMessage,
      siteId: savedRequest.site.siteID,
      materialRequestId: savedRequest._id,
      session,
    });

    await sendNotification({
      users: allUsers,
      title: 'New Material Request Created',
      message: logMessage,
      data: { route: 'receivematerials', id: savedRequest._id },
    });

    await session.commitTransaction();
    session.endSession();

    res.status(201).json({
      message: 'Material request created successfully.',
      request: savedRequest,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
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
          select: 'name unit',
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
        {
          path: 'receivedItems.receivedBy',
          select: 'firstname lastname',
        },
        {
          path: 'receivedItems.item',
          select: 'name unit',
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
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { siteId, purpose, priority, materials, date } = req.body;
    const requestedBy = req.user?._id || req.userId || req.body?.userId;

    // Validate & format materials
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

    // Fetch existing request
    const existingRequest = await MaterialRequest.findById(req.params.id)
      .populate([
        { path: 'materials.item', select: 'name unit price' },
        {
          path: 'requestedBy',
          select:
            'firstname lastname employeeId email phone profileImage roles',
        },
        { path: 'site', select: 'siteID' },
      ])
      .session(session);

    if (!existingRequest) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Material request not found.' });
    }

    // Prepare update data
    const updateData = {
      ...(siteId && { site: siteId }),
      ...(purpose && { purpose }),
      ...(priority && { priority }),
      ...(formattedMaterials && { materials: formattedMaterials }),
      ...(date && { requiredBefore: new Date(date) }),
      ...(requestedBy && { requestedBy }),
    };

    const project = siteId
      ? await Project.findById(siteId)
          .select('_id siteID project_admin accountant sr_engineer operation')
          .populate({
            path: 'project_admin accountant sr_engineer operation',
            model: 'User',
            select: 'playerId',
            session,
          })
          .lean()
          .session(session)
      : null;

    const changeDescriptions = [];

    // Compare changes
    if (
      siteId &&
      existingRequest.site?._id?.toString() !== project?._id.toString()
    ) {
      changeDescriptions.push(
        `Site changed from "${existingRequest.site?.siteID || 'N/A'}" to "${
          project?.siteID || 'N/A'
        }".`
      );
    }

    if (purpose && existingRequest.purpose !== purpose) {
      changeDescriptions.push(
        `Purpose changed from "${existingRequest.purpose}" to "${purpose}".`
      );
    }

    if (priority && existingRequest.priority !== priority) {
      changeDescriptions.push(
        `Priority changed from "${existingRequest.priority}" to "${priority}".`
      );
    }

    if (
      date &&
      new Date(existingRequest.requiredBefore).toISOString() !==
        new Date(date).toISOString()
    ) {
      changeDescriptions.push(
        `Required before changed from "${existingRequest.requiredBefore.toDateString()}" to "${new Date(
          date
        ).toDateString()}".`
      );
    }

    if (formattedMaterials) {
      const oldMaterials = existingRequest.materials.map(
        m => `${m.item?.name || 'Unknown'} (${m.quantity})`
      );

      const newMaterials = await Promise.all(
        formattedMaterials.map(async m => {
          const mat = await Material.findById(m.item)
            .select('name')
            .session(session);
          return `${mat?.name || 'Unknown'} (${m.quantity})`;
        })
      );

      if (JSON.stringify(oldMaterials) !== JSON.stringify(newMaterials)) {
        changeDescriptions.push(
          `Materials updated from ${oldMaterials.join(
            ', '
          )} to ${newMaterials.join(', ')}.`
        );
      }
    }

    const allUsers = [
      project?.project_admin?.[0],
      project?.accountant?.[0],
      project?.sr_engineer?.[0],
      project?.operation?.[0],
    ].filter(Boolean);

    // Generate remarks and log entry
    const remarks =
      changeDescriptions.length > 0
        ? `Updated fields: ${changeDescriptions.join(' ')}`
        : 'No major changes detected.';

    const updateLog = {
      status: 'updated',
      updatedBy: requestedBy,
      updatedAt: new Date(),
      remarks,
    };

    // Perform update with session
    const updatedOrder = await MaterialRequest.findByIdAndUpdate(
      req.params.id,
      {
        $set: updateData,
        $push: { updates: updateLog },
      },
      { new: true, session }
    ).populate([
      { path: 'materials.item', select: 'name unit price' },
      {
        path: 'requestedBy',
        select: 'firstname lastname employeeId email phone profileImage roles',
      },
      { path: 'site', select: 'siteID' },
    ]);

    if (!updatedOrder) {
      await session.abortTransaction();
      session.endSession();
      return res.status(404).json({ message: 'Material request not found.' });
    }

    await createLogManual({
      req,
      logMessage: remarks,
      siteId: project.siteID,
      materialRequestId: req.params.id,
      session,
    });

    await sendNotification({
      users: allUsers,
      title: 'Existing Material Request Updated.',
      message: remarks,
      data: { route: 'materialrequest', id: updatedOrder._id },
    });

    await session.commitTransaction();
    session.endSession();

    res.status(200).json({
      message: 'Material request updated successfully.',
      request: updatedOrder,
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Transaction aborted:', error.message);
    res.status(500).json({
      message: 'Server error updating material request.',
      error: error.message,
    });
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

      const project = await Project.findById(request.site)
        .select('_id siteID project_admin accountant sr_engineer operation')
        .populate({
          path: 'project_admin accountant sr_engineer operation',
          model: 'User',
          select: 'playerId',
          session,
        })
        .lean()
        .session(session);

      const user = await User.findById(userId);

      const remarks = `Successfully received ${materialsArray.length} material${
        materialsArray.length > 1 ? 's' : ''
      } by ${user.firstname} ${user.lastname}`;

      const allUsers = [
        project.project_admin[0],
        project.accountant[0],
        project.sr_engineer[0],
        project.operation[0],
      ];

      await createLogManual({
        req,
        logMessage: remarks,
        siteId: project.siteID,
        materialRequestId: requestId,
        session,
      });

      await sendNotification({
        users: allUsers,
        title: `Materials received for Site: ${project.siteID}`,
        message: remarks,
        data: { route: 'materialrequest', id: request._id },
      });
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
                rate: '$$m.rate',
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
          approvals: 1,
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
          'materials.rate': 1,
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

exports.addVendorDetails = async (req, res) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { requestId } = req.params;
    const { status, expectedDate, materials } = req.body;
    const requestedBy = req.user?._id || req.userId || req.body?.userId;

    if (!requestId) throw new Error('Request ID is required');
    if (!status) throw new Error('Status is required');
    if (!expectedDate) throw new Error('Expected Date is required');
    if (!materials || !Array.isArray(materials))
      throw new Error('Materials must be a valid array');

    // --- Fetch material request ---
    const materialRequest = await MaterialRequest.findById(requestId)
      .populate('materials.item', 'name unit')
      .session(session);

    if (!materialRequest) throw new Error('Material request not found');

    // --- Format incoming materials ---
    const formattedMaterials = materials.map(m => {
      if (!m.materialId || !m.quantity) {
        throw new Error('Each material must include materialId and quantity.');
      }
      return {
        item: m.materialId,
        quantity: Number(m.quantity),
        unit: m.unit || '',
        vendor: m.vendor || '',
        rate: m.rate || null,
      };
    });

    // --- Compare materials ---
    const oldMaterials = materialRequest.materials.map(m => ({
      itemId: m.item?._id?.toString() || '',
      name: m.item?.name || 'Unknown',
      quantity: Number(m.quantity) || 0,
      unit: m.unit || '',
      vendor: m.vendor?.toString?.() || '',
      rate: m.rate || null,
    }));

    const newMaterials = await Promise.all(
      formattedMaterials.map(async m => {
        const mat = await Material.findById(m.item)
          .select('name')
          .session(session);
        return {
          itemId: m.item.toString(),
          name: mat?.name || 'Unknown',
          quantity: Number(m.quantity) || 0,
          unit: m.unit || '',
          vendor: m.vendor?.toString?.() || '',
          rate: m.rate || null,
        };
      })
    );

    const materialsChanged =
      oldMaterials.length !== newMaterials.length ||
      oldMaterials.some((old, i) => {
        const neu = newMaterials[i];
        return (
          old.itemId !== neu.itemId ||
          old.quantity !== neu.quantity ||
          old.vendor !== neu.vendor ||
          old.rate !== neu.rate
        );
      });

    const changeDescriptions = [];
    if (materialsChanged) {
      const oldDesc = oldMaterials
        .map(
          m =>
            `${m.name} (${m.quantity})` +
            (m.vendor ? ` - Vendor: ${m.vendor}` : '') +
            (m.rate ? ` - Rate: ${m.rate}` : '')
        )
        .join(', ');

      const newDesc = newMaterials
        .map(
          m =>
            `${m.name} (${m.quantity})` +
            (m.vendor ? ` - Vendor: ${m.vendor}` : '') +
            (m.rate ? ` - Rate: ${m.rate}` : '')
        )
        .join(', ');

      changeDescriptions.push(
        `Materials updated from ${oldDesc} to ${newDesc}.`
      );
      materialRequest.set('materials', formattedMaterials);
      materialRequest.markModified('materials');
    }

    // --- Project lookup (for approval notifications) ---
    const project = materialRequest?.site
      ? await Project.findById(materialRequest.site)
          .select('_id siteID project_admin accountant sr_engineer operation')
          .populate({
            path: 'project_admin accountant sr_engineer operation',
            model: 'User',
            select: 'playerId',
          })
          .lean()
      : null;

    const user = await User.findById(requestedBy)
      .select('firstname lastname roles')
      .populate('roles');

    const userRole = user?.roles?.name?.toLowerCase?.() || '';

    const approvals = materialRequest.approvals || [];
    if (
      status &&
      (level1.includes(userRole) ||
        level2.includes(userRole) ||
        userRole === 'admin')
    ) {
      let levelToUpdate;
      const level1Approved = approvals.some(
        a => a.level === 1 && a.status === 'approved'
      );

      if (!level1Approved) {
        if (!level1.includes(userRole) && userRole !== 'admin')
          throw new Error('User not authorized for Level 1 approval');
        levelToUpdate = 1;
      } else {
        if (!level2.includes(userRole) && userRole !== 'admin')
          throw new Error('User not authorized for Level 2 approval');
        levelToUpdate = 2;
      }

      const approvalEntry = {
        level: levelToUpdate,
        approverId: requestedBy,
        status,
        approvedAt: new Date(),
      };

      const existing = approvals.find(a => a.level === levelToUpdate);
      if (existing) Object.assign(existing, approvalEntry);
      else approvals.push(approvalEntry);

      materialRequest.approvals = approvals;
      if (status === 'approved') {
        materialRequest.status =
          levelToUpdate === 1 ? 'approved' : 'order placed';
      } else if (status === 'rejected') {
        materialRequest.status = 'rejected';
      }

      changeDescriptions.push(
        `Request ${status} at level ${levelToUpdate} by ${user.firstname} ${user.lastname}`
      );
    }

    // --- Update expected date ---
    materialRequest.expectedDeliveryDate = expectedDate;

    // --- Add update log ---
    if (changeDescriptions.length > 0) {
      materialRequest.updates.push({
        updatedBy: requestedBy,
        updatedAt: new Date(),
        status: materialRequest.status,
        remarks: changeDescriptions.join('\n'),
      });
    }

    // --- Save changes ---
    await materialRequest.save({ session, validateBeforeSave: false });
    await session.commitTransaction();
    session.endSession();

    return res.status(200).json({
      success: true,
      message: 'Vendor details and approvals updated successfully',
    });
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('Error in addVendorDetails:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.changeRequestStatus = async (req, res) => {
  try {
    const { requestId } = req.params;
    const { status } = req.body;
    const requestedBy = req.user?._id || req.userId || req.body?.userId;

    if (!requestId) throw new Error('Request ID is required');
    if (!status) throw new Error('Status is required');

    const normalizedStatus = status.toLowerCase();

    // ---- Fetch material request ----
    const materialRequest = await MaterialRequest.findById(requestId).populate(
      'materials.item',
      'name unit'
    );

    if (!materialRequest) throw new Error('Material request not found');

    // ---- Approval role levels ----
    const level1 = ['accountant', 'operations', 'sr. engineer'];
    const level2 = ['accountant', 'operations'];

    // ---- Fetch project (optional) ----
    const project = materialRequest?.site
      ? await Project.findById(materialRequest.site)
          .select('_id siteID project_admin accountant sr_engineer operation')
          .populate({
            path: 'project_admin accountant sr_engineer operation',
            model: 'User',
            select: 'playerId',
          })
          .lean()
      : null;

    // ---- Flatten project members ----
    const allUsers = [
      ...(project?.project_admin || []),
      ...(project?.accountant || []),
      ...(project?.sr_engineer || []),
      ...(project?.operation || []),
    ].filter(Boolean);

    // ---- Fetch user & roles ----
    const user = await User.findById(requestedBy)
      .select('firstname lastname roles')
      .populate('roles', 'name');

    let userRoles = [];
    if (Array.isArray(user.roles)) {
      userRoles = user.roles.map(role => role.name.toLowerCase());
    } else if (user.roles?.name) {
      userRoles = [user.roles.name.toLowerCase()];
    }

    const approvals = materialRequest.approvals || [];

    // ---- Determine approval level ----
    const level1Approved = approvals.some(
      a => a.level === 1 && a.status === 'approved'
    );

    let levelToUpdate = null;
    if (!level1Approved) {
      // Level 1 approval
      if (
        !userRoles.some(r => level1.includes(r)) &&
        !userRoles.includes('admin')
      ) {
        throw new Error('User not authorized for Level 1 approval');
      }
      levelToUpdate = 1;
    } else {
      // Level 2 approval
      if (
        !userRoles.some(r => level2.includes(r)) &&
        !userRoles.includes('admin')
      ) {
        throw new Error('User not authorized for Level 2 approval');
      }
      levelToUpdate = 2;
    }

    // ---- Update approval entry ----
    const approvalEntry = {
      level: levelToUpdate,
      approverId: requestedBy,
      status: normalizedStatus,
      approvedAt: new Date(),
    };

    const existingIndex = approvals.findIndex(a => a.level === levelToUpdate);
    if (existingIndex > -1) {
      approvals[existingIndex] = approvalEntry;
    } else {
      approvals.push(approvalEntry);
    }

    // ---- Update material request status ----
    if (normalizedStatus === 'approved') {
      materialRequest.status =
        levelToUpdate === 1 ? 'approved' : 'order placed';
    } else if (normalizedStatus === 'rejected') {
      materialRequest.status = 'rejected';
    }

    // ---- Log update ----
    const changeDescription = `Request ${normalizedStatus} at level ${levelToUpdate} by ${user.firstname} ${user.lastname}`;

    const updateLog = {
      updatedBy: requestedBy,
      updatedAt: new Date(),
      status: materialRequest.status,
      remarks: changeDescription,
    };

    materialRequest.updates = materialRequest.updates || [];
    materialRequest.updates.push(updateLog);

    // ---- Save changes ----
    materialRequest.approvals = approvals;
    await materialRequest.save();

    return res.status(200).json({
      success: true,
      message: `Request ${normalizedStatus} successfully`,
      data: materialRequest,
    });
  } catch (error) {
    console.error('Error in changeRequestStatus:', error);
    return res.status(500).json({ success: false, message: error.message });
  }
};

exports.getRequestUpdates = async (req, res) => {
  try {
    const { requestId } = req.params;

    if (!requestId) {
      return res.status(400).json({ message: 'Request ID is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(requestId)) {
      return res.status(400).json({ message: 'Invalid request ID format' });
    }

    const result = await MaterialRequest.aggregate([
      { $match: { _id: new mongoose.Types.ObjectId(requestId) } },

      // Flatten updates array
      { $unwind: { path: '$updates', preserveNullAndEmptyArrays: true } },

      // Lookup updatedBy user details (if updates.updatedBy is a ref)
      {
        $lookup: {
          from: 'users',
          localField: 'updates.updatedBy',
          foreignField: '_id',
          as: 'updates.updatedBy',
          pipeline: [
            { $project: { firstname: 1, lastname: 1, profileImage: 1 } },
          ],
        },
      },

      // Flatten the updatedBy array (from lookup)
      {
        $unwind: {
          path: '$updates.updatedBy',
          preserveNullAndEmptyArrays: true,
        },
      },

      // Sort updates by updatedAt descending
      { $sort: { 'updates.updatedAt': -1 } },

      // Group back into one document
      {
        $group: {
          _id: '$_id',
          status: { $first: '$status' },
          updatedAt: { $first: '$updatedAt' },
          updates: { $push: '$updates' },
        },
      },
    ]);

    if (!result || result.length === 0) {
      return res.status(404).json({ message: 'Material request not found' });
    }

    return res.status(200).json({ data: result[0] });
  } catch (error) {
    console.error('Error in getRequestUpdates:', error);
    if (error.status) {
      return res.status(error.status).json({ message: error.message });
    }
    return handleDatabaseError(error, res);
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

  if (!['order placed', 'partially received'].includes(request.status)) {
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
