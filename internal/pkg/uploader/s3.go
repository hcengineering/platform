// Copyright © 2025 Hardcore Engineering Inc.
//
// Licensed under the Eclipse Public License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License. You may
// obtain a copy of the License at https://www.eclipse.org/legal/epl-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//
// See the License for the specific language governing permissions and
// limitations under the License.

package uploader

import (
	"context"
	"fmt"

	"github.com/pkg/errors"

	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/aws/smithy-go"
	"github.com/huly-stream/internal/pkg/log"
	"go.uber.org/zap"
)

// S3Storage represents S3 storage
type S3Storage struct {
	client     *s3.Client
	bucketName string
	logger     *zap.Logger
}

// NewS3 creates a new S3 storage
func NewS3(ctx context.Context, endpoint string) Storage {
	var accessKeyID = os.Getenv("AWS_ACCESS_KEY_ID")
	var accessKeySecret = os.Getenv("AWS_SECRET_ACCESS_KEY")
	var bucketName = os.Getenv("AWS_BUCKET_NAME")
	var logger = log.FromContext(ctx).With(zap.String("s3", "storage"))

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, accessKeySecret, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		panic(err.Error())
	}

	var s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		endpoint = "https://" + endpoint
		o.BaseEndpoint = &endpoint
	})

	return &S3Storage{
		client:     s3Client,
		bucketName: bucketName,
		logger:     logger,
	}
}

func getContentType(objectKey string) string {
	if strings.HasSuffix(objectKey, ".txt") {
		return "txt"
	}
	if strings.HasSuffix(objectKey, ".ts") {
		return "video/mp2t"
	}
	if strings.HasSuffix(objectKey, ".m3u8") {
		return "application/x-mpegurl"
	}
	return "application/octet-stream"
}

// DeleteFile deletes file from the s3 storage
func (u *S3Storage) DeleteFile(ctx context.Context, fileName string) error {
	var _, objectKey = filepath.Split(fileName)
	var logger = log.FromContext(ctx).With(zap.String("s3 delete", u.bucketName), zap.String("fileName", fileName))

	logger.Debug("start deleting")
	input := &s3.DeleteObjectInput{
		Bucket: aws.String(u.bucketName),
		Key:    aws.String(objectKey),
	}

	_, err := u.client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}
	logger.Debug("file deleted")
	return nil
}

// UploadFile uploads file to the s3 storage
func (u *S3Storage) UploadFile(ctx context.Context, fileName string) error {
	var _, objectKey = filepath.Split(fileName)
	var logger = log.FromContext(ctx).With(zap.String("s3 upload", u.bucketName), zap.String("fileName", fileName))
	logger.Debug("start upload file")

	// #nosec
	var file, err = os.Open(fileName)

	if err != nil {
		logger.Error("can not open file", zap.Error(err))
		return err
	}

	defer func() {
		_ = file.Close()
	}()
	_, err = u.client.PutObject(ctx, &s3.PutObjectInput{
		Bucket:      aws.String(u.bucketName),
		Key:         aws.String(objectKey),
		Body:        file,
		ContentType: aws.String(getContentType(objectKey)),
	})

	if err != nil {
		var apiErr smithy.APIError
		if errors.As(err, &apiErr) && apiErr.ErrorCode() == "EntityTooLarge" {
			logger.Error("Error while uploading object. The object is too large." +
				"To upload objects larger than 5GB, use the S3 console (160GB max)" +
				"or the multipart upload API (5TB max).")
		} else {
			logger.Error("Couldn't upload file", zap.Error(err))
		}
		return apiErr
	}

	err = s3.NewObjectExistsWaiter(u.client).Wait(
		ctx, &s3.HeadObjectInput{Bucket: aws.String(u.bucketName), Key: aws.String(objectKey)}, time.Minute)
	if err != nil {
		logger.Debug("Failed attempt to wait for object to exist.")
	}

	logger.Debug("file has uploaded")
	return err
}
