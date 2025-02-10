const config = require("../config/auth.config");
const db = require("../models");
const CategoryDetails = db.categoryDetails;

exports.saveCategoryDetails = (req, res) => {
  if (!req.body.name) {
    res.status(500).send({
      message: "Category name is required!!",
    });
  } else if (!req.body.unit) {
    res.status(500).send({
      message: "Category Unit is required!!",
    });
  }
  else if(req.files.categoryImage === undefined) {
    res.status(500).send({
      message: "Image is mandatory!!",
    });
    return;
  }
  else{
    let categoryFiles = [];

    if (req.files.categoryImage) {
      for (let i = 0; i < req.files.categoryImage.length; i++) {
        categoryFiles.push(req.files.categoryImage[i].location);
      }
    }

    // console.log(req.file)
    const categoryDetails = new CategoryDetails({
      name: req.body.name,
      unit: req.body.unit,
      active: req.body.active,
      position: req.body.position,
      isDeleted: req.body.isDeleted,
      categoryImage: categoryFiles,
    });
    CategoryDetails.findOne({ name: req.body.name }, (err, category) => {
      // console.log(category)
      if (err) {
        // console.log("Error-----------")
        res.status(500).send({ message: "Internal Server Error" });
        return;
      } else if (category) {
        res.status(302).send({
          message:
            "Category have already been saved, please update/change the category",
          dataSaved: category,
        });
        return;
      } else if (category == undefined || null) {
        categoryDetails.save((err, data) => {
          if (err) {
            // console.log("eroror.............")
            res
              .status(500)
              .send({ message: "Error while saving the category" });
            return;
          }
          res.status(200).send({
            message: "Your category have been saved successfuly",
            data: data,
          });
          return;
        });
      }
      return;
    });
  }
};
exports.getCategoryListByName = (req,res)=>{
  CategoryDetails.find({name:req.query.name},(err,category)=>{
    if (err) {
      // console.log("Error-----------")
      res.status(500).send({ message: "Internal Server Error" });
      return;
    } else{
      res.status(200).send({
        data: category,
      });
      return;
    }
  })
}

exports.updateCategoryDetails = (req, res) => {
  let categoryFiles = [];

  if (req.files.categoryImage) {
    for (let i = 0; i < req.files.categoryImage.length; i++) {
      categoryFiles.push(req.files.categoryImage[i].location);
    }
  }

  let dataUpdate = {
    _id: req.body._id,
    id: req.body.id,
    name: req.body.name,
    unit: req.body.unit,
    active: req.body.active,
    position: req.body.position,
    isDeleted: req.body.isDeleted,
  };

  if (categoryFiles.length > 0) {
    dataUpdate["categoryImage"] = categoryFiles;
  }

  CategoryDetails.findByIdAndUpdate(
    req.body._id,
    dataUpdate,
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update category" });
        return;
      }
      if (updated) {
        const data = {
          _id: updated?._id || null,
          id: updated.id,
          name: updated.name,
          unit: req.body.unit,
          active: updated.active,
          position: updated.position,
          isDeleted: updated.isDeleted,
        };
        res.status(200).send({ message: "Updated Successfuly", data: data });
      }
      return;
    }
  );
};
exports.getCategoryDetailsById = async (req, res) => {
  let id = req.body.id;
  // console.log("callinnnnnnnnnnnnnngggggggggggg----",id)
  const data = await CategoryDetails.findById(id);
  if (data) {
    res.status(200).json({
      message: "Category fetched successfully",
      status: 200,
      data: data,
    });
  } else {
  res.json({
      message: "The requested data could not be fetched",
      status: 404,
      data: [],
  })
  }
};

exports.deleteCategoryDetails = (req, res) => {
  let id = req.params.id;
  // console.log(id)
  CategoryDetails.deleteOne({ _id: id }, (err, dealer) => {
    if (err) {
      res
        .status(500)
        .send({ message: "The requested data could not be fetched" });
      return;
    }
    res.status(200).send({
      message: "Category delete successfully",
      status: 200,
    });
    return;
  });
};

exports.updateCategoryStatus = (req, res) => {
  let dataUpdate = {
    _id: req.body._id,
    active: req.body.active,
  };
  CategoryDetails.findByIdAndUpdate(
    req.body._id,
    dataUpdate,
    (err, updated) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not find id to update category" });
        return;
      }
      if (updated) {
        res.status(200).send({ message: "Updated Successfuly", data: updated });
      }
      return;
    }
  );
};

exports.getAllCategory = (req, res) => {
  CategoryDetails.find({}, (err, categories) => {
    if (err) {
      res.status(500).send({
        message: "There was a problem in getting the list of categories",
      });
      return;
    }
    res.status(200).send({
      message: "List of categories fetched successfuly",
      data: categories,
    });
    return;
  });
};
