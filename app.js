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
dbConnection.once('open', () => { console.log(`Mongoose connected on ${process.env.DB_URI}`) });

/* Defining App model */
const appSchema = new mongoose.Schema({ name: String, author: String });
const App = mongoose.model('App', appSchema);

/* Defining Express routes */
const app = require('express')();
app.use(require('body-parser').json());

/* Auth function */
const auth = (req, res, next) => {
    const appId = req.headers.authorization;
    let error = { status: 401 }
    if (!appId) res.status(401).json({ error: "No Authorization token sent." });
    else {
        App.findById(appId, (err, app) => {
            if (err) res.status(500).json({ error: "An unexpected error ocurred. We're very sorry." });
            else if (!app) res.status(401).json({ error: "No App with this ID has been registered." });
            else next();
        });
    }
}

/* Register App route */
app.post('/register', (req, res) => {
    const name = req.body.name;
    const author = req.body.author;
    if (!name || !author) {
        res.status(400).json({
            error: "Some fields are missing.",
            appName: name,
            appAuthor: author
        });
    } else {
        const newApp = new App({
            name: name,
            author: author
        });
        newApp.save((error, newApp) => {
            if (error) res.status(500).json({ error: "Something went wrong, try again shortly." });
            else res.status(200).json({
                message: "App created successfully.",
                appId: newApp._id
            });
        });
    }
});

/* Test function */
app.get("/test", auth, (req, res, next) => {
    res.status(200).json({ message: "OKAY" });
});

app.listen(3000, () => console.log(`Express server up.`));