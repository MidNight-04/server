const addWaterMark = require("../helper/addWaterMark");
const db = require("../models");
const ArchitectOrder = require("../models/order.model");
const Designs = db.designs;

const modifyDesignArray = (desgins) => {
  const designArray = desgins;
  const sponseredIndex = designArray.findIndex(
    (design) => design.isTop == true
  );
  designArray.push(...designArray.splice(0, sponseredIndex));
  const isTopIndex = designArray.findIndex(
    (design) => design.isSponsered == true
  );
  designArray.push(...designArray.splice(0, isTopIndex));
  return designArray;
};

exports.uploadDesign = (req, res) => {
  let twoDIFiles = [];
  let threeDIFiles = [];
  let cadFiles = [];

  if (req.files.twoDImage) {
    for (let i = 0; i < req.files.twoDImage.length; i++) {
      twoDIFiles.push(req.files.twoDImage[i].location);
    }
  }

  if (req.files.threeDImage) {
    for (let i = 0; i < req.files.threeDImage.length; i++) {
      threeDIFiles.push(req.files.threeDImage[i].location);
    }
  }

  if (req.files.cadImage) {
    for (let i = 0; i < req.files.cadImage.length; i++) {
      cadFiles.push(req.files.cadImage[i].location);
    }
  }

  let query = {
    uploadingUser: req.body.uploadingUser,
    title: req.body.title,
    suitableLocation: req.body.suitableLocation,
    serviceLocationState: req?.body?.serviceLocationState || null,
    serviceLocationCity: req?.body?.serviceLocationCity || null,
    plotLength: req.body.plotLength,
    plotWidth: req.body.plotWidth,
    numberOfBedrooms: req.body.numberOfBedrooms,
    numberOfToilets: req.body.numberOfToilets,
    numberOfFloor: req.body.numberOfFloor,
    buildingType: req.body.buildingType,
    isVastu: req.body.isVastu,
    isStiltdParking: req.body.isStiltdParking,
    purpose: req.body.purpose,
    specialFeature: req.body.specialFeature,
    description: req.body.description,
    approvalStatus: req.body.approvalStatus,
    uploadingUserName: req?.body?.uploadingUserName || null,
    cadImagePrice: req.body.cadImagePrice,
    twoDImage: twoDIFiles,
    threeDImage: threeDIFiles,
    cadImage: cadFiles,
  };
  const uploadDesign = new Designs(query);
  uploadDesign.save((err, design) => {
    if (err) {
      res.status(500).send({
        message:
          "Oops! something went wrong, this is not you this is us! be right back!",
        data: err,
      });
      return;
    }
    res
      .status(200)
      .send({ message: "Successfuly uploaded your design", data: design });
    return;
  });
};

exports.getMyDesigns = (req, res) => {
  const userId = req.body.uploadingUser;
  if (userId) {
    Designs.find({ uploadingUser: userId }, (err, designs) => {
      const designArray = modifyDesignArray(designs);
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      res.status(200).send({
        message: `Designs fetched successfuly for user ${userId}`,
        data: designArray,
      });
      return;
    });
  } else {
    Designs.find({}, (err, designs) => {
      const designArray = modifyDesignArray(designs);
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }
      res.status(200).send({
        message: `Designs fetched successfuly for user ${userId}`,
        data: designArray,
      });
      return;
    });
  }
};

