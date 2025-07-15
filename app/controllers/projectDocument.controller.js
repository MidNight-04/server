const db = require('../models');
const ProjectDocuments = db.projectDocument;
const { uploadToS3AndExtractUrls } = require('../helper/s3Helpers');

// const fetch = require('node-fetch');
const fetch = (...args) =>
  import('node-fetch').then(({ default: fetch }) => fetch(...args));

exports.addProjectDocument = async (req, res) => {
  try {
    if (!req.body.name || !req.files?.docs?.length) {
      return res.status(400).json({
        message: 'Name and at least one document are required',
      });
    }

    const documentFiles = await uploadToS3AndExtractUrls(
      req.files?.docs,
      'projectDocuments'
    );

    const projectDocument = new ProjectDocuments({
      name: req.body.name,
      siteID: req.body.siteID,
      clientID: req.body.client,
      uploadingUser: req.body.user,
      date: req.body.date,
      document: documentFiles,
    });

    const savedDoc = await projectDocument.save();

    res.status(200).send({
      message: 'Document uploaded successfully',
      data: savedDoc,
    });
  } catch (err) {
    console.error('Error while uploading project document:', err);
    res.status(500).send({
      message: 'Error while uploading the document',
      error: err.message,
    });
  }
};

exports.getDocumentBySiteID = async (req, res) => {
  let id = req.params.id;
  const data = await ProjectDocuments.find({ siteID: id });
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
  const { id, status } = req.body;
  const data = await ProjectDocuments.updateOne(
    { _id: id },
    { $set: { status: status } }
  );
  if (data.modifiedCount === 1) {
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
