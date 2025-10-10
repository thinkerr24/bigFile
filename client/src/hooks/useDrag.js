import { useEffect, useCallback, useState, useRef } from "react";
import { message } from "antd";

import { MAX_FILE_SIZE } from "@/utils/constants";

export function useDrag(uploadContainerRef) {

    // Avoid useEffect execute twice in DEV_ENV
    const initialized = useRef(false)

    // 定义一个状态用来保存用户选中的文件
    const [selectedFile, setSelectedFile] = useState(null);

    // 文件预览(url: 预览地址, type: 文件类型)
    const [filePreview, setFilePreview] = useState({ url: null, type: null });

    useEffect(() => {
        if (!selectedFile) return;

        const url = URL.createObjectURL(selectedFile);
        setFilePreview({ url, type: selectedFile.type });
        return () => {
            URL.revokeObjectURL(url);
        };
    }, [selectedFile]);

    useEffect(() => {
        const uploadContainer = uploadContainerRef.current;
        uploadContainer.addEventListener("dragenter", handleDrag);
        uploadContainer.addEventListener("dragover", handleDrag);
        uploadContainer.addEventListener("drop", handleDrop);
        uploadContainer.addEventListener("dragleave", handleDrag);

        return () => {
            uploadContainer.removeEventListener("dragenter", handleDrag);
            uploadContainer.removeEventListener("dragover", handleDrag);
            uploadContainer.removeEventListener("drop", handleDrop);
            uploadContainer.removeEventListener("dragleave", handleDrag);
        };
    }, []);

    // 实现点击上传
    useEffect(() => {
        const uploadContainer = uploadContainerRef.current;
        if (!initialized.current) {
            initialized.current = true;
            uploadContainer.addEventListener('click', handleClick);
        }

        return () => {
            if (uploadContainerRef.current) {
                uploadContainerRef.current.removeEventListener("click", handleClick);
            }
        }; 
    }, []);

    const handleDrag = useCallback(event => {
        event.preventDefault(); // 阻止默认行为
        event.stopPropagation(); // 阻止事件传播
    }, []);

    const handleDrop = useCallback(event => {
        event.preventDefault(); // 阻止默认行为
        event.stopPropagation(); // 阻止事件传播

        const { files } = event.dataTransfer;
        checkFile(files);
    }, []);

    const handleClick = useCallback(() => {
        const fileInput = document.createElement('input');
        fileInput.type = 'file';
        fileInput.style.display = 'none';

        fileInput.addEventListener('change', (event) => {
            checkFile(event.target.files);
        });
        document.body.appendChild(fileInput);
        // 手动触发文件的选择
        fileInput.click();

    }, []);

    const checkFile = files => {
        // debugger;
        const file = files[0]; // 先拿第一个文件

        if (!file) {
            message.error("没有选择文件!");
            return;
        } else {
            if (file.size > MAX_FILE_SIZE) {
                message.error("文件大小不能超过2G!");
                return;
            }

            // 判断类型 file.type.startsWith('image/') 'video/' ...

            setSelectedFile(file);
        }
    };

    const resetFileStatus = () => {
        setSelectedFile(null);
        setFilePreview({ url: null, type: null });
    };

    return { selectedFile, filePreview, resetFileStatus };
}
