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

// Package storage provdies simple storage interface for the remote storages.
package storage

import (
	"context"
	"fmt"

	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/aws/aws-sdk-go-v2/aws"
	"github.com/aws/aws-sdk-go-v2/config"
	"github.com/aws/aws-sdk-go-v2/credentials"
	"github.com/aws/aws-sdk-go-v2/service/s3"
	"github.com/hcengineering/stream/internal/pkg/log"
	"go.uber.org/zap"
)

// S3Storage represents S3 storage
type S3Storage struct {
	client     *s3.Client
	bucketName string
	logger     *zap.Logger
}

// NewS3 creates a new S3 storage
func NewS3(ctx context.Context, endpoint, bucketName string) Storage {
	var accessKeyID = os.Getenv("AWS_ACCESS_KEY_ID")
	var accessKeySecret = os.Getenv("AWS_SECRET_ACCESS_KEY")

	cfg, err := config.LoadDefaultConfig(ctx,
		config.WithCredentialsProvider(credentials.NewStaticCredentialsProvider(accessKeyID, accessKeySecret, "")),
		config.WithRegion("auto"),
	)
	if err != nil {
		panic(err.Error())
	}

	var s3Client = s3.NewFromConfig(cfg, func(o *s3.Options) {
		o.BaseEndpoint = &endpoint
		o.UsePathStyle = true
	})

	return &S3Storage{
		client:     s3Client,
		bucketName: bucketName,
		logger:     log.FromContext(ctx).With(zap.String("s3", "storage")),
	}
}

func getContentType(objectKey string) string {
	if strings.HasSuffix(objectKey, ".ts") {
		return "video/mp2t"
	}
	if strings.HasSuffix(objectKey, ".m3u8") {
		return "video/x-mpegurl"
	}
	return "application/octet-stream"
}

// DeleteFile deletes file from the s3 storage
func (u *S3Storage) DeleteFile(ctx context.Context, fileName string) error {
	var _, objectKey = filepath.Split(fileName)
	var logger = u.logger.With(zap.String("delete", u.bucketName), zap.String("fileName", fileName))

	logger.Debug("start")

	input := &s3.DeleteObjectInput{
		Bucket: aws.String(u.bucketName),
		Key:    aws.String(objectKey),
	}

	_, err := u.client.DeleteObject(ctx, input)
	if err != nil {
		return fmt.Errorf("failed to delete file from S3: %w", err)
	}

	logger.Debug("deleted")
	return nil
}

// PutFile uploads file to the s3 storage
func (u *S3Storage) PutFile(ctx context.Context, fileName string) error {
	var _, objectKey = filepath.Split(fileName)
	var logger = u.logger.With(zap.String("upload", u.bucketName), zap.String("fileName", fileName))

	logger.Debug("start")

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
		logger.Error("couldn't upload file", zap.Error(err))
		return err
	}

	err = s3.NewObjectExistsWaiter(u.client).Wait(
		ctx, &s3.HeadObjectInput{Bucket: aws.String(u.bucketName), Key: aws.String(objectKey)}, time.Minute)

	if err != nil {
		logger.Error("Failed attempt to wait for object to exist")
		return err
	}

	logger.Debug("uploaded")
	return nil
}

// GetFile gets file from the storage and stores it to destination
func (u *S3Storage) GetFile(ctx context.Context, filename, dest string) error {
	var logger = u.logger.With(zap.String("get", u.bucketName), zap.String("fileName", filename), zap.String("destination", dest))

	var result, err = u.client.GetObject(ctx, &s3.GetObjectInput{
		Bucket: &u.bucketName,
		Key:    &filename,
	})

	if err != nil {
		logger.Error("failed to get object", zap.Error(err))
		return err
	}
	defer func() {
		_ = result.Body.Close()
	}()

	// Create a local file to save the downloaded content
	// #nosec
	file, err := os.Create(dest)
	if err != nil {
		logger.Error("failed to create file", zap.Error(err))
		return err
	}
	defer func() {
		_ = file.Close()
	}()
	// Copy the S3 object content to the local file
	_, err = file.ReadFrom(result.Body)
	if err != nil {
		logger.Error("failed to write to file", zap.Error(err))
		return err
	}

	logger.Debug("file downloaded successfully")

	return nil
}
