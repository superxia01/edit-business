// 在文件顶部添加消息监听器
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
  if (request.action === 'captureProgress') {
    // 显示进度信息，但不自动清除
    showStatus(request.message + `\n已发现${request.currentCount}条笔记`);
  } else if (request.action === 'bloggerInfoCaptured') {
    // 处理创作者信息收藏结果
    if (request.success) {
      capturedBloggerInfo = request.data;
      updateBloggerInfoDisplay();
      checkAndUpdateButtonStatus();
      showStatus('创作者信息收藏成功');
    } else {
      showStatus('创作者信息收藏失败: ' + request.error);
    }
  }
});

// 全局变量存储收藏的链接数据
let capturedLinks = [];
let capturedNote = null; // 单条内容收藏结果
let capturedBloggerInfo = null; // 创作者信息收藏结果
let capturedNoteTabId = null; // 单条采集时的标签页 ID，用于同步时下载图片
let capturedLinksTabId = null; // 批量采集时的标签页 ID

// 防止重复初始化的标志
let isInitialized = false;

// 初始化函数
function initializeApp() {
  // 防止重复初始化
  if (isInitialized) {
    console.log('应用已经初始化，跳过重复初始化');
    return;
  }
  
  console.log('开始初始化应用...');
  
  // 检查必要的元素是否存在
  const requiredElements = [
    'singleCaptureTab', 'captureTab', 'bloggerInfoTab', 'configTab',
    'singleCaptureContent', 'captureContent', 'bloggerInfoContent', 'configContent'
  ];
  
  const missingElements = requiredElements.filter(id => !document.getElementById(id));
  if (missingElements.length > 0) {
    console.error('缺少必要的DOM元素:', missingElements);
    // 延迟重试
    setTimeout(() => {
      if (!isInitialized) {
        console.log('延迟重试初始化...');
        initializeApp();
      }
    }, 100);
    return;
  }
  
  try {
    // 初始化Tab切换功能
    initTabSwitching();
    
    // 先显示默认激活的Tab内容
    const activeTab = document.querySelector('.tab-button.active');
    if (activeTab) {
      if (activeTab.id === 'singleCaptureTab') {
        const content = document.getElementById('singleCaptureContent');
        if (content) {
          content.classList.add('active');
          content.style.display = 'block';
        }
      } else if (activeTab.id === 'captureTab') {
        const content = document.getElementById('captureContent');
        if (content) {
          content.classList.add('active');
          content.style.display = 'block';
        }
      } else if (activeTab.id === 'bloggerInfoTab') {
        const content = document.getElementById('bloggerInfoContent');
        if (content) {
          content.classList.add('active');
          content.style.display = 'block';
        }
      } else if (activeTab.id === 'configTab') {
        const content = document.getElementById('configContent');
        if (content) {
          content.classList.add('active');
          content.style.display = 'block';
        }
      }
    }
    
    // 初始化按钮事件监听
    initButtonListeners();
    
    // 初始化收藏的链接展示
    updateCapturedLinksDisplay();
    updateSingleNoteDisplay();
    updateBloggerInfoDisplay();
    
    // 检查并更新导出和同步按钮状态
    checkAndUpdateButtonStatus();
    
    // 标记为已初始化
    isInitialized = true;
    console.log('应用初始化完成');
  } catch (error) {
    console.error('初始化过程中出错:', error);
    isInitialized = false; // 允许重试
  }
}

// 统一的初始化入口
function startInitialization() {
  // 如果已经初始化，直接返回
  if (isInitialized) {
    return;
  }
  
  // 检查DOM是否准备好
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', function() {
      setTimeout(initializeApp, 50); // 稍微延迟确保所有元素都已渲染
    });
  } else {
    // DOM已经加载完成，稍微延迟后初始化
    setTimeout(initializeApp, 50);
  }
  
  // 备用方案：如果上面的初始化失败，使用window.onload
  window.addEventListener('load', function() {
    if (!isInitialized) {
      console.log('使用 window.onload 备用方案初始化');
      setTimeout(initializeApp, 100);
    }
  });
}

// 开始初始化
startInitialization();

// 初始化Tab切换功能
function initTabSwitching() {
  try {
    // 检查是否已经初始化过，避免重复绑定
    if (document.querySelector('.tab-button[data-initialized="true"]')) {
      console.log('Tab切换功能已经初始化，跳过');
      return;
    }
    
    const captureTab = document.getElementById('captureTab');
    const configTab = document.getElementById('configTab');
    const singleCaptureTab = document.getElementById('singleCaptureTab');
    const bloggerInfoTab = document.getElementById('bloggerInfoTab');
    
    const captureContent = document.getElementById('captureContent');
    const configContent = document.getElementById('configContent');
    const singleCaptureContent = document.getElementById('singleCaptureContent');
    const bloggerInfoContent = document.getElementById('bloggerInfoContent');
    
    // 检查所有元素是否存在
    if (!captureTab || !configTab || !singleCaptureTab || !bloggerInfoTab) {
      console.error('Tab 按钮元素未找到', {
        captureTab: !!captureTab,
        configTab: !!configTab,
        singleCaptureTab: !!singleCaptureTab,
        bloggerInfoTab: !!bloggerInfoTab
      });
      return;
    }
    
    if (!captureContent || !configContent || !singleCaptureContent || !bloggerInfoContent) {
      console.error('Tab 内容面板元素未找到', {
        captureContent: !!captureContent,
        configContent: !!configContent,
        singleCaptureContent: !!singleCaptureContent,
        bloggerInfoContent: !!bloggerInfoContent
      });
      return;
    }
    
    // 收藏Tab点击事件 - 使用更直接的方式
    captureTab.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('点击了创作者笔记Tab', captureTab, captureContent);
      switchTab(captureTab, captureContent);
    };
    
    // 配置Tab点击事件
    configTab.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('点击了设置Tab', configTab, configContent);
      switchTab(configTab, configContent);
      loadApiKey();
    };
    
    // 单篇收藏Tab点击事件
    singleCaptureTab.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('点击了单条内容Tab', singleCaptureTab, singleCaptureContent);
      switchTab(singleCaptureTab, singleCaptureContent);
    };
    
    // 创作者信息Tab点击事件
    bloggerInfoTab.onclick = function(e) {
      e.preventDefault();
      e.stopPropagation();
      console.log('点击了创作者信息Tab', bloggerInfoTab, bloggerInfoContent);
      switchTab(bloggerInfoTab, bloggerInfoContent);
    };
    
    // 标记所有 Tab 已初始化
    captureTab.setAttribute('data-initialized', 'true');
    configTab.setAttribute('data-initialized', 'true');
    singleCaptureTab.setAttribute('data-initialized', 'true');
    bloggerInfoTab.setAttribute('data-initialized', 'true');
    
    console.log('Tab 切换功能初始化成功，所有Tab按钮已绑定事件');
  } catch (error) {
    console.error('初始化Tab切换功能时出错:', error);
  }
}

