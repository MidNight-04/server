const awsS3 = require('../middlewares/aws-s3');

exports.uploadToS3AndExtractUrls = async (
  files = [],
  folder = 'taskComments'
) => {
  if (!files || files.length === 0) return [];
  const uploaded = await awsS3.uploadFiles(files, folder);
  return uploaded.map(
    file => `https://thekedar-bucket.s3.us-east-1.amazonaws.com/${file.s3key}`
  );
};

