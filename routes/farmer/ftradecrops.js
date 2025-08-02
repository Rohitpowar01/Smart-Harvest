// routes/farmer/trade.js
const express = require('express');
const router = express.Router();
const db = require('../../db');
const ensureFarmerLoggedIn = require('../../middleware/farmerAuth');

// Helper: get MRP per kg using provided connection
function getMrpKg(conn, crop, callback) {
  const sql = 'SELECT mrp_kg FROM production_approx WHERE crop = ?';
  conn.query(sql, [crop], (err, results) => {
    if (err) return callback(err);
    const mrpKg = results.length > 0 ? parseFloat(results[0].mrp_kg) : null;
    callback(null, mrpKg);
  });
}

// GET /farmer/ftradecrops
router.get('/', ensureFarmerLoggedIn, (req, res) => {
  const farmerEmail = req.session.farmer_login_user;
  if (!farmerEmail) return res.redirect('/farmer/login');

  db.query('SELECT * FROM farmerlogin WHERE email = ?', [farmerEmail], (err, farmerResults) => {
    if (err || farmerResults.length === 0) {
      console.error('Error fetching farmer data:', err);
      return res.status(500).send('Something went wrong');
    }

    const farmer = farmerResults[0];
    res.render('farmer/ftradecrops', {
      farmer,
      success: req.query.success || null,
      error: req.query.error || null,
      current: 'trade'
    });
  });
});

// POST /farmer/ftradecrops
router.post('/', ensureFarmerLoggedIn, (req, res) => {
  const { crops, trade_farmer_cropquantity, trade_farmer_cost } = req.body;
  const farmerEmail = req.session.farmer_login_user;
  if (!farmerEmail) return res.redirect('/farmer/login');

  db.getConnection((connErr, conn) => {
    if (connErr) {
      console.error('Connection error:', connErr);
      return res.redirect('/farmer/ftradecrops?error=connection_failed');
    }

    conn.query('SELECT farmer_id FROM farmerlogin WHERE email = ?', [farmerEmail], (err, farmerResults) => {
      if (err || farmerResults.length === 0) {
        console.error('Error fetching farmer:', err);
        conn.release();
        return res.redirect('/farmer/ftradecrops?error=farmer_not_found');
      }

      const farmerId = farmerResults[0].farmer_id;
      const quantity = parseFloat(trade_farmer_cropquantity);
      const costPerKg = parseFloat(trade_farmer_cost);

      if (isNaN(quantity) || isNaN(costPerKg) || quantity < 100) {
        conn.release();
        return res.redirect('/farmer/ftradecrops?error=invalid_input');
      }

      getMrpKg(conn, crops, (err, mrpKg) => {
        if (err) {
          console.error('Error fetching MRP:', err);
          conn.release();
          return res.redirect('/farmer/ftradecrops?error=mrp_fetch_failed');
        }
        if (mrpKg === null) {
          conn.release();
          return res.redirect('/farmer/ftradecrops?error=crop_not_found');
        }

        const msp = costPerKg + costPerKg * 0.5;
        if (msp > mrpKg) {
          conn.release();
          return res.redirect('/farmer/ftradecrops?error=cost_exceeds_market_price');
        }

        conn.beginTransaction((txErr) => {
          if (txErr) {
            console.error('Transaction start error:', txErr);
            conn.release();
            return res.redirect('/farmer/ftradecrops?error=transaction_failed');
          }

          const insertTradeSql = `
            INSERT INTO farmer_crops_trade
              (farmer_fkid, Trade_crop, Crop_quantity, costperkg, msp)
            VALUES (?, ?, ?, ?, ?)
          `;
          conn.query(insertTradeSql, [farmerId, crops, quantity, costPerKg, msp], (err) => {
            if (err) {
              return conn.rollback(() => {
                console.error('Insert trade error:', err);
                conn.release();
                res.redirect('/farmer/ftradecrops?error=insert_failed');
              });
            }

            const updateProdSql = `
              UPDATE production_approx
              SET quantity = quantity + ?
              WHERE crop = ?
            `;
            conn.query(updateProdSql, [quantity, crops], (err) => {
              if (err) {
                return conn.rollback(() => {
                  console.error('Update production error:', err);
                  conn.release();
                  res.redirect('/farmer/ftradecrops?error=update_failed');
                });
              }

              const insertHistorySql = `
                INSERT INTO farmer_history
                  (farmer_id, farmer_crop, farmer_quantity, farmer_price, date, Status)
                VALUES (?, ?, ?, ?, NOW(), 'order pending')
              `;
              conn.query(insertHistorySql, [farmerId, crops, quantity, costPerKg], (err) => {
                if (err) {
                  return conn.rollback(() => {
                    console.error('Insert history error:', err);
                    conn.release();
                    res.redirect('/farmer/ftradecrops?error=history_failed');
                  });
                }

                conn.commit((err) => {
                  if (err) {
                    return conn.rollback(() => {
                      console.error('Commit error:', err);
                      conn.release();
                      res.redirect('/farmer/ftradecrops?error=commit_failed');
                    });
                  }

                  conn.release();
                  res.redirect('/farmer/ftradecrops?success=crop_added');
                });
              });
            });
          });
        });
      });
    });
  });
});

// POST /farmer/ftradecrops/price
router.post('/price', ensureFarmerLoggedIn, (req, res) => {
  const { crops } = req.body;
  if (!crops) return res.status(400).send('Crop required');

  db.query('SELECT mrp_kg FROM production_approx WHERE crop = ?', [crops], (err, results) => {
    if (err) {
      console.error('Error fetching price:', err);
      return res.status(500).send('Error fetching price');
    }
    const mrpKg = results.length > 0 ? results[0].mrp_kg : '0';
    res.send(mrpKg.toString());
  });
});

module.exports = router;