// 切换Tab的辅助函数
function switchTab(activeTab, activeContent) {
  try {
    if (!activeTab || !activeContent) {
      console.error('switchTab: 参数无效', { 
        activeTab: activeTab ? activeTab.id : 'null',
        activeContent: activeContent ? activeContent.id : 'null'
      });
      return;
    }
    
    console.log('开始切换Tab:', activeTab.id, '->', activeContent.id);
    
    // 移除所有active类
    const allTabs = document.querySelectorAll('.tab-button');
    const allPanes = document.querySelectorAll('.tab-pane');
    
    console.log('找到', allTabs.length, '个Tab按钮和', allPanes.length, '个内容面板');
    
    allTabs.forEach(tab => {
      tab.classList.remove('active');
    });
    
    allPanes.forEach(content => {
      content.classList.remove('active');
      // 确保隐藏
      content.style.display = 'none';
    });
    
    // 添加active类到当前选中的Tab和内容
    activeTab.classList.add('active');
    activeContent.classList.add('active');
    activeContent.style.display = 'block';
    
    console.log('Tab切换成功:', activeTab.id, '内容面板已显示');
    
    // 验证切换结果
    const isActive = activeTab.classList.contains('active') && activeContent.classList.contains('active');
    console.log('切换验证:', isActive ? '成功' : '失败');
  } catch (error) {
    console.error('切换Tab时出错:', error);
  }
}

// 初始化按钮事件监听
function initButtonListeners() {
  try {
    // 开始收藏按钮
    const startCaptureBtn = document.getElementById('startCaptureBtn');
    if (startCaptureBtn) {
      startCaptureBtn.addEventListener('click', function() {
        startCapture();
      });
    }
    
    // 清空按钮
    const clearAllBtn = document.getElementById('clearAllBtn');
    if (clearAllBtn) {
      clearAllBtn.addEventListener('click', function() {
        clearAllNotes();
      });
    }
    
    // 导出Excel按钮
    const exportExcelBtn = document.getElementById('exportExcelBtn');
    if (exportExcelBtn) {
      exportExcelBtn.addEventListener('click', function() {
        exportToExcel();
      });
    }
    
    // 同步按钮
    const syncFeishuBtn = document.getElementById('syncFeishuBtn');
    if (syncFeishuBtn) {
      syncFeishuBtn.addEventListener('click', function() {
        syncToFeishu();
      });
    }
    
    // 单篇收藏相关按钮
    const startSingleCaptureBtn = document.getElementById('startSingleCaptureBtn');
    if (startSingleCaptureBtn) {
      startSingleCaptureBtn.addEventListener('click', function() {
        startSingleCapture();
      });
    }
    
    // 添加清空单篇收藏按钮的事件绑定
    const clearSingleCaptureBtn = document.getElementById('clearSingleCaptureBtn');
    if (clearSingleCaptureBtn) {
      clearSingleCaptureBtn.addEventListener('click', function() {
        clearSingleCapture();
      });
    }
    
    const exportSingleExcelBtn = document.getElementById('exportSingleExcelBtn');
    if (exportSingleExcelBtn) {
      exportSingleExcelBtn.addEventListener('click', function() {
        exportSingleNoteToExcel();
      });
    }
    
    // 新增下载图片视频按钮事件绑定
    const downloadMediaBtn = document.getElementById('downloadMediaBtn');
    if (downloadMediaBtn) {
      downloadMediaBtn.addEventListener('click', function() {
        downloadAllMedia();
      });
    }
    
    const syncSingleFeishuBtn = document.getElementById('syncSingleFeishuBtn');
    if (syncSingleFeishuBtn) {
      syncSingleFeishuBtn.addEventListener('click', function() {
        syncSingleNoteToFeishu();
      });
    }
    
    // 创作者信息相关按钮
    const startBloggerCaptureBtn = document.getElementById('startBloggerCaptureBtn');
    if (startBloggerCaptureBtn) {
      startBloggerCaptureBtn.addEventListener('click', function() {
        startBloggerCapture();
      });
    }
    
    // 创作者信息页面的清空按钮
    const clearBloggerBtn = document.getElementById('clearBloggerBtn');
    if (clearBloggerBtn) {
      clearBloggerBtn.addEventListener('click', function() {
        clearBloggerInfo();
      });
    }
    
    // 添加创作者信息页面的导出Excel按钮事件监听
    const exportBloggerExcelBtn = document.getElementById('exportBloggerExcelBtn');
    if (exportBloggerExcelBtn) {
      exportBloggerExcelBtn.addEventListener('click', function() {
        exportBloggerInfoToExcel();
      });
    }
    
    // 添加创作者信息页面的同步按钮事件监听
    const syncBloggerFeishuBtn = document.getElementById('syncBloggerFeishuBtn');
    if (syncBloggerFeishuBtn) {
      syncBloggerFeishuBtn.addEventListener('click', function() {
        syncBloggerInfoToFeishu();
      });
    }
    
    console.log('所有按钮事件监听器已成功绑定');
  } catch (error) {
    console.error('初始化按钮事件监听器时出错:', error);
    showStatus('初始化按钮失败，请刷新页面重试');
  }
}

// 清空所有笔记函数
function clearAllNotes() {
  // 显示确认对话框，防止用户误操作
  if (confirm('确定要清空所有收藏的笔记吗？此操作不可撤销。')) {
    // 清空capturedLinks数组
    capturedLinks = [];
    capturedLinksTabId = null;
    
    // 更新UI显示，移除所有收藏结果卡片
    updateCapturedLinksDisplay();
    
    // 更新按钮状态，确保导出和同步按钮也被正确禁用
    checkAndUpdateButtonStatus();
    
    // 显示状态信息，告知用户操作已完成
    showStatus('已清空所有收藏的笔记');
  }
}

// 检查并更新导出和同步按钮状态
function checkAndUpdateButtonStatus() {
  const exportButton = document.getElementById('exportExcelBtn');
  const syncButton = document.getElementById('syncFeishuBtn');
  const clearButton = document.getElementById('clearAllBtn');
  const singleExportButton = document.getElementById('exportSingleExcelBtn');
  const singleSyncButton = document.getElementById('syncSingleFeishuBtn');
  // 新增下载按钮引用
  const downloadMediaBtn = document.getElementById('downloadMediaBtn');
  // 新增单篇收藏清除按钮引用
  const clearSingleCaptureBtn = document.getElementById('clearSingleCaptureBtn');
  
  // 创作者信息相关按钮
  const clearBloggerButton = document.getElementById('clearBloggerBtn');
  const exportBloggerButton = document.getElementById('exportBloggerExcelBtn');
  const syncBloggerButton = document.getElementById('syncBloggerFeishuBtn');
  
  // 更新普通收藏相关按钮状态
  exportButton.disabled = capturedLinks.length === 0;
  syncButton.disabled = capturedLinks.length === 0;
  clearButton.disabled = capturedLinks.length === 0;
  
  // 更新单篇收藏相关按钮状态
  singleExportButton.disabled = capturedNote === null;
  singleSyncButton.disabled = capturedNote === null;
  downloadMediaBtn.disabled = capturedNote === null;
  clearSingleCaptureBtn.disabled = capturedNote === null; // 添加单篇收藏清除按钮的状态管理
  
  // 更新创作者信息相关按钮状态
  clearBloggerButton.disabled = capturedBloggerInfo === null;
  exportBloggerButton.disabled = capturedBloggerInfo === null;
  syncBloggerButton.disabled = capturedBloggerInfo === null;
}

