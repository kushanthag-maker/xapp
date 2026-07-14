const express = require("express");
const path = require("path");

const app = express();
const PORT = 3000;

app.use(express.static(path.join(__dirname, "public")));

app.get("/api/channels", (req, res) => {
  res.json([
    {
      id: 1,
      name: "Demo Channel",
      logo: "https://via.placeholder.com/120x120.png?text=TV",
      stream: "https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8"
    }
  ]);
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
