const db = require("../models");
const Brands = db.brands;
const axios = require("axios");

const modifyProductArray = (brands) => {
  const brandArray = brands;
  const sponseredIndex = brandArray.findIndex((brand) => brand.isTop == true);
  brandArray.push(...brandArray.splice(0, sponseredIndex));
  const isTopIndex = brandArray.findIndex((brand) => brand.isSponsered == true);
  brandArray.push(...brandArray.splice(0, isTopIndex));
  return brandArray;
};

exports.uploadBrands = (req, res) => {
  let files = [];
  if (req.files.productImage) {
    for (let i = 0; i < req.files.productImage.length; i++) {
      files.push(req.files.productImage[i].location);
    }
  }
  const brands = {
    name: req?.body?.name,
    unit: req?.body?.unit,
    productImage: files,
    price: req?.body?.price,
    minQuantity: req?.body?.minQuantity,
    maxQuantity: req?.body?.maxQuantity,
    productCommission:req?.body?.productCommission,
    descriptionOne: req?.body?.descriptionOne,
    descriptionTwo: req?.body?.descriptionTwo,
    descriptionThree: req?.body?.descriptionThree,
    uploadingUser: req?.body?.uploadingUser,
    approvalStatus: req?.body?.approvalStatus,
    category: req?.body?.category,
    suitableLocation: req?.body?.suitableLocation,
    serviceLocationState: req?.body?.serviceLocationState,
    serviceLocationCity: req?.body?.serviceLocationCity,
    uploadingUserName: req?.body?.uploadingUserName,
  };
  // console.log("upcoming product--",brands);
  Brands.create(brands).then((brandSaved, err) => {
    if (err) {
      res
        .status(500)
        .send({ message: "There was problelm while saving your brand" });
      return;
    } else {
      res.status(200).send({
        message: "Your brand have been saved and sent for admin approval!",
        data: brandSaved,
      });
    }
  });
};

exports.updateBrands = (req, res) => {
  let files = [];
  let dataUpdate = {
    name: req?.body?.name,
    unit: req?.body?.unit,
    price: req?.body?.price,
    minQuantity: req?.body?.minQuantity ,
    maxQuantity: req?.body?.maxQuantity ,
    productCommission:req?.body?.productCommission ,
    descriptionOne: req?.body?.descriptionOne ,
    descriptionTwo: req?.body?.descriptionTwo ,
    descriptionThree: req?.body?.descriptionThree ,
    uploadingUser: req?.body?.uploadingUser ,
    approvalStatus: req?.body?.approvalStatus ,
    category: req?.body?.category ,
    suitableLocation: req?.body?.suitableLocation ,
    serviceLocationState: req?.body?.serviceLocationState ,
    serviceLocationCity: req?.body?.serviceLocationCity ,
    uploadingUserName: req?.body?.uploadingUserName ,
  };

  if (req.files.productImage) {
    for (let i = 0; i < req.files.productImage.length; i++) {
      files.push(req.files.productImage[i].location);
    }
  }

  if (files.length > 0) {
    dataUpdate["productImage"] = files;
  }

  Brands.updateOne({ _id: req.body._id }, dataUpdate, (err, updated) => {
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

exports.getBrandsByUploadingUser = (req, res) => {
  let id = req.query.id;
  // console.log("Data coming from the browser hit ------>", id, {
  //   uploadingUser: id,
  // });

  Brands.find({ uploadingUser: id }).exec((err, dealer) => {
    const brandArray = modifyProductArray(dealer);
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    // const dealerDetails = {
    //     _id: dealer?._id || null,
    //     name: dealer?.name || null,
    //     image: dealer?.image || null,
    //     price: dealer?.price || null,
    //     descriptionOne: dealer?.descriptionOne || null,
    //     descriptionTwo: dealer?.descriptionTwo || null,
    //     descriptionThree: dealer?.descriptionThree || null,
    //     approvalStatus: dealer?.approvalStatus || null,
    //     uploadingUser: dealer?.uploadingUser || null,
    // }

    res.status(200).send({
      message: "Details feched successfully",
      data: brandArray,
    });
    return;
  });
};

exports.getBrandsById = (req, res) => {
  let id = req.body.id;

  // console.log("Data coming from the browser hit -->>>>>", id);
  Brands.find({ _id: id }, async (err, dealer) => {
    // console.log(dealer);
    const brandArray = modifyProductArray(dealer);
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    // console.log(brandArray)
    res.status(200).send({
      message: "Details feched successfully",
      data: brandArray,
    });
    return;
  });
};
exports.getProxyImage = async (req, res) => {
  try {
    const imageUrl = req.query.url;

    const response = await axios.get(imageUrl, {
      responseType: "stream",
    });
    res.setHeader("Content-Type", response.headers["content-type"]);
    response.data.pipe(res);
  } catch (error) {
    console.error("Error proxying image:", error);
    res.status(500).send("Internal Server Error");
  }
};
exports.deleteBrandsById = (req, res) => {
  let id = req.params.id;
  console.log("Data coming from the browser hit -->>>>>", id);
  Brands.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Details delete successfully",
      status: 200,
    });
    return;
  });
};

