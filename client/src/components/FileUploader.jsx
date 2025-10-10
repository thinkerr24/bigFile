import { useRef, useState } from "react";
import { Button, Empty, message, Progress } from "antd";
import { InboxOutlined } from "@ant-design/icons";
import axios from "axios";

import { useDrag } from "@/hooks/useDrag";

import { CHUNK_SIZE } from "@/utils/constants";

import axiosInstance from "@/services/axiosInstance";

import "./FileUploader.css";

const UPLOAD_STATUS = {
    NOT_STARTED: "NOT_STARTED", // 初始状态，尚未上传
    UPLOADING: "UPLOADING", // 上传中
    PAUSED: "PAUSED" // 已暂停
};

export default function FileUploader() {
    const uploadContainerRef = useRef(null);
    const { selectedFile, filePreview, resetFileStatus } = useDrag(uploadContainerRef);
    const [uploadProgress, setUploadProgress] = useState({});
    // 控制上传的状态，初始态，上传中，已暂停
    const [uploadStatus, setUploadStatus] = useState(UPLOAD_STATUS.NOT_STARTED);
    // 存放所有上传请求的取消token
    const [cancelTokens, setCancelTokens] = useState([]);

    const resetAllStatus = () => {
        resetFileStatus();
        // setUploadProgress({});
        setUploadStatus(UPLOAD_STATUS.NOT_STARTED);
    };

    const handleUpload = async () => {
        if (!selectedFile) {
            message.error("尚未选中文件!");
        } else {
            setUploadStatus(UPLOAD_STATUS.UPLOADING);
            const filename = await getFileName(selectedFile);
            // console.log('filename:', filename)
            await uploadFile(selectedFile, filename, setUploadProgress, resetAllStatus, setCancelTokens);
        }
    };

    const pauseUpload = async () => {
        setUploadStatus(UPLOAD_STATUS.PAUSED);
        cancelTokens.forEach(token => token.cancel('用户主动暂停了上传'));
    }


    const renderButtons = () => {
        switch(uploadStatus) {
            case UPLOAD_STATUS.NOT_STARTED:
                return <Button onClick={handleUpload}>上传</Button>
             case UPLOAD_STATUS.UPLOADING:
                return <Button onClick={pauseUpload}>暂停</Button>
            case UPLOAD_STATUS.PAUSED:
                return <Button onClick={handleUpload}>恢复上传</Button>                               
        }
       
    }

    const renderProgress = () => {
        // 切片进度条
        return Object.keys(uploadProgress).map((chunkName, index) => (
            <div key={chunkName + "progress"}>
                <span>切片:{index}:</span>
                <Progress percent={uploadProgress[chunkName]} />
            </div>
        ));
    };

    const renderTotalProgress = () => {
        // 总进度条
        const uploadValues = Object.values(uploadProgress);
        const total = Math.ceil(uploadValues.reduce((pre, cur) => pre + cur, 0));
        return (
            <>
                {uploadStatus !== UPLOAD_STATUS.NOT_STARTED &&
                <div key={"total-progress-bar"}>
                    <span>总进度条</span>
                    <Progress percent={uploadValues.length === 0 ? 0 : Math.round(total / uploadValues.length)} />
                    {renderProgress()}
                </div>}
            </>
        );
    };

    return (
        <>
            <div className="upload-container" ref={uploadContainerRef}>
                <InboxOutlined />
                {renderFilePreview(filePreview)}
            </div>
            {renderButtons()}
            {renderTotalProgress()}
            {/* {renderProgress()} */}
        </>
    );
}

function createRequest(fileName, chunk, chunkFileName, setUploadProgress, startPos, totalSize, sourceCancelToken) {
    return axiosInstance.post(`/upload/${fileName}`, chunk, {
        headers: {
            "Content-Type": "application/octet-stream" // 这个请求头是告诉服务器请求体是一个二进制格式，是一个字节流
        },
        params: {
            // querystring
            chunkFileName,
            startPos // 写入文件的起始位置
        },
        // axios内部调用原生的XMLHttpRequest
        onUploadProgress: progressEvent => {
            // progressEvent.loaded本次上传成功的字节 + start上次上传成功的字节 / 总字节数
            const percentCompleted = Math.round(((progressEvent.loaded  + startPos ) * 100) / totalSize);
            setUploadProgress(prevProgress => ({
                ...prevProgress,
                [chunkFileName]: percentCompleted
            }));
        },
        cancelToken: sourceCancelToken.token
    });
}

