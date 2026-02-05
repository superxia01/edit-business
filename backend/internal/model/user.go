package model

import (
    "encoding/json"
    "time"

    "github.com/google/uuid"
    "database/sql/driver"
    "gorm.io/gorm"
)

// User 用户模型（关联账号中心）
type User struct {
    ID                 UUID        `gorm:"primaryKey;column:id;type:uuid;default:gen_random_uuid()" json:"id"`
    AuthCenterUserID   UUID        `gorm:"uniqueIndex;column:auth_center_user_id;type:uuid;not null" json:"authCenterUserId"`
    Role               string      `gorm:"column:role;type:varchar(50);default:'USER'" json:"role"`
    Profile            JSONB       `gorm:"column:profile;type:jsonb" json:"profile"`
    CreatedAt          time.Time   `gorm:"column:created_at;type:timestamp with time zone;default:now();not null" json:"createdAt"`
    UpdatedAt          time.Time   `gorm:"column:updated_at;type:timestamp with time zone;default:now();not null" json:"updatedAt"`
}

// TableName 指定表名（复数 + snake_case）
func (User) TableName() string {
    return "users"
}

// BeforeCreate GORM hook
func (u *User) BeforeCreate(tx *gorm.DB) error {
    if u.ID == uuid.Nil {
        u.ID = uuid.New()
    }
    return nil
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
    return json.Unmarshal(data, &j)
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
