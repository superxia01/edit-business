package service

import (
	"errors"

	"github.com/keenchase/edit-business/internal/model"
	"github.com/keenchase/edit-business/internal/repository"
)

var ErrNoteNotFound = errors.New("note not found")

// NoteService 笔记服务
type NoteService struct {
	noteRepo         *repository.NoteRepository
	settingsService  *UserSettingsService
}

// NewNoteService 创建笔记服务实例
func NewNoteService(noteRepo *repository.NoteRepository, settingsService *UserSettingsService) *NoteService {
	return &NoteService{
		noteRepo:        noteRepo,
		settingsService: settingsService,
	}
}

// CreateNoteRequest 创建笔记请求
type CreateNoteRequest struct {
	URL              string   `json:"url" binding:"required"`
	Title            string   `json:"title"`
	Author           string   `json:"author"`
	Content          string   `json:"content"`
	Tags             []string `json:"tags"`
	ImageURLs        []string `json:"imageUrls"`
	Image            string   `json:"image"` // 批量接口可能只传单张封面
	VideoURL         *string  `json:"videoUrl,omitempty"`
	NoteType         string   `json:"noteType"`
	CoverImageURL    string   `json:"coverImageUrl"`
	Likes            int32    `json:"likes"`
	Collects         int32    `json:"collects"`
	Comments         int32    `json:"comments"`
	PublishDate      int64    `json:"publishDate"`
	Source           string   `json:"source"` // 'single' or 'batch'
	CaptureTimestamp int64    `json:"captureTimestamp" binding:"required"`
}

// ListNotesRequest 列表查询请求
type ListNotesRequest struct {
	Page   int      `form:"page" binding:"min=1"`
	Size   int      `form:"size" binding:"min=1,max=100"`
	Author string   `form:"author"`
	Tags   []string `form:"tags"`
	Source string   `form:"source"` // 'single' or 'batch' or empty for all
}

// ListNotesResponse 列表查询响应
type ListNotesResponse struct {
	Notes      []*model.Note `json:"notes"`
	Total      int64         `json:"total"`
	Page       int           `json:"page"`
	Size       int           `json:"size"`
	TotalPages int           `json:"totalPages"`
}

// Create 创建或更新笔记（智能 Upsert）
func (s *NoteService) Create(authCenterUserID string, req *CreateNoteRequest) (*model.Note, error) {
	// 检查用户是否开启了收藏功能
	enabled, err := s.settingsService.IsCollectionEnabled(authCenterUserID)
	if err != nil {
		return nil, err
	}
	if !enabled {
		return nil, ErrCollectionDisabled
	}

	// Get user ID from auth center user ID
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}

	// Determine source based on content presence
	source := req.Source
	if source == "" {
		// Auto-detect source if not specified
		if req.Content != "" {
			source = "single"
		} else {
			source = "batch"
		}
	}

	// 处理图片：批量接口可能只传 image，单篇传 imageUrls
	imageURLs := req.ImageURLs
	if len(imageURLs) == 0 && req.Image != "" {
		imageURLs = []string{req.Image}
	}
	coverImageURL := req.CoverImageURL
	if coverImageURL == "" && len(imageURLs) > 0 {
		coverImageURL = imageURLs[0]
	}

	note := &model.Note{
		UserID:           user.ID,
		URL:              req.URL,
		Title:            req.Title,
		Author:           req.Author,
		Content:          req.Content,
		Tags:             req.Tags,
		ImageURLs:        imageURLs,
		VideoURL:         req.VideoURL,
		NoteType:         req.NoteType,
		CoverImageURL:    coverImageURL,
		Likes:            req.Likes,
		Collects:         req.Collects,
		Comments:         req.Comments,
		PublishDate:      req.PublishDate,
		Source:           source,
		CaptureTimestamp: req.CaptureTimestamp,
	}

	// Use Upsert to create or update
	result, err := s.noteRepo.Upsert(note)
	if err != nil {
		return nil, err
	}

	return result, nil
}

