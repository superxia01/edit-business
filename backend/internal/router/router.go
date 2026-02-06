package router

import (
	"github.com/keenchase/edit-business/internal/handler"
	"github.com/keenchase/edit-business/internal/middleware"
	"github.com/keenchase/edit-business/internal/repository"
	"github.com/keenchase/edit-business/internal/service"

	"github.com/gin-gonic/gin"
)

// SetupRouter 设置路由
func SetupRouter(
	noteHandler *handler.NoteHandler,
	bloggerHandler *handler.BloggerHandler,
	userHandler *handler.UserHandler,
	authHandler *handler.AuthHandler,
	statsHandler *handler.StatsHandler,
	apiKeyHandler *handler.APIKeyHandler,
	userSettingsHandler *handler.UserSettingsHandler,
	qiniuHandler *handler.QiniuHandler,
	authCenterService *service.AuthCenterService,
	userRepo *repository.UserRepository,
) *gin.Engine {
	router := gin.Default()

	// CORS 中间件
	router.Use(CORSMiddleware())

	// 健康检查
	router.GET("/health", func(c *gin.Context) {
		c.JSON(200, gin.H{
			"status":  "ok",
			"service": "edit-business",
		})
	})

	// API v1
	v1 := router.Group("/api/v1")
	{
		// 认证相关路由（无需认证）
		auth := v1.Group("/auth")
		{
			auth.GET("/wechat/login", authHandler.WechatLoginProxy)
			auth.GET("/wechat/callback", authHandler.WechatCallback)
		}

		// 用户信息路由（使用 AuthCenterMiddleware 验证 auth-center token）
		v1.GET("/user/me", middleware.AuthCenterMiddleware(authCenterService, userRepo), authHandler.Me)
		v1.GET("/users/me", middleware.AuthCenterMiddleware(authCenterService, userRepo), authHandler.Me) // 别名，兼容旧代码

		// 笔记相关路由
		notes := v1.Group("/notes")
		{
			// 同步接口（支持 JWT 或 API Key 认证）- Chrome 插件使用
			notes.Use(apiKeyHandler.ValidateAPIKeyMiddleware())
			notes.POST("", noteHandler.Create)
			notes.POST("/batch", noteHandler.BatchCreate)

			// 查询/删除接口（需要认证）
			notesAuth := notes.Group("")
			notesAuth.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
			{
				notesAuth.GET("", noteHandler.List)
				notesAuth.GET("/:id", noteHandler.GetByID)
				notesAuth.PUT("/:id", noteHandler.Update)
				notesAuth.DELETE("/:id", noteHandler.Delete)
			}
		}

		// 博主相关路由
		bloggers := v1.Group("/bloggers")
		{
			// 同步接口（支持 JWT 或 API Key 认证）- Chrome 插件使用
			bloggers.Use(apiKeyHandler.ValidateAPIKeyMiddleware())
			bloggers.POST("", bloggerHandler.Create)
			bloggers.POST("/batch", bloggerHandler.BatchCreate)
			bloggers.POST("/upsert", bloggerHandler.UpsertByXhsID)

			// 查询/删除接口（需要认证）
			bloggersAuth := bloggers.Group("")
			bloggersAuth.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
			{
				bloggersAuth.GET("", bloggerHandler.List)
				bloggersAuth.GET("/:id", bloggerHandler.GetByID)
				bloggersAuth.GET("/xhs/:xhsId", bloggerHandler.GetByXhsID)
				bloggersAuth.PUT("/:id", bloggerHandler.Update)
				bloggersAuth.DELETE("/:id", bloggerHandler.Delete)
			}
		}

		// 用户相关路由（需要认证）
		users := v1.Group("/users")
		users.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
		{
			users.POST("", userHandler.Create)
			users.GET("/sync/:authCenterUserId", userHandler.SyncUserFromAuthCenter)
			users.GET("/auth-center/:authCenterUserId", userHandler.GetByAuthCenterUserID)
			users.GET("/:id", userHandler.GetByID)
			users.PUT("/:id", userHandler.Update)
			users.DELETE("/:id", userHandler.Delete)
		}

		// 统计数据路由（需要认证）
		stats := v1.Group("/stats")
		stats.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
		{
			stats.GET("", statsHandler.GetStats)
		}

		// API Key管理路由（需要认证）
		apiKeys := v1.Group("/api-keys")
		apiKeys.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
		{
			apiKeys.POST("", apiKeyHandler.Create)
			apiKeys.GET("", apiKeyHandler.List)
			apiKeys.GET("/get-or-create", apiKeyHandler.GetOrCreate) // 获取或自动创建
			apiKeys.GET("/stats", apiKeyHandler.GetStats)
			apiKeys.DELETE("/:id", apiKeyHandler.Delete)
			apiKeys.PATCH("/:id/deactivate", apiKeyHandler.Deactivate)
		}

		// API Key验证路由（支持 API Key 认证）- 插件使用
		apiKeysValidate := v1.Group("/api-keys")
		apiKeysValidate.Use(apiKeyHandler.ValidateAPIKeyMiddleware())
		{
			apiKeysValidate.GET("/validate", apiKeyHandler.Validate) // 验证 API Key
		}

		// 用户设置路由（需要认证）
		userSettings := v1.Group("/user-settings")
		userSettings.Use(middleware.AuthCenterMiddleware(authCenterService, userRepo))
		{
			userSettings.GET("", userSettingsHandler.GetOrCreate)
			userSettings.POST("/toggle-collection", userSettingsHandler.ToggleCollectionEnabled)
		}

		// 七牛云相关路由（使用 API Key 认证）
		qiniu := v1.Group("/qiniu")
		qiniu.Use(apiKeyHandler.ValidateAPIKeyMiddleware())
		{
			qiniu.GET("/upload-token", qiniuHandler.GetUploadToken)
		}
	}

	return router
}

// CORSMiddleware CORS 中间件
// 遵循 KeenChase V3.0 规范：支持 chrome-extension://*
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		// 允许的源
		allowedOrigins := []string{
			"http://localhost:5173",  // Vite dev server
			"http://localhost:3000",  // 可能的其他端口
			"http://127.0.0.1:5173",
			"http://127.0.0.1:3000",
			"https://edit.crazyaigc.com", // Production
		}

		origin := c.Request.Header.Get("Origin")
		allowed := false

		// 检查是否在允许列表中
		for _, allowedOrigin := range allowedOrigins {
			if origin == allowedOrigin {
				allowed = true
				break
			}
		}

		// Chrome 插件：允许所有 chrome-extension:// 协议的请求
		if len(origin) > 0 && (origin[:20] == "chrome-extension://" || origin[:18] == "moz-extension://") {
			allowed = true
		}

		if allowed {
			c.Writer.Header().Set("Access-Control-Allow-Origin", origin)
		}

		c.Writer.Header().Set("Access-Control-Allow-Credentials", "true")
		c.Writer.Header().Set("Access-Control-Allow-Headers", "Content-Type, Content-Length, Accept-Encoding, X-CSRF-Token, Authorization, accept, origin, Cache-Control, X-Requested-With, X-User-ID, X-API-Key")
		c.Writer.Header().Set("Access-Control-Allow-Methods", "POST, OPTIONS, GET, PUT, DELETE, PATCH")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}
