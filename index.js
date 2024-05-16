const express = require("express");
const path = require("path");
const reload = require("reload");
const app = express();
const PORT = 6059;

app.use(express.static(path.join(__dirname, "public")));

app.get("/", (req, res) => {
	res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
	console.log(`Server is running on http://localhost:${PORT}`);
});

reload(app);
