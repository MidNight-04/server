const db = require("../models");
const DealerDetails = db.dealerDetails;
const DealerRating = db.dealerRating;
const User = db.user;
const Brands = db.brands;
const addWaterMark = require("../helper/addWaterMark");

exports.saveDealerDetails = (req, res) => {
  let gstFiles = [];
  let panFiles = [];
  let aadharFiles = [];
  let bankDetailsFiles = [];

  if (req?.files?.gstImage) {
    for (let i = 0; i < req.files.gstImage.length; i++) {
      gstFiles.push(req.files.gstImage[i].location);
    }
  }

  if (req?.files?.panImage) {
    for (let i = 0; i < req.files.panImage.length; i++) {
      panFiles.push(req.files.panImage[i].location);
    }
  }

  if (req?.files?.aadharImage) {
    for (let i = 0; i < req.files.aadharImage.length; i++) {
      aadharFiles.push(req.files.aadharImage[i].location);
    }
  }

  if (req?.files?.bankDetailsImage) {
    for (let i = 0; i < req.files.bankDetailsImage.length; i++) {
      bankDetailsFiles.push(req.files.bankDetailsImage[i].location);
    }
  }

  let query = {
    id: req.body.id,
    photo: req?.file?.location || req.body.photo,
    designation: req.body.designation,
    companyNameShopName: req.body.companyNameShopName,
    address: req.body.address,
    upiDetails: req.body.upiDetails,
    dateOfCompanyFormation: req.body.dateOfCompanyFormation,
    businessContactNumber: req.body.businessContactNumber,
    serviceLocationState: req.body.serviceLocationState,
    serviceLocationCity: req.body.serviceLocationCity,
    radiusOfDelivery: req.body.radiusOfDelivery,
    merchantType: req.body.merchantType,
    approvalStatus: req.body.approvalStatus,
    name: req.body.name,
    gstImage: gstFiles,
    panImage: panFiles,
    aadharImage: aadharFiles,
    bankDetailsImage: bankDetailsFiles,
  };
  const dealerDetails = new DealerDetails(query);
  DealerDetails.findOne({ id: req.body.id }, (err, dealer) => {
    if (err) {
      res.status(500).send({ message: "Internal Server Error" });
      return;
    } else if (dealer) {
      res.status(202).send({
        message: "Details have already been saved, please update the details",
        data: dealer,
      });
      return;
    } else if (dealer == undefined || null) {
      dealerDetails.save((err, dealer) => {
        if (err) {
          res.status(500).send({ message: "Error while saving the details" });
          return;
        }
        res.status(200).send({
          message: "Your details have been saved successfuly",
          data: dealer,
        });
        return;
      });
    }
    return;
  });

  // DealerDetails.findOne({ 'email': req.body.email }, (err, dealer) => {
  //     if (err) {
  //         res.status(500).send({ message: "Internal Server Error" })
  //         return;
  //     } else if (dealer) {
  //         console.log("dealer coming in as -->>>>", dealer);
  //         res.status(302).send({ message: "Details have already been saved, please update the details", dataSaved: dealer });
  //         return;
  //     } else if (dealer == undefined || null) {
  //         dealerDetails.save((err, dealer) => {
  //             if (err) {
  //                 res.status(500).send({ message: 'Error while saving the details' });
  //                 return;
  //             }
  //             res.status(200).send({ message: "Your details have been saved successfuly", data: dealer });
  //             return;
  //         })
  //     }
  //     return;
  // })
};

exports.getDealerDetails = (req, res) => {
  let id = req.body.id;
  let gstFiles = [];
  let panFiles = [];
  let bankDetailsFiles = [];
  let aadharFiles = [];
  let dealerArray = [];

  // console.log("ID coming throught the API -->>>>>>", id);
  if (id) {
    DealerDetails.find(
      { $or: [{ _id: id }, { id: id }] },
      async (err, dealer) => {
        if (err) {
          res
            .status(500)
            .send({ message: "The requested data could not be fetched" });
          return;
        } else if (dealer) {
          // console.log(dealer);
          res.status(200).send({
            message: "Details feched successfully",
            data: dealer,
          });
        } else {
          res.status(404).send({
            message: "Application details not found",
          });
        }

        return;
      }
    );
  } else {
    DealerDetails.find({}, async (err, dealer) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else if (dealer) {
        res.status(200).send({
          message: "Details feched successfully",
          data: dealer,
        });
      } else {
        res.status(404).send({
          message: "Application details not found",
        });
      }

      return;
    });
  }
};

