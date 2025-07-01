module.exports = (req, res, next) => {
  if (!req.session || !req.session.token) {
    return res
      .status(401)
      .send({ message: 'Unauthorized! No active session.' });
  }
  next();
};
