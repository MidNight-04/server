require('dotenv').config();
const jwt = require('jsonwebtoken');
const db = require('../models');
const User = db.user;

const verifyToken = async (req, res, next) => {
  let token =
    req.session?.token ||
    req.headers['x-access-token'] ||
    req.headers.authorization;

  if (!token) {
    return res.status(403).send({ message: 'No token provided!' });
  }

  if (token.startsWith('Bearer ')) {
    token = token.slice(7, token.length);
  }

  try {
    const decoded = jwt.verify(token, process.env.SESSION_SECRET);
    req.userId = decoded.id;
    next();
  } catch (err) {
    console.log(err);
    return res.status(401).send({ message: err.message });
  }
};

const checkRole = roleName => async (req, res, next) => {
  try {
    const user = await User.findById(req.userId).populate('roles');

    if (!user) {
      return res.status(404).send({ message: 'User not found!' });
    }

    if (!user.roles || user.roles.name !== roleName) {
      return res.status(403).send({ message: `Require ${roleName} Role!` });
    }

    next();
  } catch (err) {
    res.status(500).send({ message: 'Internal error', error: err.message });
  }
};

function checkRoles({ allow = [], deny = [] } = {}) {
  const normalize = r => r.toLowerCase();
  const allowNorm = allow.map(normalize);
  const denyNorm = deny.map(normalize);

  return async (req, res, next) => {
    try {
      const user = await User.findById(req.userId).populate('roles');
      if (!user) {
        return res.status(404).json({ message: 'User not found!' });
      }

      const userRole = normalize(user.roles?.name || '');
      if (!userRole) {
        return res.status(403).json({ message: 'Role not assigned!' });
      }

      if (denyNorm.includes(userRole)) {
        return res
          .status(403)
          .json({ message: `Access denied for role: ${user.roles.name}` });
      }

      if (allowNorm.length && !allowNorm.includes(userRole)) {
        return res.status(403).json({
          message: `Only these roles can access: ${allow.join(', ')}`,
        });
      }

      req.userRoles = user.roles.name;
      next();
    } catch (err) {
      res.status(500).json({ message: 'Internal error', error: err.message });
    }
  };
}

const SECRET = process.env.SESSION_SECRET;

const signToken = payload => {
  return jwt.sign(payload, SECRET, { expiresIn: '7d' });
};

const verifyTkn = token => {
  return jwt.verify(token, SECRET);
};

const authJwt = {
  verifyToken,
  signToken,
  verifyTkn,
  isAdmin: checkRole('admin'),
  isModerator: checkRole('dealer'),
  isUser: checkRole('user'),
  isClient: checkRole('client'),
  isManager: checkRole('Manager'),
  isSiteAdmin: checkRole('Site Admin'),
  isSrEngineer: checkRole('Sr. Engineer'),
  isOperations: checkRole('Operations'),
  isSrArchitect: checkRole('Sr. Architect'),
  isSales: checkRole('Sales'),
  isCEO: checkRole('CEO'),
  isHR: checkRole('HR'),
  isAccountant: checkRole('Accountant'),
  isSiteSupervisor: checkRole('Site Supervisor'),
  isArchitect: checkRole('Architect'),
  isSiteEngineer: checkRole('Site Engineer'),
  isSenior: checkRoles({
    allow: [
      'CEO',
      'admin',
      'Project Admin',
      'Site Admin',
      'Manager',
      'Sr. Engineer',
      'Operations',
      'Sr. Architect',
      'Site Supervisor',
    ],
    deny: [
      'user',
      'Client',
      'Accountant',
      'Site Engineer',
      'Sales',
      'HR',
      'Architect',
    ],
  }),
  canCreate: checkRoles({
    allow: ['CEO', 'admin', 'Project Admin', 'Operations', 'Sales'],
    deny: ['user', 'Client', 'Accountant', 'Site Engineer', 'HR', 'Architect'],
  }),
};

module.exports = authJwt;
