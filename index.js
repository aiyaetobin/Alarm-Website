const express = require('express');
const bcryptjs = require('bcryptjs');
const pool = require('./src/db');
const cookieParser = require('cookie-parser');

const sessions = {};

const app = express();

const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);

app.use(express.json());
app.use(cookieParser());
app.use(express.static('public'));

app.use((req, res, next) =>
{
    const sessionId = req.cookies.sessionId;

    if (sessionId && sessions[sessionId])
    {
        req.userId = sessions[sessionId].userId;
    }

    next();
});

app.post('/login', async (req, res) =>
{
    const username = req.body.username;
    const password = req.body.password;

    try
    {
        const result = await pool.query(
            'SELECT id, password FROM users WHERE username = $1',
            [username]
        );

        if (result.rows.length === 0)
        {
            return res.status(401).json({ error: 'Username not found' });
        }

        const user = result.rows[0];
        const passwordMatch = await bcryptjs.compare(password, user.password);

        if (passwordMatch)
        {
            const sessionId = Math.random().toString(36).substring(2, 15);
            sessions[sessionId] = { userId: user.id };

            res.cookie('sessionId', sessionId, { httpOnly: true });
            res.json({ message: 'Login successful', userId: user.id });
        } else
        {
            res.status(401).json({ error: 'Wrong password' });
        }
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.post('/signup', async (req, res) =>
{
    const username = req.body.username;
    const password = req.body.password;

    try
    {
        const hashedPassword = await bcryptjs.hash(password, 10);

        const result = await pool.query(
            'INSERT INTO users (username, password) VALUES ($1, $2) RETURNING id',
            [username, hashedPassword]
        );

        res.json({ message: 'Signup successful', userId: result.rows[0].id });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.get('/me', (req, res) =>
{
    if (req.userId)
    {
        res.json({ message: 'you are logged in', userId: req.userId });
    } else
    {
        res.status(401).json({ error: 'not logged in' });
    }
});

app.post('/logout', (req, res) =>
{
    const sessionId = req.cookies.sessionId;

    if (sessionId)
    {
        delete sessions[sessionId];
    }

    res.clearCookie('sessionId');
    res.json({ message: 'logged out successfully' });
});

app.post('/alarm', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const alarmTime = req.body.alarmTime;
    const alarmDistance = req.body.alarmDistance || 100;

    try
    {
        const result = await pool.query(
            'UPDATE users SET alarm_time = $1, alarm_distance = $2 WHERE id = $3 RETURNING alarm_time, alarm_distance',
            [alarmTime, alarmDistance, req.userId]
        );

        res.json({ message: 'Alarm set', alarm: result.rows[0] });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.get('/alarm', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'not logged in' });
    }

    try
    {
        const result = await pool.query(
            'SELECT alarm_time, alarm_distance FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0)
        {
            return res.status(404).json({ error: 'User not found' });
        }

        const alarm = result.rows[0];
        if (!alarm.alarm_time)
        {
            return res.json({ alarm: null });
        }

        res.json({ alarm });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.delete('/alarm', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try
    {
        await pool.query(
            'UPDATE users SET alarm_time = NULL, alarm_distance = 100 WHERE id = $1',
            [req.userId]
        );

        res.json({ message: 'Alarm deleted' });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.post('/challenge/start', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const startLat = req.body.startLat;
    const startLon = req.body.startLon;

    try
    {
        const existing = await pool.query(
            'SELECT challenge_active, challenge_start_lat, challenge_start_lon, challenge_start_time FROM users WHERE id = $1',
            [req.userId]
        );

        if (existing.rows.length === 0)
        {
            return res.status(404).json({ error: 'User not found' });
        }

        if (existing.rows[0].challenge_active)
        {
            return res.json({ message: 'Challenge already active', challenge: existing.rows[0] });
        }

        const result = await pool.query(
            'UPDATE users SET challenge_active = true, challenge_start_lat = $1, challenge_start_lon = $2, challenge_start_time = NOW() WHERE id = $3 RETURNING challenge_active, challenge_start_lat, challenge_start_lon, challenge_start_time',
            [startLat, startLon, req.userId]
        );

        res.json({ message: 'Challenge started', challenge: result.rows[0] });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.get('/challenge/status', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try
    {
        const result = await pool.query(
            'SELECT challenge_active, challenge_start_lat, challenge_start_lon, challenge_start_time, alarm_distance FROM users WHERE id = $1',
            [req.userId]
        );

        if (result.rows.length === 0)
        {
            return res.status(404).json({ error: 'User not found' });
        }

        const challenge = result.rows[0];
        res.json({ challenge });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.post('/challenge/end', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try
    {
        await pool.query(
            'UPDATE users SET challenge_active = false, challenge_start_lat = NULL, challenge_start_lon = NULL, challenge_start_time = NULL WHERE id = $1',
            [req.userId]
        );

        res.json({ message: 'Challenge ended' });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.post('/challenge/complete', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try
    {
        await pool.query(
            'UPDATE users SET challenge_active = false, challenge_start_lat = NULL, challenge_start_lon = NULL, challenge_start_time = NULL WHERE id = $1',
            [req.userId]
        );

        res.json({ message: 'Challenge completed successfully!' });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

app.post('/challenge/fail', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    try
    {
        console.log('Challenge fail endpoint called for user:', req.userId);

        await pool.query(
            'UPDATE users SET challenge_active = false, challenge_start_lat = NULL, challenge_start_lon = NULL, challenge_start_time = NULL WHERE id = $1',
            [req.userId]
        );

        const userResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]);
        const customerId = userResult.rows[0].stripe_customer_id;

        console.log('Customer ID:', customerId);

        if (customerId)
        {
            console.log('Charging customer:', customerId);
            await stripe.charges.create({
                amount: 1000,
                currency: 'usd',
                customer: customerId,
                description: 'Alarm challenge failed - charity donation'
            });
            console.log('Charge successful!');
        }

        res.json({ message: 'Challenge failed. Money charged to charity.' });
    } catch (error)
    {
        console.error('ERROR IN CHALLENGE/FAIL:', error.message);
        res.status(400).json({ error: error.message });
    }
});

app.post('/setup-payment', async (req, res) =>
{
    if (!req.userId)
    {
        return res.status(401).json({ error: 'Not logged in' });
    }

    const stripeToken = req.body.stripeToken;

    try
    {
        const userResult = await pool.query('SELECT stripe_customer_id FROM users WHERE id = $1', [req.userId]);
        let customerId = userResult.rows[0].stripe_customer_id;

        if (!customerId)
        {
            const customer = await stripe.customers.create();
            customerId = customer.id;
            await pool.query('UPDATE users SET stripe_customer_id = $1 WHERE id = $2', [customerId, req.userId]);
        }

        await stripe.customers.createSource(customerId, { source: stripeToken });

        res.json({ message: 'Payment method saved successfully' });
    } catch (error)
    {
        res.status(400).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () =>
{
    console.log(`Server is running on port ${PORT}`);
});