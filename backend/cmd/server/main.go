package main

import (
	"fmt"
	"log"

	"github.com/gin-gonic/gin"
	"github.com/keenchase/edit-business/internal/config"
	"github.com/keenchase/edit-business/internal/handler"
	"github.com/keenchase/edit-business/internal/repository"
	"github.com/keenchase/edit-business/internal/router"
	"github.com/keenchase/edit-business/internal/service"
	"github.com/keenchase/edit-business/pkg/database"
)

func main() {
	// 加载配置
	cfg := config.LoadConfig()

	// 初始化数据库
	if err := database.InitDatabase(cfg); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}
	defer database.CloseDatabase()

	// 自动迁移（开发环境使用，生产环境应使用迁移脚本）
	// 注释：生产环境使用手动迁移脚本，禁用 AutoMigrate
	// if err := database.AutoMigrate(); err != nil {
	// 	log.Fatalf("Failed to auto migrate: %v", err)
	// }

	// 初始化仓库层
	db := database.GetDB()
	noteRepo := repository.NewNoteRepository(db)
	bloggerRepo := repository.NewBloggerRepository(db)
	userRepo := repository.NewUserRepository(db)
	apiKeyRepo := repository.NewAPIKeyRepository(db)
	userSettingsRepo := repository.NewUserSettingsRepository(db)

	// 初始化服务层
	// Note: UserSettingsService must be created before NoteService and BloggerService since they depend on it
	userSettingsService := service.NewUserSettingsService(userSettingsRepo, userRepo, noteRepo)
	noteService := service.NewNoteService(noteRepo, userSettingsService)
	bloggerService := service.NewBloggerService(bloggerRepo, userSettingsService)
	userService := service.NewUserService(userRepo)
	statsService := service.NewStatsService(noteRepo, bloggerRepo, userSettingsService)
	apiKeyService := service.NewAPIKeyService(apiKeyRepo, userRepo)
	authCenterService := service.NewAuthCenterService() // 账号中心服务

	// 初始化处理器
	noteHandler := handler.NewNoteHandler(noteService)
	bloggerHandler := handler.NewBloggerHandler(bloggerService)
	userHandler := handler.NewUserHandler(userService)
	authHandler := handler.NewAuthHandler(userService)
	statsHandler := handler.NewStatsHandler(statsService)
	apiKeyHandler := handler.NewAPIKeyHandler(apiKeyService)
	userSettingsHandler := handler.NewUserSettingsHandler(userSettingsService)
	qiniuHandler := handler.NewQiniuHandler()

	// 设置路由
	gin.SetMode(gin.ReleaseMode)
	router := router.SetupRouter(noteHandler, bloggerHandler, userHandler, authHandler, statsHandler, apiKeyHandler, userSettingsHandler, qiniuHandler, authCenterService, userRepo)

	// 打印路由信息
	log.Printf("Router initialized. Registered routes:")
	for _, route := range router.Routes() {
		log.Printf("  %s %s", route.Method, route.Path)
	}

	// 启动服务器
	addr := fmt.Sprintf("%s:%s", cfg.ServerHost, cfg.ServerPort)
	log.Printf("Starting server on %s", addr)

	if err := router.Run(addr); err != nil {
		log.Fatalf("Failed to start server: %v", err)
	}
}
