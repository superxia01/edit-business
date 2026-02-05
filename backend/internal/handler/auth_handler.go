package handler

import (
	"bytes"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

	"github.com/keenchase/edit-business/internal/middleware"
	"github.com/keenchase/edit-business/internal/service"
	"github.com/gin-gonic/gin"
)

// AuthHandler 认证处理器
type AuthHandler struct {
	userService *service.UserService
}

// NewAuthHandler 创建认证处理器实例
func NewAuthHandler(userService *service.UserService) *AuthHandler {
	return &AuthHandler{userService: userService}
}

// WechatLoginProxy 发起微信登录（重定向到 auth-center）
// @Summary 发起微信登录
// @Description 重定向到账号中心进行微信登录
// @Tags auth
// @Accept json
// @Produce json
// @Param callbackUrl query string false "回调地址"
// @Success 200 {object} Response
// @Router /api/v1/auth/wechat/login [get]
func (h *AuthHandler) WechatLoginProxy(c *gin.Context) {
	// 构建回调 URL
	callbackURL := "https://edit.crazyaigc.com/api/v1/auth/wechat/callback"
	authCenterURL := fmt.Sprintf(
		"https://os.crazyaigc.com/api/auth/wechat/login?callbackUrl=%s",
		callbackURL,
	)

	// 重定向到账号中心
	c.Redirect(http.StatusFound, authCenterURL)
}

// WechatLoginRequest 微信登录请求
type WechatLoginRequest struct {
	AuthCode string `json:"authCode" binding:"required"`
	Type     string `json:"type"` // "open" (开放平台) 或 "mp" (公众号)
}

