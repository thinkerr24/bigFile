const express = require("express");
const logger = require("morgan");
const { StatusCodes } = require("http-status-codes");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

// 存放上传合并好的文件
fs.ensureDirSync(path.resolve(__dirname, "public"));
// 存放分片的文件
fs.ensureDirSync(path.resolve(__dirname, "temp"));

const app = express();
app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "public")));

app.post("/upload/:fileName", async (req, res, next) => {
    const { fileName } = req.params;  // 路径参数
    const { chunkFileName } = req.query; // 查询参数
    console.log('fileName:', fileName)
    console.log('chunkFileName:', chunkFileName)

    res.json({ success: true });
});

app.get("/merge/:fileName", async (req, res, next) => {
    const { fileName } = req.params;
    res.json({ success: true });
});

app.listen(8080, () => {
    console.log("server started on port 8080!");
});