// GetByID 根据 ID 获取笔记（校验归属，防止越权访问）
func (s *NoteService) GetByID(authCenterUserID, id string) (*model.Note, error) {
	note, err := s.noteRepo.GetByID(id)
	if err != nil {
		return nil, err
	}
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}
	if note.UserID != user.ID {
		return nil, ErrNoteNotFound // 不属于当前用户，按未找到处理
	}
	return note, nil
}

// List 获取笔记列表（按用户隔离）
func (s *NoteService) List(authCenterUserID string, req *ListNotesRequest) (*ListNotesResponse, error) {
	// 解析为本地用户 ID
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}
	userID := user.ID

	// 设置默认值
	if req.Page < 1 {
		req.Page = 1
	}
	if req.Size < 1 {
		req.Size = 20
	}

	offset := (req.Page - 1) * req.Size

	var notes []*model.Note
	var total int64

	// 根据查询条件选择不同的查询方法（均按用户隔离）
	if req.Source != "" {
		notes, total, err = s.noteRepo.ListBySource(userID, req.Source, offset, req.Size)
	} else if req.Author != "" {
		notes, total, err = s.noteRepo.ListByAuthor(userID, req.Author, offset, req.Size)
	} else if len(req.Tags) > 0 {
		notes, total, err = s.noteRepo.ListByTags(userID, req.Tags, offset, req.Size)
	} else {
		notes, total, err = s.noteRepo.List(userID, offset, req.Size)
	}

	if err != nil {
		return nil, err
	}

	totalPages := int(total) / req.Size
	if int(total)%req.Size > 0 {
		totalPages++
	}

	return &ListNotesResponse{
		Notes:      notes,
		Total:      total,
		Page:       req.Page,
		Size:       req.Size,
		TotalPages: totalPages,
	}, nil
}

// BatchCreate 批量创建或更新笔记（用于 Chrome 插件同步）
func (s *NoteService) BatchCreate(authCenterUserID string, reqs []*CreateNoteRequest) error {
	if len(reqs) == 0 {
		return nil
	}

	// 检查用户是否开启了收藏功能
	enabled, err := s.settingsService.IsCollectionEnabled(authCenterUserID)
	if err != nil {
		return err
	}
	if !enabled {
		return ErrCollectionDisabled
	}

	// Get user ID from auth center user ID
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return err
	}

	// Process each note with Upsert logic
	for _, req := range reqs {
		// Determine source based on content presence
		source := req.Source
		if source == "" {
			// Auto-detect source if not specified
			if req.Content != "" {
				source = "single"
			} else {
				source = "batch"
			}
		}

		// 处理图片：批量接口可能只传 image
		imageURLs := req.ImageURLs
		if len(imageURLs) == 0 && req.Image != "" {
			imageURLs = []string{req.Image}
		}
		coverImageURL := req.CoverImageURL
		if coverImageURL == "" && len(imageURLs) > 0 {
			coverImageURL = imageURLs[0]
		}

		note := &model.Note{
			UserID:           user.ID,
			URL:              req.URL,
			Title:            req.Title,
			Author:           req.Author,
			Content:          req.Content,
			Tags:             req.Tags,
			ImageURLs:        imageURLs,
			VideoURL:         req.VideoURL,
			NoteType:         req.NoteType,
			CoverImageURL:    coverImageURL,
			Likes:            req.Likes,
			Collects:         req.Collects,
			Comments:         req.Comments,
			PublishDate:      req.PublishDate,
			Source:           source,
			CaptureTimestamp: req.CaptureTimestamp,
		}

		// Use Upsert for each note
		_, err := s.noteRepo.Upsert(note)
		if err != nil {
			return err
		}
	}

	return nil
}

// Update 更新笔记（校验归属）
func (s *NoteService) Update(authCenterUserID string, note *model.Note) error {
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return err
	}
	if note.UserID != user.ID {
		return ErrNoteNotFound // 不属于当前用户
	}
	return s.noteRepo.Update(note)
}

// Delete 删除笔记（校验归属）
func (s *NoteService) Delete(authCenterUserID, id string) error {
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return err
	}
	return s.noteRepo.Delete(user.ID, id)
}