// 开始收藏函数
function startCapture() {
  // 清空之前的收藏结果
  capturedLinks = [];
  capturedLinksTabId = null;
  updateCapturedLinksDisplay();
  
  // 更明显的收藏状态提示
  showStatus('正在收藏中，请稍后...\n收藏过程中请勿关闭插件窗口');
  
  // 禁用开始收藏按钮防止重复点击
  const captureBtn = document.getElementById('startCaptureBtn');
  const originalText = captureBtn.textContent;
  captureBtn.disabled = true;
  captureBtn.textContent = '收藏ing...';
  
  // 向content script发送消息，开始收藏
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'startCapture'}, function(response) {
      // 恢复按钮状态
      captureBtn.disabled = false;
      captureBtn.textContent = originalText;
      
      if (chrome.runtime.lastError) {
        showStatus('收藏失败，请确保您在平台创作者主页上使用此功能');
        return;
      }
      
      // 检查response是否包含links字段来判断成功
      if (response && response.links && response.links.length > 0) {
        capturedLinks = response.links;
        capturedLinksTabId = tabs[0].id; // 保存标签页 ID，同步时用于下载图片
        showStatus(`成功收藏到 ${capturedLinks.length} 条笔记`);
        updateCapturedLinksDisplay();
        checkAndUpdateButtonStatus();
      } else {
        // 正确显示错误信息
        showStatus('收藏失败：' + (response && response.error ? response.error : '未能收藏到任何链接，请确保在创作者主页上使用此功能，并等待页面完全加载'));
      }
    });
  });
}

// 更新收藏的链接展示
function updateCapturedLinksDisplay() {
  const container = document.getElementById('capturedLinksContainer');
  container.innerHTML = '';
  
  if (capturedLinks.length === 0) {
    container.innerHTML = '<p style="text-align: center; color: #999; margin: 20px 0;">暂无收藏的笔记</p>';
    return;
  }
  
  capturedLinks.forEach((link, index) => {
    const card = document.createElement('div');
    card.className = 'card';
    card.innerHTML = `
      <div class="image-container">
        <div class="card-number">${index + 1}</div>
        ${link.image ? 
          `<img src="${link.image}" alt="${link.title}">` : 
          '<div class="placeholder">无图片</div>'}
      </div>
      <div class="card-content">
        <a href="${link.url}" class="card-title" target="_blank" rel="noopener noreferrer">
          ${link.title || '无标题'}
        </a>
        <div class="card-author">${link.author || '未知作者'}</div>
        <div class="card-likes">点赞数: ${link.likes || 0}</div>
      </div>
      <button class="delete-button" data-index="${index}">删除</button>
    `;
    
    container.appendChild(card);
  });
  
  // 为删除按钮添加事件监听
  document.querySelectorAll('.delete-button').forEach(button => {
    button.addEventListener('click', function(e) {
      e.preventDefault();
      const index = parseInt(this.getAttribute('data-index'));
      deleteNote(index);
    });
  });
}

// 删除笔记函数
function deleteNote(index) {
  if (index >= 0 && index < capturedLinks.length) {
    capturedLinks.splice(index, 1);
    updateCapturedLinksDisplay();
    checkAndUpdateButtonStatus();
    showStatus('笔记已删除');
  }
}

