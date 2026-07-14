const express = require("express");
const pair = require("./routes/pair");

const app = express();

app.use("/", pair);

app.listen(3000, () => {
    console.log("Server Running");
});

require("./telegram/bot");
