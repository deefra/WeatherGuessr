import dotenv from 'dotenv';
import express from "express";
import pg from "pg";
import { dirname } from "path";
import { fileURLToPath } from "url";
import bodyParser from 'body-parser';



dotenv.config();

const db = new pg.Client({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_DATABASE,
    password: process.env.DB_PASSWORD,
    port: process.env.DB_PORT,
});

db.connect((err) => {
    if (err) {
        console.error('Connection error', err.stack);
    } else {
        console.log('Connected to the database');
    }
});

const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
const port = 3000;

// MIDDLEWARE

app.use(express.static(__dirname + '/public'));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// ROUTES
app.get('/play', async (req, res) => {
    await getQuestion();
    res.render(__dirname + '/views/play.ejs', {data: currentQuestion, totalCorrect: totalCorrect});
  });

app.get ("/", (req, res) => {
    res.render(__dirname + "/views/index.ejs");
})

app.post ('/submit', async (req, res) => {
    const userInput = req.body.answer; 
    if (checkAnswer(userInput) === true) {
        totalCorrect ++
        await getQuestion();
        res.render("play.ejs", {data: currentQuestion, totalCorrect: totalCorrect});
    } else {
        const errorMessage = `Your score was ${totalCorrect} correct asnwer was ${currentQuestion.land} try again!`; 
        res.render(__dirname + "/views/index.ejs", { errorMessage, totalCorrect: totalCorrect, currentQuestion});
        totalCorrect = 0;
    }
});


// GAME LOGIC


let totalCorrect = 0;
let allCountries = [];
let currentQuestion = [];

const getQuestion = async () => {
    try{
        const res = await db.query("SELECT * FROM weatherdata WHERE weer IS NOT NULL AND wind IS NOT NULL AND humidity IS NOT NULL AND airquality IS NOT NULL")
        allCountries = res.rows;
        currentQuestion = allCountries[Math.floor(Math.random() * allCountries.length)];
        currentQuestion.wind = (parseFloat(currentQuestion.wind) * 3.6).toFixed(2);
        currentQuestion.weer = (parseFloat(currentQuestion.weer) - 273.15).toFixed(2);
    } catch (error) {
        console.error("Error fetching countries from database:", error);
    }
};

function checkAnswer(userInput) {
    const cleanedInput = userInput.replace(/\s+/g, ' ').trim().toLowerCase();
    const correctAnswer = currentQuestion.land;
    const cleanedCorrectAnswer = correctAnswer.replace(/\s+/g, ' ').trim().toLowerCase();

    if (cleanedInput === cleanedCorrectAnswer) {
        return true;
    } else {
        return false;
    }
}


// DB FETCH WEATHERDATA

const apiKey = '';

const fetchWeatherData = async () => {
    try {
        const res = await db.query('SELECT * FROM weatherdata ORDER BY updated_at ASC LIMIT 60;');
        const countries = res.rows;

        for (const row of countries) {
            const placeName = row.land; 
            const apiUrl = `https://api.openweathermap.org/data/2.5/weather?q=${placeName}&appid=${apiKey}`;

            try {
                const response = await fetch(apiUrl);
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                const data = await response.json();
                await saveData(data); 
            } catch (error) {
                console.error(`Error fetching weather data for ${placeName}:`, error);
            }
        }
    } catch (error) {
        console.error('Error fetching countries from database:', error);
    }
};

setInterval(fetchWeatherData, 3600000);

async function saveData(data) {

    const temperature = data.main.temp; 
    const windSpeed = data.wind.speed; 
    const humidity = data.main.humidity; 
    const airQuality = data.weather[0].description; 
    const countryName = data.name; 

    try {
        await db.query(
            `UPDATE weatherdata
             SET weer = $1, wind = $2, humidity = $3, airquality = $4, updated_at = NOW() 
             WHERE land = $5`,
            [temperature, windSpeed, humidity, airQuality, countryName]
        );
        console.log(`Updated weather data for ${countryName}`);
    } catch (error) {
        console.error('Error saving data to database:', error);
    }
}

// SERVER LOGIC

app.listen(port, () => {
    console.log(`Server is running on ${port}.`);
});

process.on('exit', async () => {
    await db.end();
    console.log('Database connection closed');
});
