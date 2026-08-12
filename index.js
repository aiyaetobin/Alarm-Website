const express = require('express');
const bcryptjs = require('bcryptjs');
const pool = require('./src/db');

const app = express();

app.use(express.json());
app.use(express.static('public'));

app.post('/signup', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;

  console.log('Signup attempt:', username);
  res.json({ message: 'got your data' });
});

app.listen(3000, () => {
  console.log('Server is running on port 3000');
});