import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { apiKeyApi, userSettingsApi, type APIKey, type UserSettings } from '@/api'
import { Key, Copy, Check, AlertCircle, Download, Shield, AlertTriangle } from 'lucide-react'

export function SettingsPage() {
  const [apiKey, setApiKey] = useState<APIKey | null>(null)
  const [userSettings, setUserSettings] = useState<UserSettings | null>(null)
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')
  const [toggling, setToggling] = useState(false)

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const [apiKeyResponse, settingsResponse] = await Promise.all([
        apiKeyApi.getOrCreate(),
        userSettingsApi.getOrCreate(),
      ])
      if (apiKeyResponse.data) {
        setApiKey(apiKeyResponse.data)
      }
      if (settingsResponse.data) {
        setUserSettings(settingsResponse.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '加载数据失败')
    } finally {
      setLoading(false)
    }
  }

  const copyToClipboard = () => {
    if (apiKey) {
      navigator.clipboard.writeText(apiKey.key)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const handleToggleCollection = async (enabled: boolean) => {
    try {
      setToggling(true)
      const response = await userSettingsApi.toggleCollection(enabled)
      if (response.data) {
        setUserSettings(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '切换收藏开关失败')
    } finally {
      setToggling(false)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">加载中...</div>
      </main>
    )
  }

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">设置</h1>
        <p className="text-muted-foreground">管理你的API Key和收藏设置</p>
      </div>

        {error && (
          <div className="mb-6 flex items-center gap-2 p-4 bg-destructive/10 text-destructive rounded-lg">
            <AlertCircle className="h-5 w-5" />
            <span>{error}</span>
            <Button
              variant="ghost"
              size="sm"
              className="ml-auto"
              onClick={() => setError('')}
            >
              关闭
            </Button>
          </div>
        )}

        {/* 收藏控制 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              收藏控制
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <Label htmlFor="collection-toggle" className="text-base font-semibold">
                  允许数据收藏
                </Label>
                <p className="text-sm text-muted-foreground">
                  开启后，Chrome插件才能收藏数据到你的账户
                </p>
              </div>
              <Switch
                id="collection-toggle"
                checked={userSettings?.collectionEnabled || false}
                onCheckedChange={handleToggleCollection}
                disabled={toggling}
              />
            </div>

            {!userSettings?.collectionEnabled && (
              <div className="flex items-start gap-2 p-3 bg-amber-500/10 text-amber-600 dark:text-amber-500 rounded-lg">
                <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5" />
                <div className="text-sm space-y-1">
                  <p className="font-semibold">收藏功能已关闭</p>
                  <p>Chrome插件将无法收藏数据。开启开关以允许数据收藏。</p>
                </div>
              </div>
            )}

            {/* 收藏限额信息（只读） */}
            <div className="border rounded-lg p-4 space-y-3">
              <h4 className="font-semibold text-sm">收藏限额</h4>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-muted-foreground">每日限额</p>
                  <p className="text-lg font-semibold">{userSettings?.collectionDailyLimit || 500} 条</p>
                </div>
                <div>
                  <p className="text-muted-foreground">单次限额</p>
                  <p className="text-lg font-semibold">{userSettings?.collectionBatchLimit || 50} 条</p>
                </div>
              </div>
              <p className="text-xs text-muted-foreground">
                * 限额由系统设定，每日零点重置。如需调整请联系管理员。
              </p>
            </div>
          </CardContent>
        </Card>

        {/* API Key 显示 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Chrome 插件 API Key
            </CardTitle>
          </CardHeader>
          <CardContent>
            {apiKey ? (
              <div className="space-y-4">
                <div className="bg-muted p-4 rounded-lg">
                  <p className="text-sm text-muted-foreground mb-2">你的专属 API Key：</p>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-3 py-2 bg-background rounded border font-mono text-sm break-all">
                      {apiKey.key}
                    </code>
                    <Button
                      size="sm"
                      onClick={copyToClipboard}
                      className="flex-shrink-0"
                    >
                      {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                      {copied ? '已复制' : '复制'}
                    </Button>
                  </div>
                </div>

                <div className="text-sm text-muted-foreground space-y-2">
                  <p>• 这是你的专属API Key，用于Chrome插件认证</p>
                  <p>• 每个用户只有一个固定的API Key，无需手动创建</p>
                  <p>• 请妥善保管，不要泄露给他人</p>
                </div>

                {apiKey.lastUsed && (
                  <p className="text-xs text-muted-foreground">
                    最后使用时间：{new Date(apiKey.lastUsed).toLocaleString('zh-CN')}
                  </p>
                )}
              </div>
            ) : (
              <p className="text-muted-foreground">加载失败，请刷新页面</p>
            )}
          </CardContent>
        </Card>

        {/* 插件下载和使用说明 */}
        <Card>
          <CardHeader>
            <CardTitle>Chrome 插件配置</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 text-sm">
              <p className="font-semibold">1. 下载插件</p>
              <Button
                variant="outline"
                className="w-full sm:w-auto"
                onClick={() => window.open('https://edit.crazyaigc.com/plugin/download', '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                下载 Chrome 插件
              </Button>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">2. 安装插件</p>
              <p className="text-muted-foreground">
                解压下载的文件，打开 Chrome 浏览器的扩展程序管理页面（chrome://extensions/），开启"开发者模式"，点击"加载已解压的扩展程序"，选择解压后的文件夹。
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">3. 配置 API Key</p>
              <p className="text-muted-foreground">
                点击插件图标，进入"设置"标签，将上方复制的 API Key 粘贴到输入框中并保存。
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">4. 开启收藏功能</p>
              <p className="text-muted-foreground">
                在本页面开启"允许数据收藏"开关，插件才能正常工作。
              </p>
            </div>

            <div className="space-y-2 text-sm">
              <p className="font-semibold">5. 开始使用</p>
              <p className="text-muted-foreground">
                访问平台网站，点击插件图标即可开始收藏数据。
              </p>
            </div>
          </CardContent>
        </Card>
    </main>
  )
}
