const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const filePath = path.resolve(__dirname, './1.txt');
const hash = crypto.createHash('SHA256');
const stream = fs.createReadStream(filePath);

stream.on('data', (data) => {
    hash.update(data);
});


stream.on('end', () => {
    const hashValue = hash.digest('hex');
    console.log(hashValue)
});