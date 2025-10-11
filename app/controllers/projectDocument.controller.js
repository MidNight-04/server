const db = require('../models');
const ProjectDocuments = db.projectDocument;
const Project = db.projects;
const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');
const { createLogManually } = require('../middlewares/createLog');
const { sendNotification } = require('../services/oneSignalService');

// const fetch = require('node-fetch');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.addProjectDocument = async (req, res) => {
  try {
    const { name, siteID, client, user, date } = req.body;

    if (!name?.trim()) {
      return res
        .status(400)
        .json({ success: false, message: 'Document name is required' });
    }
    if (!siteID) {
      return res
        .status(400)
        .json({ success: false, message: 'siteID is required' });
    }
    if (!client) {
      return res
        .status(400)
        .json({ success: false, message: 'Client ID is required' });
    }
    if (!user) {
      return res
        .status(400)
        .json({ success: false, message: 'Uploading user ID is required' });
    }

    const clientData = await db.user.findById(client);

    const filesArray = Array.isArray(req.files?.docs)
      ? req.files.docs
      : req.files?.docs
      ? [req.files.docs]
      : [];
    if (!filesArray.length) {
      return res
        .status(400)
        .json({ success: false, message: 'At least one document is required' });
    }

    let documentFiles;
    try {
      documentFiles = await uploadToS3AndExtractUrls(
        filesArray,
        'projectDocuments'
      );

      const logMessage = `Uploaded ${documentFiles.length} project document ${name} with siteID ${siteID}.`;

      await createLogManually(req, logMessage, siteID);

      const allPlayerIds = [clientData];

      await sendNotification({
        users: allPlayerIds,
        title: 'Project Updated',
        message: logMessage,
        data: { route: 'projects', id: siteID },
      });
    } catch (uploadErr) {
      console.error('S3 upload failed:', uploadErr);
      return res.status(500).json({
        success: false,
        message: 'File upload failed',
        error: uploadErr.message,
      });
    }

    const projectDocument = new ProjectDocuments({
      name: name.trim(),
      siteID,
      clientID: client,
      uploadingUser: user,
      date: date || new Date(),
      document: documentFiles,
    });

    const savedDoc = await projectDocument.save();

    return res.status(201).json({
      success: true,
      message: 'Document uploaded successfully',
      data: savedDoc,
    });
  } catch (err) {
    console.error('Error while uploading project document:', err);
    res.status(500).json({
      success: false,
      message: 'Unexpected error occurred while uploading the document',
      error: err.message,
    });
  }
};

exports.getDocumentBySiteID = async (req, res) => {
  let id = req.params.id;
  const data = await ProjectDocuments.find({ siteID: id }).populate({
    path: 'uploadingUser',
    select: 'firstname lastname profileImage',
  });
  if (data?.length > 0) {
    res.status(200).json({
      status: 200,
      data: data,
    });
  } else {
    res.json({
      message: 'The requested data could not be fetched',
      status: 404,
      data: [],
    });
  }
};

exports.getDocumentByClientID = async (req, res) => {
  let id = req.params.id;
  const data = await ProjectDocuments.find({ clientID: id });
  if (data?.length > 0) {
    res.status(200).json({
      status: 200,
      data: data,
    });
  } else {
    res.json({
      message: 'The requested data could not be fetched',
      status: 404,
      data: [],
    });
  }
};

exports.getDocumentByID = async (req, res) => {
  let id = req.params.id;
  const data = await ProjectDocuments.find({ _id: id });
  if (data?.length > 0) {
    res.status(200).json({
      status: 200,
      data: data,
    });
  } else {
    res.json({
      message: 'The requested data could not be fetched',
      status: 404,
      data: [],
    });
  }
};

exports.updateDocumentStatusByClient = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  const projectDocument = await ProjectDocuments.findById(id);

  if (!projectDocument) {
    return res.status(404).json({ message: 'Project document not found' });
  }

  const siteID = projectDocument.siteID;

  const siteData = await Project.findOne({
    siteID: siteID,
  }).populate({
    path: 'project_admin site_engineer accountant sr_engineer sales operation architect',
    model: 'User',
    select: 'playerIds',
  });

  if (!siteData) {
    return res
      .status(404)
      .json({ message: 'Project not found for the siteID' });
  }
  const data = await ProjectDocuments.updateOne(
    { _id: id },
    { $set: { status: status } }
  );
  if (data.modifiedCount === 1) {
    const logMessage = `Updated document status to ${status} for project document ${projectDocument.name} for site: ${projectDocument.siteID}.`;
    await createLogManually(req, logMessage, projectDocument.siteID);

    const allPlayerIds = [
      siteData.project_admin[0],
      siteData.architect[0],
      siteData.accountant[0],
      siteData.sr_engineer[0],
      siteData.site_engineer[0],
      siteData.operation[0],
      siteData.sales[0],
    ];

    await sendNotification({
      users: allPlayerIds,
      title: 'Project Updated',
      message: logMessage,
      data: { route: 'projects', id: siteID },
    });

    res.status(200).json({
      status: 200,
      message: 'Document status update by client',
    });
  } else {
    res.json({
      message: 'Error while updating document status by client',
      status: 404,
    });
  }
};
exports.viewDocument = async (req, res) => {
  const { pdfURL } = req.query;
  try {
    const response = await fetch(pdfURL);
    const pdf = await response.blob();
    // Set Content-Type header to application/pdf
    res.setHeader('Content-Type', 'application/pdf');
    res.send(pdf);
  } catch (error) {
    console.error('Error fetching PDF:', error);
    res.status(500).send('Error fetching PDF');
  }
};
