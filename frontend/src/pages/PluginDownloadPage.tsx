import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Download, AlertCircle, CheckCircle, FileText, Clock } from 'lucide-react'

export function PluginDownloadPage() {
  const downloadLink = 'https://gobiggroup.feishu.cn/docx/Da4ddgCkToF1vDxyLxvc2Thdn8e?from=from_copylink'

  const features = [
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: '一键采集',
      description: '在笔记详情页或博主主页，点击插件图标即可自动采集数据'
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: '批量同步',
      description: '支持批量采集博主主页的笔记列表，提高采集效率'
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: '自动存储',
      description: '采集的数据自动同步到云端，随时随地查看'
    },
    {
      icon: <CheckCircle className="h-5 w-5 text-green-600" />,
      title: '无需登录',
      description: '插件使用无需登录，即装即用'
    },
  ]

  const steps = [
    {
      num: 1,
      title: '下载插件',
      description: '点击下方下载按钮，获取插件压缩包'
    },
    {
      num: 2,
      title: '解压文件',
      description: '将下载的压缩包解压到本地文件夹'
    },
    {
      num: 3,
      title: '安装插件',
      description: '打开 Chrome 浏览器，访问 chrome://extensions/，开启"开发者模式"，点击"加载已解压的扩展程序"'
    },
    {
      num: 4,
      title: '开始使用',
      description: '访问小红书网站，点击插件图标即可开始采集数据'
    },
  ]

  const configSteps = [
    {
      title: '获取 API Key',
      description: '登录系统后进入"设置"页面，点击"创建API Key"生成认证密钥',
    },
    {
      title: '配置插件',
      description: '安装插件后，点击插件图标进入"设置"标签，粘贴 API Key 并保存',
    },
    {
      title: '开始使用',
      description: '配置完成后，访问小红书页面即可开始采集数据',
    },
  ]

  return (
    <main className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Chrome 插件下载</h1>
        <p className="text-muted-foreground">
          小红书数据采集插件，一键采集笔记和博主信息
        </p>
      </div>

        {/* 下载卡片 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Download className="h-6 w-6" />
              下载插件 v2.0.0
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              点击下方按钮下载插件压缩包，解压后按照配置说明安装使用。
            </p>

            <div className="flex gap-4">
              <Button
                size="lg"
                onClick={() => window.open(downloadLink, '_blank')}
                className="flex items-center gap-2"
              >
                <Download className="w-5 h-5" />
                下载插件
              </Button>

              <Button
                size="lg"
                variant="outline"
                onClick={() => window.open('https://edit.crazyaigc.com/dashboard', '_self')}
              >
                返回首页
              </Button>
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>更新时间：2026年2月4日</span>
            </div>
          </CardContent>
        </Card>

        {/* 功能特性 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>功能特性</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-2">
              {features.map((feature, index) => (
                <div key={index} className="flex gap-3 p-4 border rounded-lg">
                  <div className="flex-shrink-0">
                    {feature.icon}
                  </div>
                  <div>
                    <h3 className="font-semibold mb-1">{feature.title}</h3>
                    <p className="text-sm text-muted-foreground">{feature.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 安装步骤 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle>安装步骤</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold">
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-semibold mb-1">{step.title}</h3>
                    <p className="text-sm text-muted-foreground">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* 配置说明 */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              配置说明
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {configSteps.map((step, index) => (
              <div key={index} className="space-y-2">
                <h3 className="font-semibold">{step.title}</h3>
                <p className="text-sm text-muted-foreground">{step.description}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        {/* 注意事项 */}
        <Card className="border-yellow-200 bg-yellow-50 dark:bg-yellow-950">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-yellow-800 dark:text-yellow-200">
              <AlertCircle className="h-5 w-5" />
              注意事项
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-yellow-700 dark:text-yellow-300 space-y-2">
            <p>• 插件仅支持 Chrome 浏览器 88+ 版本</p>
            <p>• 使用插件前必须先配置 API Key（在设置页面生成）</p>
            <p>• 采集数据需要有稳定的网络连接</p>
            <p>• 采集的数据会自动同步到你的账号下</p>
            <p>• API Key 可以随时停用或删除，建议定期更换</p>
          </CardContent>
        </Card>

        {/* 技术支持 */}
        <Card>
          <CardHeader>
            <CardTitle>需要帮助？</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>• 1. 登录系统后访问<a href="/settings" className="text-primary hover:underline">设置页面</a>生成 API Key</p>
            <p>• 2. 安装插件后在"设置"标签中配置 API Key</p>
            <p>• 3. 访问小红书页面，点击插件图标开始采集</p>
            <p>• <a href="https://gobiggroup.feishu.cn/docx/Da4ddgCkToF1vDxyLxvc2Thdn8e?from=from_copylink" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">查看使用文档</a></p>
          </CardContent>
        </Card>
    </main>
  )
}
