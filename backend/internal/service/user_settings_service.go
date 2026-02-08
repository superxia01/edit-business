package service

import (
	"errors"

	"github.com/keenchase/edit-business/internal/model"
	"github.com/keenchase/edit-business/internal/repository"
)

var (
	ErrCollectionDisabled    = errors.New("collection is disabled by user")
	ErrDailyLimitExceeded    = errors.New("daily collection limit exceeded")
	ErrBatchLimitExceeded   = errors.New("batch collection limit exceeded")
)

// UserSettingsService handles user settings business logic
type UserSettingsService struct {
	settingsRepo *repository.UserSettingsRepository
	userRepo     *repository.UserRepository
	noteRepo     *repository.NoteRepository
}

// NewUserSettingsService creates a new user settings service
func NewUserSettingsService(settingsRepo *repository.UserSettingsRepository, userRepo *repository.UserRepository, noteRepo *repository.NoteRepository) *UserSettingsService {
	return &UserSettingsService{
		settingsRepo: settingsRepo,
		userRepo:     userRepo,
		noteRepo:     noteRepo,
	}
}

// GetUserByAuthCenterUserID gets user by auth center user ID
func (s *UserSettingsService) GetUserByAuthCenterUserID(authCenterUserID string) (*model.User, error) {
	return s.userRepo.GetByAuthCenterUserID(authCenterUserID)
}

// IsCollectionEnabled checks if collection is enabled for a user
func (s *UserSettingsService) IsCollectionEnabled(authCenterUserID string) (bool, error) {
	user, err := s.userRepo.GetByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return false, err
	}

	settings, err := s.settingsRepo.GetByUserID(user.ID)
	if err != nil {
		return false, err
	}

	return settings.CollectionEnabled, nil
}

// GetOrCreateSettings gets user settings or creates default
func (s *UserSettingsService) GetOrCreateSettings(authCenterUserID string) (*model.UserSettings, error) {
	// 通过 authCenterUserID 查找用户
	user, err := s.userRepo.GetByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}

	// 使用本地 user ID 查询设置
	settings, err := s.settingsRepo.GetByUserID(user.ID)
	if err != nil {
		return nil, err
	}

	return settings, nil
}

// ToggleCollectionEnabled toggles the collection enabled status
func (s *UserSettingsService) ToggleCollectionEnabled(authCenterUserID string, enabled bool) (*model.UserSettings, error) {
	// 通过 authCenterUserID 查找用户
	user, err := s.userRepo.GetByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}

	// 使用本地 user ID 查询设置
	settings, err := s.settingsRepo.GetByUserID(user.ID)
	if err != nil {
		return nil, err
	}

	settings.CollectionEnabled = enabled
	if err := s.settingsRepo.Update(settings); err != nil {
		return nil, err
	}

	return settings, nil
}

// CheckCollectionLimits checks if the user can collect data
// Returns error if limits are exceeded
func (s *UserSettingsService) CheckCollectionLimits(authCenterUserID string, batchSize int) error {
	user, err := s.userRepo.GetByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return err
	}

	settings, err := s.settingsRepo.GetByUserID(user.ID)
	if err != nil {
		return err
	}

	// Check if collection is enabled
	if !settings.CollectionEnabled {
		return ErrCollectionDisabled
	}

	// Check batch limit
	if batchSize > settings.CollectionBatchLimit {
		return ErrBatchLimitExceeded
	}

	// Check daily limit
	dailyCount, err := s.noteRepo.CountByUserAndDate(user.ID, "")
	if err != nil {
		return err
	}

	if int(dailyCount) >= settings.CollectionDailyLimit {
		return ErrDailyLimitExceeded
	}

	return nil
}

// UserSettingsResponse represents the user settings response
type UserSettingsResponse struct {
	UserID               string `json:"userId"`
	CollectionEnabled    bool   `json:"collectionEnabled"`
	CollectionDailyLimit int    `json:"collectionDailyLimit"`
	CollectionBatchLimit int    `json:"collectionBatchLimit"`
}

// ToResponse converts model to response
func (s *UserSettingsService) ToResponse(settings *model.UserSettings) UserSettingsResponse {
	return UserSettingsResponse{
		UserID:               settings.UserID,
		CollectionEnabled:    settings.CollectionEnabled,
		CollectionDailyLimit: settings.CollectionDailyLimit,
		CollectionBatchLimit: settings.CollectionBatchLimit,
	}
}
