const db  = require("../models")
const RoleModel = db.role;

exports.addProjectRole = (req, res) => {
  let data = {
    name:req.body.name
  };
  const findRole = RoleModel.find({name:req.body.name});
  if(findRole?.length>0){
    res.status(200).send({ message: "Record already exist"});
  }
  else{
    let role = new RoleModel(data);
    role.save((err, result) => {
      if (err) {
        res
          .status(500)
          .send({ message: "Could not create role" });
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

exports.getAllRole = (req, res) => { 
    RoleModel.find({})
      .then((role, err) => {
        if (err) {
          res
            .status(500)
            .send({
              message: "There was a problem in getting the list of role",
            });
          return;
        }
        if (role) {
          res.status(200).send({
            message: "List of role fetched successfuly",
            data: role,
          });
        }
      })
  return;
};
exports.deleteProjectRoleById = (req, res) => { 
    const id = req.params.id;
    RoleModel.deleteOne({ _id: id }, (err, dealer) => {
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
exports.getProjectRoleById = (req, res) => { 
    const id = req.params.id;
    RoleModel.findById(id,(err, data) => {
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
exports.updateProjectRoleById = (req, res) => { 
    const{id,role} = req.body;
    const data = {name:role}
    RoleModel.updateOne({ _id: id }, data, (err, updated) => {
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

