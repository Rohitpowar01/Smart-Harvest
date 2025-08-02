// Basic Express App Skeleton for Smart Harvest
const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const session = require('express-session');
const db = require('./db'); // Ensure this path is correct
const app = express();
const port = 3000;
const farmerProfileRoutes = require('./routes/farmer/profile');
const customerProfileRoutes = require('./routes/customer/profile');
const farmerTradeRoutes = require('./routes/farmer/ftradecrops');

// Set up EJS as the templating engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// Middleware
app.use(express.static(path.join(__dirname, 'public')));
app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
    secret: 'smart_harvest_secret',
    resave: false,
    saveUninitialized: true
}));


// Routes

app.use('/farmer', farmerProfileRoutes);

app.use('/customer', customerProfileRoutes);
app.use('/farmer/ftradecrops', farmerTradeRoutes);

// Home Page
app.get('/', (req, res) => {
    res.render('index');
});

// Contact Page
// app.get('/contact', (req, res) => {
//     res.render('contact');
// });

// app.post('/contact', (req, res) => {
//     const { name, email, message } = req.body;
//     // Save or email logic here
//     res.send('Contact form submitted successfully');
// });

// Admin Login
// GET admin login page
app.get('/admin/login', (req, res) => {
  res.render('admin/login', { error: null });
});

// POST admin login
app.post('/admin/login', (req, res) => {
  const { admin_name, admin_password } = req.body;

  const sql = 'SELECT * FROM admin WHERE admin_name = ? AND admin_password = ?';
  db.query(sql, [admin_name, admin_password], (err, results) => {
    if (err) {
      console.error('Admin login error:', err);
      return res.render('admin/login', { error: 'Something went wrong. Try again.' });
    }

    if (results.length === 1) {
      // Login successful — redirect or set session
      // res.redirect('/admin/dashboard');
      res.send('Admin login successful'); // Placeholder response
    } else {
      res.render('admin/login', { error: 'Invalid ID or password' });
    }
  });
});


// Farmer Registration (GET)
app.get('/farmer/register', (req, res) => {
    const sql = 'SELECT StCode, StateName FROM state';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching states:', err);
            return res.render('farmer/register', { states: [], error: 'Unable to load states' });
        }
        res.render('farmer/register', { states: results, error: null });
    });
});

// Farmer Registration (POST)
app.post('/farmer/register', (req, res) => {
  const {
    name,
    email,
    mobile,
    gender,
    dob,
    bank_nm,
    ifsc_cd,
    acct_num,
    state,
    district,
    city,
    password
  } = req.body;

  const sql = `INSERT INTO farmerlogin 
    (farmer_name, password, email, phone_no, F_gender, F_birthday, F_State, F_District, F_Location, bank_nm, ifsc_cd, acct_num)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

  const values = [
    name,
    password,
    email,
    mobile,
    gender,
    dob,
    state,
    district,
    city,
    bank_nm,
    ifsc_cd,
    acct_num
  ];

  db.query(sql, values, (err, result) => {
    if (err) {
      console.error('Farmer registration error:', err);
      return res.status(500).send('Something went wrong during registration');
    }
    req.session.farmer_login_user = email; // Store session!
    res.redirect('/farmer/dashboard');
  });
});


app.post('/farmer/get-district', (req, res) => {
  const { state_id } = req.body;
  const sql = 'SELECT DistCode, DistrictName FROM district WHERE StCode = ?';
  db.query(sql, [state_id], (err, results) => {
    if (err) {
      console.error('Error fetching districts:', err);
      return res.status(500).send('Failed to load districts');
    }
    let options = '<option value="">Select District</option>';
    results.forEach(row => {
      options += `<option value="${row.DistrictName}">${row.DistrictName}</option>`;
    });
    res.send(options);
  });
});

//Farmer Login
// GET farmer login
app.get('/farmer/login', (req, res) => {
  res.render('farmer/login', { error: null });
});

// POST farmer login
app.post('/farmer/login', (req, res) => {
  const { farmer_email, farmer_password } = req.body;

  const sql = 'SELECT * FROM farmerlogin WHERE email = ? AND password = ?';
  db.query(sql, [farmer_email, farmer_password], (err, results) => {
    if (err) {
      console.error('Login error:', err);
      return res.render('farmer/login', { error: 'Something went wrong. Try again.' });
    }

    if (results.length === 1) {
      req.session.farmer_login_user = farmer_email; // Store session!
      res.redirect('/farmer/dashboard');
    } else {
      res.render('farmer/login', { error: 'Invalid email or password' });
    }
  });
});

//Customer Registration (GET)
app.get('/customer/register', (req, res) => {
    const sql = 'SELECT StCode, StateName FROM state';
    db.query(sql, (err, results) => {
        if (err) {
            console.error('Error fetching states:', err);
            return res.render('customer/register', { states: [], error: 'Unable to load states' });
        }
        res.render('customer/register', { states: results, error: null });
    });
});

// Customer Registration (POST)
app.post('/customer/register', (req, res) => {
  const {
    name,
    email,
    mobile,
    password,
    confirmpassword,
    state,
    district,
    address,
    pincode
  } = req.body;

  // Check password match
  if (password !== confirmpassword) {
    return res.render('customer/register', { states: [], error: 'Passwords do not match' });
  }

  const insertSql = `
    INSERT INTO custlogin 
    (cust_name, password, email, phone_no, state, district, address, pincode) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
    name,
    password,
    email,
    mobile,
    state,
    district,
    address,
    pincode
  ];

  db.query(insertSql, values, (err, result) => {
    if (err) {
      console.error('Customer registration error:', err);
      return res.status(500).send('Something went wrong during registration');
    }
    // res.send('Customer registered successfully');
    req.session.customer_email = email;
    res.redirect('/customer/dashboard');
  });
});

app.post('/customer/get-district', (req, res) => {
  const { state_id } = req.body;
  const sql = 'SELECT DistCode, DistrictName FROM district WHERE StCode = ?';
  db.query(sql, [state_id], (err, results) => {
    if (err) {
      console.error('Error fetching districts:', err);
      return res.status(500).send('Failed to load districts');
    }
    let options = '<option value="">Select District</option>';
    results.forEach(row => {
      options += `<option value="${row.DistrictName}">${row.DistrictName}</option>`;
    });
    res.send(options);
  });
});

// Customer Login
// GET customer login page
app.get('/customer/login', (req, res) => {
  res.render('customer/login', { error: null });
});

// POST customer login
app.post('/customer/login', (req, res) => {
  const { cust_email, cust_password } = req.body;

  const sql = 'SELECT * FROM custlogin WHERE email = ? AND password = ?';
  db.query(sql, [cust_email, cust_password], (err, results) => {
    if (err) {
      console.error('Customer login error:', err);
      return res.render('customer/login', { error: 'Something went wrong. Try again.' });
    }

    if (results.length === 1) {
      //  Set session
      req.session.customer_email = cust_email;

      //  Optional: log it for debugging
      console.log('Login successful:', cust_email);

      res.redirect('/customer/dashboard');
    } else {
      res.render('customer/login', { error: 'Invalid email or password' });
    }
  });
});

// Start Server
app.listen(port, () => {
    console.log(`Smart Harvest app listening at http://localhost:${port}`);
});