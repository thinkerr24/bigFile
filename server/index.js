const express = require("express");
const logger = require("morgan");
const { StatusCodes } = require("http-status-codes");
const cors = require("cors");
const fs = require("fs-extra");
const path = require("path");

const PUBLIC_DIR = path.resolve(__dirname, "public");
const TEMP_DIR = path.resolve(__dirname, "temp");

const CHUNK_SIZE = 10 * 1024 * 1024;

// 存放上传合并好的文件
fs.ensureDirSync(PUBLIC_DIR);
// 存放分片的文件
fs.ensureDirSync(TEMP_DIR);

const app = express();
app.use(logger("dev"));
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.resolve(__dirname, "public")));

/**
 * 上传分片的接口
 */
app.post("/upload/:fileName", async (req, res, next) => {
  const { fileName } = req.params; // 路径参数
  const { chunkFileName } = req.query; // 查询参数
  console.log("fileName:", fileName);
  console.log("chunkFileName:", chunkFileName);

  // 创建保存文件分片的目录
  const chunkDir = path.resolve(TEMP_DIR, fileName);
  // 分片文件的路径
  const chunkFilePath = path.resolve(chunkDir, chunkFileName);
  // 确定路径存在
  await fs.ensureDirSync(chunkDir);
  // 创建文件可写流
  const ws = fs.createWriteStream(chunkFilePath, {});

  // 为暂停功能做准备
  // aborted事件，关闭可写流
  req.on("aborted", () => {
    ws.close;
  });

  try {
    // 使用管道的方式把请求中的请求体流数据写入到文件中
    await pipeStream(req, ws);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get("/merge/:fileName", async (req, res, next) => {
  const { fileName } = req.params;
  try {
    await mergeChunks(fileName);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

function pipeStream(rs, ws) {
  return new Promise((resolve, reject) => {
    // 把可读流中的数据写入可写流中
    rs.pipe(ws).on("finish", resolve).on("error", reject);
  });
}

async function mergeChunks(fileName) {
  const chunkDir = path.resolve(TEMP_DIR, fileName);
  const mergedFilePath = path.resolve(PUBLIC_DIR, fileName);
  const chunkFiles = await fs.readdir(chunkDir);
  // 对分片按索引排序
  chunkFiles.sort((a, b) => Number(a.split("-")[1]) - Number(b.split("-")[1]));
  try {
    // 为了提高性能，实现并行写入
    const pipes = chunkFiles.map((chunkFile, index) => {
      return pipeStream(
        fs.createReadStream(path.resolve(chunkDir, chunkFile), {
          autoClose: true,
        }),
        fs.createWriteStream(mergedFilePath, { start: index * CHUNK_SIZE })
      );
    });

    // 把每个分片数据写入到目标文件中去
    await Promise.all(pipes);

    // 删除存储分片文件的临时目录
    await fs.rmdir(chunkDir, { recursive: true });
  } catch (error) {
    next(error);
  }
}

app.listen(8080, () => {
  console.log("server started on port 8080!");
});