// 导出Excel函数
function exportToExcel() {
  if (capturedLinks.length === 0) {
    showStatus('没有可导出的笔记数据');
    return;
  }
  
  showStatus('正在导出Excel，请稍候...');
  
  try {
    // 准备CSV数据
    let csvContent = '\ufeff标题,链接,作者,点赞数,图片链接\n'; // BOM字符确保中文正常显示
    
    capturedLinks.forEach(note => {
      // 处理CSV中的特殊字符
      const title = note.title ? note.title.replace(/"/g, '""').replace(/,/g, '，') : '无标题';
      const url = note.url || '';
      const author = note.author ? note.author.replace(/"/g, '""').replace(/,/g, '，') : '未知作者';
      const likes = note.likes || 0;
      const imageUrl = note.image || '';
      
      // 添加CSV行
      csvContent += `"${title}","${url}","${author}","${likes}","${imageUrl}"\n`;
    });
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // 设置下载属性
    link.setAttribute('href', url);
    link.setAttribute('download', `平台笔记_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    
    // 添加到文档并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus(`成功导出 ${capturedLinks.length} 条笔记到Excel`);
  } catch (error) {
    console.error('导出Excel时出错:', error);
    showStatus('导出Excel失败，请重试');
  }
}

// 显示状态信息 - 优化版
function showStatus(message) {
  const statusElement = document.getElementById('status');
  // 使用innerHTML替代textContent，以便正确解析HTML标签
  statusElement.innerHTML = message;
  
  // 移除自动清除逻辑，让提示内容一直显示直到下一次操作
}

// 判断是否为 xhscdn 等需 Background 拉取的域名（防盗链/跨域）
function isXhsCdnUrl(url) {
  return url && (url.includes('xhscdn.com') || url.includes('xhsstatic.com'));
}

// 通过 Background 拉取媒体并触发下载（规避 CORS/防盗链）
async function downloadViaBackground(url, fileName) {
  const result = await chrome.runtime.sendMessage({ action: 'fetchImage', imageUrl: url });
  if (!result || !result.success || !result.base64) {
    throw new Error(result?.error || '拉取失败');
  }
  const blob = base64ToBlob(result.base64);
  const blobUrl = URL.createObjectURL(blob);
  return new Promise((resolve, reject) => {
    chrome.downloads.download({
      url: blobUrl,
      filename: fileName,
      saveAs: false,
      conflictAction: 'uniquify'
    }, () => {
      URL.revokeObjectURL(blobUrl);
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

// 优化下载图片视频函数
async function downloadAllMedia() {
  if (capturedNote === null) {
    showStatus('没有可下载的媒体数据');
    return;
  }

  // 收集所有图片和视频链接
  const mediaUrls = [];

  // 添加所有图片链接
  if (capturedNote.imageUrls) {
    const imageArray = capturedNote.imageUrls.split(',');
    mediaUrls.push(...imageArray.filter(url => url.trim() !== ''));
  }

  // 添加视频链接
  if (capturedNote.videoUrl && capturedNote.videoUrl.trim() !== '') {
    mediaUrls.push(capturedNote.videoUrl);
  }

  if (mediaUrls.length === 0) {
    showStatus('没有找到可下载的图片或视频');
    return;
  }

  // 禁用按钮防止重复点击
  const downloadBtn = document.getElementById('downloadMediaBtn');
  const originalText = downloadBtn.textContent;
  downloadBtn.disabled = true;
  downloadBtn.textContent = '下载中...';

  try {
    showStatus('正在下载媒体文件，请稍候...');

    let downloadedCount = 0;
    let failedCount = 0;
    const noteTitle = capturedNote.title ? capturedNote.title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 15) : '平台笔记';

    for (let index = 0; index < mediaUrls.length; index++) {
      const url = mediaUrls[index];
      const fileExtension = url.match(/\.\w+($|\?)/) ? url.match(/\.\w+($|\?)/)[0].split('?')[0] : '.jpg';
      const fileName = `${noteTitle}_media_${index + 1}${fileExtension}`;

      try {
        if (isXhsCdnUrl(url)) {
          // xhscdn：用 Background 拉取后下载（规避 CORS）
          await downloadViaBackground(url, fileName);
        } else {
          // 其他：直接下载
          await new Promise((resolve, reject) => {
            chrome.downloads.download({
              url: url,
              filename: fileName,
              saveAs: false,
              conflictAction: 'uniquify'
            }, () => {
              if (chrome.runtime.lastError) {
                reject(chrome.runtime.lastError);
              } else {
                resolve();
              }
            });
          });
        }
        downloadedCount++;
      } catch (err) {
        console.error('下载失败:', url, err);
        failedCount++;
      }
    }

    downloadBtn.disabled = false;
    downloadBtn.textContent = originalText;
    if (failedCount > 0) {
      showStatus(`下载完成：成功 ${downloadedCount} 个，失败 ${failedCount} 个`);
    } else {
      showStatus(`成功下载 ${downloadedCount} 个媒体文件到浏览器默认下载文件夹`);
    }
  } catch (error) {
    console.error('下载媒体时出错:', error);
    showStatus('下载失败：' + (error.message || '请稍后重试'));
    downloadBtn.disabled = false;
    downloadBtn.textContent = originalText;
  }
}

// 优化单篇收藏函数
function startSingleCapture() {
  // 清空之前的收藏结果，确保完全重置对象
  capturedNote = null;
  capturedNoteTabId = null;
  updateSingleNoteDisplay();
  
  // 显示收藏状态提示
  showStatus('正在收藏单条内容，请稍后...');
  
  // 禁用开始收藏按钮防止重复点击
  const captureBtn = document.getElementById('startSingleCaptureBtn');
  const originalText = captureBtn.textContent;
  captureBtn.disabled = true;
  captureBtn.textContent = '收藏ing...';
  
  // 设置超时处理
  const timeoutId = setTimeout(() => {
    if (captureBtn.disabled) {
      showStatus('收藏超时，请刷新页面后重试');
      captureBtn.disabled = false;
      captureBtn.textContent = originalText;
    }
  }, 15000); // 15秒超时
  
  // 首先检查是否在笔记详情页
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    chrome.tabs.sendMessage(tabs[0].id, {action: 'checkIsNotePage'}, function(response) {
      // 清除超时定时器
      clearTimeout(timeoutId);
      
      if (chrome.runtime.lastError) {
        showStatus('请确保您在平台网页版上使用此功能');
        captureBtn.disabled = false;
        captureBtn.textContent = originalText;
        return;
      }
      
      if (!response || !response.isNotePage) {
        showStatus('请确保在平台笔记详情页上使用此功能');
        captureBtn.disabled = false;
        captureBtn.textContent = originalText;
        return;
      }
      
      // 确认在笔记详情页后，开始提取数据
      chrome.tabs.sendMessage(tabs[0].id, {action: 'extractNoteData'}, function(response) {
        // 恢复按钮状态
        captureBtn.disabled = false;
        captureBtn.textContent = originalText;
        
        if (chrome.runtime.lastError) {
          showStatus('提取笔记数据失败，请刷新页面后重试');
          return;
        }
        
        if (response && response.success && response.data) {
          // 完全重新创建对象，确保不继承任何残留属性
          capturedNote = {
            url: response.data.url || '',
            title: response.data.title || '',
            author: response.data.author || '',
            content: response.data.content || '',
            tags: response.data.tags || '',
            likes: response.data.likes || 0,
            collects: response.data.collects || 0,
            comments: response.data.comments || 0,
            publishDate: response.data.publishDate || '',
            imageUrls: response.data.imageUrls || '',
            formattedImageUrls: response.data.formattedImageUrls || '',
            noteType: response.data.noteType || '',
            coverImageUrl: response.data.coverImageUrl || '',
            captureTimestamp: response.data.captureTimestamp || '',
            captureRemark: response.data.captureRemark || ''
          };
          
          // 只有当明确是视频笔记时才添加videoUrl字段
          if (response.data.videoUrl && response.data.videoUrl.trim() !== '' && 
              response.data.noteType === '视频') {
            capturedNote.videoUrl = response.data.videoUrl;
          }
          capturedNoteTabId = tabs[0].id; // 保存标签页 ID，同步时用于下载图片
          
          showStatus('成功收藏到单条内容');
          updateSingleNoteDisplay();
          checkAndUpdateButtonStatus();
        } else {
          showStatus('收藏失败：' + (response && response.error ? response.error : '未能提取到笔记数据'));
        }
      });
    });
  });
}

// 开始收藏创作者信息函数
function startBloggerCapture() {
  // 发送消息到content.js开始收藏创作者信息
  chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
    if (tabs.length > 0) {
      // 显示收藏状态
      showStatus('正在收藏创作者信息...');
      
      // 向content.js发送消息开始收藏
      chrome.tabs.sendMessage(tabs[0].id, {action: 'startCaptureBloggerInfo'}, function(response) {
        if (chrome.runtime.lastError) {
          showStatus('收藏失败: 无法与页面通信，请刷新页面后重试');
        }
      });
    } else {
      showStatus('请先选择一个平台页面');
    }
  });
}

// 清空创作者信息函数
function clearBloggerInfo() {
  if (confirm('确定要清空收藏的创作者信息吗？')) {
    capturedBloggerInfo = null;
    updateBloggerInfoDisplay();
    checkAndUpdateButtonStatus();
    showStatus('已清空创作者信息');
  }
}

// 导出创作者信息到Excel
function exportBloggerInfoToExcel() {
  if (capturedBloggerInfo === null) {
    showStatus('没有可导出的创作者信息数据');
    return;
  }
  
  showStatus('正在导出Excel，请稍候...');
  
  try {
    // 准备CSV数据 - 包含所有要求的字段
    let csvContent = '\ufeff创作者名称,头像链接,平台号,简介,粉丝数,创作者主页链接,收藏时间\n'; // BOM字符确保中文正常显示
    
    // 获取创作者信息
    const bloggerInfo = capturedBloggerInfo;
    
    // 处理CSV中的特殊字符
    const name = bloggerInfo.bloggerName || bloggerInfo.name || '';
    const avatarUrl = bloggerInfo.avatarUrl || bloggerInfo.avatar || '';
    const bloggerId = bloggerInfo.bloggerId || bloggerInfo.userId || bloggerInfo.xiaohongshuId || '';
    const description = bloggerInfo.description || bloggerInfo.bio || '';
    const followersCount = bloggerInfo.followersCount || bloggerInfo.fansCount || 0;
    const bloggerUrl = bloggerInfo.bloggerUrl || bloggerInfo.profileUrl || bloggerInfo.url || '';
    const captureTimestamp = new Date().getTime(); // 中国日期的时间戳格式
    
    // 处理特殊字符
    const cleanName = name.replace(/"/g, '""').replace(/,/g, '，');
    const cleanDescription = description.replace(/"/g, '""').replace(/,/g, '，');
    
    // 添加CSV行
    csvContent += '"' + cleanName + '","' + avatarUrl + '","' + bloggerId + '","' + cleanDescription + '","' + followersCount + '","' + bloggerUrl + '","' + captureTimestamp + '"\n';
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    
    // 设置下载属性
    link.setAttribute('href', url);
    link.setAttribute('download', '平台创作者信息_' + new Date().toLocaleDateString('zh-CN').replace(/\//g, '-') + '.csv');
    link.style.visibility = 'hidden';
    
    // 添加到文档并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('成功导出创作者信息到Excel');
  } catch (error) {
    console.error('导出Excel时出错:', error);
    showStatus('导出Excel失败，请重试');
  }
}

// 更新单条内容展示
function updateSingleNoteDisplay() {
  const container = document.getElementById('singleCapturedNotesContainer');
  container.innerHTML = '';
  
  if (capturedNote === null) {
    container.innerHTML = '<p style="text-align: center; color: #999; margin: 20px 0;">暂无收藏的笔记</p>';
    return;
  }
  
  const card = document.createElement('div');
  card.className = 'card';
  
  // 提取图片显示 - 与创作者笔记保持一致的逻辑
  const imageUrls = capturedNote.imageUrls ? capturedNote.imageUrls.split(',') : [];
  const displayImage = imageUrls.length > 0 ? imageUrls[0] : (capturedNote.videoUrl ? capturedNote.videoUrl : '');
  
  card.innerHTML = `
    <div class="image-container">
      <div class="card-number">1</div>
      ${displayImage ? 
        `<img src="${displayImage}" alt="${capturedNote.title}">` : 
        '<div class="placeholder">无图片</div>'}
    </div>
    <div class="card-content">
      <a href="${capturedNote.url}" class="card-title" target="_blank" rel="noopener noreferrer">
        ${capturedNote.title || '无标题'}
      </a>
      <div class="card-author">${capturedNote.author || '未知作者'}</div>
      <div class="card-likes">点赞数: ${capturedNote.likes || 0}</div>
    </div>
  `;
  
  container.appendChild(card);
}

// 更新创作者信息展示
function updateBloggerInfoDisplay() {
  const container = document.getElementById('bloggerInfoContainer');
  container.innerHTML = '';
  
  if (capturedBloggerInfo === null) {
    container.innerHTML = '<p style="text-align: center; color: #999; margin: 20px 0;">暂无收藏的创作者信息</p>';
    return;
  }
  
  const card = document.createElement('div');
  card.className = 'card'; // 使用与创作者笔记相同的卡片样式
  
  const bloggerUrl = capturedBloggerInfo.bloggerUrl || capturedBloggerInfo.profileUrl || capturedBloggerInfo.url;
  
  card.innerHTML = `
    <div class="image-container blogger-avatar-container">
      <img src="${capturedBloggerInfo.avatarUrl || capturedBloggerInfo.avatar}" alt="${capturedBloggerInfo.bloggerName || capturedBloggerInfo.name}">
    </div>
    <div class="card-content">
      <a href="${bloggerUrl}" class="card-title" target="_blank" rel="noopener noreferrer">
        ${capturedBloggerInfo.bloggerName || capturedBloggerInfo.name}
      </a>
      <div class="card-author">平台号: ${capturedBloggerInfo.bloggerId || capturedBloggerInfo.userId || capturedBloggerInfo.xiaohongshuId}</div>
      <div class="card-stats">
        <span class="stat-item">粉丝数: ${capturedBloggerInfo.followersCount || capturedBloggerInfo.fansCount}</span>
      </div>
    </div>
  `;
  
  container.appendChild(card);
}

// 添加清空单篇收藏结果的函数
function clearSingleCapture() {
  // 显示确认对话框，防止用户误操作
  if (confirm('确定要清空单篇收藏的笔记吗？此操作不可撤销。')) {
    // 完全清空capturedNote对象，确保不残留任何属性
    capturedNote = null;
    
    // 更新UI显示
    updateSingleNoteDisplay();
    
    // 更新按钮状态
    checkAndUpdateButtonStatus();
    
    // 显示状态信息
    showStatus('已清空单篇收藏的笔记');
  }
}

// 导出单条内容到Excel
function exportSingleNoteToExcel() {
  if (capturedNote === null) {
    showStatus('没有可导出的笔记数据');
    return;
  }
  
  showStatus('正在导出Excel，请稍候...');
  
  try {
    // 准备CSV数据 - 包含所有要求的字段
    let csvContent = '\ufeff标题,笔记链接,笔记类型,作者,正文,话题标签,封面链接,全部图片链接,视频链接,点赞数,收藏数,评论数,发布时间,收藏时间\n'; // BOM字符确保中文正常显示
    
    // 处理CSV中的特殊字符
    const title = capturedNote.title ? capturedNote.title.replace(/"/g, '""').replace(/,/g, '，') : '无标题';
    const url = capturedNote.url || '';
    const noteType = capturedNote.videoUrl ? '视频' : '图文';
    const author = capturedNote.author ? capturedNote.author.replace(/"/g, '""').replace(/,/g, '，') : '未知作者';
    const content = capturedNote.content ? capturedNote.content.replace(/"/g, '""').replace(/,/g, '，') : '';
    
    // 处理话题标签，去除#符号
    let tags = '';
    if (capturedNote.tags) {
      tags = capturedNote.tags.split(',').map(tag => tag.replace(/#/g, '').trim()).join('、');
    }
    
    // 处理封面链接
    const coverLink = capturedNote.imageUrls ? capturedNote.imageUrls.split(',')[0] : '';
    
    // 处理全部图片链接，按"图X=(链接)"格式组合带换行
    let formattedImageUrls = '';
    if (capturedNote.imageUrls) {
      const imageArray = capturedNote.imageUrls.split(',');
      formattedImageUrls = imageArray.map((img, index) => `图${index + 1}=(${img})`).join('\n');
    }
    
    const videoUrl = capturedNote.videoUrl || '';
    const likes = capturedNote.likes || 0;
    const collects = capturedNote.collects || 0;
    const comments = capturedNote.comments || 0;
    const publishDate = capturedNote.publishDate || '';
    const captureTimestamp = new Date().getTime(); // 中国日期的时间戳格式
    
    // 添加CSV行
    csvContent += `"${title}","${url}","${noteType}","${author}","${content}","${tags}","${coverLink}","${formattedImageUrls}","${videoUrl}","${likes}","${collects}","${comments}","${publishDate}","${captureTimestamp}"\n`;
    
    // 创建Blob对象
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 创建下载链接
    const link = document.createElement('a');
    const urlBlob = URL.createObjectURL(blob);
    
    // 设置下载属性
    link.setAttribute('href', urlBlob);
    link.setAttribute('download', `平台单条内容_${new Date().toLocaleDateString('zh-CN').replace(/\//g, '-')}.csv`);
    link.style.visibility = 'hidden';
    
    // 添加到文档并触发下载
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    showStatus('成功导出单条内容到Excel');
  } catch (error) {
    console.error('导出Excel时出错:', error);
    showStatus('导出Excel失败，请重试');
  }
}

// ============================================
// API Key 管理功能（添加到文件末尾，不破坏现有逻辑）
// ============================================

// 加载保存的 API Key
function loadApiKey() {
  const apiKey = localStorage.getItem('edit-business-api-key') || '';
  const apiKeyInput = document.getElementById('apiKey');
  if (apiKeyInput) {
    apiKeyInput.value = apiKey;
  }
  updateApiKeyStatus(apiKey);
}

// 保存 API Key
function saveApiKey() {
  const apiKeyInput = document.getElementById('apiKey');
  const apiKey = apiKeyInput ? apiKeyInput.value.trim() : '';
  
  if (!apiKey) {
    updateApiKeyStatus('');
    showStatus('请输入 API Key');
    return;
  }
  
  if (!apiKey.startsWith('eb_')) {
    showStatus('API Key 格式不正确，应以 eb_ 开头');
    return;
  }
  
  localStorage.setItem('edit-business-api-key', apiKey);
  validateApiKey(apiKey);
}

// 验证 API Key
function validateApiKey(apiKey) {
  const statusDiv = document.getElementById('apiKeyStatus');
  if (statusDiv) {
    statusDiv.textContent = '验证中...';
    statusDiv.style.color = '#666';
  }

  fetch(API_CONFIG.BASE_URL + '/api/v1/api-keys/validate', {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    }
  })
  .then(response => response.json())
  .then(data => {
    if (data.code === 0 || data.success) {
      updateApiKeyStatus(apiKey);
      showStatus('API Key 验证成功！');
    } else {
      updateApiKeyStatus('');
      showStatus('API Key 验证失败：' + (data.message || '未知错误'));
    }
  })
  .catch(error => {
    updateApiKeyStatus('');
    showStatus('API Key 验证失败：' + error.message);
  });
}

// 更新 API Key 状态显示
function updateApiKeyStatus(apiKey) {
  const statusDiv = document.getElementById('apiKeyStatus');
  if (!statusDiv) return;
  
  if (apiKey) {
    const maskedKey = apiKey.substring(0, 8) + '...' + apiKey.substring(apiKey.length - 4);
    statusDiv.innerHTML = '<span style="color: green;">✅ 已配置: ' + maskedKey + '</span>';
  } else {
    statusDiv.innerHTML = '<span style="color: #999;">⚠️ 未配置 API Key</span>';
  }
}

// 在页面加载完成后加载 API Key（延迟执行，不阻塞初始化）
if (document.readyState === 'complete') {
  setTimeout(loadApiKey, 500);
} else {
  window.addEventListener('load', function() {
    setTimeout(loadApiKey, 500);
  });
}

// 添加保存按钮监听器（延迟执行）
setTimeout(function() {
  const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
  if (saveApiKeyBtn) {
    saveApiKeyBtn.addEventListener('click', function() {
      saveApiKey();
    });
    console.log('API Key 保存按钮监听器已添加');
  }
}, 1000);

// ============================================
// Edit Business API 同步功能
// ============================================

// 同步创作者信息到 Edit Business
function syncBloggerInfoToFeishu() {
  if (capturedBloggerInfo === null) {
    showStatus('没有可同步的创作者信息');
    return;
  }

  showStatus('正在同步创作者信息，请稍候...');

  const apiKey = localStorage.getItem('edit-business-api-key');
  if (!apiKey) {
    showStatus('请先在设置中配置 API Key');
    return;
  }

  const data = {
    xhsId: capturedBloggerInfo.bloggerId,
    bloggerName: capturedBloggerInfo.bloggerName,
    avatarUrl: capturedBloggerInfo.avatarUrl || '',
    description: capturedBloggerInfo.description || '',
    followersCount: Number(capturedBloggerInfo.followersCount || 0),
    bloggerUrl: capturedBloggerInfo.bloggerUrl || '',
    captureTimestamp: Date.now()
  };

  fetch(API_CONFIG.BASE_URL + '/api/v1/bloggers', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(data)
  })
  .then(response => response.json())
  .then(result => {
    if (result.code === 0 || result.success) {
      showStatus('✅ 创作者信息同步成功！');
    } else {
      showStatus('同步失败：' + (result.message || '未知错误'));
    }
  })
  .catch(error => {
    console.error('创作者信息同步失败:', error);
    showStatus('同步失败：' + error.message);
  });
}

// ============================================
// 七牛云图片上传功能
// ============================================

// 缓存上传token，避免重复请求
let cachedQiniuToken = null;
let tokenExpireTime = 0;

/**
 * 获取七牛云上传token
 * @returns {Promise<{uploadToken: string, cdnDomain: string, keyPrefix: string}>}
 */
async function getQiniuToken() {
  // 检查缓存是否有效
  if (cachedQiniuToken && Date.now() < tokenExpireTime) {
    return cachedQiniuToken;
  }

  const apiKey = localStorage.getItem('edit-business-api-key');
  if (!apiKey) {
    throw new Error('请先在设置中配置 API Key');
  }

  try {
    const response = await fetch(API_CONFIG.BASE_URL + '/api/v1/qiniu/upload-token', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      }
    });

    if (!response.ok) {
      throw new Error(`获取上传token失败: ${response.status}`);
    }

    const data = await response.json();

    // 缓存token (提前5分钟过期)
    tokenExpireTime = Date.now() + (data.expiresIn - 300) * 1000;
    cachedQiniuToken = {
      uploadToken: data.uploadToken,
      cdnDomain: data.cdnDomain,
      keyPrefix: data.keyPrefix
    };

    return cachedQiniuToken;
  } catch (error) {
    console.error('获取七牛云token失败:', error);
    throw error;
  }
}

/**
 * 将 base64 字符串转为 Blob
 */
function base64ToBlob(base64, mimeType = 'image/jpeg') {
  const base64Data = base64.includes(',') ? base64.split(',')[1] : base64;
  const byteCharacters = atob(base64Data);
  const byteArray = new Uint8Array(byteCharacters.length);
  for (let i = 0; i < byteCharacters.length; i++) {
    byteArray[i] = byteCharacters.charCodeAt(i);
  }
  return new Blob([byteArray], { type: mimeType });
}

/**
 * 从平台下载图片（优先 Background 拉图，规避 CORS；失败时回退到 content script）
 * @param {string} imageUrl - 平台图片URL
 * @returns {Promise<Blob>}
 */
async function downloadImageFromXhs(imageUrl, tabId = null) {
  try {
    // 1. 优先用 Background 拉图（有 host_permissions，不受 CORS 限制）
    const bgResult = await chrome.runtime.sendMessage({ action: 'fetchImage', imageUrl });
    if (bgResult && bgResult.success && bgResult.base64) {
      return base64ToBlob(bgResult.base64);
    }

    // 2. 回退：用 content script（页面上下文，带 cookie，部分场景可用）
    let targetTabId = tabId || capturedNoteTabId || capturedLinksTabId;
    if (!targetTabId) {
      const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tabs[0] || !tabs[0].id) {
        throw new Error(bgResult?.error || '无法获取当前标签页，请确保小红书页面为当前激活的标签页');
      }
      if (!tabs[0].url || !tabs[0].url.includes('xiaohongshu.com')) {
        throw new Error('当前标签页不是小红书页面，请切换到小红书笔记页再同步');
      }
      targetTabId = tabs[0].id;
    }

    const result = await chrome.tabs.sendMessage(targetTabId, {
      action: 'downloadImage',
      imageUrl: imageUrl
    });

    if (!result) {
      throw new Error('未收到响应，请刷新小红书页面后重试');
    }
    if (result.error) {
      throw new Error(result.error);
    }

    return base64ToBlob(result.base64);
  } catch (error) {
    console.error('下载图片失败:', imageUrl, error);
    throw error;
  }
}

