import { useEffect, useCallback, useState } from "react";
import { message } from "antd";

import { MAX_FILE_SIZE } from "@/utils/constants";

export function useDrag(uploadContainerRef) {
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

    const handleDrag = useCallback(event => {
        event.preventDefault(); // 阻止默认行为
        event.stopPropagation(); // 阻止事件传播
    }, []);

    const handleDrop = useCallback(event => {
        event.preventDefault(); // 阻止默认行为
        event.stopPropagation(); // 阻止事件传播

        const { files } = event.dataTransfer;
        checkFile(files)
    }, []);

    const checkFile = files => {
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

    return { selectedFile, filePreview };
}
