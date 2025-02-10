const validateRequest = (req, res, next) => {
  const {
    serviceLocationState,
    serviceLocationCity,
    category,
    name,
    unit,
    minQuantity,
    maxQuantity,
    price,
    descriptionOne,
    productCommission,
    role,
  } = req.body;
  console.log(role)
  if (!serviceLocationState) {
    return res.status(400).json({ error: "Service State is required" });
  } else if (!serviceLocationCity) {
    return res.status(400).json({ error: "Service city is required" });
  } else if (!category) {
    return res.status(400).json({ error: "Product category is required" });
  } else if (!name) {
    return res.status(400).json({ error: "Product name is required" });
  } else if (!req.files.productImage) {
    return res.status(400).json({ error: "Product image is required" });
  } else if (!unit) {
    return res.status(400).json({ error: "Product unit is required" });
  }
  else if (!minQuantity) {
    return res
      .status(400)
      .json({ error: "Product minimum quantity is required" });
  } else if (!maxQuantity) {
    return res
      .status(400)
      .json({ error: "Product maximum quantity is required" });
  } else if (!price) {
    return res.status(400).json({ error: "Product price is required" });
  } else if (!descriptionOne) {
    return res.status(400).json({ error: "Description one  is required" });
  } else {
    next();
  }
};
module.exports = validateRequest;
