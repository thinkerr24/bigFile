import { useRef } from "react";
import { Button, Empty, message } from "antd";
import { InboxOutlined } from "@ant-design/icons";

import { useDrag } from "@/hooks/useDrag";

import { CHUNK_SIZE } from "@/utils/constants";

import axiosInstance from "@/services/axiosInstance";

import "./FileUploader.css";

export default function FileUploader() {
    const uploadContainerRef = useRef(null);
    const { selectedFile, filePreview } = useDrag(uploadContainerRef);

    const handleUpload = async () => {
        if (!selectedFile) {
            message.error("尚未选中文件!");
        } else {
            const filename = await getFileName(selectedFile);
            // console.log('filename:', filename)
            await uploadFile(selectedFile, filename);
        }
    };

    return (
        <>
            <div className="upload-container" ref={uploadContainerRef}>
                <InboxOutlined />
                {renderFilePreview(filePreview)}
            </div>
            <Button onClick={handleUpload}>上传</Button>
        </>
    );
}

function createRequest(fileName, chunk, chunkFileName) {
    return axiosInstance.post(`/upload/${fileName}`, chunk, {
        headers: {
            'Content-Type': 'application/octet-stream' // 这个请求头是告诉服务器请求体是一个二进制格式，是一个字节流
        },
        params: { // querystring
            chunkFileName
        }
    }); 
}

/**
 * 切片上传大文件
 * @param {*} file
 * @param {*} fileName
 */
async function uploadFile(file, fileName) {
    // 对文件进行切片
    const chunks = createFileChunks(file, fileName);
    // 实现并行上传
    const requests = chunks.map(({ chunk, chunkFileName }) => {
        return createRequest(fileName, chunk, chunkFileName);
    });

    try {
        // 并行上传分片
        await Promise.all(requests);
        // 等全部分片上传完了，会香服务器发送一个合并文件的请求
        await axiosInstance.get(`/merge/${fileName}`);
        message.success('文件上传完成!');
    } catch(error) {
        console.error('uploadFile error:', error);
        message.error('上传出错!');
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
