package repository

import (
	"time"

	"github.com/keenchase/edit-business/internal/model"

	"gorm.io/gorm"
)

// NoteRepository 笔记数据仓库
type NoteRepository struct {
	db *gorm.DB
}

// NewNoteRepository 创建笔记仓库实例
func NewNoteRepository(db *gorm.DB) *NoteRepository {
	return &NoteRepository{db: db}
}

// Create 创建笔记
func (r *NoteRepository) Create(note *model.Note) error {
	return r.db.Create(note).Error
}

// GetByID 根据 ID 获取笔记
func (r *NoteRepository) GetByID(id string) (*model.Note, error) {
	var note model.Note
	err := r.db.Where("id = ?", id).First(&note).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

// GetByURL 根据 URL 获取笔记
func (r *NoteRepository) GetByURL(url string) (*model.Note, error) {
	var note model.Note
	err := r.db.Where("url = ?", url).First(&note).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

// GetByUserIDAndURL 根据 user_id 和 URL 获取笔记
func (r *NoteRepository) GetByUserIDAndURL(userID string, url string) (*model.Note, error) {
	var note model.Note
	err := r.db.Where("user_id = ? AND url = ?", userID, url).First(&note).Error
	if err != nil {
		return nil, err
	}
	return &note, nil
}

// List 获取笔记列表（按用户隔离）
func (r *NoteRepository) List(userID string, offset, limit int) ([]*model.Note, int64, error) {
	var notes []*model.Note
	var total int64

	// 计算总数
	if err := r.db.Model(&model.Note{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	err := r.db.Where("user_id = ?", userID).
		Order("capture_timestamp DESC").
		Offset(offset).
		Limit(limit).
		Find(&notes).Error

	return notes, total, err
}

// ListBySource 根据 source 获取笔记列表（按用户隔离）
func (r *NoteRepository) ListBySource(userID, source string, offset, limit int) ([]*model.Note, int64, error) {
	var notes []*model.Note
	var total int64

	// 计算总数
	if err := r.db.Model(&model.Note{}).Where("user_id = ? AND source = ?", userID, source).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	err := r.db.Where("user_id = ? AND source = ?", userID, source).
		Order("capture_timestamp DESC").
		Offset(offset).
		Limit(limit).
		Find(&notes).Error

	return notes, total, err
}

// ListByAuthor 根据作者获取笔记列表（按用户隔离）
func (r *NoteRepository) ListByAuthor(userID, author string, offset, limit int) ([]*model.Note, int64, error) {
	var notes []*model.Note
	var total int64

	// 计算总数
	if err := r.db.Model(&model.Note{}).Where("user_id = ? AND author = ?", userID, author).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	err := r.db.Where("user_id = ? AND author = ?", userID, author).
		Order("capture_timestamp DESC").
		Offset(offset).
		Limit(limit).
		Find(&notes).Error

	return notes, total, err
}

// ListByTags 根据标签获取笔记列表（按用户隔离）
func (r *NoteRepository) ListByTags(userID string, tags []string, offset, limit int) ([]*model.Note, int64, error) {
	var notes []*model.Note
	var total int64

	// 计算总数
	if err := r.db.Model(&model.Note{}).Where("user_id = ? AND tags && ?", userID, tags).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	// 分页查询
	err := r.db.Where("user_id = ? AND tags && ?", userID, tags).
		Order("capture_timestamp DESC").
		Offset(offset).
		Limit(limit).
		Find(&notes).Error

	return notes, total, err
}

// Update 更新笔记
func (r *NoteRepository) Update(note *model.Note) error {
	return r.db.Save(note).Error
}

// Upsert 创建或更新笔记（智能合并）
// 如果记录存在且有完整数据（content），保留完整数据
// 如果记录存在但无完整数据，更新为新数据
// 如果记录不存在，创建新记录
func (r *NoteRepository) Upsert(note *model.Note) (*model.Note, error) {
	// 查找是否存在相同 user_id + url 的记录
	existing, err := r.GetByUserIDAndURL(note.UserID, note.URL)

	if err != nil {
		// 记录不存在，创建新记录
		if err == gorm.ErrRecordNotFound {
			if err := r.db.Create(note).Error; err != nil {
				return nil, err
			}
			return note, nil
		}
		// 其他错误
		return nil, err
	}

	// 记录存在，判断是否需要更新
	// 如果现有记录有完整数据（content 不为空），且新数据没有更完整的信息，保留现有记录
	if existing.Content != "" && note.Content == "" {
		// 现有记录已经是完整版，新数据是简化版，保留完整版
		return existing, nil
	}

	// 更新记录：使用新数据填充现有记录
	// 保留 ID 和创建时间，更新其他字段
	existing.Title = note.Title
	existing.Author = note.Author
	existing.Likes = note.Likes
	existing.Collects = note.Collects
	existing.Comments = note.Comments
	existing.PublishDate = note.PublishDate
	existing.CaptureTimestamp = note.CaptureTimestamp

	// 如果新数据有完整字段，更新这些字段
	if note.Content != "" {
		existing.Content = note.Content
		existing.Tags = note.Tags
		existing.ImageURLs = note.ImageURLs
		existing.VideoURL = note.VideoURL
		existing.NoteType = note.NoteType
		existing.CoverImageURL = note.CoverImageURL
		existing.Source = "single" // 标记为完整版
	} else if existing.Content == "" {
		// 如果新数据和旧数据都是简化版，更新为 batch
		existing.Source = "batch"
	}

	// 保存更新
	if err := r.db.Save(existing).Error; err != nil {
		return nil, err
	}

	return existing, nil
}

// Delete 删除笔记（按用户隔离，防止越权删除）
func (r *NoteRepository) Delete(userID, id string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Note{}).Error
}

// BatchCreate 批量创建笔记
func (r *NoteRepository) BatchCreate(notes []*model.Note) error {
	if len(notes) == 0 {
		return nil
	}
	return r.db.Create(&notes).Error
}

// NoteStats 笔记统计数据
type NoteStats struct {
	TotalNotes    int64
	TotalLikes    int64
	TotalCollects int64
	TotalComments int64
	ImageNotes    int64
	VideoNotes    int64
}

// GetStats 获取笔记统计数据（按用户隔离）
func (r *NoteRepository) GetStats(userID string) (*NoteStats, error) {
	var stats NoteStats
	q := r.db.Model(&model.Note{}).Where("user_id = ?", userID)

	// 总笔记数
	if err := q.Count(&stats.TotalNotes).Error; err != nil {
		return nil, err
	}

	// 总点赞数
	if err := r.db.Model(&model.Note{}).Where("user_id = ?", userID).Select("COALESCE(SUM(likes), 0)").Scan(&stats.TotalLikes).Error; err != nil {
		return nil, err
	}

	// 总收藏数
	if err := r.db.Model(&model.Note{}).Where("user_id = ?", userID).Select("COALESCE(SUM(collects), 0)").Scan(&stats.TotalCollects).Error; err != nil {
		return nil, err
	}

	// 总评论数
	if err := r.db.Model(&model.Note{}).Where("user_id = ?", userID).Select("COALESCE(SUM(comments), 0)").Scan(&stats.TotalComments).Error; err != nil {
		return nil, err
	}

	// 图文笔记数
	if err := r.db.Model(&model.Note{}).Where("user_id = ? AND note_type = ?", userID, "图文").Count(&stats.ImageNotes).Error; err != nil {
		return nil, err
	}

	// 视频笔记数
	if err := r.db.Model(&model.Note{}).Where("user_id = ? AND note_type = ?", userID, "视频").Count(&stats.VideoNotes).Error; err != nil {
		return nil, err
	}

	return &stats, nil
}

// CountByUserAndDate counts notes by user ID and date
func (r *NoteRepository) CountByUserAndDate(userID string, date string) (int64, error) {
	var count int64
	query := r.db.Model(&model.Note{}).Where("user_id = ?", userID)

	if date != "" {
		query = query.Where("DATE(created_at) = ?", date)
	} else {
		// If no date specified, use today
		today := time.Now().Format("2006-01-02")
		query = query.Where("DATE(created_at) = ?", today)
	}

	err := query.Count(&count).Error
	return count, err
}
