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
  const { fileName, startPos } = req.params; // 路径参数
  const { chunkFileName } = req.query; // 查询参数

  const start = isNaN(startPos) ? 0 : parseInt(startPos, 10);

  // 创建保存文件分片的目录
  const chunkDir = path.resolve(TEMP_DIR, fileName);
  // 分片文件的路径
  const chunkFilePath = path.resolve(chunkDir, chunkFileName);
  // 确定路径存在
  await fs.ensureDirSync(chunkDir);
  // 创建文件可写流(可指定写入的起始位置)
  const ws = fs.createWriteStream(chunkFilePath, { start, flags: 'a'});

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
    await mergeChunks(fileName, next);
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

app.get('/verify/:fileName', async(req, res, next) => {
  const { fileName } = req.params;
  const filePath = path.resolve(PUBLIC_DIR, fileName);
  // 检查文件是否存在
  const existFile = await fs.pathExists(filePath);
  if (existFile) {
    return res.json({
      success: true, needUpload: false
    })
  }
  const chunksDir = path.resolve(TEMP_DIR, fileName);
  const existDir = await fs.pathExists(chunksDir);
  // 存放已经上传的分片的对象数组
  let uploadedChunkList = [];
  if (existDir) {
    // 读取临时目录里所有的分片对应的文件
    const chunkFileNames = await fs.readdir(chunksDir);
    // 读取每个分片文件的文件信息
    uploadedChunkList = await Promise.all(chunkFileNames.map(async function (chunkFileName) {
        const { size } = await fs.stat(path.resolve(chunksDir, chunkFileName));
        return { chunkFileName, size };
    }));
  }

  // 如果没有此文件，则需要上传(已经上传一部分的，把已经上传的分片名，以及分片的大小给客户端， 客户端只上传剩下的部分即可)
  return res.json({
    success: true, needUpload: true, uploadedChunkList
  })
});

function pipeStream(rs, ws) {
  return new Promise((resolve, reject) => {
    // 把可读流中的数据写入可写流中
    rs.pipe(ws).on("finish", resolve).on("error", reject);
  });
}

async function mergeChunks(fileName, next) {
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
    await  fs.rm(chunkDir, { recursive: true });
    // 合并完文件后可以重新计算合并后的文件hash值，与文件中的hash值进行对比
    // 如果值是一样的，说明文件没有被修改
  } catch (error) {
    next(error);
  }
}

app.listen(8080, () => {
  console.log("server started on port 8080!");
});
