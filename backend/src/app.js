const express = require("express");
const cors = require("cors");
const path = require("path");
const routes = require("./routes");
const { UPLOAD_DIR } = require("./middleware/upload");
const { notFound, errorHandler } = require("./middleware/error");

const app = express();

app.use(cors());
app.use(express.json({ limit: "100kb" }));

app.use("/api", routes);
app.use("/api", notFound);

app.use("/uploads", express.static(UPLOAD_DIR));
app.use(express.static(path.join(__dirname, "../../frontend")));

app.use(errorHandler);

module.exports = app;
