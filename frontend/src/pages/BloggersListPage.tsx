import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { DataTable } from '@/components/ui/data-table'
import { bloggersApi, type Blogger } from '@/api'
import { ExternalLink, User } from 'lucide-react'

export function BloggersListPage() {
  const [bloggers, setBloggers] = useState<Blogger[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  })

  const fetchBloggers = async (page = 1, size = 20) => {
    try {
      setLoading(true)
      const response = await bloggersApi.list({ page, size })
      if (response.data) {
        setBloggers(response.data.bloggers)
        setPagination({
          page: response.data.page,
          size: response.data.size,
          total: response.data.total,
          totalPages: response.data.totalPages,
        })
      }
    } catch (error) {
      console.error('Failed to fetch bloggers:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchBloggers()
  }, [])

  const formatDate = (timestamp: number) => {
    if (!timestamp) return '-'
    return new Date(timestamp).toLocaleDateString('zh-CN')
  }

  const formatNumber = (num: number) => {
    if (num >= 10000) {
      return `${(num / 10000).toFixed(1)}万`
    }
    return num.toString()
  }

  const columns: ColumnDef<Blogger>[] = [
    {
      accessorKey: 'avatarUrl',
      header: '头像',
      cell: ({ row }) => {
        const avatarUrl = row.original.avatarUrl
        return avatarUrl ? (
          <img
            src={avatarUrl}
            alt={row.original.bloggerName}
            className="w-10 h-10 rounded-full object-cover"
          />
        ) : (
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center">
            <User className="w-5 h-5 text-muted-foreground" />
          </div>
        )
      },
    },
    {
      accessorKey: 'bloggerName',
      header: '创作者名称',
      cell: ({ row }) => row.original.bloggerName || '-',
    },
    {
      accessorKey: 'xhsId',
      header: '平台ID',
      cell: ({ row }) => row.original.xhsId || '-',
    },
    {
      accessorKey: 'description',
      header: '简介',
      cell: ({ row }) => {
        const description = row.original.description
        return (
          <div className="max-w-[300px] truncate" title={description}>
            {description || '-'}
          </div>
        )
      },
    },
    {
      accessorKey: 'followersCount',
      header: '粉丝数',
      cell: ({ row }) => {
        const count = row.original.followersCount
        return (
          <Badge variant="secondary" className="font-semibold">
            {formatNumber(count)}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'bloggerUrl',
      header: '主页链接',
      cell: ({ row }) => {
        const url = row.original.bloggerUrl
        return url ? (
          <Button variant="ghost" size="sm" asChild>
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              访问主页
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
        ) : (
          '-'
        )
      },
    },
    {
      accessorKey: 'captureTimestamp',
      header: '收藏时间',
      cell: ({ row }) => formatDate(row.original.captureTimestamp),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-muted-foreground">加载中...</div>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">创作者列表</h1>
        <p className="text-muted-foreground mt-1">
          共 {pagination.total} 位创作者
        </p>
      </div>

      <DataTable columns={columns} data={bloggers} pageSize={pagination.size} />
    </div>
  )
}
