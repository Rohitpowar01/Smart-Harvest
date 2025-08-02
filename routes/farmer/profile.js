const express = require('express');
const router = express.Router();
const db = require('../../db');
const ensureFarmerLoggedIn = require('../../middleware/farmerAuth');

router.get('/dashboard', ensureFarmerLoggedIn, (req, res) => {
  const farmerEmail = req.session.farmer_login_user;

  const sql = 'SELECT * FROM farmerlogin WHERE email = ?';
  db.query(sql, [farmerEmail], (err, farmerResults) => {
    if (err || farmerResults.length === 0) {
      console.error('Error fetching farmer data:', err);
      return res.status(500).send('Something went wrong');
    }

    // Fetch states for dropdown
    db.query('SELECT * FROM state', (stateErr, stateResults) => {
      if (stateErr) {
        console.error('Error fetching states:', stateErr);
        return res.status(500).send('Failed to load states');
      }

      const farmer = farmerResults[0];
      res.render('farmer/dashboard', {
        farmer,
        states: stateResults,
        current: 'dashboard' // <-- added so navbar knows active tab
      });
    });
  });
});

module.exports = router;