exports.getDealerDetailbyId = (req,res)=>{
  const id = req.body.id;
  DealerDetails.find({ id: id },
    async (err, dealer) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else if (dealer) {
        // console.log(dealer);
        res.status(200).send({
          message: "Details feched successfully",
          data: dealer,
        });
      } else {
        res.status(404).send({
          message: "Application details not found",
        });
      }

      return;
    }
  );
}
exports.getVendorListByBrand = (req,res)=>{
  const brand = req.body.brand;
  Brands.find({ name: brand },
    async (err, dealer) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else if (dealer) {
        // console.log(dealer);
        res.status(200).send({
          message: "Details feched successfully",
          data: dealer,
        });
      } else {
        res.status(404).send({
          message: "Application details not found",
        });
      }

      return;
    }
  );
}

exports.updateDealerDetails = (req, res) => {
  let gstFiles = [];
  let panFiles = [];
  let aadharFiles = [];
  let bankDetailsFiles = [];

  if (req?.files?.gstImage) {
    for (let i = 0; i < req.files.gstImage.length; i++) {
      gstFiles.push(req.files.gstImage[i].location);
    }
  }

  if (req?.files?.panImage) {
    for (let i = 0; i < req.files.panImage.length; i++) {
      panFiles.push(req.files.panImage[i].location);
    }
  }

  if (req?.files?.aadharImage) {
    for (let i = 0; i < req.files.aadharImage.length; i++) {
      aadharFiles.push(req.files.aadharImage[i].location);
    }
  }

  if (req?.files?.bankDetailsImage) {
    for (let i = 0; i < req.files.bankDetailsImage.length; i++) {
      bankDetailsFiles.push(req.files.bankDetailsImage[i].location);
    }
  }

  let dataUpdate = {
    id: req.body.id,
    photo: req?.file?.location || req.body.photo,
    designation: req.body.designation,
    companyNameShopName: req.body.companyNameShopName,
    address: req.body.address,
    upiDetails: req.body.upiDetails,
    dateOfCompanyFormation: req.body.dateOfCompanyFormation,
    businessContactNumber: req.body.businessContactNumber,
    serviceLocationState: req.body.serviceLocationState,
    serviceLocationCity: req.body.serviceLocationCity,
    radiusOfDelivery: req.body.radiusOfDelivery,
    merchantType: req.body.merchantType,
    approvalStatus: req.body.approvalStatus,
    name: req.body.name,
  };

  if (gstFiles.length > 0) {
    dataUpdate["gstImage"] = gstFiles;
  }

  if (panFiles.length > 0) {
    dataUpdate["panImage"] = panFiles;
  }

  if (aadharFiles.length > 0) {
    dataUpdate["aadharImage"] = aadharFiles;
  }

  if (bankDetailsFiles.length > 0) {
    dataUpdate["bankDetailsImage"] = bankDetailsFiles;
  }

  DealerDetails.updateOne(
    { id: req.body.id },
    {
      $set: dataUpdate,
    },
    { new: true, upsert: true },
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};

exports.getAllDealers = (req, res) => {
  DealerDetails.find({}, (err, dealers) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of applications",
      });
      return;
    }
    res
      .status(200)
      .send({ message: "List of dealers fetched successfuly", data: dealers });
    return;
  });
};
exports.deleteDealerById = (req, res) => {
  let id = req.params.id;
  console.log(id);
  DealerDetails.deleteOne({ id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Dealer deleted successfully",
      status: 200,
    });
    return;
  });
};
exports.suspendDealerById = async (req, res) => {
  let id = req.params.id;
  const updateStatus = await DealerDetails.updateOne(
    { id: id },
    { userStatus: "suspend" },
    { new: true }
  );
  if (updateStatus.modifiedCount === 1) {
    User.updateOne(
      { id: id },
      { userStatus: "suspend" },
      { new: true },
      (err, dealer) => {
        if (err) {
          res
            .status(500)
            .send({ message: "The requested data could not be fetched" });
          return;
        } else {
          Brands.updateMany(
            {
              uploadingUser: id,
            },
            { userStatus: "suspend" },
            { new: true },
            (err, dealer) => {
              if (err) {
                res
                  .status(500)
                  .send({ message: "The requested data could not be fetched" });
                return;
              } else {
                res.status(200).send({
                  message: "Dealer suspended successfully",
                  status: 200,
                });
              }
              return;
            }
          );
        }
        return;
      }
    );
  } else {
    res
      .status(500)
      .send({ message: "The requested data could not be fetched" });
    return;
  }
};

