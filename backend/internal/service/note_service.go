package service

import (
	"github.com/keenchase/edit-business/internal/model"
	"github.com/keenchase/edit-business/internal/repository"
)

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
	URL              string            `json:"url" binding:"required"`
	Title            string            `json:"title"`
	Author           string            `json:"author"`
	Content          string            `json:"content"`
	Tags             []string          `json:"tags"`
	ImageURLs        []string          `json:"imageUrls"`
	VideoURL         *string           `json:"videoUrl,omitempty"`
	NoteType         string            `json:"noteType"`
	CoverImageURL    string            `json:"coverImageUrl"`
	Likes            int32             `json:"likes"`
	Collects         int32             `json:"collects"`
	Comments         int32             `json:"comments"`
	PublishDate      int64             `json:"publishDate"`
	Source           string            `json:"source"` // 'single' or 'batch'
	CaptureTimestamp int64             `json:"captureTimestamp" binding:"required"`
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

	note := &model.Note{
		UserID:           user.ID,
		URL:              req.URL,
		Title:            req.Title,
		Author:           req.Author,
		Content:          req.Content,
		Tags:             req.Tags,
		ImageURLs:        req.ImageURLs,
		VideoURL:         req.VideoURL,
		NoteType:         req.NoteType,
		CoverImageURL:    req.CoverImageURL,
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

// GetByID 根据 ID 获取笔记
func (s *NoteService) GetByID(id string) (*model.Note, error) {
	return s.noteRepo.GetByID(id)
}

// List 获取笔记列表
func (s *NoteService) List(req *ListNotesRequest) (*ListNotesResponse, error) {
	// Debug log
	println("DEBUG: ListNotesRequest - Source:", req.Source, "Author:", req.Author, "Tags:", req.Tags, "Page:", req.Page, "Size:", req.Size)

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
	var err error

	// 根据查询条件选择不同的查询方法
	// 优先级：source > author > tags > 默认
	if req.Source != "" {
		println("DEBUG: Using ListBySource with source:", req.Source)
		notes, total, err = s.noteRepo.ListBySource(req.Source, offset, req.Size)
	} else if req.Author != "" {
		notes, total, err = s.noteRepo.ListByAuthor(req.Author, offset, req.Size)
	} else if len(req.Tags) > 0 {
		notes, total, err = s.noteRepo.ListByTags(req.Tags, offset, req.Size)
	} else {
		println("DEBUG: Using default List")
		notes, total, err = s.noteRepo.List(offset, req.Size)
	}

	if err != nil {
		return nil, err
	}

	// DEBUG: 打印第一条笔记的图片数据
	if len(notes) > 0 {
		firstNote := notes[0]
		println("DEBUG: 第一条笔记图片数据:")
		println("  Title:", firstNote.Title)
		println("  CoverImageURL:", firstNote.CoverImageURL)
		println("  ImageURLs length:", len(firstNote.ImageURLs))
		if len(firstNote.ImageURLs) > 0 {
			println("  ImageURLs[0]:", firstNote.ImageURLs[0])
		}
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

		note := &model.Note{
			UserID:           user.ID,
			URL:              req.URL,
			Title:            req.Title,
			Author:           req.Author,
			Content:          req.Content,
			Tags:             req.Tags,
			ImageURLs:        req.ImageURLs,
			VideoURL:         req.VideoURL,
			NoteType:         req.NoteType,
			CoverImageURL:    req.CoverImageURL,
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

// Update 更新笔记
func (s *NoteService) Update(note *model.Note) error {
	return s.noteRepo.Update(note)
}

// Delete 删除笔记
func (s *NoteService) Delete(id string) error {
	return s.noteRepo.Delete(id)
}
