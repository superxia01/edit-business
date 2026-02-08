// 插件启动时初始化侧边栏（只设置路径，不打开）
chrome.runtime.onInstalled.addListener(async () => {
  try {
    // 设置全局侧边栏路径（这个可以在任何时候调用）
    await chrome.sidePanel.setOptions({
      path: 'sidebar.html',
      enabled: true
    });
    console.log('侧边栏路径初始化成功');
  } catch (error) {
    console.error('侧边栏路径初始化失败:', error);
  }
});

// 当插件图标被点击时，打开侧边栏
// 注意：sidePanel.open() 必须在用户手势的响应中直接调用，不能放在异步操作之后
chrome.action.onClicked.addListener((tab) => {
  // 直接调用 open，不要使用 async/await，因为必须在用户手势响应中立即调用
  chrome.sidePanel.open({ tabId: tab.id }).then(() => {
    console.log('侧边栏打开成功');
  }).catch((error) => {
    console.error('打开侧边栏失败:', error);
    // 如果使用 tabId 失败，尝试使用 windowId
    chrome.sidePanel.open({ windowId: tab.windowId }).then(() => {
      console.log('使用 windowId 打开侧边栏成功');
    }).catch((windowError) => {
      console.error('使用 windowId 打开侧边栏也失败:', windowError);
    });
  });
});

// 监听来自popup或侧边栏的消息
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'fetchImage') {
    // Background 有 host_permissions，可跨域拉取 xhscdn 图片
    const imageUrl = message.imageUrl;
    if (!imageUrl || typeof imageUrl !== 'string') {
      sendResponse({ success: false, error: '缺少图片URL' });
      return true;
    }
    fetch(imageUrl, { mode: 'cors' })
      .then(res => {
        if (!res.ok) throw new Error('HTTP ' + res.status);
        return res.blob();
      })
      .then(blob => {
        const reader = new FileReader();
        reader.onloadend = () => sendResponse({ success: true, base64: reader.result });
        reader.onerror = () => sendResponse({ success: false, error: 'Blob 转 base64 失败' });
        reader.readAsDataURL(blob);
      })
      .catch(err => {
        sendResponse({ success: false, error: err.message || '拉取图片失败' });
      });
    return true; // 保持消息通道开启，用于异步 sendResponse
  }
  return true;
});