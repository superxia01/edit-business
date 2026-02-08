package model

import (
	"encoding/json"
	"fmt"
	"time"

	"database/sql/driver"
	"gorm.io/gorm"
)

// User 用户模型（关联账号中心）
type User struct {
	ID               string      `gorm:"primaryKey;column:id;type:varchar(255)" json:"id"`
	AuthCenterUserID string      `gorm:"uniqueIndex;column:auth_center_user_id;type:varchar(255);not null" json:"authCenterUserId"`
	Role             string      `gorm:"column:role;type:varchar(50);default:'USER'" json:"role"`

	// 新增：高频独立字段（从 JSONB 迁移）
	UnionID     *string `gorm:"column:union_id;type:varchar(255);uniqueIndex" json:"unionId,omitempty"`
	Nickname    *string `gorm:"column:nickname;type:varchar(100)" json:"nickname,omitempty"`
	AvatarURL   *string `gorm:"column:avatar_url;type:varchar(500)" json:"avatarUrl,omitempty"`
	PhoneNumber *string `gorm:"column:phone_number;type:varchar(255);uniqueIndex" json:"phoneNumber,omitempty"`
	Email       *string `gorm:"column:email;type:varchar(255);uniqueIndex" json:"email,omitempty"`

	// 保留：低频字段继续使用 JSONB
	Profile            JSONB       `gorm:"column:profile;type:jsonb;default:'{}'::jsonb" json:"profile,omitempty"`
	CreatedAt          time.Time   `gorm:"column:created_at;type:timestamp with time zone;default:now();not null" json:"createdAt"`
	UpdatedAt          time.Time   `gorm:"column:updated_at;type:timestamp with time zone;default:now();not null" json:"updatedAt"`
}

// TableName 指定表名（复数 + snake_case）
func (User) TableName() string {
	return "users"
}

// emptyStringToNil 将空字符串指针转为 nil，避免 UNIQUE 列插入 '' 导致多个用户冲突
func emptyStringToNil(s *string) *string {
	if s == nil || *s == "" {
		return nil
	}
	return s
}

// BeforeCreate GORM hook
func (u *User) BeforeCreate(tx *gorm.DB) error {
	if u.ID == "" {
		u.ID = generateUserID()
	}
	// 插入时对 UNIQUE 列做空字符串归一化，避免 '' 与 '' 冲突
	u.UnionID = emptyStringToNil(u.UnionID)
	u.PhoneNumber = emptyStringToNil(u.PhoneNumber)
	u.Email = emptyStringToNil(u.Email)
	return nil
}

// BeforeSave GORM hook（Create/Update 都会调用）
func (u *User) BeforeSave(tx *gorm.DB) error {
	// 保存时对 UNIQUE 列做空字符串归一化
	u.UnionID = emptyStringToNil(u.UnionID)
	u.PhoneNumber = emptyStringToNil(u.PhoneNumber)
	u.Email = emptyStringToNil(u.Email)
	return nil
}

// generateUserID 生成用户 ID
func generateUserID() string {
	return fmt.Sprintf("user-%d", time.Now().UnixNano())
}

// JSONB 自定义类型
type JSONB map[string]interface{}

// Scan implements sql.Scanner
func (j *JSONB) Scan(value interface{}) error {
	if value == nil {
		return nil
	}
	bytes, ok := value.([]byte)
	if !ok {
		return nil
	}
	return j.UnmarshalJSON(bytes)
}

// UnmarshalJSON implements json.Unmarshaler
func (j *JSONB) UnmarshalJSON(data []byte) error {
	var tmp map[string]interface{}
	if err := json.Unmarshal(data, &tmp); err != nil {
		return err
	}
	*j = JSONB(tmp)
	return nil
}

// MarshalJSON implements json.Marshaler
func (j JSONB) MarshalJSON() ([]byte, error) {
	if len(j) == 0 {
		return []byte("{}"), nil
	}
	// 直接转换为 map[string]interface{} 来避免递归调用
	return json.Marshal(map[string]interface{}(j))
}

// Value implements driver.Valuer
func (j JSONB) Value() (driver.Value, error) {
	if len(j) == 0 {
		return nil, nil
	}
	return j.MarshalJSON()
}
