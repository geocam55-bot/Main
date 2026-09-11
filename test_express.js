const express = require('express');
const app = express();
app.get('/api/products/:id/competitive-pricing', (req, res) => res.json({id: req.params.id}));
app.get('*all', (req, res) => res.send('<!doctype html>fallback'));
app.listen(3001, () => console.log('started'));
