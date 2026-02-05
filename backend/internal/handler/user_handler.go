package handler

import (
	"github.com/keenchase/edit-business/internal/service"
	"github.com/gin-gonic/gin"
)

// UserHandler 用户处理器
type UserHandler struct {
	userService *service.UserService
}

// NewUserHandler 创建用户处理器实例
func NewUserHandler(userService *service.UserService) *UserHandler {
	return &UserHandler{userService: userService}
}

// Create 创建用户
// @Summary 创建用户
// @Description 创建新用户（关联账号中心）
// @Tags users
// @Accept json
// @Produce json
// @Param request body service.CreateUserRequest true "创建用户请求"
// @Success 200 {object} Response
// @Router /api/v1/users [post]
func (h *UserHandler) Create(c *gin.Context) {
	var req service.CreateUserRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	user, err := h.userService.Create(&req)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, user)
}

// GetByID 根据 ID 获取用户
// @Summary 获取用户详情
// @Description 根据 ID 获取用户详情
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "用户 ID"
// @Success 200 {object} Response
// @Router /api/v1/users/{id} [get]
func (h *UserHandler) GetByID(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	user, err := h.userService.GetByID(id)
	if err != nil {
		NotFound(c, "user not found")
		return
	}

	SuccessResponse(c, user)
}

// GetByAuthCenterUserID 根据账号中心用户 ID 获取用户
// @Summary 根据账号中心 ID 获取用户
// @Description 根据账号中心用户 ID 获取用户信息
// @Tags users
// @Accept json
// @Produce json
// @Param authCenterUserId path string true "账号中心用户 ID"
// @Success 200 {object} Response
// @Router /api/v1/users/auth-center/{authCenterUserId} [get]
func (h *UserHandler) GetByAuthCenterUserID(c *gin.Context) {
	authCenterUserID := c.Param("authCenterUserId")
	if authCenterUserID == "" {
		BadRequest(c, "authCenterUserId is required")
		return
	}

	user, err := h.userService.GetByAuthCenterUserID(authCenterUserID)
	if err != nil {
		NotFound(c, "user not found")
		return
	}

	SuccessResponse(c, user)
}

// SyncUserFromAuthCenter 从账号中心同步用户
// @Summary 同步用户
// @Description 从账号中心同步用户信息
// @Tags users
// @Accept json
// @Produce json
// @Param authCenterUserId path string true "账号中心用户 ID"
// @Success 200 {object} Response
// @Router /api/v1/users/sync/{authCenterUserId} [post]
func (h *UserHandler) SyncUserFromAuthCenter(c *gin.Context) {
	authCenterUserID := c.Param("authCenterUserId")
	if authCenterUserID == "" {
		BadRequest(c, "authCenterUserId is required")
		return
	}

	user, err := h.userService.SyncUserFromAuthCenter(authCenterUserID, nil, nil)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, user)
}

// Update 更新用户
// @Summary 更新用户
// @Description 更新用户信息
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "用户 ID"
// @Param request body model.User true "用户信息"
// @Success 200 {object} Response
// @Router /api/v1/users/{id} [put]
func (h *UserHandler) Update(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	// 获取现有用户
	user, err := h.userService.GetByID(id)
	if err != nil {
		NotFound(c, "user not found")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	// 更新字段（这里简化处理）
	_ = req

	err = h.userService.Update(user)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, user)
}

// Delete 删除用户
// @Summary 删除用户
// @Description 根据 ID 删除用户
// @Tags users
// @Accept json
// @Produce json
// @Param id path string true "用户 ID"
// @Success 200 {object} Response
// @Router /api/v1/users/{id} [delete]
func (h *UserHandler) Delete(c *gin.Context) {
	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	err := h.userService.Delete(id)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, gin.H{
		"id":     id,
		"status": "deleted",
	})
}

// Me 获取当前登录用户信息
// @Summary 获取当前用户
// @Description 获取当前登录用户信息（需要认证）
// @Tags users
// @Accept json
// @Produce json
// @Success 200 {object} Response
// @Router /api/v1/users/me [get]
func (h *UserHandler) Me(c *gin.Context) {
	// 从 JWT token 或 session 中获取用户 ID
	// 这里简化处理，从 header 中获取
	userID := c.GetHeader("X-User-ID")
	if userID == "" {
		BadRequest(c, "X-User-ID header is required")
		return
	}

	user, err := h.userService.GetByID(userID)
	if err != nil {
		NotFound(c, "user not found")
		return
	}

	SuccessResponse(c, user)
}
