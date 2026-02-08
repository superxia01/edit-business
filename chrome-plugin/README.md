# Chrome 插件配置指南

本文档说明如何将 xhs2feishu 插件改造为适配 edit-business 系统。

## 快速开始

1. 下载 xhs2feishu 插件源码
2. 修改配置文件（见下文）
3. 在 Chrome 中加载插件
4. 访问平台收藏数据

## 修改文件清单

| 文件 | 修改内容 | 状态 |
|------|----------|------|
| `api-config.js` | 修改 BASE_URL 为 edit-business 后端地址 | 需修改 |
| `sidebar.js` | 修改同步函数,调用新的 API 接口,移除用户验证逻辑 | 需修改 |
| `sidebar.html` | 移除设置标签页，简化 UI | 需修改 |
| `manifest.json` | 添加 edit-business 域名到 host_permissions | 需修改 |

## 详细修改步骤

### Step 1: 修改 api-config.js

将生产环境的 BASE_URL 修改为：

```javascript
const API_CONFIG = {
    // 本地开发
    BASE_URL: 'http://localhost:8084',

    // 生产环境
    // BASE_URL: 'https://edit.crazyaigc.com',

    ENDPOINTS: {
        SYNC_SINGLE_NOTE: '/api/v1/notes',
        SYNC_BLOGGER_NOTES: '/api/v1/notes/batch',
        SYNC_BLOGGER_INFO: '/api/v1/bloggers',
    }
};
```

### Step 2: 简化 sidebar.js

**移除以下内容**:
- `verifyUserOrder()` 函数及相关用户验证逻辑
- 飞书配置输入框 (ordeid, basetoken, knowledgeurl, bloggerurl, blogger_noteurl)
- 订单验证相关 UI
- 配置标签页（configTab）
- 下载媒体功能

**修改同步函数**:
- `syncSingleNote()` → POST `/api/v1/notes`
- `syncBatchNotes()` → POST `/api/v1/notes/batch`
- `syncBloggerInfo()` → POST `/api/v1/bloggers`

**数据格式映射**:

```javascript
// 单篇笔记数据映射
const noteData = {
    url: noteUrl,
    title: noteTitle,
    author: authorName,
    content: noteContent,
    tags: noteTags.map(tag => tag.replace('#', '')), // 去除 # 号
    imageUrls: imageUrls,
    videoUrl: videoUrl,
    noteType: noteType, // '图文' or '视频'
    coverImageUrl: coverImageUrl,
    likes: likeCount,
    collects: collectCount,
    comments: commentCount,
    publishDate: publishTime,
    captureTimestamp: Date.now(),
};

// 创作者信息数据映射
const bloggerData = {
    platformId: platformId,
    creatorName: creatorName,
    avatarUrl: avatarUrl,
    description: description,
    followersCount: followerCount,
    bloggerUrl: bloggerUrl,
    captureTimestamp: Date.now(),
};
```

### Step 3: 修改 manifest.json

```json
{
  "manifest_version": 3,
  "name": "edit-business-crawler",
  "version": "2.0.0",
  "description": "平台数据收藏并同步到 edit-business 系统",
  "permissions": [
    "activeTab",
    "scripting",
    "storage"
  ],
  "host_permissions": [
    "*://www.xiaohongshu.com/*",
    "*://localhost:8084/*",
    "*://edit.crazyaigc.com/*"
  ],
  "action": {
    "default_icon": {
      "16": "images/icon16.png",
      "48": "images/icon48.png",
      "128": "images/icon128.png"
    }
  },
  "icons": {
    "16": "images/icon16.png",
    "48": "images/icon48.png",
    "128": "images/icon128.png"
  },
  "content_scripts": [{
    "matches": ["*://www.xiaohongshu.com/*"],
    "js": ["content.js"]
  }],
  "background": {
    "service_worker": "background.js"
  },
  "side_panel": {
    "default_path": "sidebar.html"
  }
}
```

## API 接口说明

### 同步单篇笔记
- **接口**: `POST /api/v1/notes`
- **认证**: 无需认证
- **请求体**:
```json
{
  "url": "https://www.xiaohongshu.com/explore/...",
  "title": "笔记标题",
  "author": "作者昵称",
  "content": "正文内容",
  "tags": ["标签1", "标签2"],
  "imageUrls": ["图片URL1", "图片URL2"],
  "videoUrl": "视频URL（可选）",
  "noteType": "图文",
  "coverImageUrl": "封面图片URL",
  "likes": 100,
  "collects": 50,
  "comments": 20,
  "publishDate": 1736000000000,
  "captureTimestamp": 1736000000000
}
```

### 批量同步笔记
- **接口**: `POST /api/v1/notes/batch`
- **认证**: 无需认证
- **请求体**: 笔记数组

### 同步创作者信息
- **接口**: `POST /api/v1/bloggers`
- **认证**: 无需认证
- **请求体**:
```json
{
  "platformId": "平台号",
  "creatorName": "创作者名称",
  "avatarUrl": "头像URL",
  "description": "简介",
  "followersCount": 10000,
  "bloggerUrl": "创作者主页URL",
  "captureTimestamp": 1736000000000
}
```

## 使用方法

### 安装插件

1. 打开 Chrome 浏览器
2. 访问 `chrome://extensions/`
3. 开启"开发者模式"
4. 点击"加载已解压的扩展程序"
5. 选择插件文件夹

### 收藏单篇笔记

1. 访问平台笔记详情页
2. 点击浏览器工具栏中的插件图标
3. 在侧边栏中点击"收藏笔记"

### 批量收藏笔记

1. 访问平台创作者主页
2. 点击插件图标
3. 在侧边栏中点击"批量收藏"

### 收藏创作者信息

1. 访问平台创作者主页
2. 点击插件图标
3. 在侧边栏中点击"收藏创作者信息"

## 依赖说明

- **qiniu.min.js**：七牛云 JS SDK，用于将图片上传到七牛云 CDN。该文件需放在插件根目录，由 `sidebar.html` 引入。若同步后图片仍为小红书 URL，请检查此文件是否存在。

## 故障排查

### 收藏失败

- 检查网络连接
- 查看浏览器控制台错误
- 确认后端服务运行正常

### 同步后图片仍为小红书 URL（未转七牛云）

插件会显示具体失败原因，常见情况：

1. **「图片下载失败」**
   - 保持**小红书笔记页**为当前激活标签页，不要切换到其他标签
   - 若提示「请刷新小红书页面」：刷新后重新采集并同步
   - 若提示「跨域限制/防盗链」：平台 CDN 限制跨域读取，需后端代理方案

2. **「获取七牛云 token 失败」**
   - 检查 API Key 是否已配置
   - 确认后端七牛云环境变量已配置（QINIU_ACCESS_KEY 等）

3. **「上传七牛云失败」**
   - 检查网络连接
   - 查看浏览器控制台完整错误信息

### CORS 错误

- 确认插件域名已在后端 CORS 白名单中
- 检查 BASE_URL 配置是否正确

## 安全说明

- 插件无需登录即可同步数据
- 后端 API 通过域名白名单控制访问
- 敏感信息（API 密钥等）不在插件中存储
