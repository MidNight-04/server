const db  = require("../models")
const FloorModel = db.floors;

exports.addProjectFloor = (req, res) => {
  let data = {
    name:req.body.name
  };
  // console.log(data)
  const findFloor = FloorModel.find({name:req.body.name});
  if(findFloor?.length>0){
    res.status(200).send({ message: "Record already exist"});
  }
  else{
    let Floor = new FloorModel(data);
    Floor.save((err, result) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not create Floor" });
        return;
      }
      else {
          console.log(result)
        res.status(201).send({ message: "Record created Successfuly"});
      }
      return;
    }
    );
  }
};

exports.getAllProjectFloor = (req, res) => { 
    FloorModel.find({})
      .then((Floor, err) => {
        if (err) {
          res
            .status(500)
            .send({
              message: "There was a problem in getting the list of Floor",
            });
          return;
        }
        if (Floor) {
          res.status(200).send({
            message: "List of Floor fetched successfuly",
            data: Floor,
          });
        }
      })
  return;
};
exports.deleteProjectFloorById = (req, res) => { 
    const id = req.params.id;
    FloorModel.deleteOne({ _id: id }, (err, dealer) => {
        if (err) {
          res
            .status(500)
            .send({ message: "The requested data could not be fetched" });
          return;
        }
        res.status(200).send({
          message: "Record delete successfully",
          status: 200,
        });
        return;
      });
};
exports.getProjectFloorById = (req, res) => { 
    const id = req.params.id;
    FloorModel.findById(id,(err, data) => {
        if (err) {
        //   console.log(err);
          res.status(500).send({ message: "Could not find id to get details" });
          return;
        }
        if (data) {
          res.status(200).send({data: data });
        }
      });
};
exports.updateProjectFloorById = (req, res) => { 
    const{id,floor} = req.body;
    const data = {name:floor}
    FloorModel.updateOne({ _id: id }, data, (err, updated) => {
        if (err) {
        //   console.log(err);
          res.status(500).send({ message: "Could not find id to update details" });
          return;
        }
        if (updated) {
          res.status(200).send({ message: "Updated Successfuly"});
        }
      });
};

