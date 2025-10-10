self.addEventListener("message", async event => {

    const file = event.data;
    const fileName = await getFileName(file);
    self.postMessage(fileName);

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
});
