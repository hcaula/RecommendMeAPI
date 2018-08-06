/* Loading .env file if not in production server */
if (process.env.NODE_ENV && process.env.NODE_ENV !== 'production') {
    console.log('Loading .env file.');
    require('dotenv').load();
    console.log('.env file loaded successfully');
};

/* Connecting DB */
const mongoose = require('mongoose');
mongoose.connect(process.env.DB_URI, { useNewUrlParser: true });
const dbConnection = mongoose.connection;
dbConnection.on('error', (error) => {
    console.log(error);
    process.exit(1);
});
dbConnection.once('open', () => {console.log(`Mongoose connected on ${process.env.DB_URI}`)});

// app.get('/', (req, res) => {
    
// })

// app.listen(3000, () => console.log('Example app listening on port 3000!'))