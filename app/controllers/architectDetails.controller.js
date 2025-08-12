const config = require("../config/auth.config");
const db = require("../models");
const ArchitectDetails = db.architectDetails;
const EnquiryForm = db.enquiryForm;
const Designs = db.designs;
const User = db.user;
const Role = db.role;
const addWaterMark = require("../helper/addWaterMark");

exports.saveArchitectDetails = (req, res) => {

    let gstFiles = []
    let panFiles = []
    let aadharFiles = []
    let bankDetailsFiles = []
    let coaLicenseFiles = []
    let otherLicenseFiles = []

    if (req.files.gstImage) {
        for (let i = 0; i < req.files.gstImage.length; i++) {
            gstFiles.push(req.files.gstImage[i].location)
        }
    }

    if (req.files.panImage) {
        for (let i = 0; i < req.files.panImage.length; i++) {
            panFiles.push(req.files.panImage[i].location)
        }
    }

    if (req.files.aadharImage) {
        for (let i = 0; i < req.files.aadharImage.length; i++) {
            aadharFiles.push(req.files.aadharImage[i].location)
        }
    }

    if (req.files.bankDetailsImage) {
        for (let i = 0; i < req.files.bankDetailsImage.length; i++) {
            bankDetailsFiles.push(req.files.bankDetailsImage[i].location)
        }
    }

    if (req.files.coaLicenseImage) {
        for (let i = 0; i < req.files.coaLicenseImage.length; i++) {
            coaLicenseFiles.push(req.files.coaLicenseImage[i].location)
        }
    }

    if (req.files.otherLicenseImage) {
        for (let i = 0; i < req.files.otherLicenseImage.length; i++) {
            otherLicenseFiles.push(req.files.otherLicenseImage[i].location)
        }
    }

    let query = {
        id: req.body.id,
        photo: req?.file?.location || req.body.photo,
        designation: req.body.designation,
        companyName: req.body.companyName,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        bankDetails: req.body.bankDetails,
        qualification: req.body.qualification,
        servicesOffered: req.body.servicesOffered,
        qualificationDocument: req.body.qualificationDocument,
        dateOfBirth: req.body.dateOfBirth,
        businessContactNumber: req.body.businessContactNumber,
        email: req.body.email,
        serviceLocation: req.body.serviceLocation,
        serviceLocationState: req.body.serviceLocationState,
        serviceLocationCity: req.body.serviceLocationCity,
        yearsOfExperience: req.body.yearsOfExperience,
        yearOfGraduation: req.body.yearOfGraduation,
        approvalStatus: req.body.approvalStatus,
        name: req.body.name,
        gstImage: gstFiles,
        panImage: panFiles,
        coaLicenseImage: coaLicenseFiles,
        otherLicenseImage: otherLicenseFiles,
        aadharImage: aadharFiles,
        bankDetailsImage: bankDetailsFiles
    }

    const architectDetails = new ArchitectDetails(query);
    ArchitectDetails.findOne({ 'id': req.body.id }, (err, architect) => {
        if (err) {
            res.status(500).send({ message: "Internal Server Error" })
            return;
        } else if (architect) {
            res.status(202).send({ message: "Details have already been saved, please update the details", data: architect });
            return;
        } else if (architect == undefined || null) {
            architectDetails.save((err, architect) => {
                if (err) {
                    res.status(500).send({ message: 'Error while saving the details' });
                    return;
                }
                res.status(200).send({ message: "Your details have been saved successfuly", data: architect });
                return;
            })
        }
        return;
    })
}

exports.contactArchitect = (req, res) => {
    const { architectId, designId, userId, comment, productDetail } = req.body;

    const query = {
        architectId,
        designId,
        userId,
        comment,
        contactType: "Architect Contact",
        productDetail
    }

    const saveEnquiry = new EnquiryForm(query)

    saveEnquiry.save((err, enquirySaved) => {
        console.log(err, enquirySaved);
        if (err) {
            res.status(500).send({ message: err });
            return;
        }
        if (enquirySaved) {
            res.send({ message: "Order sent successfully! You will be contacted soon" });
        }
        return;
    })
}

