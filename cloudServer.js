require('dotenv').config();
const express = require('express');
const multer = require('multer');
const AWS = require('aws-sdk');
const Jimp = require('jimp');
const fs = require('fs');
const { accessKeyId, secretAccessKey } = require('./app/config/auth.config');
const app = express();
const upload = multer({ dest: 'app/helper/' });

// Configure AWS with your credentials
AWS.config.update({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRETACCESS_KEY,
  region: "us-east-1",
});
// Create an S3 instance
const s3 = new AWS.S3();

// Load the font for adding text
Jimp.loadFont(Jimp.FONT_SANS_64_WHITE).then(async (font) => {
  // Process the uploaded image and add text
  async function processImageAndUploadToS3(file) {
    try {
      // const originalImage = await Jimp.read(file.path);

      // Load the original image
      const originalImage = await Jimp.read(file.path);

      // Create a new image with the same dimensions as the original image
      const backgroundImage = new Jimp(originalImage.getWidth(), originalImage.getHeight(), 0xffffffff); // White background color (0xffffffff)

      const text = 'Hello, ChatGPT!';

      // Calculate the center coordinates for the text
      const textWidth = Jimp.measureText(font, text);
      const textHeight = Jimp.measureTextHeight(font, text, backgroundImage.getWidth());
      const xCenter = Math.floor((backgroundImage.getWidth() - textWidth) / 2);
      const yCenter = Math.floor((backgroundImage.getHeight() - textHeight) / 2);

      // Add text to the background image at the center
      backgroundImage.print(font, xCenter, yCenter, text);

      // Composite the original image on top of the background image
      backgroundImage.composite(originalImage, 0, 0);

      // Convert the processed image to a buffer
      const buffer = await backgroundImage.getBufferAsync(Jimp.MIME_JPEG);

      // Define the S3 upload parameters
      const params = {
        Bucket: 'thekedar-bucket',
        Key: `app/helper/${file.originalname}/${new Date().getTime()}`, // Change the key as per your requirement
        Body: buffer,
        ContentType: file.mimetype,
        ACL: 'public-read',
      };

      // Upload the processed image to S3
      const uploadedObject = await s3.upload(params).promise();

      // Delete the temporary file after upload
      fs.unlinkSync(file.path);

      return uploadedObject.Location;
    } catch (err) {
      console.error('Error processing and uploading image:', err);
      throw err;
    }
  }

  // Route for handling image upload
  app.post('/upload', upload.single('image'), async (req, res) => {
    if (!req.file) {
      return res.status(400).send('No image uploaded.');
    }
    try {
      const uploadedImageUrl = await processImageAndUploadToS3(req.file);
      return res.send(`${uploadedImageUrl}`);
    } catch (err) {
      return res.status(500).send('Failed to upload image.');
    }
  });

  // Start the server
  const PORT = 3000;
  app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
  });
}).catch((err) => {
  console.error('Error loading font:', err);
});