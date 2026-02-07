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
      // 读取本地配置并填充到输入框
      loadConfiguration();
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
    
    // 同步飞书按钮
    const syncFeishuBtn = document.getElementById('syncFeishuBtn');
    if (syncFeishuBtn) {
      syncFeishuBtn.addEventListener('click', function() {
        syncToFeishu();
      });
    }
    
    // 验证用户按钮
    const checkUserBtn = document.getElementById('checkUserBtn');
    if (checkUserBtn) {
      checkUserBtn.addEventListener('click', function() {
        verifyUserOrder();
      });
    }
    
    // 保存配置按钮
    const saveConfigBtn = document.getElementById('saveConfigBtn');
    if (saveConfigBtn) {
      saveConfigBtn.addEventListener('click', function() {
        saveConfiguration();
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
    
    // 添加创作者信息页面的同步飞书按钮事件监听
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

// 同步飞书函数 - 完全符合需求的实现
function syncToFeishu() {
  if (capturedLinks.length === 0) {
    showStatus('没有可同步的笔记数据');
    return;
  }
  
  showStatus('正在同步到飞书，请稍候...');
  
  // 获取飞书配置
  const config = loadConfiguration(true);
  
  // 检查配置是否完整
  if (!config.ordeid || !config.basetoken || !config.blogger_noteurl) {
    showStatus('请先配置完整的飞书信息');
    switchTab(document.getElementById('configTab'), document.getElementById('configContent'));
    return;
  }
  
  // 准备同步数据
  try {
    // 构建records数组 - 修复反引号问题
    const records = capturedLinks.map(note => {
      // 确保URL中不包含反引号
      const cleanUrl = note.url ? note.url.replace(/`/g, '') : '';
      const cleanImageUrl = note.image ? note.image.replace(/`/g, '') : '';
      
      return {
        fields: {
          "创作者": note.author || "未知作者",
          "标题": note.title || "无标题",
          "点赞数": note.likes || 0,
          "笔记链接": {
            "link": cleanUrl,
            "text": "查看原文"
          },
          "封面链接": cleanImageUrl
        }
      };
    });
    
    // 构建完整的数据对象
    const dataObject = {
      records: records
    };
    
    // 转换为JSON字符串
    const author_notes = JSON.stringify(dataObject);
    
    // 确保blogger_noteurl不包含反引号
    const cleanBloggerNoteUrl = config.blogger_noteurl.replace(/`/g, '');
    
    // 显示加载状态并禁用按钮
    const syncButton = document.getElementById('syncFeishuBtn');
    const originalText = syncButton.textContent;
    syncButton.disabled = true;
    syncButton.textContent = '同步中...';
    
    // 检查 API_CONFIG 是否已加载
    if (typeof API_CONFIG === 'undefined') {
      showStatus('API配置未加载，请刷新页面重试');
      return;
    }
    
    // 向coze平台发起post请求
    fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SYNC_BLOGGER_NOTES, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ordeid: config.ordeid.toString(),
        basetoken: config.basetoken.toString(),
        blogger_noteurl: cleanBloggerNoteUrl,
        body: author_notes
      })
    })
    .then(response => {
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      
      console.log('API响应:', data);
      
      // 处理响应 - 兼容新旧两种格式
      let result;
      
      // 新格式：直接对象 { ordeid_result: true, add_result: true, ... }
      if (data.ordeid_result !== undefined) {
        result = data;
        console.log('使用新格式响应:', result);
      } 
      // 旧格式：{ code: 0, data: "{\"ordeid_result\":true,...}" }
      else if (data.code === 0 && data.data) {
        try {
          result = JSON.parse(data.data);
          console.log('使用旧格式响应，解析后的数据:', result);
        } catch (parseError) {
          console.error('解析响应数据时出错:', parseError);
          showStatus(`同步出了点问题，解析错误: ${parseError.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
          return;
        }
      } else {
        // 未知格式
        console.error('未知的响应格式:', data);
        showStatus(`同步出了点问题，响应格式异常，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
        return;
      }
      
      // 处理结果
      if (result.add_result && result.ordeid_result) {
        showStatus(`同步成功，去表格看看吧，<a href="${config.blogger_noteurl}" target="_blank" style="color: blue; text-decoration: underline;">点击查看表格</a>`);
      } else if (!result.ordeid_result) {
        showStatus(`用户编号不存在或已过期或存在多人使用情况，请点击购买，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击购买</a>`);
      } else {
        const errorMsg = result.error || `add_result: ${result.add_result}`;
        showStatus(`同步出了点问题，${errorMsg}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
      }
    })
    .catch(error => {
      console.error('同步飞书时出错:', error);
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      showStatus(`同步出了点问题，错误: ${error.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
    });
  } catch (dataError) {
    console.error('数据处理错误:', dataError);
    showStatus(`数据处理出错，错误: ${dataError.message}，请重试`);
  }
}

// 优化下载图片视频函数，添加用户编号验证功能
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
  downloadBtn.textContent = '验证中...';
  
  try {
    // 获取飞书配置中的orderid
    const config = loadConfiguration(true);
    
    if (!config.ordeid) {
      showStatus('请先在配置页填写用户编号');
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      switchTab(document.getElementById('configTab'), document.getElementById('configContent'));
      return;
    }
    
    showStatus('正在验证用户编号，请稍候...');
    
    // 检查 API_CONFIG 是否已加载
    if (typeof API_CONFIG === 'undefined') {
      showStatus('API配置未加载，请刷新页面重试');
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      return;
    }
    
    // 向coze平台发起post请求验证用户编号
    const response = await fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.VERIFY_ORDER, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ordeid: config.ordeid.toString()
      })
    });
    
    const data = await response.json();
    console.log('API响应:', data);
    
    // 处理响应 - 兼容新旧两种格式
    let result;
    
    // 新格式：直接对象 { ordeid_result: true, ... }
    if (data.ordeid_result !== undefined) {
      result = data;
      console.log('使用新格式响应:', result);
    } 
    // 旧格式：{ code: 0, data: "{\"ordeid_result\":true,...}" }
    else if (data.code === 0 && data.data) {
      try {
        result = JSON.parse(data.data);
        console.log('使用旧格式响应，解析后的数据:', result);
      } catch (parseError) {
        console.error('解析响应数据时出错:', parseError);
        showStatus(`验证用户编号出了点问题，解析错误: ${parseError.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
        downloadBtn.disabled = false;
        downloadBtn.textContent = originalText;
        return;
      }
    } else {
      // 未知格式
      console.error('未知的响应格式:', data);
      showStatus(`验证用户编号出了点问题，响应格式异常，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      return;
    }
    
    // 处理结果
    if (!result.ordeid_result) {
      showStatus(`用户编号不存在或已过期或存在多人使用情况，请点击购买，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击购买</a>`);
      downloadBtn.disabled = false;
      downloadBtn.textContent = originalText;
      return;
    }
    
    // 订单验证通过，继续下载逻辑
    showStatus('正在下载媒体文件，请稍候...');
    downloadBtn.textContent = '下载中...';
    
    // 逐个下载文件
    let downloadedCount = 0;
    let failedCount = 0;
    
    // 为文件夹生成默认名称
    const noteTitle = capturedNote.title ? capturedNote.title.replace(/[^\w\u4e00-\u9fa5]/g, '_').substring(0, 15) : '平台笔记';
    
    mediaUrls.forEach((url, index) => {
      // 为文件生成有意义的名称
      const fileExtension = url.match(/\.\w+($|\?)/) ? url.match(/\.\w+($|\?)/)[0].split('?')[0] : '.jpg';
      const fileName = `${noteTitle}_media_${index + 1}${fileExtension}`;
      
      // 使用Chrome下载API进行下载
      chrome.downloads.download({
        url: url,
        filename: fileName,
        saveAs: false, // 不显示浏览器默认的保存对话框
        conflictAction: 'uniquify' // 文件名冲突时自动重命名
      }, (downloadId) => {
        if (chrome.runtime.lastError) {
          console.error('下载失败:', chrome.runtime.lastError);
          failedCount++;
        } else {
          downloadedCount++;
        }
        
        // 所有文件都处理完成后更新状态
        if (downloadedCount + failedCount === mediaUrls.length) {
          setTimeout(() => {
            downloadBtn.disabled = false;
            downloadBtn.textContent = originalText;
            
            if (failedCount > 0) {
              showStatus(`下载完成：成功 ${downloadedCount} 个，失败 ${failedCount} 个`);
            } else {
              showStatus(`成功下载 ${downloadedCount} 个媒体文件到浏览器默认下载文件夹`);
            }
          }, 1000);
        }
      });
    });
  } catch (error) {
    console.error('验证用户编号时出错:', error);
    showStatus(`验证订单号出了点问题，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
    
    // 恢复按钮状态
    downloadBtn.disabled = false;
    downloadBtn.textContent = originalText;
  }
}

// 验证用户编号函数
async function verifyUserOrder() {
  // 获取用户编号
  const ordeidInput = document.getElementById('ordeid');
  const ordeid = ordeidInput ? ordeidInput.value.trim() : '';
  
  if (!ordeid) {
    showStatus('请先输入用户编号');
    return;
  }
  
  // 获取验证按钮
  const checkUserBtn = document.getElementById('checkUserBtn');
  const originalText = checkUserBtn ? checkUserBtn.textContent : '验证用户';
  
  // 禁用按钮防止重复点击
  if (checkUserBtn) {
    checkUserBtn.disabled = true;
    checkUserBtn.textContent = '验证中...';
  }
  
  showStatus('正在验证用户编号，请稍候...');
  
  try {
    // 检查 API_CONFIG 是否已加载
    if (typeof API_CONFIG === 'undefined') {
      showStatus('API配置未加载，请刷新页面重试');
      if (checkUserBtn) {
        checkUserBtn.disabled = false;
        checkUserBtn.textContent = originalText;
      }
      return;
    }
    
    // 构建完整的API URL
    const apiUrl = API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.VERIFY_ORDER;
    console.log('验证用户编号 - API地址:', apiUrl);
    console.log('验证用户编号 - 请求数据:', { ordeid: ordeid });
    
    // 向API发起POST请求验证用户编号
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ordeid: ordeid
      })
    });
    
    // 检查响应状态
    if (!response.ok) {
      const errorText = await response.text();
      console.error('API响应错误:', response.status, errorText);
      throw new Error(`API请求失败: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    console.log('验证用户编号API响应:', data);
    
    // 处理响应 - 兼容新旧两种格式
    let result;
    
    // 新格式：直接对象 { ordeid_result: true, ... }
    if (data.ordeid_result !== undefined) {
      result = data;
      console.log('使用新格式响应:', result);
    } 
    // 旧格式：{ code: 0, data: "{\"ordeid_result\":true,...}" }
    else if (data.code === 0 && data.data) {
      try {
        result = JSON.parse(data.data);
        console.log('使用旧格式响应，解析后的数据:', result);
      } catch (parseError) {
        console.error('解析响应数据时出错:', parseError);
        showStatus(`验证用户编号出了点问题，解析错误: ${parseError.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
        if (checkUserBtn) {
          checkUserBtn.disabled = false;
          checkUserBtn.textContent = originalText;
        }
        return;
      }
    } else {
      // 未知格式
      console.error('未知的响应格式:', data);
      showStatus(`验证用户编号出了点问题，响应格式异常，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
      if (checkUserBtn) {
        checkUserBtn.disabled = false;
        checkUserBtn.textContent = originalText;
      }
      return;
    }
    
    // 处理结果
    if (result.ordeid_result) {
      showStatus('✅ 用户编号验证成功！可以继续配置飞书参数');
      // 验证成功后，显示飞书配置区域
      const feishuConfigSection = document.getElementById('feishuConfigSection');
      if (feishuConfigSection) {
        feishuConfigSection.style.display = 'block';
      }
    } else {
      showStatus(`❌ 用户编号不存在或已过期或存在多人使用情况，请点击购买，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击购买</a>`);
    }
    
    // 恢复按钮状态
    if (checkUserBtn) {
      checkUserBtn.disabled = false;
      checkUserBtn.textContent = originalText;
    }
  } catch (error) {
    console.error('验证用户编号时出错:', error);
    console.error('错误详情:', {
      name: error.name,
      message: error.message,
      stack: error.stack,
      apiUrl: API_CONFIG ? API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.VERIFY_ORDER : '未定义'
    });
    
    // 根据错误类型显示不同的提示
    let errorMessage = '验证用户编号出了点问题';
    if (error.message.includes('Failed to fetch')) {
      errorMessage = '网络请求失败，请检查：<br>1. 网络连接是否正常<br>2. API服务器是否可访问<br>3. 浏览器控制台是否有CORS错误';
    } else if (error.message.includes('API请求失败')) {
      errorMessage = `API请求失败: ${error.message}`;
    } else {
      errorMessage = `错误: ${error.message}`;
    }
    
    showStatus(`${errorMessage}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
    
    // 恢复按钮状态
    if (checkUserBtn) {
      checkUserBtn.disabled = false;
      checkUserBtn.textContent = originalText;
    }
  }
}

// 保存配置到本地
function saveConfiguration() {
  const config = {
    ordeid: document.getElementById('ordeid').value,
    basetoken: document.getElementById('basetoken').value,
    knowledgeurl: document.getElementById('knowledgeurl').value,
    blogger_noteurl: document.getElementById('blogger_noteurl').value,
    bloggerurl: document.getElementById('bloggerurl').value
  };
  
  // 保存到localStorage
  localStorage.setItem('feishuConfig', JSON.stringify(config));
  
  showStatus('配置已保存');
  
  // 检查并更新按钮状态
  checkAndUpdateButtonStatus();
}

// 从本地加载配置
function loadConfiguration(silent = false) {
  const configStr = localStorage.getItem('feishuConfig');
  if (configStr) {
    try {
      const config = JSON.parse(configStr);
      
      // 填充到输入框
      document.getElementById('ordeid').value = config.ordeid || '';
      document.getElementById('basetoken').value = config.basetoken || '';
      document.getElementById('knowledgeurl').value = config.knowledgeurl || '';
      document.getElementById('blogger_noteurl').value = config.blogger_noteurl || '';
      document.getElementById('bloggerurl').value = config.bloggerurl || '';
      
      return config;
    } catch (e) {
      if (!silent) {
        showStatus('配置解析错误');
      }
    }
  }
  return {};
}

// 优化单篇收藏函数
function startSingleCapture() {
  // 清空之前的收藏结果，确保完全重置对象
  capturedNote = null;
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

// 同步创作者信息到飞书
function syncBloggerInfoToFeishu() {
  if (capturedBloggerInfo === null) {
    showStatus('没有可同步的创作者信息数据');
    return;
  }
  
  showStatus('正在同步到飞书，请稍候...');
  
  // 获取飞书配置
  const config = loadConfiguration(true);
  
  // 检查配置是否完整
  if (!config.ordeid || !config.basetoken || !config.bloggerurl) {
    showStatus('请先配置完整的飞书信息');
    switchTab(document.getElementById('configTab'), document.getElementById('configContent'));
    return;
  }
  
  // 准备同步数据
  try {
    // 获取创作者信息
    const bloggerInfo = capturedBloggerInfo;
    
    // 构建records数组 - 完全按照用户要求的格式
    const records = [{
      "fields": {
        "创作者名称": bloggerInfo.bloggerName || bloggerInfo.name || "",
        "头像链接": bloggerInfo.avatarUrl || bloggerInfo.avatar || "",
        "平台号": bloggerInfo.bloggerId || bloggerInfo.userId || bloggerInfo.xiaohongshuId || "",
        "简介": bloggerInfo.description || bloggerInfo.bio || "",
        "粉丝数": bloggerInfo.followersCount || bloggerInfo.fansCount || 0,
        "主页链接": {
          "link": bloggerInfo.bloggerUrl || bloggerInfo.profileUrl || bloggerInfo.url || "",
          "text": "查看原文"
        },
        "收藏时间": new Date().getTime() // 中国日期的时间戳格式
      }
    }];
    
    // 构建完整的数据对象
    const dataObject = {
      records: records
    };
    
    // 转换为JSON字符串 - 赋值给auther_detail变量
    const auther_detail = JSON.stringify(dataObject);
    
    // 显示加载状态并禁用按钮
    const syncButton = document.getElementById('syncBloggerFeishuBtn');
    const originalText = syncButton.textContent;
    syncButton.disabled = true;
    syncButton.textContent = '同步中...';
    
    // 向coze平台发起post请求 - 使用正确的工作流ID和参数
    fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SYNC_BLOGGER_INFO, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ordeid: config.ordeid.toString(),
        basetoken: config.basetoken.toString(),
        bloggerurl: config.bloggerurl.toString(),
        body: auther_detail
      })
    })
    .then(response => {
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      
      console.log('API响应:', data);
      
      // 处理响应 - 兼容新旧两种格式
      let result;
      
      // 新格式：直接对象 { ordeid_result: true, add_result: true, ... }
      if (data.ordeid_result !== undefined) {
        result = data;
        console.log('使用新格式响应:', result);
      } 
      // 旧格式：{ code: 0, data: "{\"ordeid_result\":true,...}" }
      else if (data.code === 0 && data.data) {
        try {
          result = JSON.parse(data.data);
          console.log('使用旧格式响应，解析后的数据:', result);
        } catch (parseError) {
          console.error('解析响应数据时出错:', parseError);
          showStatus(`同步出了点问题，解析错误: ${parseError.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
          return;
        }
      } else {
        // 未知格式
        console.error('未知的响应格式:', data);
        showStatus(`同步出了点问题，响应格式异常，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
        return;
      }
      
      // 处理结果
      if (result.add_result && result.ordeid_result) {
        showStatus(`同步成功，去表格看看吧，<a href="${config.bloggerurl}" target="_blank" style="color: blue; text-decoration: underline;">点击查看表格</a>`);
      } else if (!result.ordeid_result) {
        showStatus(`用户编号不存在或已过期或存在多人使用情况，请点击购买，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击购买</a>`);
      } else {
        const errorMsg = result.error || `add_result: ${result.add_result}`;
        showStatus(`同步出了点问题，${errorMsg}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
      }
    })
    .catch(error => {
      console.error('同步飞书时出错:', error);
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      showStatus(`同步出了点问题，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
    });
  } catch (dataError) {
    console.error('数据处理错误:', dataError);
    showStatus(`数据处理出错，请重试`);
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

// 同步单条内容到飞书
function syncSingleNoteToFeishu() {
  if (capturedNote === null) {
    showStatus('没有可同步的笔记数据');
    return;
  }
  
  showStatus('正在同步到飞书，请稍候...');
  
  // 获取飞书配置
  const config = loadConfiguration(true);
  
  // 检查配置是否完整
  if (!config.ordeid || !config.basetoken || !config.knowledgeurl) {
    showStatus('请先配置完整的飞书信息');
    switchTab(document.getElementById('configTab'), document.getElementById('configContent'));
    return;
  }
  
  // 准备同步数据
  try {
    // 处理话题标签，去除#符号
    let tagsArray = [];
    if (capturedNote.tags) {
      tagsArray = capturedNote.tags.split(',').map(tag => tag.replace(/#/g, '').trim());
    }
    
    // 处理全部图片链接，按"图X=(链接)"格式组合带换行
    let formattedImageUrls = '';
    if (capturedNote.imageUrls) {
      const imageArray = capturedNote.imageUrls.split(',');
      formattedImageUrls = imageArray.map((img, index) => `图${index + 1}=(${img})`).join('\n');
    }
    
    // 首先创建基本的fields对象
    const fields = {
      "创作者": capturedNote.author || "未知作者",
      "封面链接": capturedNote.imageUrls ? capturedNote.imageUrls.split(',')[0] : "",
      "标题": capturedNote.title || "无标题",
      "原文链接": {
        "link": capturedNote.url || "",
        "text": "查看原文"
      },
      "正文": capturedNote.content || "",
      "话题标签": tagsArray,
      "图片链接": formattedImageUrls,
      "点赞数": capturedNote.likes || 0,
      "收藏数": capturedNote.collects || 0,
      "评论数": capturedNote.comments || 0,
      "类型": capturedNote.noteType || (capturedNote.videoUrl ? "视频" : "图文"),
      "域名": "平台",
      "收藏时间": new Date().getTime(), // 中国日期的时间戳格式
      "发布时间": capturedNote.publishDate ? (() => {
        try {
          console.log('=== sidebar.js日期转换调试 ===');
          console.log('原始publishDate:', capturedNote.publishDate);
          
          // 处理格式：2024/12/13 20:00
          const dateStr = capturedNote.publishDate;
          const parts = dateStr.match(/(\d{4})\/(\d{2})\/(\d{2}) (\d{2}):(\d{2})/);
          console.log('正则匹配结果:', parts);
          
          if (parts) {
            const [, year, month, day, hour, minute] = parts;
            console.log('提取的组件:', {year, month, day, hour, minute});
            
            const targetDate = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), parseInt(hour), parseInt(minute));
            console.log('构造的Date对象:', targetDate);
            console.log('最终时间戳:', targetDate.getTime());
            console.log('=== sidebar.js日期转换结束 ===');
            
            return targetDate.getTime();
          }
          // 如果格式不匹配，尝试直接解析
          console.log('格式不匹配，尝试备用解析');
          const fallbackResult = new Date(dateStr.replace(/\//g, '-')).getTime();
          console.log('备用解析结果:', fallbackResult);
          console.log('=== sidebar.js日期转换结束 ===');
          return fallbackResult;
        } catch (e) {
          console.error('日期转换失败:', e);
          return 0;
        }
      })() : 0
    };
    
    // 只有当视频链接不为空时，才添加视频链接字段 - 保留这个优化
    if (capturedNote.videoUrl && capturedNote.videoUrl.trim() !== '') {
      fields["视频链接"] = {
        "link": capturedNote.videoUrl,
        "text": "查看视频"
      };
    }
    
    // 构建records数组
    const records = [{
      "fields": fields
    }];
    
    // 构建完整的数据对象
    const dataObject = {
      records: records
    };
    
    // 转换为JSON字符串 - 赋值给detail_notes变量
    const detail_notes = JSON.stringify(dataObject);
    
    // 显示加载状态并禁用按钮
    const syncButton = document.getElementById('syncSingleFeishuBtn');
    const originalText = syncButton.textContent;
    syncButton.disabled = true;
    syncButton.textContent = '同步中...';
    
    // 检查 API_CONFIG 是否已加载
    if (typeof API_CONFIG === 'undefined') {
      showStatus('API配置未加载，请刷新页面重试');
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      return;
    }
    
    // 向coze平台发起post请求 - 使用正确的工作流ID和参数
    fetch(API_CONFIG.BASE_URL + API_CONFIG.ENDPOINTS.SYNC_SINGLE_NOTE, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        ordeid: config.ordeid.toString(),
        basetoken: config.basetoken.toString(),
        knowledgeurl: config.knowledgeurl.toString(),
        body: detail_notes
      })
    })
    .then(response => {
      // 检查响应状态
      if (!response.ok) {
        throw new Error(`网络请求失败: ${response.status}`);
      }
      return response.json();
    })
    .then(data => {
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      
      console.log('API响应:', data);
      
      // 处理响应 - 兼容新旧两种格式
      let result;
      
      // 新格式：直接对象 { ordeid_result: true, add_result: true, ... }
      if (data.ordeid_result !== undefined) {
        result = data;
        console.log('使用新格式响应:', result);
      } 
      // 旧格式：{ code: 0, data: "{\"ordeid_result\":true,...}" }
      else if (data.code === 0 && data.data) {
        try {
          result = JSON.parse(data.data);
          console.log('使用旧格式响应，解析后的数据:', result);
        } catch (parseError) {
          console.error('解析响应数据时出错:', parseError);
          showStatus(`同步出了点问题，解析错误: ${parseError.message}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
          return;
        }
      } else {
        // 未知格式
        console.error('未知的响应格式:', data);
        showStatus(`同步出了点问题，响应格式异常，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
        return;
      }
      
      // 处理结果
      if (result.add_result && result.ordeid_result) {
        showStatus(`同步成功，去表格看看吧，<a href="${config.knowledgeurl}" target="_blank" style="color: blue; text-decoration: underline;">点击查看表格</a>`);
      } else if (!result.ordeid_result) {
        showStatus(`用户编号不存在或已过期或存在多人使用情况，请点击购买，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击购买</a>`);
      } else {
        const errorMsg = result.error || `add_result: ${result.add_result}`;
        showStatus(`同步出了点问题，${errorMsg}，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
      }
    })
    .catch(error => {
      console.error('同步飞书时出错:', error);
      // 恢复按钮状态
      syncButton.disabled = false;
      syncButton.textContent = originalText;
      showStatus(`同步出了点问题，请稍后再试，或者联系客服解决，<a href="https://gobiggroup.feishu.cn/wiki/QWDOwWvPYiZfb2kXuwqc8fQanmb?from=from_copylink" target="_blank" style="color: blue; text-decoration: underline;">点击联系客服</a>`);
    });
  } catch (dataError) {
    console.error('数据处理错误:', dataError);
    showStatus(`数据处理出错，请重试`);
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
// Edit Business API 同步功能（覆盖原飞书同步）
// ============================================

// 同步单条内容到 Edit Business
function syncSingleNoteToFeishu() {
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
  
  const data = {
    url: capturedNote.url,
    title: capturedNote.title,
    author: capturedNote.author,
    content: capturedNote.content || '',
    tags: capturedNote.tags ? capturedNote.tags.split(',') : [],
    imageUrls: capturedNote.imageUrls ? capturedNote.imageUrls.split(',') : [],
    videoUrl: capturedNote.videoUrl || '',
    noteType: capturedNote.noteType || (capturedNote.videoUrl ? '视频' : '图文'),
    coverImageUrl: capturedNote.imageUrls ? capturedNote.imageUrls.split(',')[0] : '',
    likes: Number(capturedNote.likes || 0),
    collects: Number(capturedNote.collects || 0),
    comments: Number(capturedNote.comments || 0),
    publishDate: Number(capturedNote.publishDate || Date.now()),
    source: 'single',
    captureTimestamp: Date.now()
  };
  
  fetch(API_CONFIG.BASE_URL + '/api/v1/notes', {
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
      showStatus('✅ 同步成功！');
    } else {
      showStatus('同步失败：' + (result.message || '未知错误'));
    }
  })
  .catch(error => {
    console.error('同步失败:', error);
    showStatus('同步失败：' + error.message);
  });
}

// 批量同步笔记到 Edit Business
function syncToFeishu() {
  if (capturedLinks.length === 0) {
    showStatus('没有可同步的笔记数据');
    return;
  }
  
  showStatus('正在批量同步 ' + capturedLinks.length + ' 条笔记，请稍候...');
  
  const apiKey = localStorage.getItem('edit-business-api-key');
  if (!apiKey) {
    showStatus('请先在设置中配置 API Key');
    return;
  }
  
  const notesData = capturedLinks.map(link => ({
    url: link.url,
    title: link.title,
    author: link.author,
    likes: Number(link.likes || 0),
    image: link.image || '',
    publishDate: Number(link.publishDate || Date.now()),
    source: 'batch',
    captureTimestamp: Date.now()
  }));
  
  fetch(API_CONFIG.BASE_URL + '/api/v1/notes/batch', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'X-API-Key': apiKey
    },
    body: JSON.stringify(notesData)
  })
  .then(response => response.json())
  .then(result => {
    if (result.code === 0 || result.success) {
      showStatus('✅ 同步成功！已同步 ' + capturedLinks.length + ' 条笔记');
    } else {
      showStatus('同步失败：' + (result.message || '未知错误'));
    }
  })
  .catch(error => {
    console.error('批量同步失败:', error);
    showStatus('同步失败：' + error.message);
  });
}

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
 * 从平台下载图片（使用浏览器上下文，有cookies）
 * @param {string} imageUrl - 平台图片URL
 * @returns {Promise<Blob>}
 */
async function downloadImageFromXhs(imageUrl) {
  try {
    const response = await fetch(imageUrl, {
      credentials: 'include', // 包含cookies，绕过防盗链
      headers: {
        'Accept': 'image/webp,image/apng,image/*,*/*;q=0.8'
      }
    });

    if (!response.ok) {
      throw new Error(`下载图片失败: ${response.status}`);
    }

    return await response.blob();
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
    // 1. 下载图片
    const blob = await downloadImageFromXhs(imageUrl);

    // 2. 获取上传token
    const tokenData = await getQiniuToken();

    // 3. 生成文件key
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 8);
    const ext = imageUrl.match(/\.\w+($|\?)/) ?
      imageUrl.match(/\.\w+($|\?)/)[0].split('?')[0] : '.jpg';
    const key = `${tokenData.keyPrefix}/${timestamp}_${random}_${index}${ext}`;

    // 缓存CDN域名
    localStorage.setItem('qiniu-cdn-domain', tokenData.cdnDomain);

    // 4. 上传到七牛云
    const cdnUrl = await uploadToQiniu(blob, key, tokenData.uploadToken);

    return cdnUrl;
  } catch (error) {
    console.error('处理图片失败:', imageUrl, error);
    // 如果上传失败，返回原始URL作为fallback
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

  try {
    // 处理图片URLs：下载并上传到七牛云
    let cdnImageUrls = [];
    let cdnCoverImageUrl = '';
    let cdnVideoUrl = '';

    if (capturedNote.imageUrls) {
      const originalUrls = capturedNote.imageUrls.split(',');
      showStatus(`正在上传 ${originalUrls.length} 张图片到七牛云...`);

      cdnImageUrls = await processImageUrls(originalUrls, (current, total, cdnUrl) => {
        showStatus(`正在上传图片 ${current}/${total}...`);
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
      showStatus('✅ 同步成功！图片已上传到七牛云');
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

  try {
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
      showStatus(`✅ 同步成功！已同步 ${capturedLinks.length} 条笔记到七牛云`);
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