/**
 * 上传图片到七牛云
 * @param {Blob} file - 文件Blob对象
 * @param {string} key - 文件key（路径）
 * @param {string} token - 上传token
 * @returns {Promise<string>} CDN URL
 */
function uploadToQiniu(file, key, token) {
  return new Promise((resolve, reject) => {
    try {
      // 使用七牛云JS SDK上传
      const observable = qiniu.upload(file, key, token, {
        useCdnDomain: true,
        region: qiniu.region.z0 // 华东区域
      }, {
        useCdnDomain: true,
        disableStatisticsReport: false,
        retryCount: 3,
        checkChunkMD5: true
      });

      const subscription = observable.subscribe({
        next(res) {
          // 上传进度
          console.log('上传进度:', res.total.percent + '%');
        },
        error(err) {
          console.error('上传失败:', err);
          reject(err);
        },
        complete(res) {
          // 上传完成，返回CDN URL
          const cdnDomain = localStorage.getItem('qiniu-cdn-domain') || '';
          const cdnUrl = `${cdnDomain}/${key}`;
          console.log('上传成功:', cdnUrl);
          resolve(cdnUrl);
        }
      });
    } catch (error) {
      console.error('上传异常:', error);
      reject(error);
    }
  });
}

/**
 * 处理单张图片URL：下载 -> 上传 -> 返回CDN URL
 * @param {string} imageUrl - 原始图片URL
 * @param {number} index - 图片索引（用于生成文件名）
 * @returns {Promise<string>} CDN URL
 */
