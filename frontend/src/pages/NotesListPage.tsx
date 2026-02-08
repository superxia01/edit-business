import { useEffect, useState } from 'react'
import type { ColumnDef } from '@tanstack/react-table'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { DataTable } from '@/components/ui/data-table'
import { notesApi, type Note } from '@/api'
import { ExternalLink, Image as ImageIcon, Video, Trash2, Filter } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

export function NotesListPage() {
  const [notes, setNotes] = useState<Note[]>([])
  const [loading, setLoading] = useState(true)
  const [pagination, setPagination] = useState({
    page: 1,
    size: 20,
    total: 0,
    totalPages: 0,
  })

  // 筛选条件
  const [authorFilter, setAuthorFilter] = useState('')
  const [tagFilter, setTagFilter] = useState('')

  const fetchNotes = async (page = 1, size = 20) => {
    try {
      setLoading(true)
      const params: any = { page, size, source: 'single' }

      // 添加筛选条件
      if (authorFilter) {
        params.author = authorFilter
      }
      if (tagFilter) {
        params.tags = [tagFilter]
      }

      const response = await notesApi.list(params)
      if (response.data) {
        setNotes(response.data.notes)
        setPagination({
          page: response.data.page,
          size: response.data.size,
          total: response.data.total,
          totalPages: response.data.totalPages,
        })
      }
    } catch (error) {
      console.error('Failed to fetch notes:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotes()
  }, [authorFilter, tagFilter])

  const handleDelete = async (id: string) => {
    try {
      await notesApi.delete(id)
      // 刷新列表
      fetchNotes(pagination.page, pagination.size)
    } catch (error) {
      console.error('Failed to delete note:', error)
    }
  }

  const handleFilter = () => {
    fetchNotes(1, pagination.size)
  }

  const handleClearFilter = () => {
    setAuthorFilter('')
    setTagFilter('')
    fetchNotes(1, pagination.size)
  }

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

  const columns: ColumnDef<Note>[] = [
    {
      accessorKey: 'title',
      header: '标题',
      cell: ({ row }) => (
        <div className="min-w-0 truncate" title={row.original.title || ''}>
          {row.original.title || '无标题'}
        </div>
      ),
    },
    {
      accessorKey: 'coverImage',
      header: '封面图',
      cell: ({ row }) => {
        const hasImages = row.original.imageUrls && row.original.imageUrls.length > 0

        if (hasImages) {
          const coverImageUrl = row.original.coverImageUrl || row.original.imageUrls[0]
          // 七牛云图片处理：添加缩略图参数
          const thumbnailUrl = coverImageUrl.includes('cdn.crazyaigc.com')
            ? `${coverImageUrl}?imageView2/2/w/100/h/100`
            : coverImageUrl

          return (
            <a
              href={coverImageUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-block flex-shrink-0"
              title="点击查看大图"
            >
              <img
                src={thumbnailUrl}
                alt="封面图"
                className="w-16 h-16 object-cover rounded border border-gray-200 hover:border-blue-500 transition-colors"
                loading="lazy"
              />
            </a>
          )
        }

        return <span className="text-muted-foreground">-</span>
      },
    },
    {
      accessorKey: 'innerImages',
      header: '内页图',
      cell: ({ row }) => {
        if (row.original.videoUrl) {
          return <span className="text-muted-foreground">-</span>
        }

        const imageUrls = row.original.imageUrls || []
        const coverImageUrl = row.original.coverImageUrl || (imageUrls.length > 0 ? imageUrls[0] : '')
        const innerImages = imageUrls.filter(url => url !== coverImageUrl)

        if (innerImages.length === 0) {
          return <span className="text-muted-foreground">-</span>
        }

        return (
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-8">
                {innerImages.length} 张
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>内页图片（共 {innerImages.length} 张）</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-3 sm:grid-cols-4 gap-3">
                {innerImages.map((url, idx) => {
                  const thumbUrl = url.includes('cdn.crazyaigc.com')
                    ? `${url}?imageView2/2/w/200/h/200`
                    : url
                  return (
                    <a
                      key={idx}
                      href={url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block"
                    >
                      <img
                        src={thumbUrl}
                        alt={`内页图${idx + 1}`}
                        className="w-full aspect-square object-cover rounded border hover:border-primary transition-colors"
                        loading="lazy"
                      />
                    </a>
                  )
                })}
              </div>
            </DialogContent>
          </Dialog>
        )
      },
    },
    {
      accessorKey: 'author',
      header: '作者',
      cell: ({ row }) => (
        <div className="truncate max-w-[120px]" title={row.original.author || ''}>
          {row.original.author || '-'}
        </div>
      ),
    },
    {
      accessorKey: 'noteType',
      header: '类型',
      cell: ({ row }) => {
        const type = row.original.noteType
        return (
          <Badge variant={type === '视频' ? 'default' : 'secondary'} className="whitespace-nowrap">
            {type === '视频' ? (
              <Video className="w-3 h-3 mr-1" />
            ) : (
              <ImageIcon className="w-3 h-3 mr-1" />
            )}
            {type || '图文'}
          </Badge>
        )
      },
    },
    {
      accessorKey: 'video',
      header: '视频',
      cell: ({ row }) => {
        const videoUrl = row.original.videoUrl

        if (!videoUrl) {
          return <span className="text-muted-foreground">-</span>
        }

        return (
          <a
            href={videoUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-blue-600 hover:underline flex items-center gap-1 whitespace-nowrap"
          >
            <Video className="w-3 h-3" />
            查看视频
          </a>
        )
      },
    },
    {
      accessorKey: 'tags',
      header: '标签',
      cell: ({ row }) => {
        const rawTags = row.original.tags as unknown
        const tags: string[] = Array.isArray(rawTags)
          ? rawTags.map((t: unknown) => String(t ?? '')).filter(Boolean) as string[]
          : typeof rawTags === 'string'
            ? (rawTags as string).split(',').map((s: string) => s.trim()).filter(Boolean)
            : []
        if (tags.length === 0) return <span className="text-muted-foreground">-</span>
        return (
          <div className="flex gap-1 flex-nowrap overflow-hidden items-center">
            {tags.slice(0, 2).map((tag: string, index: number) => (
              <Badge key={index} variant="outline" className="text-xs flex-shrink-0">
                <span className="truncate max-w-[60px]">{tag}</span>
              </Badge>
            ))}
            {tags.length > 2 && (
              <Dialog>
                <DialogTrigger asChild>
                  <Badge variant="outline" className="text-xs flex-shrink-0 cursor-pointer hover:bg-accent">
                    +{tags.length - 2}
                  </Badge>
                </DialogTrigger>
                <DialogContent className="max-w-sm">
                  <DialogHeader>
                    <DialogTitle>全部标签（{tags.length} 个）</DialogTitle>
                  </DialogHeader>
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag: string, index: number) => (
                      <Badge key={index} variant="secondary">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>
        )
      },
    },
    {
      accessorKey: 'likes',
      header: '点赞',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatNumber(row.original.likes)}</span>,
    },
    {
      accessorKey: 'collects',
      header: '收藏',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatNumber(row.original.collects)}</span>,
    },
    {
      accessorKey: 'comments',
      header: '评论',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatNumber(row.original.comments)}</span>,
    },
    {
      accessorKey: 'publishDate',
      header: '发布时间',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.publishDate)}</span>,
    },
    {
      accessorKey: 'captureTimestamp',
      header: '采集时间',
      cell: ({ row }) => <span className="whitespace-nowrap">{formatDate(row.original.captureTimestamp)}</span>,
    },
    {
      id: 'actions',
      header: '操作',
      cell: ({ row }) => (
        <div className="flex gap-2 flex-shrink-0">
          <Button variant="ghost" size="sm" asChild>
            <a
              href={row.original.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-1"
            >
              查看原文
              <ExternalLink className="w-3 h-3" />
            </a>
          </Button>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="ghost" size="sm" className="text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>确认删除</AlertDialogTitle>
                <AlertDialogDescription>
                  确定要删除这条笔记吗？此操作无法撤销。
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>取消</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() => handleDelete(row.original.id)}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  删除
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      ),
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
        <h1 className="text-3xl font-bold">笔记列表</h1>
        <p className="text-muted-foreground mt-1">
          共 {pagination.total} 条笔记
        </p>
      </div>

      {/* 筛选栏 */}
      <div className="mb-6 p-4 bg-card rounded-lg border">
        <div className="flex items-center gap-4">
          <Filter className="w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="按作者筛选"
            value={authorFilter}
            onChange={(e) => setAuthorFilter(e.target.value)}
            className="max-w-xs"
          />
          <Input
            placeholder="按标签筛选"
            value={tagFilter}
            onChange={(e) => setTagFilter(e.target.value)}
            className="max-w-xs"
          />
          <Button onClick={handleFilter} size="sm">
            筛选
          </Button>
          <Button onClick={handleClearFilter} variant="outline" size="sm">
            清除
          </Button>
        </div>
      </div>

      <DataTable columns={columns} data={notes} pageSize={pagination.size} />
    </div>
  )
}
