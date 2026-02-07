import { useEffect, useState } from 'react'
import { statsApi, type Stats } from '@/api'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { FileText, Users, Heart, Star, MessageSquare, Image, Video, Download, Chrome } from 'lucide-react'

export function DashboardPage() {
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    fetchStats()
  }, [])

  const fetchStats = async () => {
    try {
      setLoading(true)
      const response = await statsApi.get()
      if (response.data) {
        setStats(response.data)
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '获取统计数据失败')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center text-muted-foreground">加载中...</div>
      </main>
    )
  }

  if (error) {
    return (
      <main className="container mx-auto px-4 py-8">
        <div className="text-center text-destructive">{error}</div>
      </main>
    )
  }

  const StatCard = ({
    title,
    value,
    icon: Icon,
    description,
    color = 'text-blue-600',
  }: {
    title: string
    value: number | string
    icon: any
    description?: string
    color?: string
  }) => (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">
          {title}
        </CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value.toLocaleString()}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
      </CardContent>
    </Card>
  )

  return (
    <main className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">数据概览</h1>
        <p className="text-muted-foreground mt-2">内容管理统计</p>
      </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="笔记总数"
            value={stats?.totalNotes || 0}
            icon={FileText}
            color="text-blue-600"
          />
          <StatCard
            title="创作者总数"
            value={stats?.totalBloggers || 0}
            icon={Users}
            color="text-green-600"
          />
          <StatCard
            title="总点赞数"
            value={stats?.totalLikes || 0}
            icon={Heart}
            color="text-red-600"
          />
          <StatCard
            title="总收藏数"
            value={stats?.totalCollects || 0}
            icon={Star}
            color="text-yellow-600"
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-8">
          <StatCard
            title="总评论数"
            value={stats?.totalComments || 0}
            icon={MessageSquare}
            color="text-purple-600"
          />
          <StatCard
            title="图文笔记"
            value={stats?.imageNotes || 0}
            icon={Image}
            color="text-orange-600"
            description="含图片的笔记"
          />
          <StatCard
            title="视频笔记"
            value={stats?.videoNotes || 0}
            icon={Video}
            color="text-pink-600"
            description="含视频的笔记"
          />
          <StatCard
            title="平均互动"
            value={stats && stats.totalNotes > 0
              ? Math.round((stats.totalLikes + stats.totalCollects + stats.totalComments) / stats.totalNotes)
              : 0}
            icon={Heart}
            color="text-indigo-600"
            description="每篇笔记平均互动数"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>使用指南</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm text-muted-foreground">
            <p>• 安装 Chrome 插件后，访问平台笔记页面即可收藏内容</p>
            <p>• 在笔记详情页点击插件图标收藏单条内容</p>
            <p>• 在博主主页可以批量收藏内容列表和创作者信息</p>
            <p>• 收藏的内容将自动同步到本系统</p>
            <p>• 使用导航栏查看笔记列表、博主列表和统计数据</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Chrome className="h-5 w-5" />
              Chrome 插件下载
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              安装 Chrome 插件后，可以自动采集平台笔记和创作者信息到本系统。
            </p>

            <div className="space-y-2">
              <Button
                className="w-full sm:w-auto"
                variant="default"
                onClick={() => window.open('https://edit.crazyaigc.com/plugin/download', '_blank')}
              >
                <Download className="w-4 h-4 mr-2" />
                下载 Chrome 插件
              </Button>

              <p className="text-xs text-muted-foreground">
                插件配置说明和使用指南请查看下载页面
              </p>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p>• 支持 Chrome 88+ 浏览器</p>
              <p>• 无需登录即可使用</p>
              <p>• 数据自动同步到云端</p>
            </div>
          </CardContent>
        </Card>
    </main>
  )
}
