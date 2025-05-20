require('dotenv').config();
const watermark = require("jimp-watermark");
const PDFWatermark = require("pdf-watermark");
const fs = require("fs");
var AWS = require("aws-sdk");
const { accessKeyId, secretAccessKey } = require("../config/auth.config");

AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRETACCESS_KEY,
});

var s3 = new AWS.S3();

const addWaterMark = async (file, originalUrl) => {
  //   console.log(watermarkImagePath)
  const fileName = `./files/${file}`;
  const exists = fs.existsSync(fileName);
  if (exists) {
    // console.log("File already exists");
    return "File already exists";
  } else {
    if (fileName.match(/jpg|jpeg|png|gif|webp/)) {
      const options = {
        ratio: 0.5, // Should be less than one
        opacity: 0.4, //Should be less than one
        dstPath: fileName, //Path of destination image file
        position: "top-left", //Should be 'top-left', 'top-center', 'top-right', 'center-left', 'center', 'center-right', 'bottom-left', 'bottom-center', 'bottom-right'
      };
      const data = await watermark.addWatermark(
        originalUrl,
        "app/helper/thikedaar_logo.png",
        options
      );
      //   console.log("watermark function response-", data);
      return data.destinationPath;
    } else {
      const params = { Bucket: "thekedar-bucket", Key: fileName };
      const file = fs.createWriteStream(fileName);
      await s3.getObject(params).createReadStream().pipe(file);

      file.on("close", async () => {
        const options = {
          pdf_path: fileName,
          dstPath: fileName,
        };
        await PDFWatermark(options);
        return "PDF watermark done";
      });
    }
  }
};

module.exports = addWaterMark;