exports.filterDesignsByData = (req, res) => {
  let designArray = [];
  let array = [];
  let twoDIFiles = [];
  let threeDIFiles = [];
  let cadFiles = [];
  const {
    bedroom,
    toilet,
    floor,
    buildingType,
    purpose,
    vastu,
    stilt,
    state,
    city,
  } = req.body;
  Designs.find(
    {
      $or: [
        { numberOfBedrooms: { $in: bedroom } },
        { numberOfToilets: { $in: toilet } },
        { numberOfFloor: { $in: floor } },
        { buildingType: { $in: buildingType } },
        { purpose: { $in: purpose } },
        { isVastu: { $in: vastu } },
        { isStiltdParking: { $in: stilt } },
        { serviceLocationState: { $in: state } },
        { serviceLocationCity: { $in: city } },
      ],
    },
    async (err, design) => {
      const designArrays = modifyDesignArray(design);
      // console.log(designArrays)
      if (err) {
        res.status(500).send({
          message: "Sorry! Something went wrong please try again later",
          data: err,
        });
        return;
      }

      for (const design of designArrays) {
        for (let i = 0; i < design.twoDImage.length; i++) {
          // console.log("File path:", design.twoDImage[i]);
          const key = new URL(design.twoDImage[i]);
          const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
          await addWaterMark(encodeURIComponent(fileName), design.twoDImage[i]);
          twoDIFiles.push(`/files/${fileName}`);
        }

        for (let i = 0; i < design.threeDImage.length; i++) {
          const key = new URL(design.threeDImage[i]);
          const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
          await addWaterMark(
            encodeURIComponent(fileName),
            design.threeDImage[i]
          );
          threeDIFiles.push(`/files/${fileName}`);
        }

        for (let i = 0; i < design.cadImage.length; i++) {
          const key = new URL(design.cadImage[i]);
          const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
          await addWaterMark(encodeURIComponent(fileName), design.cadImage[i]);
          cadFiles.push(`/files/${fileName}`);
        }

        designArray.push({
          ...design.toObject(),
          twoDImage: twoDIFiles,
          threeDImage: threeDIFiles,
          cadImage: cadFiles,
        });
      }

      res
        .status(200)
        .send({ message: `Designs fetched successfuly`, data: designArray });
      return;
    }
  );
};

exports.getDesignById = (req, res) => {
  const designID = req.body.id;
  // console.log("design id", designID);
  let twoDIFiles = [];
  let threeDIFiles = [];
  let cadFiles = [];
  let designArray = [];

  Designs.find({ _id: designID }, async (err, designs) => {
    const designArrays = modifyDesignArray(designs);
    // console.log(designArrays)
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    }
    for (const design of designArrays) {
      for (let i = 0; i < design?.twoDImage?.length; i++) {
        const key = new URL(design.twoDImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.twoDImage[i]);
        twoDIFiles.push(`/files/${fileName}`);
        // twoDIFiles.push(key.href);
      }

      for (let i = 0; i < design?.threeDImage?.length; i++) {
        const key = new URL(design.threeDImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.threeDImage[i]);
        threeDIFiles.push(`/files/${fileName}`);
        // threeDIFiles.push(key.href);
      }

      for (let i = 0; i < design?.cadImage?.length; i++) {
        const key = new URL(design.cadImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.cadImage[i]);
        cadFiles.push(`/files/${fileName}`);
        // cadFiles.push(key.href);
      }

      designArray.push({
        ...design.toObject(),
        twoDImage: twoDIFiles,
        threeDImage: threeDIFiles,
        cadImage: cadFiles,
      });
    }

    res.status(200).send({
      message: `Designs fetched successfuly for desgin ${designID}`,
      data: designArray,
    });
    return;
  });
};

exports.deleteDesignById = (req, res) => {
  let id = req.params.id;
  console.log(id);
  Designs.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Design delete successfully",
      status: 200,
    });
    return;
  });
};

exports.sponserDesigns = (req, res) => {
  const { id, sponsered } = req.body;
  console.log(id);
  Designs.updateOne({ _id: id }, { isSponsored: sponsered }, (err, updated) => {
    if (err) {
      console.log(err);
      res.status(500).send({ message: "Could not find id to update details" });
      return;
    }
    if (updated) {
      res.status(200).send({ message: "Updated Successfuly", data: updated });
    }
  });
};

exports.makeItTopDesigns = (req, res) => {
  const { id, top } = req.body;
  console.log(id);
  Designs.updateOne({ _id: id }, { isTop: top }, (err, updated) => {
    if (err) {
      console.log(err);
      res.status(500).send({ message: "Could not find id to update details" });
      return;
    }
    if (updated) {
      res.status(200).send({ message: "Updated Successfuly", data: updated });
    }
  });
};