async function processSingleImage(imageUrl, index = 0) {
  try {
    // 1. 下载图片（需保持小红书页面为当前标签页）
    let blob;
    try {
      blob = await downloadImageFromXhs(imageUrl);
    } catch (e) {
      const msg = e.message || String(e);
      console.error('下载图片失败:', imageUrl, e);
      let hint = '请确保小红书页面为当前标签页';
      if (msg.includes('Receiving end') || msg.includes('receiving end')) {
        hint = '请刷新小红书页面后重试（插件需重新注入）';
      } else if (msg.includes('跨域') || msg.includes('防盗链')) {
        hint = '平台图片有跨域/防盗链限制，无法直接读取';
      }
      if (typeof showStatus === 'function') {
        showStatus(`⚠️ 图片${index + 1}下载失败: ${msg}。${hint}`);
      }
      return imageUrl;
    }

    // 2. 获取上传token
    let tokenData;
    try {
      tokenData = await getQiniuToken();
    } catch (e) {
      const msg = e.message || String(e);
      console.error('获取七牛云token失败:', e);
      if (typeof showStatus === 'function') {
        showStatus(`⚠️ 获取七牛云token失败(${msg})，已使用原链接。请检查API Key和后端配置`);
      }
      return imageUrl;
    }

    // 3. 生成文件key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = imageUrl.match(/\.\w+($|\?)/) ?
      imageUrl.match(/\.\w+($|\?)/)[0].split('?')[0] : '.jpg';
    const key = `${tokenData.keyPrefix}/${timestamp}_${random}_${index}${ext}`;

    // 缓存CDN域名
    localStorage.setItem('qiniu-cdn-domain', tokenData.cdnDomain);

    // 4. 上传到七牛云
    try {
      const cdnUrl = await uploadToQiniu(blob, key, tokenData.uploadToken);
      return cdnUrl;
    } catch (e) {
      const msg = e.message || String(e);
      console.error('七牛云上传失败:', e);
      if (typeof showStatus === 'function') {
        showStatus(`⚠️ 图片${index + 1}上传七牛云失败(${msg})，已使用原链接`);
      }
      return imageUrl;
    }
  } catch (error) {
    console.error('处理图片失败:', imageUrl, error);
    if (typeof showStatus === 'function') {
      showStatus(`⚠️ 图片${index + 1}处理异常(${error.message})，已使用原链接`);
    }
    return imageUrl;
  }
}

