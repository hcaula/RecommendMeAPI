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
            else {
                req.app = app;
                next();
            };
        });
    }
}

/* Register App route */
app.post('/api/v1/register', (req, res) => {
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

/* Refresh token from Spotify */
const refresh = (next) => {
    const request = require('request');
    const options = {
        url: 'https://accounts.spotify.com/api/token',
        headers: { 'Authorization': `Basic ${process.env.SPOTIFY_ENCODED}` },
        form: {
            'grant_type': 'refresh_token',
            'refresh_token': process.env.SPOTIFY_REFRESH_TOKEN
        }
    };

    request.post(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            console.log(error);
            console.log(body);
            next("error");
        } else next(null, JSON.parse(body).access_token);
    });
}

/* Get recommendations from Spotify function */
const recommend = (access_token, options, next) => {
    const request = require('request');
    const queryString = require('query-string');

    const target_popularity = 90;

    const query = queryString.stringify({
        target_energy: options.energy,
        target_popularity: target_popularity,
        seed_genres: options.genres
    });

    options = {
        url: `https://api.spotify.com/v1/recommendations?${query}`,
        headers: { 'Authorization': `Bearer ${access_token}` },
    };

    request.get(options, (error, response, body) => {
        if (error || response.statusCode !== 200) {
            console.log(error);
            console.log(body);
            next("error");
        } else {
            const tracks = JSON.parse(body).tracks.map(t => {
                return {
                    name: t.name,
                    album: t.album.name,
                    artist: t.artists[0].name,
                    images: t.images,
                    href: t.href,
                    spotify: t.external_urls.spotify
                }
            });

            next(null, tracks);
        };
    });
}

/* Recommendation route */
app.get("/api/v1/recommend", auth, (req, res, next) => {
    refresh((error, access_token) => {
        if (error) res.status(500).json({ error: "Something went wrong. We're very sorry." });
        else {
            try {
                const genres = req.query.genres ? req.query.genres : 'rock';
                const energy = req.query.energy ? req.query.energy : 0.5;

                const options = {
                    energy: energy,
                    genres: genres
                }

                recommend(access_token, options, (error, playlist) => {
                    if (error) res.status(500).json({ error: "Something went wrong. We're very sorry." });
                    else {
                        res.status(200).json({
                            playlist: playlist,
                            energy: energy,
                            genres: genres
                        });
                    }
                });
            } catch (error) {
                console.log(error);
                res.status(400).json({ error: "Bad request." });
            }
        }
    });
});

/* Test App ID validity function */
app.get("/test", auth, (req, res, next) => {
    res.status(200).json({ 
        message: "This App ID is valid!",
        app: req.app
    });
});

app.listen(3000, () => console.log(`Express server up.`));