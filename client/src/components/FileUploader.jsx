import { useRef } from "react";
import { InboxOutlined } from "@ant-design/icons";

import { useDrag } from "@/hooks/useDrag";

import "./FileUploader.css";
import { Empty } from "antd";

export default function FileUploader() {
    const uploadContainerRef = useRef(null);
    const { selectedFile, filePreview } = useDrag(uploadContainerRef);

    return (
        <div className="upload-container" ref={uploadContainerRef}>
            <InboxOutlined />
            {renderFilePreview(filePreview)}
        </div>
    );
}

/**
 * 文件的预览
 * @param {*} filePreview
 */
function renderFilePreview(filePreview) {
    const { url, type } = filePreview;

    if (url) {
        if (type.startsWith('video/')) {
            return <video src={url} alt="preview" controls/>
        } else if (type.startsWith('image/')) {
              return <img src={url} alt="preview"/>
        } else {
            return <Empty/>
        }
    }
}
