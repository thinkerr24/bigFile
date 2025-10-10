# Overview

<ul>
<li>1.业务背景</li>
<li>2.原理实现</li>
<li>3.难点亮点</li>
</ul>

### env
```bash
node-v: v20.18.0

# 前端(client)
npm i antd @ant-design/icons axios

# 后端(server)
npm init -y
npm i nodemon -g
npm i express morgan http-status-codes http-errors cors fs-extra

scripts: {
    "start": "nodemon index.js",
    ...
}
```



## 处理文件的上传
- 为了提升性能，在上传大文件的时候，可以把一个大文件切成多个小文件，然后并行上传
- 另外为了后面在实现类似秒传的功能，所以需要对文件进行唯一的标识
- 所以我们需要根据文件的内容生成一个hash值来标识这一个文件，如果内容一样，产生的文件名就是一样

1. 解决网络发生错误的情况，或用户点了暂停又继续的情况
2. 此文件服务器已经存在了，则不需要重复上传

要想实现秒传的功能，需要服务器提供一个接口，返回已经上传的分片和大小<br/>

#### 如何确定合理的文件切片大小
考虑上传效率，还要考虑网络稳定性
- 切片过大可能会导致上传失败，尤其在网络不稳定的情况下
- 切片过小会导致出现太多HTTP请求，降低上传效率
- 所以切片大小根据实际情况进行考虑(网络状态，服务器限制，并发上传，根据实验进行调整)
- 综合考虑一般来说切片的大小在1M和10M之间


### Issues
1.配置@引入路径
```js
// vite.config.js in project root path
import { defineConfig } from 'vite';
import path from 'path';
export default defineConfig({
 resolve: {
   alias: {
     '@': path.resolve(__dirname, './src'), // '@' represents the 'src' directory
   },
 },
});
```

```js
// jsconfig.json or tsconfig.json in project root path (能够通过Ctrl键点进源文件)
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["src/*"]
    }
  },
  "include": ["src/**/*.js", "src/**/*.ts", "src/**/*.vue", "src/**/*.tsx"]
}
```