exports.getArchitectDetails = (req, res) => {
    let id = req.body.id;
    let gstFiles = []
    let panFiles = []
    let bankDetailsFiles = []
    let aadharFiles = []
    let coaLicenseFiles = []
    let otherLicenseFiles = []
    let architectArray = []

    console.log("Data coming from the browser hit -->>>>>", id);
    if (id) {
        ArchitectDetails.find({
            $or: [
                { _id: req.body.id },
                { id: req.body.id }
            ]
        }, async (err, architect) => {
            if (err) {
                res.status(500).send({ message: "The requested data could not be fetched" })
                return;
            }
            else if (architect) {

                // for (const data of architect) {
                //     for (let i = 0; i < data.gstImage.length; i++) {
                //         const key = new URL(data.gstImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.gstImage[i])
                //         gstFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.panImage.length; i++) {
                //         const key = new URL(data.panImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.panImage[i])
                //         panFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.bankDetailsImage.length; i++) {
                //         const key = new URL(data.bankDetailsImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.bankDetailsImage[i])
                //         bankDetailsFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.aadharImage.length; i++) {
                //         const key = new URL(data.aadharImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.aadharImage[i])
                //         aadharFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.coaLicenseImage.length; i++) {
                //         const key = new URL(data.coaLicenseImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.coaLicenseImage[i])
                //         coaLicenseFiles.push(`/files/${fileName}`)
                //     }
                //     for (let i = 0; i < data.otherLicenseImage.length; i++) {
                //         const key = new URL(data.otherLicenseImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.otherLicenseImage[i])
                //         otherLicenseFiles.push(`/files/${fileName}`)
                //     }

                //     architectArray.push({ ...data.toObject(), gstImage: gstFiles, panImage: panFiles, bankDetailsImage: bankDetailsFiles, aadharImage: aadharFiles, coaLicenseImage: coaLicenseFiles, otherLicenseImage: otherLicenseFiles })
                // }

                res.status(200).send({
                    message: "Details feched successfully",
                    data: architect
                })
            }
            else {
                res.status(404).send({
                    message: "Application details not found",
                })
            }

            return;
        })
    } else {
        ArchitectDetails.find({}, async (err, architect) => {
            if (err) {
                res.status(500).send({ message: "The requested data could not be fetched" })
                return;
            }
            else if (architect) {

                // for (const data of architect) {
                //     for (let i = 0; i < data.gstImage.length; i++) {
                //         const key = new URL(data.gstImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.gstImage[i])
                //         gstFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.panImage.length; i++) {
                //         const key = new URL(data.panImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.panImage[i])
                //         panFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.bankDetailsImage.length; i++) {
                //         const key = new URL(data.bankDetailsImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.bankDetailsImage[i])
                //         bankDetailsFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.aadharImage.length; i++) {
                //         const key = new URL(data.aadharImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.aadharImage[i])
                //         aadharFiles.push(`/files/${fileName}`)
                //     }

                //     for (let i = 0; i < data.coaLicenseImage.length; i++) {
                //         const key = new URL(data.coaLicenseImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.coaLicenseImage[i])
                //         coaLicenseFiles.push(`/files/${fileName}`)
                //     }
                //     for (let i = 0; i < data.otherLicenseImage.length; i++) {
                //         const key = new URL(data.otherLicenseImage[i])
                //         const fileName = key.pathname.replace(/[^a-zA-Z0-9. ]/g, "").slice(1)
                //         await addWaterMark(encodeURIComponent(fileName), data.otherLicenseImage[i])
                //         otherLicenseFiles.push(`/files/${fileName}`)
                //     }

                //     architectArray.push({ ...data.toObject(), gstImage: gstFiles, panImage: panFiles, bankDetailsImage: bankDetailsFiles, aadharImage: aadharFiles, coaLicenseImage: coaLicenseFiles, otherLicenseImage: otherLicenseFiles })
                // }

                res.status(200).send({
                    message: "Details feched successfully",
                    data: architect
                })
            }
            else {
                res.status(404).send({
                    message: "Application details not found",
                })
            }

            return;
        })
    }
}
exports.updateArchitectDetails = (req, res) => {
    let gstFiles = []
    let panFiles = []
    let aadharFiles = []
    let bankDetailsFiles = []
    let coaLicenseFiles = []
    let otherLicenseFiles = []

    if (req.files.gstImage) {
        for (let i = 0; i < req.files.gstImage.length; i++) {
            gstFiles.push(req.files.gstImage[i].location)
        }
    }

    if (req.files.panImage) {
        for (let i = 0; i < req.files.panImage.length; i++) {
            panFiles.push(req.files.panImage[i].location)
        }
    }

    if (req.files.aadharImage) {
        for (let i = 0; i < req.files.aadharImage.length; i++) {
            aadharFiles.push(req.files.aadharImage[i].location)
        }
    }

    if (req.files.bankDetailsImage) {
        for (let i = 0; i < req.files.bankDetailsImage.length; i++) {
            bankDetailsFiles.push(req.files.bankDetailsImage[i].location)
        }
    }

    if (req.files.coaLicenseImage) {
        for (let i = 0; i < req.files.coaLicenseImage.length; i++) {
            coaLicenseFiles.push(req.files.coaLicenseImage[i].location)
        }
    }

    if (req.files.otherLicenseImage) {
        for (let i = 0; i < req.files.otherLicenseImage.length; i++) {
            otherLicenseFiles.push(req.files.otherLicenseImage[i].location)
        }
    }

    let dataUpdate = {
        // photo: req?.file?.location || req.body.photo,
        id: req.body.id,
        designation: req.body.designation,
        companyName: req.body.companyName,
        address: req.body.address,
        paymentMethod: req.body.paymentMethod,
        bankDetails: req.body.bankDetails,
        qualification: req.body.qualification,
        servicesOffered: req.body.servicesOffered,
        qualificationDocument: req.body.qualificationDocument,
        dateOfBirth: req.body.dateOfBirth,
        businessContactNumber: req.body.businessContactNumber,
        email: req.body.email,
        serviceLocation: req.body.serviceLocation,
        serviceLocationState: req.body.serviceLocationState,
        serviceLocationCity: req.body.serviceLocationCity,
        yearsOfExperience: req.body.yearsOfExperience,
        yearOfGraduation: req.body.yearOfGraduation,
        approvalStatus: req.body.approvalStatus,
        name: req.body.name
    }

    if (gstFiles.length > 0) {
        dataUpdate["gstImage"] = gstFiles
    }

    if (panFiles.length > 0) {
        dataUpdate["panImage"] = panFiles
    }

    if (aadharFiles.length > 0) {
        dataUpdate["aadharImage"] = aadharFiles
    }

    if (bankDetailsFiles.length > 0) {
        dataUpdate["bankDetailsImage"] = bankDetailsFiles
    }

    if (coaLicenseFiles.length > 0) {
        dataUpdate["coaLicenseImage"] = coaLicenseFiles
    }

    if (otherLicenseFiles.length > 0) {
        dataUpdate["otherLicenseImage"] = otherLicenseFiles
    }

    ArchitectDetails.updateOne({ id: req.body.id }, {
        $set: dataUpdate
    }, { new: true, upsert: true }, (err, updated) => {
        console.log(err, updated)
        if (err) {
            res.status(500).send({ message: "Could not find id to update details" });
            return;
        }
        else if (updated) {
            res.status(200).send({ message: "Updated Successfuly", data: updated });
        }
        else {
            res.status(404).send({ message: "Data is not existed" });
        }
        return;
    });
}