exports.getFilterDesign = (req, res) => {
  let array = [];
  let twoDIFiles = [];
  let threeDIFiles = [];
  let cadFiles = [];
  let designArray = [];

  const cleanData = Object.entries(req.body)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      if (
        key == "numberOfBedrooms" ||
        key == "numberOfToilets" ||
        key == "numberOfFloor" ||
        key == "buildingType" ||
        key == "isVastu" ||
        key == "isStiltdParking" ||
        key == "purpose"
      ) {
        array.push({
          [key]: { $in: value },
        });
      } else {
        array.push({
          [key]: value,
        });
      }
      return obj;
    }, {});

  let query = array.length > 0 ? { $or: array } : {};

  Designs.find(query, async (err, designs) => {
    const designArrays = modifyDesignArray(designs);
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    }

    for (const design of designArrays) {
      for (let i = 0; i < design.twoDImage.length; i++) {
        // console.log("File path:", design.twoDImage[i]);
        const key = new URL(design.twoDImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.twoDImage[i]);
        twoDIFiles.push(`/files/${fileName}`);
      }

      for (let i = 0; i < design.threeDImage.length; i++) {
        const key = new URL(design.threeDImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.threeDImage[i]);
        threeDIFiles.push(`/files/${fileName}`);
      }

      for (let i = 0; i < design.cadImage.length; i++) {
        const key = new URL(design.cadImage[i]);
        const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1);
        await addWaterMark(encodeURIComponent(fileName), design.cadImage[i]);
        cadFiles.push(`/files/${fileName}`);
      }

      designArray.push({
        ...design.toObject(),
        twoDImage: twoDIFiles,
        threeDImage: threeDIFiles,
        cadImage: cadFiles,
      });
    }
    res
      .status(200)
      .send({ message: `Designs fetched successfuly`, data: designArray });
    return;
  });
};

exports.getOrders = (req, res) => {
  const { uploadingUser } = req.body;

  ArchitectOrder.find({ userId: uploadingUser }).then((orders, err) => {
    if (err) {
      res.status(500).send({ message: err });
      return;
    }
    if (orders) {
      res.status(200).send({ data: orders });
    }
    return;
  });
};

exports.updateDesign = (req, res) => {
  let twoDIFiles = [];
  let threeDIFiles = [];
  let cadFiles = [];

  if (req.files.twoDImage) {
    for (let i = 0; i < req.files.twoDImage.length; i++) {
      twoDIFiles.push(req.files.twoDImage[i].location);
    }
  }

  if (req.files.threeDImage) {
    for (let i = 0; i < req.files.threeDImage.length; i++) {
      threeDIFiles.push(req.files.threeDImage[i].location);
    }
  }

  if (req.files.cadImage) {
    for (let i = 0; i < req.files.cadImage.length; i++) {
      cadFiles.push(req.files.cadImage[i].location);
    }
  }

  let query = {
    uploadingUser: req.body.uploadingUser,
    suitableLocation: req.body.suitableLocation,
    serviceLocationState: req?.body?.serviceLocationState || null,
    serviceLocationCity: req?.body?.serviceLocationCity || null,
    title: req.body.title,
    plotLength: req.body.plotLength,
    plotWidth: req.body.plotWidth,
    numberOfBedrooms: req.body.numberOfBedrooms,
    numberOfToilets: req.body.numberOfToilets,
    numberOfFloor: req.body.numberOfFloor,
    buildingType: req.body.buildingType,
    isVastu: req.body.isVastu,
    isStiltdParking: req.body.isStiltdParking,
    purpose: req.body.purpose,
    specialFeature: req.body.specialFeature,
    description: req.body.description,
    cadImagePrice: req.body.cadImagePrice,
    uploadingUserName: req?.body?.uploadingUserName || null,
  };

  if (twoDIFiles.length > 0) {
    query["twoDImage"] = twoDIFiles;
  }

  if (threeDIFiles.length > 0) {
    query["threeDImage"] = threeDIFiles;
  }

  if (cadFiles.length > 0) {
    query["cadImage"] = cadFiles;
  }

  Designs.findByIdAndUpdate(
    req.body._id || req.body.id,
    query,
    { new: true },
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      } else if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      } else {
        res.status(404).send({ message: "design is not existed" });
      }
      return;
    }
  );
};
