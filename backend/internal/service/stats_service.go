package service

import (
	"github.com/keenchase/edit-business/internal/repository"
)

// StatsService 统计服务
type StatsService struct {
	noteRepo        *repository.NoteRepository
	bloggerRepo     *repository.BloggerRepository
	settingsService *UserSettingsService
}

// NewStatsService 创建统计服务实例
func NewStatsService(
	noteRepo *repository.NoteRepository,
	bloggerRepo *repository.BloggerRepository,
	settingsService *UserSettingsService,
) *StatsService {
	return &StatsService{
		noteRepo:        noteRepo,
		bloggerRepo:     bloggerRepo,
		settingsService: settingsService,
	}
}

// GetStatsByAuthCenterUserID 根据 authCenterUserID 获取统计数据（内部解析为本地 user ID）
func (s *StatsService) GetStatsByAuthCenterUserID(authCenterUserID string) (*StatsResponse, error) {
	user, err := s.settingsService.GetUserByAuthCenterUserID(authCenterUserID)
	if err != nil {
		return nil, err
	}
	return s.GetStats(user.ID)
}

// StatsResponse 统计数据响应
type StatsResponse struct {
	TotalNotes     int64 `json:"totalNotes"`
	TotalBloggers  int64 `json:"totalBloggers"`
	TotalLikes     int64 `json:"totalLikes"`
	TotalCollects  int64 `json:"totalCollects"`
	TotalComments  int64 `json:"totalComments"`
	ImageNotes     int64 `json:"imageNotes"`
	VideoNotes     int64 `json:"videoNotes"`
}

// GetStats 获取统计数据（按用户隔离）
func (s *StatsService) GetStats(userID string) (*StatsResponse, error) {
	noteStats, err := s.noteRepo.GetStats(userID)
	if err != nil {
		return nil, err
	}

	bloggerCount, err := s.bloggerRepo.Count(userID)
	if err != nil {
		return nil, err
	}

	return &StatsResponse{
		TotalNotes:     noteStats.TotalNotes,
		TotalBloggers:  bloggerCount,
		TotalLikes:     noteStats.TotalLikes,
		TotalCollects:  noteStats.TotalCollects,
		TotalComments:  noteStats.TotalComments,
		ImageNotes:     noteStats.ImageNotes,
		VideoNotes:     noteStats.VideoNotes,
	}, nil
}
