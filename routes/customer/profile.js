const express = require('express');
const router = express.Router();
const db = require('../../db'); // Adjust path as needed
const authMiddleware = require('../../middleware/customerAuth'); // Protect dashboard

// GET: Customer dashboard
router.get('/dashboard', authMiddleware, (req, res) => {
  const email = req.session.customer_email;

  const customerQuery = `SELECT * FROM custlogin WHERE email = ?`;
  const statesQuery = `SELECT * FROM state`;

  db.query(customerQuery, [email], (err, customerResult) => {
    if (err) return res.status(500).send('Database error (customer).');

    if (!customerResult.length) return res.redirect('/');

    db.query(statesQuery, (err, statesResult) => {
      if (err) return res.status(500).send('Database error (states).');

      res.render('customer/dashboard', {
        customer: customerResult[0],
        states: statesResult,
      });
    });
  });
});

// POST /customer/login
router.post('/login', (req, res) => {
  const email = req.body.cust_email?.trim().toLowerCase();
  const password = req.body.cust_password?.trim();

  console.log('Logging in with:', email, password); // Now this will print correctly

  const query = 'SELECT * FROM custlogin WHERE LOWER(email) = ? AND password = ?';
  db.query(query, [email, password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.render('customer/login', { error: 'Something went wrong' });
    }

    if (results.length === 1) {
      req.session.customer_email = email;
      res.redirect('/customer/dashboard');
    } else {
      res.render('customer/login', { error: 'Invalid email or password' });
    }
  });
});




// POST: Handle profile update
router.post('/update-profile', authMiddleware, (req, res) => {
  const {
    id,
    name,
    mobile,
    state,
    district,
    address,
    pincode,
    pass
  } = req.body;

  const stateQuery = `SELECT StateName FROM state WHERE StCode = ?`;
  db.query(stateQuery, [state], (err, stateResult) => {
    if (err) return res.status(500).send('State lookup failed');

    const stateName = stateResult.length ? stateResult[0].StateName : '';

    const updateQuery = `
      UPDATE custlogin SET
        cust_name = ?,
        phone_no = ?,
        state = ?,
        district = ?,
        address = ?,
        pincode = ?,
        password = ?
      WHERE cust_id = ?
    `;

    const values = [name, mobile, stateName, district, address, pincode, pass, id];

    db.query(updateQuery, values, (err) => {
      if (err) return res.status(500).send('Update failed');

      res.redirect('/customer/dashboard');
    });
  });
});

// POST: Fetch district list by state (AJAX)
router.post('/get-district', (req, res) => {
  const { state_id } = req.body;
  const query = `SELECT DistrictName FROM district WHERE StCode = ?`;

  db.query(query, [state_id], (err, results) => {
    if (err) return res.status(500).send('Error fetching districts');

    let html = '';
    results.forEach(row => {
      html += `<option value="${row.DistrictName}">${row.DistrictName}</option>`;
    });

    res.send(html);
  });
});

module.exports = router;
