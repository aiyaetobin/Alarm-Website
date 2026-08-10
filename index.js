
const express = require('express'); //uses express library
const app = express(); //creates a new express application

app.use(express.static('public')); // server files from public when someone visits the site

app.listen(3000, () => { //starts the server and listens for requests
    console.log('Server is running on port 3000'); //logs a message to the console when the server starts
})