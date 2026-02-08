package handler

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/keenchase/edit-business/internal/service"
)

// UserSettingsHandler handles user settings HTTP requests
type UserSettingsHandler struct {
	settingsService *service.UserSettingsService
}

// NewUserSettingsHandler creates a new user settings handler
func NewUserSettingsHandler(settingsService *service.UserSettingsService) *UserSettingsHandler {
	return &UserSettingsHandler{
		settingsService: settingsService,
	}
}

// GetOrCreate gets or creates user settings
// @Summary Get user settings
// @Description Get current user's settings (create default if not exists)
// @Tags user-settings
// @Produce json
// @Success 200 {object} handler.Response{data=service.UserSettingsResponse}
// @Failure 401 {object} handler.Response
// @Failure 500 {object} handler.Response
// @Router /api/v1/user-settings [get]
func (h *UserSettingsHandler) GetOrCreate(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Code:    401,
			Message: "Unauthorized",
		})
		return
	}

	settings, err := h.settingsService.GetOrCreateSettings(authCenterUserID.(string))
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to get settings",
			Data:    err.Error(),
		})
		return
	}

	response := h.settingsService.ToResponse(settings)
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Success",
		Data:    response,
	})
}

// ToggleCollectionEnabled toggles collection enabled status
// @Summary Toggle collection enabled
// @Description Enable or disable data collection from plugin
// @Tags user-settings
// @Accept json
// @Produce json
// @Param request body service.ToggleCollectionRequest true "Toggle request"
// @Success 200 {object} handler.Response{data=service.UserSettingsResponse}
// @Failure 400 {object} handler.Response
// @Failure 401 {object} handler.Response
// @Failure 500 {object} handler.Response
// @Router /api/v1/user-settings/toggle-collection [post]
func (h *UserSettingsHandler) ToggleCollectionEnabled(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(http.StatusUnauthorized, Response{
			Code:    401,
			Message: "Unauthorized",
		})
		return
	}

	var req struct {
		Enabled bool `json:"enabled"`
	}

	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, Response{
			Code:    400,
			Message: "Invalid request",
			Data:    err.Error(),
		})
		return
	}

	settings, err := h.settingsService.ToggleCollectionEnabled(authCenterUserID.(string), req.Enabled)
	if err != nil {
		c.JSON(http.StatusInternalServerError, Response{
			Code:    500,
			Message: "Failed to update settings",
			Data:    err.Error(),
		})
		return
	}

	response := h.settingsService.ToResponse(settings)
	c.JSON(http.StatusOK, Response{
		Code:    0,
		Message: "Settings updated",
		Data:    response,
	})
}
