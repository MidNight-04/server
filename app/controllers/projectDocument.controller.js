const config = require("../config/auth.config");
const db = require("../models");
const ProjectLog = db.projectlogs;
const ProjectDocuments = db.projectDocument;
const awsS3 = require('../middlewares/aws-s3');

// const fetch = require('node-fetch');
const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

exports.addProjectDocument = async (req, res) => {
  let documentFiles = [];

  // if (req.files.document) {
  //   for (let i = 0; i < req.files.document.length; i++) {
  //     documentFiles.push(req.files.document[i].location);
  //   }
  // }

  if (req.files?.document?.length > 0) {
    await awsS3.uploadFiles(req.files?.document, `project_doc`).then(async (data) => {
      const images = data.map((file) => {
        const url = 'https://thekedar-bucket.s3.us-east-1.amazonaws.com/' + file.s3key
        return url;
      })
      documentFiles.push(...images);
    });
  }

  // const log = {
  //   log: "Project document upload by admin",
  //   file: documentFiles,
  //   date: req.body.date,
  //   siteID: req.body.siteID,
  //   member: {
  //     name: req.body.userName,
  //     Id: req.body.user,
  //   },
  // };

  const projectDocument = new ProjectDocuments({
    name: req.body.name,
    siteID: req.body.siteID,
    clientID: req.body.client,
    uploadingUser: req.body.user,
    uploadingUserName: req.body.userName,
    document: documentFiles,
  });
  projectDocument.save(async (err, data) => {
    if (err) {
      res.status(500).send({ message: "Error while uploading the document" });
      return;
    }
    // const logSave = new ProjectLog(log);
    // await logSave.save();
    res.status(200).send({
      message: "Document have been upload successfully",
      data: data,
    });
    return;
  });
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
      message: "The requested data could not be fetched",
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
      message: "The requested data could not be fetched",
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
      message: "The requested data could not be fetched",
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
      message: "Document status update by client",
    });
  } else {
    res.json({
      message: "Error while updating document status by client",
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
    res.setHeader("Content-Type", "application/pdf");
    res.send(pdf);
  } catch (error) {
    console.error("Error fetching PDF:", error);
    res.status(500).send("Error fetching PDF");
  }
};