// WechatLogin PC扫码微信登录
// @Summary PC扫码微信登录
// @Description 使用 authCode 换取用户信息并登录
// @Tags auth
// @Accept json
// @Produce json
// @Param request body WechatLoginRequest true "登录请求"
// @Success 200 {object} Response
// @Router /api/v1/auth/wechat [post]
func (h *AuthHandler) WechatLogin(c *gin.Context) {
	var req WechatLoginRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	// 调用账号中心的微信登录API，用 code 换取用户信息
	// POST https://os.crazyaigc.com/api/auth/wechat/login
	// Body: {"code": "xxx", "type": "open"}
	loginReqBody, _ := json.Marshal(map[string]string{
		"code": req.AuthCode,
		"type": req.Type,
	})

	loginResp, err := http.Post(
		"https://os.crazyaigc.com/api/auth/wechat/login",
		"application/json",
		bytes.NewBuffer(loginReqBody),
	)
	if err != nil {
		InternalError(c, "调用账号中心失败")
		return
	}
	defer loginResp.Body.Close()

	var loginResult struct {
		Success bool `json:"success"`
		Data    struct {
			UserID      string                 `json:"userId"`
			Token       string                 `json:"token"`
			UnionID     string                 `json:"unionId"`
			PhoneNumber string                 `json:"phoneNumber"`
			Profile     map[string]interface{} `json:"profile"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(loginResp.Body).Decode(&loginResult); err != nil {
		InternalError(c, "解析响应失败")
		return
	}

	if !loginResult.Success {
		BadRequest(c, loginResult.Message)
		return
	}

	// 从 data.profile 直接获取用户信息（PC扫码登录不需要再调用 user-info）
	var nicknameStr, avatarUrlStr string
	if loginResult.Data.Profile != nil {
		if val, ok := loginResult.Data.Profile["nickname"]; ok && val != nil {
			switch v := val.(type) {
			case string:
				nicknameStr = v
			case []byte:
				nicknameStr = string(v)
			}
		}
		if val, ok := loginResult.Data.Profile["avatarUrl"]; ok && val != nil {
			switch v := val.(type) {
			case string:
				avatarUrlStr = v
			case []byte:
				avatarUrlStr = string(v)
			}
		}
	}

	// 同步或创建用户
	user, err := h.userService.SyncUserFromAuthCenter(loginResult.Data.UserID, nicknameStr, avatarUrlStr)
	if err != nil {
		InternalError(c, "创建用户失败")
		return
	}

	// 生成 JWT token（本地系统的 token）
	jwtToken, err := middleware.GenerateToken(user.ID.String())
	if err != nil {
		InternalError(c, "生成令牌失败")
		return
	}

	SuccessResponse(c, gin.H{
		"token": jwtToken,
		"user":  user,
	})
}

// WechatCallback 微信登录回调（接收账号中心回调）
// @Summary 微信登录回调
// @Description 接收账号中心回调，验证token并创建本地用户
// @Tags auth
// @Accept json
// @Produce json
// @Param userId query string true "账号中心用户ID"
// @Param token query string true "账号中心token"
// @Success 302 {string} string "重定向到前端"
// @Router /api/v1/auth/wechat/callback [get]
func (h *AuthHandler) WechatCallback(c *gin.Context) {
	userId := c.Query("userId")
	authCenterToken := c.Query("token")

	// 验证参数
	if userId == "" || authCenterToken == "" {
		c.Redirect(http.StatusFound, "/login?error=missing_params")
		return
	}

	// 调用账号中心验证 token
	verifyReqBody, _ := json.Marshal(map[string]string{
		"token": authCenterToken,
	})

	verifyResp, err := http.Post(
		"https://os.crazyaigc.com/api/auth/verify-token",
		"application/json",
		bytes.NewBuffer(verifyReqBody),
	)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=verify_failed")
		return
	}
	defer verifyResp.Body.Close()

	var verifyResult struct {
		Success bool `json:"success"`
		Data    struct {
			Valid  bool   `json:"valid"`
			UserID string `json:"userId"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(verifyResp.Body).Decode(&verifyResult); err != nil {
		c.Redirect(http.StatusFound, "/login?error=decode_failed")
		return
	}

	// 验证 token
	if !verifyResult.Success || !verifyResult.Data.Valid || verifyResult.Data.UserID != userId {
		c.Redirect(http.StatusFound, "/login?error=invalid_token")
		return
	}

	// 调用账号中心获取用户信息（获取头像昵称）
	req, _ := http.NewRequest("GET", "https://os.crazyaigc.com/api/auth/user-info", nil)
	req.Header.Set("Authorization", "Bearer "+authCenterToken)

	userInfoResp, err := http.DefaultClient.Do(req)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=get_user_info_failed")
		return
	}
	defer userInfoResp.Body.Close()

	var userInfoResult struct {
		Success bool `json:"success"`
		Data    struct {
			UserID  string                 `json:"userId"`
			Profile map[string]interface{} `json:"profile"`
		} `json:"data"`
	}
	if err := json.NewDecoder(userInfoResp.Body).Decode(&userInfoResult); err != nil {
		c.Redirect(http.StatusFound, "/login?error=decode_user_info_failed")
		return
	}

	if !userInfoResult.Success {
		c.Redirect(http.StatusFound, "/login?error=user_info_failed")
		return
	}

	// 从 profile 获取用户信息
	var nickname, avatarUrl interface{}
	if userInfoResult.Data.Profile != nil {
		nickname = userInfoResult.Data.Profile["nickname"]
		avatarUrl = userInfoResult.Data.Profile["avatarUrl"]
	}

	// 创建或获取本地用户
	user, err := h.userService.SyncUserFromAuthCenter(userId, nickname, avatarUrl)
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=user_creation_failed")
		return
	}

	// 生成本地 JWT token
	jwtToken, err := middleware.GenerateToken(user.ID.String())
	if err != nil {
		c.Redirect(http.StatusFound, "/login?error=token_generation_failed")
		return
	}

	// 设置 cookie
	c.SetSameSite(http.SameSiteStrictMode)
	c.SetCookie(
		"token",
		jwtToken,
		3600*24*7, // 7天
		"/",
		".crazyaigc.com",
		true,  // HTTPS only
		true,  // httpOnly
	)

	// 重定向到前端
	c.Redirect(http.StatusFound, "/dashboard")
}

