const { type } = require("@testing-library/user-event/dist/type");
const mongoose = require("mongoose");

const projectMaterialModel = mongoose.model(
  "projectMaterialsRequest",
  new mongoose.Schema(
    {
      siteID: String,
      requestUser: String,
      itemName: String,
      itemQuantity: {
        requestQuantity: String,
        approvalQuantity: String,
      },
      purpose: String,
      priority: String,
      requestDate: String,
      projectManager: {
        approval: {
          type: String,
          default: "Pending",
        },
        approvalDate: {
          type: String,
          default: "",
        },
      },
      operation: {
        vendor: {
          type: String,
          default: "",
        },
        brand: {
          type: String,
          default: "",
        },
        rate: {
          type: String,
          default: "",
        },
        amount: {
          type: String,
          default: "",
        },
        remark: {
          type: String,
          default: "",
        },
      },
      admin: {
        approval: {
          type: String,
          default: "Pending",
        },
        approvalDate: {
          type: String,
          default: "",
        },
      },
      order: {
        orderPlacedBy: {
          type: String,
          default: "",
        },
        orderDate: {
          type: String,
          default: "",
        },
        expectedDeliveryDate: {
          type: String,
          default: "",
        },
        vendor: {
          type: String,
          default: "",
        },
        brand: {
          type: String,
          default: "",
        },
        quantity: {
          type: String,
          default: "",
        },
        rate: {
          type: String,
          default: "",
        },
        amount: {
          type: String,
          default: "",
        },
        invoice: {
          type: String,
          default: "",
        },
        deliveryStatusByAdmin: {
          type: String,
          default: "Pending",
        },
      },
      materialDelivered: {
        quantity: {
          type: String,
          default: "",
        },
        deliveredDate: {
          type: String,
          default: "",
        },
      },
      productDetails:{}
    },
    { timestamps: true }
  )
);

module.exports = projectMaterialModel;
