// middleware/customerAuth.js
module.exports = function (req, res, next) {
  if (req.session.customer_email) {
    next();
  } else {
    res.redirect('/'); // Redirects if not logged in
  }
};
