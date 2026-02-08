package handler

import (
	"crypto/hmac"
	"crypto/sha1"
	"encoding/base64"
	"fmt"
	"os"
	"time"

	"github.com/gin-gonic/gin"
)

// QiniuHandler 七牛云处理器
type QiniuHandler struct{}

// NewQiniuHandler 创建七牛云处理器实例
func NewQiniuHandler() *QiniuHandler {
	return &QiniuHandler{}
}

// GetUploadToken 获取七牛云上传token
// @Summary 获取七牛云上传token
// @Description 为前端生成七牛云上传凭证，用于直接上传图片到七牛云
// @Tags qiniu
// @Accept json
// @Produce json
// @Success 200 {object} Response
// @Router /api/v1/qiniu/upload-token [get]
func (h *QiniuHandler) GetUploadToken(c *gin.Context) {
	// 从环境变量读取配置
	accessKey := os.Getenv("QINIU_ACCESS_KEY")
	secretKey := os.Getenv("QINIU_SECRET_KEY")
	bucket := os.Getenv("QINIU_BUCKET")
	cdnDomain := os.Getenv("QINIU_DOMAIN")

	// 验证配置
	if accessKey == "" || secretKey == "" || bucket == "" || cdnDomain == "" {
		InternalError(c, "七牛云配置未设置")
		return
	}

	// 生成上传token
	keyPrefix := fmt.Sprintf("notes/%s", time.Now().Format("2006/01/02"))
	deadline := time.Now().Add(24 * time.Hour).Unix()

	// 构建上传策略（允许上传到整个 bucket，通过 keyPrefix 建议路径）
	putPolicy := fmt.Sprintf(
		`{"scope":"%s","deadline":%d}`,
		bucket,
		deadline,
	)

	// 1. 先对上传策略进行 Base64 编码
	encodedPutPolicy := base64.URLEncoding.EncodeToString([]byte(putPolicy))

	// 2. 使用密钥对编码后的策略进行 HMAC-SHA1 签名
	hasher := hmac.New(sha1.New, []byte(secretKey))
	hasher.Write([]byte(encodedPutPolicy))
	signature := base64.URLEncoding.EncodeToString(hasher.Sum(nil))

	// 3. 拼接生成上传凭证: accessKey:signature:encodedPutPolicy
	uploadToken := fmt.Sprintf("%s:%s:%s", accessKey, signature, encodedPutPolicy)

	// 返回上传配置
	c.JSON(200, gin.H{
		"uploadToken": uploadToken,
		"uploadUrl":   "https://upload.qiniup.com",
		"cdnDomain":   cdnDomain,
		"keyPrefix":   keyPrefix,
		"expiresIn":   3600 * 24, // 24小时
	})
}
