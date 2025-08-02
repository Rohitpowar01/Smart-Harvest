// middleware/farmerAuth.js
module.exports = function ensureFarmerLoggedIn(req, res, next) {
  if (req.session.farmer_login_user) {
    return next();
  } else {
    return res.redirect('/farmer/login');
  }
};