exports.getAllBrands = (req, res) => {
  const { approvalStatus } = req.body;
  let productFiles = [];
  let productArray = [];
  if (approvalStatus) {
    Brands.find({ approvalStatus }, async (err, dealer) => {
      const brandArray = await modifyProductArray(dealer);
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }

      // for (const product of dealer) {
      //     for (let i = 0; i < product.productImage.length; i++) {
      //       const key = new URL(product.productImage[i])
      //       const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
      //       await addWaterMark(encodeURIComponent(fileName), product.productImage[i])
      //       productFiles.push(`/files/${fileName}`)
      //     }

      //     productArray.push({ ...product.toObject(), productImage: productFiles })
      //   }
      res.status(200).send({
        message: "Details feched successfully",
        data: brandArray,
      });
      return;
    });
  } else {
    Brands.find({}, async (err, dealer) => {
      const brandArray = await modifyProductArray(dealer);
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }
      res.status(200).send({
        message: "Details feched successfully",
        data: brandArray,
      });
      return;
    });
  }
};
exports.getFilterProductsByData = (req, res) => {
  const { category, state, city } = req.body;
  Brands.find(
    {
      $or: [
        { category: { $in: category } },
        { uploadingUser: { $in: category } },
        { serviceLocationState: state },
        { serviceLocationCity: city },
      ],
    },
    async (err, dealer) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }
      res.status(200).send({
        message: "Details feched successfully",
        data: dealer,
      });
      return;
    }
  );
};

exports.getFilterProducts = (req, res) => {
  let array = [];
  let productFiles = [];
  let productArray = [];
  const cleanData = Object.entries(req.body)
    .filter(([key, value]) => value !== undefined)
    .reduce((obj, [key, value]) => {
      obj[key] = value;
      if (key === "category") {
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
  // console.log(query);

  Brands.find(query, async (err, product) => {
    const brandArray = modifyProductArray(product);
    if (err) {
      res.status(500).send({
        message: "Sorry! Something went wrong please try again later",
        data: err,
      });
      return;
    }

    // for (const product of designs) {
    //     for (let i = 0; i < product.productImage.length; i++) {
    //       const key = new URL(product.productImage[i])
    //       const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
    //       await addWaterMark(encodeURIComponent(fileName), product.productImage[i])
    //       productFiles.push(`/files/${fileName}`)
    //     }

    //     productArray.push({ ...product.toObject(), productImage: productFiles })
    //   }

    res.status(200).send({
      message: "Brands feched successfully",
      data: brandArray,
    });
    return;
  });
};

exports.getBrandsByCategoryName = (req, res) => {
  let productFiles = [];
  let productArray = [];
  Brands.find(
    { category: { $in: [req.body.categoryName] }, approvalStatus: "Approved" },
    async (err, dealer) => {
      const brandArray = modifyProductArray(dealer);
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }

      // for (const product of dealer) {
      //     for (let i = 0; i < product.productImage.length; i++) {
      //       const key = new URL(product.productImage[i])
      //       const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
      //       await addWaterMark(encodeURIComponent(fileName), product.productImage[i])
      //       productFiles.push(`/files/${fileName}`)
      //     }

      //     productArray.push({ ...product.toObject(), productImage: productFiles })
      //   }

      res.status(200).send({
        message: "Details feched successfully",
        data: brandArray,
      });
      return;
    }
  );
};
exports.getBrandsByProductName = (req, res) => {
  Brands.find(
    { name: { $in: [req.body.productName] }, approvalStatus: "Approved" },
    async (err, dealer) => {
      const brandArray = modifyProductArray(dealer);
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      }

      res.status(200).send({
        message: "Details feched successfully",
        data: brandArray,
      });
      return;
    }
  );
};

exports.sponserBrands = (req, res) => {
  const { id, sponsered } = req.body;
  // console.log(id,sponsered);
  Brands.updateOne({ _id: id }, { isSponsered: sponsered }, (err, updated) => {
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

exports.makeItTopBrands = (req, res) => {
  const { id, isTop } = req.body;
  Brands.updateOne({ _id: id }, { isTop: isTop }, (err, updated) => {
    if (err) {
      console.log(err);
      res.status(500).send({ message: "Could not find id to update details" });
      return;
    } else {
      if (updated) {
        res
          .status(200)
          .send({ message: "Updated Successfuly", data: updated, status: 200 });
      }
    }
  });
};
