package service

import (
	"github.com/google/uuid"
	"github.com/keenchase/edit-business/internal/model"
	"github.com/keenchase/edit-business/internal/repository"
)

// UserService 用户服务
type UserService struct {
	userRepo *repository.UserRepository
}

// NewUserService 创建用户服务实例
func NewUserService(userRepo *repository.UserRepository) *UserService {
	return &UserService{userRepo: userRepo}
}

// CreateUserRequest 创建用户请求
type CreateUserRequest struct {
	AuthCenterUserID string                 `json:"authCenterUserId" binding:"required"`
	Role             string                 `json:"role"`
	Profile          map[string]interface{} `json:"profile"`
}

// Create 创建用户
func (s *UserService) Create(req *CreateUserRequest) (*model.User, error) {
	parsedUUID, err := uuid.Parse(req.AuthCenterUserID)
	if err != nil {
		return nil, err
	}

	user := &model.User{
		AuthCenterUserID: parsedUUID,
		Role:             req.Role,
		Profile:          req.Profile,
	}

	if user.Role == "" {
		user.Role = "USER"
	}

	err = s.userRepo.Create(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// GetByID 根据 ID 获取用户
func (s *UserService) GetByID(id string) (*model.User, error) {
	return s.userRepo.GetByID(id)
}

// GetByAuthCenterUserID 根据账号中心用户 ID 获取用户
func (s *UserService) GetByAuthCenterUserID(authCenterUserID string) (*model.User, error) {
	return s.userRepo.GetByAuthCenterUserID(authCenterUserID)
}

// SyncUserFromAuthCenter 从账号中心同步用户信息
func (s *UserService) SyncUserFromAuthCenter(authCenterUserID string, nickname interface{}, headimgurl interface{}) (*model.User, error) {
	parsedUUID, err := uuid.Parse(authCenterUserID)
	if err != nil {
		return nil, err
	}

	// 尝试获取现有用户
	existingUser, err := s.userRepo.GetByAuthCenterUserID(authCenterUserID)
	var profile map[string]interface{}

	if err == nil && existingUser != nil {
		// 用户已存在，使用现有的 profile（如果为 nil 则初始化）
		profile = existingUser.Profile
		if profile == nil {
			profile = make(map[string]interface{})
		}
	}
	// 如果是新用户或 profile 为空，初始化
	if profile == nil {
		profile = make(map[string]interface{})
	}

	// 更新 profile 中的字段（如果提供了新值）
	if nickname != nil {
		profile["nickname"] = nickname
	}
	if headimgurl != nil {
		profile["headimgurl"] = headimgurl
	}

	user := &model.User{
		AuthCenterUserID: parsedUUID,
		Role:             "USER",
		Profile:          profile,
	}

	err = s.userRepo.UpsertByAuthCenterUserID(user)
	if err != nil {
		return nil, err
	}

	return user, nil
}

// Update 更新用户
func (s *UserService) Update(user *model.User) error {
	return s.userRepo.Update(user)
}

// Delete 删除用户
func (s *UserService) Delete(id string) error {
	return s.userRepo.Delete(id)
}
