import { Link, useLocation } from 'react-router-dom'
import { useAuth } from '@/hooks/useAuth'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { User, LogOut, Settings } from 'lucide-react'

export function Navigation() {
  const location = useLocation()
  const { user, logout } = useAuth()

  const navItems = [
    { path: '/dashboard', label: '数据概览' },
    { path: '/notes', label: '单篇笔记' },
    { path: '/blogger-notes', label: '创作者内容' },
    { path: '/bloggers', label: '创作者列表' },
    { path: '/settings', label: '设置', icon: Settings },
  ]

  return (
    <nav className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          <div className="flex items-center gap-8">
            <Link to="/" className="flex items-center space-x-2">
              <span className="text-xl font-bold">内容管理工具</span>
            </Link>
            <div className="flex items-center gap-2">
              {navItems.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn(
                    'px-4 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2',
                    location.pathname === item.path
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground hover:bg-muted'
                  )}
                >
                  {item.icon && <item.icon className="w-4 h-4" />}
                  {item.label}
                </Link>
              ))}
            </div>
          </div>

          {/* 用户信息 */}
          <div className="flex items-center gap-4">
            {user && (
              <>
                <div className="flex items-center gap-2 text-sm">
                  {(user.avatarUrl || user.profile?.avatarUrl || user.profile?.headimgurl) ? (
                    <img
                      src={user.avatarUrl || user.profile?.avatarUrl || user.profile?.headimgurl}
                      alt={user.nickname || user.profile?.nickname || '用户'}
                      className="w-8 h-8 rounded-full"
                    />
                  ) : (
                    <User className="w-4 h-4" />
                  )}
                  <span className="text-muted-foreground">
                    {user.nickname || user.profile?.nickname || user.authCenterUserId?.substring(0, 8)}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={logout}
                  className="flex items-center gap-1"
                >
                  <LogOut className="w-4 h-4" />
                  登出
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  )
}