// Me 获取当前用户信息（支持 auth-center token 用于微信内登录）
// @Summary 获取当前用户
// @Description 获取当前登录用户的信息，支持 auth-center token
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} Response
// @Router /api/v1/user/me [get]
func (h *AuthHandler) Me(c *gin.Context) {
	// 从 Authorization header 获取 token
	authHeader := c.GetHeader("Authorization")
	if authHeader == "" {
		Unauthorized(c, "未提供认证令牌")
		return
	}

	// 解析 Bearer token
	parts := strings.SplitN(authHeader, " ", 2)
	if len(parts) != 2 || parts[0] != "Bearer" {
		Unauthorized(c, "令牌格式错误")
		return
	}

	authCenterToken := parts[1]

	// 调用 auth-center API 获取用户信息
	// GET https://os.crazyaigc.com/api/auth/user-info
	println("DEBUG: 微信内登录 - 调用 auth-center /api/auth/user-info")
	println("DEBUG: Token = ", authCenterToken[:20]+"...")

	req, _ := http.NewRequest("GET", "https://os.crazyaigc.com/api/auth/user-info", nil)
	req.Header.Set("Authorization", "Bearer "+authCenterToken)

	userInfoResp, err := http.DefaultClient.Do(req)
	if err != nil {
		println("ERROR: 调用 auth-center /api/auth/user-info 失败: ", err.Error())
		InternalError(c, "调用账号中心失败")
		return
	}
	defer userInfoResp.Body.Close()

	var userInfoResult struct {
		Success bool `json:"success"`
		Data    struct {
			UserID  string                 `json:"userId"`
			Profile map[string]interface{} `json:"profile"`
		} `json:"data"`
		Message string `json:"message"`
	}
	if err := json.NewDecoder(userInfoResp.Body).Decode(&userInfoResult); err != nil {
		println("ERROR: 解析 auth-center 响应失败: ", err.Error())
		InternalError(c, "解析响应失败")
		return
	}

	println("DEBUG: auth-center /api/auth/user-info 响应:")
	println("  Success: ", userInfoResult.Success)
	println("  Message: ", userInfoResult.Message)
	if userInfoResult.Success {
		println("  UserID: ", userInfoResult.Data.UserID)
		if userInfoResult.Data.Profile != nil {
			println("  Nickname: ", userInfoResult.Data.Profile["nickname"])
			println("  AvatarUrl: ", userInfoResult.Data.Profile["avatarUrl"])
		}
	}

	if !userInfoResult.Success {
		Unauthorized(c, userInfoResult.Message)
		return
	}

	// 从 profile 获取用户信息
	var nickname, headimgurl interface{}
	if userInfoResult.Data.Profile != nil {
		nickname = userInfoResult.Data.Profile["nickname"]
		headimgurl = userInfoResult.Data.Profile["avatarUrl"]
	}

	// 同步或创建用户
	user, err := h.userService.SyncUserFromAuthCenter(userInfoResult.Data.UserID, nickname, headimgurl)
	if err != nil {
		InternalError(c, "创建用户失败")
		return
	}

	// 生成本地 JWT token
	jwtToken, err := middleware.GenerateToken(user.ID.String())
	if err != nil {
		InternalError(c, "生成令牌失败")
		return
	}

	SuccessResponse(c, gin.H{
		"token": jwtToken,
		"user":  user,
	})
}

// GetCurrentUser 获取当前登录用户信息
// @Summary 获取当前用户
// @Description 获取当前登录用户的信息
// @Tags auth
// @Accept json
// @Produce json
// @Success 200 {object} Response
// @Router /api/v1/auth/me [get]
func (h *AuthHandler) GetCurrentUser(c *gin.Context) {
	userID, exists := c.Get("userId")
	if !exists {
		NotFound(c, "用户未登录")
		return
	}

	user, err := h.userService.GetByID(userID.(string))
	if err != nil {
		NotFound(c, "用户不存在")
		return
	}

	SuccessResponse(c, user)
}
