export const adminMiddleware = (req, res, next) => {
  if (!req.user || req.user.role !== 'admin' || req.user.email !== 'hiral2005gajjar@gmail.com') {
    return res.status(403).json({ error: 'Access denied. Administrator privileges required.' });
  }
  next();
};
