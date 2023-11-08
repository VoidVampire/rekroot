require('dotenv').config();

const express = require('express');
const cors = require('cors');
const connectDB = require('./db_config');

const app = express();
const port = process.env.PORT || 5000;
connectDB();

app.use(express.json());
app.use(cors());
app.use('/', require('./routes/creds'));
app.listen(port, () => {
    console.log(`Listening on port ${port}...`);
});

app.get('/', (req, res) => {
    return res.status(200).send('Welcome To Rekroot');
});