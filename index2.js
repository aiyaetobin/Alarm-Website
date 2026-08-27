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
app.use((req, res, next) => { //session is added to the session object later
    //
    const sessionId = req.cookies.userId;
    if (sesssionId && sessions[sessionId])
    {
        req.userId = sessions[sessionId].userId;
    }
    next();
});

//login 
app.post('/login', async (req, res) => {
    const password = req.body.password;
    const username = req.body.username;
try {
     const result = await pool.query(
        'SELECT id, password FROM users WHERE username = $1',
        [username]
    );
    const user = result.rows(0);
    
    if(result.rows.length() == 0){
        return res.status(401).json({message: 'account not found sign up'});
    }
    
    const passwordMatch = bcrypt.compareSync(password, user.password);

    if(passwordMatch){
        const sessionNum = 
        sessions[user.id] = 
    }

}catch (error) {
    res.status(400);
}




})

//signup 
app.post('/signup', async (req, res) => {
    const password = req.body.password;
    const username = req.body.username;
    try {
        const hashedPassword = bcrypt.hashSync(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES($1, $2) RETURNING id',
            [username, password]
        );

        res.json({message: 'sign up successful', userId: result.rows[0].id});

    } catch (error) {
        res.status(400).json({error: error.message});
    }


})

const PORT = process.env.PORT || 3000;
app.listen(PORT);

