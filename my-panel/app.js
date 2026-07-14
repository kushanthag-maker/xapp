const express = require('express');
const app = express();
const port = 3000;

app.set('view engine', 'ejs');

app.get('/', (req, res) => {
    res.render('index', { status: 'System Running' });
});

app.listen(port, () => {
    console.log(`Panel running at http://localhost:${port}`);
});