/**
 * 批量处理图片URLs
 * @param {string[]} imageUrls - 图片URL数组
 * @param {function} progressCallback - 进度回调
 * @returns {Promise<string[]>} CDN URL数组
 */
async function processImageUrls(imageUrls, progressCallback = null) {
  if (!imageUrls || imageUrls.length === 0) {
    return [];
  }

  const results = [];
  const total = imageUrls.length;

  for (let i = 0; i < total; i++) {
    try {
      const cdnUrl = await processSingleImage(imageUrls[i], i);
      results.push(cdnUrl);

      if (progressCallback) {
        progressCallback(i + 1, total, cdnUrl);
      }
    } catch (error) {
      console.error(`处理第${i + 1}张图片失败:`, error);
      // 失败时也push原始URL，保证数量一致
      results.push(imageUrls[i]);
    }
  }

  return results;
}

// ============================================
// 修改后的同步函数（使用七牛云CDN URL）
// ============================================

/**
 * 校验采集页面 tab 是否就绪（需下载图片时必须切回采集页）
 * @param {string} mode - 'single' 单条采集 | 'batch' 批量采集
 * @returns {Promise<{ok: boolean, message?: string}>}
 */
async function ensureNoteTabForImageDownload(mode = 'single') {
  let hasImages = false;
  let targetTabId = null;

  if (mode === 'single') {
    hasImages = capturedNote && capturedNote.imageUrls && capturedNote.imageUrls.trim() !== '';
    targetTabId = capturedNoteTabId;
  } else {
    hasImages = capturedLinks.some(link => link.image && link.image.startsWith('http'));
    targetTabId = capturedLinksTabId;
  }

  if (!hasImages) {
    return { ok: true }; // 无图片则无需校验
  }
  if (!targetTabId) {
    const hint = mode === 'single' ? '请重新在笔记页面采集后再同步' : '请重新在创作者主页采集后再同步';
    return { ok: false, message: '无法获取采集时的页面，' + hint };
  }

  try {
    const tab = await chrome.tabs.get(targetTabId);
    if (!tab || !tab.url || !tab.url.includes('xiaohongshu.com')) {
      const hint = mode === 'single' ? '请重新打开笔记页面并采集后再同步' : '请重新打开创作者主页并采集后再同步';
      return { ok: false, message: '采集页面已失效，' + hint };
    }

    const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!activeTab || activeTab.id !== targetTabId) {
      // 自动切换到采集页 tab，提示用户再次点击同步
      await chrome.tabs.update(targetTabId, { active: true });
      return { ok: false, message: '已切换到采集页面，请再次点击「同步数据」' };
    }

    return { ok: true };
  } catch (e) {
    if (e.message && e.message.includes('No tab with id')) {
      const hint = mode === 'single' ? '请重新打开笔记页面并采集后再同步' : '请重新打开创作者主页并采集后再同步';
      return { ok: false, message: '采集页面已关闭，' + hint };
    }
    return { ok: false, message: '无法校验采集页面：' + (e.message || '未知错误') };
  }
}

