const jwt = require("jsonwebtoken");
const User = require("../models/User");


const protect = async (req, res, next) => {
  let token;

  if (req.headers.authorization && req.headers.authorization.startsWith("Bearer ")) {
    token = req.headers.authorization.split(" ")[1];
  }

  if (!token) {
    return res.status(401).json({ message: "Not authorised — no token provided" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    req.user = {
      id:   decoded.id,
      role: decoded.role,
      name: decoded.name,
    };

    next();
  } catch (error) {
    return res.status(401).json({ message: "Not authorised — token is invalid or expired" });
  }
};

const authoriseRoles = (...roles) => {
  return (req, res, next) => {
    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `Access denied — role '${req.user.role}' is not permitted`,
      });
    }
    next();
  };
};

module.exports = { protect, authoriseRoles };