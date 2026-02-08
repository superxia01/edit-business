package repository

import (
	"errors"

	"github.com/keenchase/edit-business/internal/model"

	"gorm.io/gorm"
)

// BloggerRepository 博主信息仓库
type BloggerRepository struct {
	db *gorm.DB
}

// NewBloggerRepository 创建博主仓库实例
func NewBloggerRepository(db *gorm.DB) *BloggerRepository {
	return &BloggerRepository{db: db}
}

// Create 创建博主信息
func (r *BloggerRepository) Create(blogger *model.Blogger) error {
	return r.db.Create(blogger).Error
}

// GetByID 根据 ID 获取博主信息（按用户隔离）
func (r *BloggerRepository) GetByID(userID, id string) (*model.Blogger, error) {
	var blogger model.Blogger
	err := r.db.Where("id = ? AND user_id = ?", id, userID).First(&blogger).Error
	if err != nil {
		return nil, err
	}
	return &blogger, nil
}

// GetByUserIDAndXhsID 根据用户 ID 和小红书 ID 获取博主信息
func (r *BloggerRepository) GetByUserIDAndXhsID(userID, xhsID string) (*model.Blogger, error) {
	var blogger model.Blogger
	err := r.db.Where("user_id = ? AND xhs_id = ?", userID, xhsID).First(&blogger).Error
	if err != nil {
		return nil, err
	}
	return &blogger, nil
}

// GetByXhsID 根据小红书 ID 获取博主信息（已废弃，请用 GetByUserIDAndXhsID）
func (r *BloggerRepository) GetByXhsID(xhsID string) (*model.Blogger, error) {
	var blogger model.Blogger
	err := r.db.Where("xhs_id = ?", xhsID).First(&blogger).Error
	if err != nil {
		return nil, err
	}
	return &blogger, nil
}

// List 获取博主列表（按用户隔离）
func (r *BloggerRepository) List(userID string, offset, limit int) ([]*model.Blogger, int64, error) {
	var bloggers []*model.Blogger
	var total int64

	if err := r.db.Model(&model.Blogger{}).Where("user_id = ?", userID).Count(&total).Error; err != nil {
		return nil, 0, err
	}

	err := r.db.Where("user_id = ?", userID).
		Order("followers_count DESC").
		Offset(offset).
		Limit(limit).
		Find(&bloggers).Error

	return bloggers, total, err
}

// Update 更新博主信息
func (r *BloggerRepository) Update(blogger *model.Blogger) error {
	return r.db.Save(blogger).Error
}

// Delete 删除博主信息（按用户隔离）
func (r *BloggerRepository) Delete(userID, id string) error {
	return r.db.Where("id = ? AND user_id = ?", id, userID).Delete(&model.Blogger{}).Error
}

// BatchCreate 批量创建博主信息
func (r *BloggerRepository) BatchCreate(bloggers []*model.Blogger) error {
	if len(bloggers) == 0 {
		return nil
	}
	return r.db.Create(&bloggers).Error
}

// UpsertByXhsID 根据 user_id + xhs_id 插入或更新博主信息
func (r *BloggerRepository) UpsertByXhsID(blogger *model.Blogger) error {
	existing, err := r.GetByUserIDAndXhsID(blogger.UserID, blogger.XhsID)
	if err != nil {
		if errors.Is(err, gorm.ErrRecordNotFound) {
			return r.db.Create(blogger).Error
		}
		return err
	}

	blogger.ID = existing.ID
	return r.db.Save(blogger).Error
}

// Count 获取博主总数（按用户隔离）
func (r *BloggerRepository) Count(userID string) (int64, error) {
	var count int64
	err := r.db.Model(&model.Blogger{}).Where("user_id = ?", userID).Count(&count).Error
	return count, err
}
