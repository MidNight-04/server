const config = require("../config/auth.config");
const db = require("../models");
const PaytmChecksum = require("../helper/PaytmChecksum");
const EnquiryForm = db.enquiryForm;
const Payment = db.projectPaymentDetails;
const axios = require("axios");


// initiate payment
exports.initiatePayment = (req, res) => {
    const {siteID,clientID,stage,amount, callbackUrl, currency } = req.body;
  
    // Sandbox Credentials
    let mid = "WBJIwm08119302462954"; // Merchant ID
    let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key
    var paytmParams = {};
  
    paytmParams.body = {
      requestType: "Payment",
      mid: mid,
      websiteName: "DEFAULT",
    //   orderId: orderId,
      callbackUrl: callbackUrl,
      txnAmount: {
        value: amount,
        currency: currency,
      },
      userInfo: {
        custId: clientID,
      },
    };
  
    /*
     * Generate checksum by parameters we have in body
     * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
     */
    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
      function (checksum) {
        console.log(checksum);
  
        paytmParams.head = {
          signature: checksum,
        };
  
        var post_data = JSON.stringify(paytmParams);
  
        let data = post_data;
  
        let config = {
          method: "post",
          maxBodyLength: Infinity,
          url: `https://securegw.paytm.in/theia/api/v1/initiateTransaction?mid=${mid}&orderId=${orderId}`,
          headers: {
            "Content-Type": "application/json",
          },
          data: data,
        };
  
        axios
          .request(config)
          .then((response) => {
            res.status(200).send({ data: response.data });
            return;
          })
          .catch((error) => {
            console.log(error);
          });
      }
    );
  };
  
  // verify payment
  exports.verifyPayment = (req, res) => {
    const {
      vendorId,
      userId,
      comment,
      orderId,
      contactType,
      productDetail,
      address,
      paymentType,
    } = req.body;
    // console.log(req.body);
    // Sandbox Credentials
    let mid = "WBJIwm08119302462954"; // Merchant ID
    let mkey = "Ipb3#Bx%3RdHmr#M"; // Merchant Key
  
    /* initialize an object */
    var paytmParams = {};
  
    /* body parameters */
    paytmParams.body = {
      /* Find your MID in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys */
      mid: mid,
  
      /* Enter your order id which needs to be check status for */
      orderId: orderId,
    };
  
    /**
     * Generate checksum by parameters we have in body
     * Find your Merchant Key in your Paytm Dashboard at https://dashboard.paytm.com/next/apikeys
     */
    PaytmChecksum.generateSignature(JSON.stringify(paytmParams.body), mkey).then(
      function (checksum) {
        /* head parameters */
        paytmParams.head = {
          /* put generated checksum value here */
          signature: checksum,
        };
  
        /* prepare JSON string for request */
        var post_data = JSON.stringify(paytmParams);
  
        let data = post_data;
  
        let config = {
          method: "post",
          maxBodyLength: Infinity,
          url: `https://securegw.paytm.in/v3/order/status`,
          headers: {
            "Content-Type": "application/json",
          },
          data: data,
        };
  
        axios
          .request(config)
          .then((response) => {
            const query = {
              vendorId,
              userId,
              address:address,
              comment,
              contactType,
              paymentType,
              paymentInformation: response.data,
              approvalStatus:
                response.data.body.resultInfo.resultStatus == "TXN_FAILURE"?"Pending":"Order Confirmed",
              productDetail,
              otp: Math.floor(Math.random() * 100000) + 1,
            };
  
            if (
              contactType == "Material Purchase"
            ) {
              const saveOrder = new Payment(query);
              saveOrder.save((err, orderSaved) => {
                // console.log(err, orderSaved);
                if (err) {
                  res.status(500).send({ message: err });
                  return;
                }
                if (orderSaved) {
                  res.send({
                    message: "Payment Done Successfully",
                    data: orderSaved,
                  });
                }
                return;
              });
            } else {
              const saveEnquiry = new EnquiryForm(query);
              saveEnquiry.save((err, enquirySaved) => {
                // console.log(err, enquirySaved);
                if (err) {
                  res.status(500).send({ message: err });
                  return;
                }
                if (enquirySaved) {
                  res.status(200).send({
                    message:
                      "Order sent successfully! You will be contacted soon",
                    data: enquirySaved,
                  });
                }
                return;
              });
            }
          })
          .catch((error) => {
            console.log(error);
          });
      }
    );
  };
  