exports.activeDealerById = (req, res) => {
  let id = req.params.id;
  DealerDetails.updateOne(
    { id: id },
    { userStatus: "active" },
    { new: true },
    (err, dealer) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else {
        User.updateOne(
          { id: id },
          { userStatus: "active" },
          { new: true },
          (err, dealer) => {
            if (err) {
              res
                .status(500)
                .send({ message: "The requested data could not be fetched" });
              return;
            } else {
              Brands.updateMany(
                {
                  uploadingUser: id,
                },
                { userStatus: "active" },
                { new: true },
                (err, dealer) => {
                  if (err) {
                    res.status(500).send({
                      message: "The requested data could not be fetched",
                    });
                    return;
                  } else {
                    res.status(200).send({
                      message: "Dealer activate successfully",
                      status: 200,
                    });
                  }
                  return;
                }
              );
            }
            return;
          }
        );
      }
      return;
    }
  );
};
exports.deleteDealerRating = (req, res) => {
  let id = req.body.id;
  console.log(id);
  DealerRating.deleteOne({ _id: id }).then((err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Dealer Rating deleted successfully",
      status: 200,
    });
    return;
  });
};

exports.getDealerRatingById = (req, res) => {
  let id = req.body.id;
  console.log(id);
  DealerRating.find({ dealerid: id }, (err, dealerRating) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      data: dealerRating,
      status: 200,
    });
    return;
  });
};

exports.postDealerRating = (req, res) => {
  const { title, username, dealerid, rating, comments, userId, date } =
    req.body;

  const data = {
    title,
    username,
    dealerid,
    rating,
    comments,
    userId,
    date,
  };
  DealerRating.find(
    { dealerid: dealerid, userId: userId },
    (err, dealerRating) => {
      if (err) {
        res
          .status(500)
          .send({ message: "The requested data could not be fetched" });
        return;
      } else {
        // console.log(dealerRating);
        if (dealerRating?.length > 0) {
          const dataUpdate = {
            title,
            username,
            dealerid,
            rating,
            comments,
            userId,
            date,
          };
          DealerRating.updateOne(
            { _id: dealerRating[0]?._id },
            {
              $set: dataUpdate,
            },
            { new: true, upsert: true },
            (err, updated) => {
              if (err) {
                res
                  .status(500)
                  .send({ message: "Could not find id to update details" });
                return;
              }
              if (updated) {
                res
                  .status(200)
                  .send({
                    message: "Review Updated Successfuly",
                    data: updated,
                  });
              }
              return;
            }
          );
        } else {
          const dealerRating = new DealerRating(data);
          dealerRating.save((err, rating) => {
            if (err) {
              res
                .status(500)
                .send({ message: "Error while saving the details" });
              return;
            }
            res.status(200).send({
              message: "Your Review posted successfuly",
              data: rating,
            });
            return;
          });
        }
      }
    }
  );
};

exports.updateDealerRaing = (req, res) => {
  const { title, username, id, dealerid, rating, comments, userId } = req.body;

  const dataUpdate = {
    title,
    username,
    dealerid,
    rating,
    comments,
    userId,
  };

  DealerRating.updateOne(
    { id: req.body.id },
    {
      $set: dataUpdate,
    },
    { new: true, upsert: true },
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update details" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};

exports.getDealerRating = (req, res) => {
  DealerRating.find({}, async (err, data) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    } else if (data) {
      res.status(200).send({
        message: "Dealer Rating feched successfully",
        data: data,
      });
    } else {
      res.status(404).send({
        message: "Application details not found",
      });
    }

    return;
  });
};
