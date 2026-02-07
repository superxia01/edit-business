import { useState } from 'react'

export function LoginPage() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // 页面加载时检查URL参数
  const urlParams = new URLSearchParams(window.location.search)
  const errorMsg = urlParams.get('error')
  if (errorMsg && errorMsg !== '') {
    setError(decodeURIComponent(errorMsg))
    // 清除URL中的error参数，但保持页面不刷新
    const newUrl = window.location.pathname
    window.history.replaceState({}, '', newUrl)
  }

  // 跳转到业务系统后端的微信登录代理接口
  const handleLogin = () => {
    setLoading(true)
    setError('')

    // 跳转到业务系统后端的代理接口
    window.location.href = '/api/v1/auth/wechat/login'
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-full max-w-md p-8">
        <div className="bg-card rounded-lg shadow-lg p-8">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold">内容管理工具系统</h1>
            <p className="text-muted-foreground mt-2">请使用账号中心登录</p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/10 border border-destructive/20 rounded-md">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <button
              onClick={handleLogin}
              disabled={loading}
              className="w-full py-3 px-4 bg-primary text-primary-foreground rounded-md hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {loading ? '登录中...' : '微信登录'}
            </button>

            <div className="text-center text-sm text-muted-foreground">
              <p>登录即表示同意使用条款</p>
            </div>
          </div>

          <div className="mt-8 pt-6 border-t">
            <div className="text-sm text-muted-foreground">
              <p className="font-semibold mb-2">系统说明：</p>
              <ul className="list-disc list-inside space-y-1">
                <li>使用账号中心统一认证</li>
                <li>支持微信扫码登录</li>
                <li>登录后可使用所有功能</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
