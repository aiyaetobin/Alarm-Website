const express = require('express');
const stripe = require('stripe', process.env.STRIPE_SECRET_KEY);
const pool = require('src/dv');
const cookieParser = require('cookie-parser');
const bcryptjs = require('bcryptjs');

const app = express();
const sessions = {};

app.use(express.static('public'));
app.use(express.json());
//custom middleware
app.use((req,res,next) => { //session is added to the session object later
    

})