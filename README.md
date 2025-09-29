# Overview

<ul>
<li>1.业务背景</li>
<li>2.原理实现</li>
<li>3.难点亮点</li>
</ul>


### env
```bash
node-v: v20.18.0
```


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