exports.getAllArchitectApplications = (req, res) => {
    ArchitectDetails.find({}, (err, architectApplication) => {
        if (err) {
            res.status(500).send({ message: "There was a problem in getting the list of applications" });
            return;
        };
        res.status(200).send({ message: "List of applications fetched successfuly", data: architectApplication });
        return;
    });
}

exports.getFilterArchitectApplications = (req, res) => {
    const {array} = req.body;
    // console.log(array)
    var final = [];
    array.forEach(elem => {
        console.log(elem)
        let start = elem.split("-")[0];
        let end = elem.split("-")[1];
        for(let i=start; i<=end;i++){
            final.push(parseInt(i));
        }
    });
    // console.log(final)
    ArchitectDetails.find({ "yearsOfExperience": { $in: final } }, (err, architectApplication) => {
        if (err) {
            res.status(500).send({ message: "There was a problem in getting the list of applications" });
            return;
        };
        res.status(200).send({ message: "List of applications fetched successfuly", data: architectApplication });
        return;
    });
}
exports.getDesignsForUser = (req, res) => {
    Designs.find({}, (err, designs) => {
        if (err) {
            res.status(500).send({ message: "There was a problem in fetching the designs!" });
            return;
        }
        res.status(200).send({ message: 'List of design fetched successfully', data: designs });
    })
}
// get static banner images

