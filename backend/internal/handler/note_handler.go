package handler

import (
	"strconv"

	"github.com/keenchase/edit-business/internal/service"
	"github.com/gin-gonic/gin"
)

// NoteHandler 笔记处理器
type NoteHandler struct {
	noteService *service.NoteService
}

// NewNoteHandler 创建笔记处理器实例
func NewNoteHandler(noteService *service.NoteService) *NoteHandler {
	return &NoteHandler{noteService: noteService}
}

// Create 创建笔记
// @Summary 创建笔记
// @Description 创建新的笔记记录
// @Tags notes
// @Accept json
// @Produce json
// @Param request body service.CreateNoteRequest true "创建笔记请求"
// @Success 200 {object} Response
// @Router /api/v1/notes [post]
func (h *NoteHandler) Create(c *gin.Context) {
	var req service.CreateNoteRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	// Get authCenterUserID from context (set by auth middleware)
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{
			Code:    401,
			Message: "Unauthorized",
		})
		return
	}

	note, err := h.noteService.Create(authCenterUserID.(string), &req)
	if err != nil {
		// Check if it's a limit error and provide appropriate message
		if err == service.ErrCollectionDisabled {
			c.JSON(403, Response{
				Code:    403,
				Message: "采集功能已关闭，请在网站设置中开启",
			})
			return
		}
		if err == service.ErrBatchLimitExceeded {
			c.JSON(400, Response{
				Code:    400,
				Message: "单次采集超过上限（50条）",
			})
			return
		}
		if err == service.ErrDailyLimitExceeded {
			c.JSON(429, Response{
				Code:    429,
				Message: "今日采集数量已达上限（500条）",
			})
			return
		}
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, note)
}

// GetByID 根据 ID 获取笔记（校验归属）
// @Summary 获取笔记详情
// @Description 根据 ID 获取笔记详情
// @Tags notes
// @Accept json
// @Produce json
// @Param id path string true "笔记 ID"
// @Success 200 {object} Response
// @Router /api/v1/notes/{id} [get]
func (h *NoteHandler) GetByID(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{Code: 401, Message: "Unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	note, err := h.noteService.GetByID(authCenterUserID.(string), id)
	if err != nil || note == nil {
		NotFound(c, "note not found")
		return
	}

	SuccessResponse(c, note)
}

// List 获取笔记列表（按当前用户隔离）
// @Summary 获取笔记列表
// @Description 分页获取笔记列表，支持按作者、标签筛选
// @Tags notes
// @Accept json
// @Produce json
// @Param page query int false "页码" default(1)
// @Param size query int false "每页数量" default(20)
// @Param author query string false "作者筛选"
// @Param tags query []string false "标签筛选"
// @Success 200 {object} Response
// @Router /api/v1/notes [get]
func (h *NoteHandler) List(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{Code: 401, Message: "Unauthorized"})
		return
	}

	var req service.ListNotesRequest
	if pageStr := c.Query("page"); pageStr != "" {
		if page, err := strconv.Atoi(pageStr); err == nil {
			req.Page = page
		}
	}
	if sizeStr := c.Query("size"); sizeStr != "" {
		if size, err := strconv.Atoi(sizeStr); err == nil {
			req.Size = size
		}
	}
	req.Author = c.Query("author")
	req.Tags = c.QueryArray("tags")
	req.Source = c.Query("source")

	result, err := h.noteService.List(authCenterUserID.(string), &req)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, result)
}

// BatchCreate 批量创建笔记
// @Summary 批量创建笔记
// @Description 批量创建笔记记录（用于 Chrome 插件同步）
// @Tags notes
// @Accept json
// @Produce json
// @Param request body []service.CreateNoteRequest true "批量创建笔记请求"
// @Success 200 {object} Response
// @Router /api/v1/notes/batch [post]
func (h *NoteHandler) BatchCreate(c *gin.Context) {
	var reqs []*service.CreateNoteRequest
	if err := c.ShouldBindJSON(&reqs); err != nil {
		BadRequest(c, err.Error())
		return
	}

	// Get authCenterUserID from context (set by auth middleware)
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{
			Code:    401,
			Message: "Unauthorized",
		})
		return
	}

	err := h.noteService.BatchCreate(authCenterUserID.(string), reqs)
	if err != nil {
		// Check if it's a limit error and provide appropriate message
		if err == service.ErrCollectionDisabled {
			c.JSON(403, Response{
				Code:    403,
				Message: "采集功能已关闭，请在网站设置中开启",
			})
			return
		}
		if err == service.ErrBatchLimitExceeded {
			c.JSON(400, Response{
				Code:    400,
				Message: "单次采集超过上限（50条）",
			})
			return
		}
		if err == service.ErrDailyLimitExceeded {
			c.JSON(429, Response{
				Code:    429,
				Message: "今日采集数量已达上限（500条）",
			})
			return
		}
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, gin.H{
		"count":  len(reqs),
		"status": "success",
	})
}

// Update 更新笔记（校验归属）
// @Summary 更新笔记
// @Description 更新笔记信息
// @Tags notes
// @Accept json
// @Produce json
// @Param id path string true "笔记 ID"
// @Param request body model.Note true "笔记信息"
// @Success 200 {object} Response
// @Router /api/v1/notes/{id} [put]
func (h *NoteHandler) Update(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{Code: 401, Message: "Unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	var req map[string]interface{}
	if err := c.ShouldBindJSON(&req); err != nil {
		BadRequest(c, err.Error())
		return
	}

	note, err := h.noteService.GetByID(authCenterUserID.(string), id)
	if err != nil || note == nil {
		NotFound(c, "note not found")
		return
	}

	err = h.noteService.Update(authCenterUserID.(string), note)
	if err != nil {
		if err == service.ErrNoteNotFound {
			NotFound(c, "note not found")
			return
		}
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, note)
}

// Delete 删除笔记（校验归属）
// @Summary 删除笔记
// @Description 根据 ID 删除笔记
// @Tags notes
// @Accept json
// @Produce json
// @Param id path string true "笔记 ID"
// @Success 200 {object} Response
// @Router /api/v1/notes/{id} [delete]
func (h *NoteHandler) Delete(c *gin.Context) {
	authCenterUserID, exists := c.Get("authCenterUserID")
	if !exists {
		c.JSON(401, Response{Code: 401, Message: "Unauthorized"})
		return
	}

	id := c.Param("id")
	if id == "" {
		BadRequest(c, "id is required")
		return
	}

	err := h.noteService.Delete(authCenterUserID.(string), id)
	if err != nil {
		InternalError(c, err.Error())
		return
	}

	SuccessResponse(c, gin.H{
		"id":     id,
		"status": "deleted",
	})
}
