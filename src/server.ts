import cors from "cors";
import dotenv from "dotenv";
import express from "express";
import { Client } from "pg";
import { getEnvVarOrFail } from "./support/envVarUtils";
import { setupDBClientConfig } from "./support/setupDBClientConfig";
import morgan from "morgan";

dotenv.config(); //Read .env file lines as though they were env vars.

const dbClientConfig = setupDBClientConfig();
const client = new Client(dbClientConfig);

//Configure express routes

const logger = morgan;

const app = express();

app.use(logger("tiny"));
app.use(express.json()); //add JSON body parser to each following route handler
app.use(cors()); //add CORS support to each following route handler

app.get("/", async (_req, res) => {
    res.json({ msg: "Hello! There's nothing interesting for GET /" });
});

app.get("/leaderboard", async (_req, res) => {
    try {
        const queryText =
            "SELECT * FROM BreedVotes ORDER BY Votes DESC LIMIT 10";
        const result = await client.query(queryText);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.post("/breeds/:name", async (req, res) => {
    try {
        const queryText =
            "INSERT INTO BreedVotes(BreedName) VALUES ($1) ON CONFLICT (BreedName) DO UPDATE SET Votes = BreedVotes.Votes+1 RETURNING *";
        const values = [req.params.name];

        const result = await client.query(queryText, values);

        res.status(200).json(result.rows);
    } catch (error) {
        res.status(500).send("An error occurred. Check server logs.");
    }
});

app.get("/health-check", async (_req, res) => {
    try {
        //For this to be successful, must connect to db
        await client.query("select now()");
        res.status(200).send("system ok");
    } catch (error) {
        //Recover from error rather than letting system halt
        console.error(error);
        res.status(500).send("An error occurred. Check server logs.");
    }
});

connectToDBAndStartListening();

async function connectToDBAndStartListening() {
    console.log("Attempting to connect to db");
    await client.connect();
    console.log("Connected to db!");

    const port = getEnvVarOrFail("PORT");
    app.listen(port, () => {
        console.log(
            `Server started listening for HTTP requests on port ${port}.  Let's go!`
        );
    });
}