exports.getBannerImages = (req, res) => {
    let data = [
        "https://images.pexels.com/photos/1216589/pexels-photo-1216589.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "https://images.pexels.com/photos/2590716/pexels-photo-2590716.jpeg?auto=compress&cs=tinysrgb&dpr=1&w=252&fit=crop&h=408",
        "https://images.pexels.com/photos/2219035/pexels-photo-2219035.jpeg?auto=compress&cs=tinysrgb&w=1260&h=750&dpr=1",
        "https://images.pexels.com/photos/1145434/pexels-photo-1145434.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/4170184/pexels-photo-4170184.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/5691606/pexels-photo-5691606.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/2219024/pexels-photo-2219024.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/962889/pexels-photo-962889.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/8961065/pexels-photo-8961065.jpeg?auto=compress&cs=tinysrgb&w=600",
        "https://images.pexels.com/photos/7245366/pexels-photo-7245366.jpeg?auto=compress&cs=tinysrgb&w=600"
    ]
    let list = []
    data.filter((el, id) => {
        let temp = {
            id: id.toString(),
            value: el
        }
        list.push(temp)
        return true
    })
    res.status(200).send({ message: 'List fetched successfully', data: list });
}
exports.uploadImage = (req, res) => {
    res.send({ result: req.body, image: req?.file?.location || req.body.photo })
}
exports.deleteArchitectById = (req, res) => {
    let id = req.params.id;
    console.log(id)
    ArchitectDetails.deleteOne({ _id: id }, (err, architect) => {
        if (err) {
            res
                .status(500)
                .send({ message: "The requested data could not be fetched" });
            return;
        }
        res.status(200).send({
            message: "Architect deleted successfully",
            status: 200,
        });
        return;
    });
};
exports.suspendArchitectById = async (req, res) => {
    let id = req.params.id;
    // console.log(id)
    const updateStatus = await ArchitectDetails.updateOne({ id: id }, { userStatus: "suspend" }, { new: true });
    if (updateStatus.modifiedCount === 1) {
        User.updateOne({ id: id }, { userStatus: "suspend" }, { new: true }, (err, architect) => {
            if (err) {
                res
                    .status(500)
                    .send({ message: "The requested data could not be fetched" });
                return;
            }
            else {
                Designs.updateMany({
                    uploadingUser: id
                }, { userStatus: "suspend" }, { new: true }, (err, architect) => {
                    if (err) {
                        res
                            .status(500)
                            .send({ message: "The requested data could not be fetched" });
                        return;
                    }
                    else {
                        res.status(200).send({
                            message: "Architect suspended successfully",
                            status: 200,
                        });
                    }
                    return;
                });
            }
            return;
        });
    }
    else {
        res
            .status(500)
            .send({ message: "The requested data could not be fetched" });
        return;
    }
}
exports.activeArchitectById = (req, res) => {
    let id = req.params.id;
    ArchitectDetails.updateOne({ id: id }, { userStatus: "active" }, { new: true }, (err, dealer) => {
        if (err) {
            res
                .status(500)
                .send({ message: "The requested data could not be fetched" });
            return;
        }
        else {
            User.updateOne({ id: id }, { userStatus: "active" }, { new: true }, (err, architect) => {
                if (err) {
                    res
                        .status(500)
                        .send({ message: "The requested data could not be fetched" });
                    return;
                }
                else {
                    Designs.updateMany({
                        uploadingUser: id
                    }, { userStatus: "active" }, { new: true }, (err, architect) => {
                        if (err) {
                            res
                                .status(500)
                                .send({ message: "The requested data could not be fetched" });
                            return;
                        }
                        else {
                            res.status(200).send({
                                message: "Architect active successfully",
                                status: 200,
                            });
                        }
                        return;
                    });
                }
                return;
            });
        }
        return;
    });
}
exports.authorizedArchitectById = async(req,res)=>{
    let status = req.body.status;
    let id = req.params.id;
    ArchitectDetails.updateOne({ id: id }, { authorized: status }, { new: true }, (err, dealer) => {
        if (err) {
            res
                .status(500)
                .send({ message: "The requested data could not be fetched" });
            return;
        }
        else {
            res.status(200).send({
                message: `Architect ${status ==="true"?"authorized":"unauthorized"} successfully`,
                status: 200,
            });
            return;
        }
    });
}