/**
 * 切片上传大文件
 * @param {*} file
 * @param {*} fileName
 */
async function uploadFile(file, fileName, setUploadProgress, resetAllStatus, setCancelTokens) {
    const { needUpload, uploadedChunkList } = await axiosInstance.get(`/verify/${fileName}`);
    if (!needUpload) {
        message.success(`文件已存在，秒传成功`);
        return resetAllStatus();
    }
    // 对文件进行切片
    const chunks = createFileChunks(file, fileName);

    const newCancelTokens = [];
    // 实现并行上传
    const requests = chunks.map(({ chunk, chunkFileName }) => {
        const cancelToken = axios.CancelToken.source();
        newCancelTokens.push(cancelToken); 
        // 判断给服务器发送是否是完整的分片数据
        const existingChunk = uploadedChunkList.find(uploadedChunk => {
            return uploadedChunk.chunkFileName === chunkFileName
        });

        // 如果已经上传过
        if (existingChunk) {
            const uploadedSize = existingChunk.size;
            // 从chunk中进行截取，过滤掉已经上传过的大小，得到剩下需要上传的内容
            const remainingChunk = chunk.slice(uploadedSize);
            if (remainingChunk.size === 0) {
                setUploadProgress(prevProgress => ({
                    ...prevProgress,
                    [chunkFileName]: 100
                }));
                return Promise.resolve();
            } else {
                setUploadProgress(prevProgress => ({
                    ...prevProgress,
                    [chunkFileName]: chunk.size > 0 ? Math.round(uploadedSize * 100 / chunk.size) : 0
                }));
                // 如果还有没传完的，继续上传剩下的
                return createRequest(fileName, remainingChunk, chunkFileName, setUploadProgress, uploadedSize, chunk.size, cancelToken);
            }
        } else {
            return createRequest(fileName, chunk, chunkFileName, setUploadProgress, 0, chunk.size, cancelToken);            
        }

    });
    setCancelTokens(newCancelTokens);

    try {
        // 并行上传分片
        await Promise.all(requests);
        // 等全部分片上传完了，会香服务器发送一个合并文件的请求
        await axiosInstance.get(`/merge/${fileName}`);
        message.success("文件上传完成!");
        resetAllStatus();
    } catch (error) {
        // 如果是用户主动点击了暂停按钮
        if (axios.isCancel(error)) {
            console.log('上传暂停');
            message.warning("暂停上传!");
        } else {
            console.error("uploadFile error:", error);
            message.error("上传出错!");
        }
    }
}

function createFileChunks(file, fileName) {
    // 最后切成的分片数组
    const chunks = [];
    let count = Math.ceil(file.size / CHUNK_SIZE);

    for (let i = 0; i < count; i++) {
        const chunk = file.slice(i * CHUNK_SIZE, (i + 1) * CHUNK_SIZE);
        chunks.push({
            chunk,
            chunkFileName: `${fileName}-${i}`
        });
    }
    return chunks;
}

/**
 * 根据文件对象获取文件内容, 进而得到hash文件名
 * @param {*} file
 */
async function getFileName(file) {
    // 计算此文件的hash值
    const fileHash = await calculateFileHash(file);
    // 获取文件拓展名
    const fileExtension = file.name.split(".").pop();
    return `${fileHash}.${fileExtension}`;
}

/**
 * 计算文件的hash字符串
 * @param {*} file
 * @returns
 */
async function calculateFileHash(file) {
    const arrayBuffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest("SHA-256", arrayBuffer);
    return bufferToHex(hashBuffer);
}

/**
 *   把ArrayBuffer转成16进制的字符串
 */
function bufferToHex(buffer) {
    return Array.from(new Uint8Array(buffer))
        .map(b => b.toString(16).padStart(2, "0"))
        .join("");
}

/**
 * 文件的预览
 * @param {*} filePreview
 */
function renderFilePreview(filePreview) {
    const { url, type } = filePreview;

    if (url) {
        if (type.startsWith("video/")) {
            return <video src={url} alt="preview" controls />;
        } else if (type.startsWith("image/")) {
            return <img src={url} alt="preview" />;
        } else {
            return <Empty />;
        }
    }
}