// 同步单条内容到 Edit Business（使用七牛云）
async function syncSingleNoteToFeishu() {
  if (capturedNote === null) {
    showStatus('没有可同步的笔记数据');
    return;
  }

  showStatus('正在同步数据，请稍候...');

  const apiKey = localStorage.getItem('edit-business-api-key');
  if (!apiKey) {
    showStatus('请先在设置中配置 API Key');
    return;
  }

  // 有图片时需要用户保持在采集页，否则图片下载会失败
  const tabCheck = await ensureNoteTabForImageDownload();
  if (!tabCheck.ok) {
    showStatus('⚠️ ' + tabCheck.message);
    return;
  }

  try {
    // 检查七牛云 SDK 是否已加载（依赖 qiniu.min.js）
    if (typeof qiniu === 'undefined') {
      showStatus('❌ 七牛云上传组件未加载，请重新安装插件或联系技术支持');
      console.error('qiniu SDK 未加载，请确保 sidebar.html 已正确引入 qiniu.min.js');
      return;
    }

    // 处理图片URLs：下载并上传到七牛云
    let cdnImageUrls = [];
    let cdnCoverImageUrl = '';
    let cdnVideoUrl = '';

    if (capturedNote.imageUrls) {
      const originalUrls = capturedNote.imageUrls.split(',');
      showStatus(`正在处理 ${originalUrls.length} 张图片...`);

      cdnImageUrls = await processImageUrls(originalUrls, (current, total, cdnUrl) => {
        showStatus(`正在处理图片 ${current}/${total}...`);
      });

      // 第一张作为封面
      if (cdnImageUrls.length > 0) {
        cdnCoverImageUrl = cdnImageUrls[0];
      }
    }

    // 处理视频（如果有）
    if (capturedNote.videoUrl && capturedNote.videoUrl.trim() !== '') {
      showStatus('正在处理视频...');
      // 视频暂时保持原URL（因为视频文件较大）
      cdnVideoUrl = capturedNote.videoUrl;
    }

    // 构建同步数据
    const data = {
      url: capturedNote.url,
      title: capturedNote.title,
      author: capturedNote.author,
      content: capturedNote.content || '',
      tags: capturedNote.tags ? capturedNote.tags.split(',') : [],
      imageUrls: cdnImageUrls,
      videoUrl: cdnVideoUrl,
      noteType: capturedNote.noteType || (capturedNote.videoUrl ? '视频' : '图文'),
      coverImageUrl: cdnCoverImageUrl,
      likes: Number(capturedNote.likes || 0),
      collects: Number(capturedNote.collects || 0),
      comments: Number(capturedNote.comments || 0),
      publishDate: Number(capturedNote.publishDate || Date.now()),
      source: 'single',
      captureTimestamp: Date.now()
    };

    showStatus('正在同步到服务器...');

    const response = await fetch(API_CONFIG.BASE_URL + '/api/v1/notes', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(data)
    });

    const result = await response.json();

    if (result.code === 0 || result.success) {
      showStatus('✅ 同步成功！');
      // 清除token缓存，下次重新获取
      cachedQiniuToken = null;
    } else {
      showStatus('同步失败：' + (result.message || '未知错误'));
    }
  } catch (error) {
    console.error('同步失败:', error);
    showStatus('同步失败：' + error.message);
  }
}

// 批量同步笔记到 Edit Business（使用七牛云）
async function syncToFeishu() {
  if (capturedLinks.length === 0) {
    showStatus('没有可同步的笔记数据');
    return;
  }

  showStatus(`正在批量同步 ${capturedLinks.length} 条笔记，请稍候...`);

  const apiKey = localStorage.getItem('edit-business-api-key');
  if (!apiKey) {
    showStatus('请先在设置中配置 API Key');
    return;
  }

  // 有图片时需要用户保持在采集页（创作者主页）
  const tabCheck = await ensureNoteTabForImageDownload('batch');
  if (!tabCheck.ok) {
    showStatus('⚠️ ' + tabCheck.message);
    return;
  }

  try {
    // 检查七牛云 SDK 是否已加载
    if (typeof qiniu === 'undefined') {
      showStatus('❌ 七牛云上传组件未加载，请重新安装插件或联系技术支持');
      return;
    }

    const notesData = [];

    for (let i = 0; i < capturedLinks.length; i++) {
      const link = capturedLinks[i];
      showStatus(`正在处理第 ${i + 1}/${capturedLinks.length} 条笔记...`);

      // 处理封面图
      let cdnImage = link.image || '';
      if (link.image && link.image.startsWith('http')) {
        try {
          cdnImage = await processSingleImage(link.image, 0);
        } catch (error) {
          console.error('处理封面图失败:', error);
          // 使用原图
        }
      }

      notesData.push({
        url: link.url,
        title: link.title,
        author: link.author,
        likes: Number(link.likes || 0),
        image: cdnImage,
        publishDate: Number(link.publishDate || Date.now()),
        source: 'batch',
        captureTimestamp: Date.now()
      });
    }

    showStatus('正在同步到服务器...');

    const response = await fetch(API_CONFIG.BASE_URL + '/api/v1/notes/batch', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-API-Key': apiKey
      },
      body: JSON.stringify(notesData)
    });

    const result = await response.json();

    if (result.code === 0 || result.success) {
      showStatus(`✅ 同步成功！已同步 ${capturedLinks.length} 条笔记`);
      // 清除token缓存
      cachedQiniuToken = null;
    } else {
      showStatus('同步失败：' + (result.message || '未知错误'));
    }
  } catch (error) {
    console.error('批量同步失败:', error);
    showStatus('同步失败：' + error.message);
  }
}
