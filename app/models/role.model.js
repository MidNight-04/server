const mongoose = require('mongoose');

const Role = mongoose.model(
    "Role",
    new mongoose.Schema({
        name: String
    }, { timestamps: true })
);

module.exports = Role;
function init() {
    Role.find({}, (error, success) => {
        if (error) {
            console.log(error);
        } else if (success.length == 0) {
            let query = [{ name: "user" }, { name: "architect" }, { name: "admin" }, { name: "dealer" }, { name: "contractor" }]
            Role.create(query, (error, success) => {
                console.log("created sucessfully ", error, success);
            });
        }

    });
}
init();