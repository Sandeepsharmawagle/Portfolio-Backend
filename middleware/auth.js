import jwt from 'jsonwebtoken';

export const authMiddleware = (req, res, next) => {
  try {
    // Get token from header or cookie
    const token = req.headers.authorization?.split(' ')[1] || req.cookies?.adminToken;

    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Access denied. No token provided.'
      });
    }

    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.admin = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      status: 'error',
      message: 'Invalid or expired token.'
    });
  }
};
