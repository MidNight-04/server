const db = require("../models");
const ProjectMaterial = db.projectMaterialsRequest;
const axios = require("axios");

exports.addProjectMaterial = async (req, res) => {
  //   console.log(req.body)
  const { data } = req.body;
  const dataAdd = {
    siteID: data.projectID,
    requestUser: data.user,
    itemName: data.item,
    itemQuantity: {
      requestQuantity: data.quantity,
      approvalQuantity: data.quantity,
    },
    purpose: data.purpose,
    priority: data.priority,
    requestDate: data.date,
    productDetails: {},
  };

  let material = new ProjectMaterial(dataAdd);
  material.save((err, result) => {
    if (err) {
      res.status(500).send({ message: "Could not raise request for material" });
      return;
    } else {
      //   console.log(result)
      res
        .status(201)
        .send({ message: "Material request raised Successfuly", status: 201 });
    }
    return;
  });
};

// exports.updateClientProfileById = async(req,res)=>{
//   // console.log("Upcoming data-", req.body);

//   let profileFiles = [];

//   if (req.files.profileImage) {
//     for (let i = 0; i < req.files.profileImage.length; i++) {
//       profileFiles.push(req.files.profileImage[i].location);
//     }
//   }
//   const findData = await Client.find({ _id: req.params.id });
//   if (findData?.length > 0) {
//     let query = {
//       name:req.body.name,
//       phone:req.body.phone,
//       email:req.body.email,
//       address:req.body.address
//     };

//     if (profileFiles.length > 0) {
//       query["profileImage"] = profileFiles;
//     }
//     // console.log(query)
//     const updateProfile = await Client.updateOne(
//       { _id: req.params.id },
//       {$set:query}
//     );
//     // console.log(updateProfile)
//     if (updateProfile.modifiedCount ===1) {
//       res.json({
//         status: 200,
//         message: "Profile Updated Successfuly",
//       });
//     }
//   } else {
//     res.status(200).send({
//       message: "User does not exist",
//     });
//   }
// }

exports.getAllProjectMaterial = (req, res) => {
  ProjectMaterial.find({}).then((member, err) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of request",
      });
      return;
    }
    if (member) {
      res.status(200).send({
        message: "List of material request fetched successfuly",
        data: member,
      });
    }
  });
  return;
};
// exports.deleteClientById = (req, res) => {
//   const id = req.params.id;
//   Client.deleteOne({ _id: id }, (err, dealer) => {
//     if (err) {
//       res
//         .status(500)
//         .send({ message: "The requested data could not be fetched" });
//       return;
//     }
//     res.status(200).send({
//       message: "Record delete successfully",
//       status: 200,
//     });
//     return;
//   });
// };
exports.getProjectMaterialBySiteID = (req, res) => {
  const id = req.params.id;
  ProjectMaterial.find({ siteID: id }, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: "Could not find id to get details" });
      return;
    }
    if (data) {
      res.status(200).send({ data: data });
    }
  });
};
exports.getProjectMaterialRequestById = (req, res) => {
  const id = req.params.id;
  ProjectMaterial.find({ _id: id }, (err, data) => {
    if (err) {
      //   console.log(err);
      res.status(500).send({ message: "Could not find id to get details" });
      return;
    }
    if (data) {
      res.status(200).send({ data: data });
    }
  });
};
exports.updateProjectMaterialRequestByPM = (req, res) => {
  const { id, quantity, purpose, priority, date, status } = req.body;
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "itemQuantity.approvalQuantity": quantity,
        "order.quantity": quantity,
        "projectManager.approval": status,
        purpose: purpose,
        priority: priority,
        "projectManager.approvalDate": date,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
exports.updateProjectMaterialRequestByOperation = (req, res) => {
  const {
    id,
    brand,
    vendor,
    rate,
    amount,
    remark,
    expectedDeliveryDate,
    productDetails,
  } = req.body;
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "operation.vendor": vendor,
        "operation.brand": brand,
        "operation.rate": rate,
        "operation.amount": amount,
        "operation.remark": remark,
        "order.expectedDeliveryDate": expectedDeliveryDate,
        productDetails: productDetails,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
exports.updateProjectMaterialRequestByAdmin = (req, res) => {
  const { id, status } = req.body;
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "admin.approval": status,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
exports.orderProjectMaterialRequestByAdmin = (req, res) => {
  const {
    id,
    orderPlacedBy,
    orderDate,
    vendor,
    brand,
    rate,
    amount,
    deliveryStatusByAdmin,
    adminApproval,
    approvalDate,
  } = req.body;
  console.log(req.body)
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "admin.approval": adminApproval,
        "admin.approvalDate": approvalDate,
        "order.orderPlacedBy": orderPlacedBy,
        "order.orderDate": orderDate,
        "order.vendor": vendor,
        "order.brand": brand,
        "order.rate": rate,
        "order.amount": amount,
        "order.deliveryStatusByAdmin": deliveryStatusByAdmin,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
exports.deliveredProjectMaterialRequestByAdmin = (req, res) => {
  const { id, deliveryStatusByAdmin } = req.body;
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "order.deliveryStatusByAdmin": deliveryStatusByAdmin,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
exports.updateDeliveredMaterialbypm = (req, res) => {
  const { id, quantity, date } = req.body;
  ProjectMaterial.updateOne(
    { _id: id },
    {
      $set: {
        "materialDelivered.quantity": quantity,
        "materialDelivered.date": date,
      },
    },
    (err, updated) => {
      if (err) {
        //   console.log(err);
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", status: 200 });
      }
    }
  );
};
