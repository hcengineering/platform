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

package storage

import (
	"context"
	"net/url"
	"strings"

	"github.com/pkg/errors"
)

// Metadata represents file's metadata
type Metadata map[string]any

// MetaProvider provides simple api for working with files metadata
type MetaProvider interface {
	GetMeta(ctx context.Context, filename string) (*Metadata, error)
	PatchMeta(ctx context.Context, filename string, value *Metadata) error
}

// BlobInfo contains blob stat information
type BlobInfo struct {
	Size int64
	Type string
	ETag string
}

// PutOptions represents options for the PutFile operation
type PutOptions struct {
	NoCache bool
}

// Storage represents file-based storage
type Storage interface {
	PutFile(ctx context.Context, fileName string, options PutOptions) error
	DeleteFile(ctx context.Context, fileName string) error
	GetFile(ctx context.Context, fileName, destination string) error
	StatFile(ctx context.Context, fileName string) (*BlobInfo, error)
	SetParent(ctx context.Context, fileName string, parentName string) error
}

// MultipartPart represents uploaded multipart part
type MultipartPart struct {
	PartNumber int    `json:"partNumber"`
	ETag       string `json:"etag"`
}

// MultipartStorage represents multipart-based storage
type MultipartStorage interface {
	MultipartUploadStart(ctx context.Context, objectName, contentType string) (string, error)
	MultipartUploadPart(ctx context.Context, objectName, uploadID string, partNumber int, data []byte) (*MultipartPart, error)
	MultipartUploadComplete(ctx context.Context, objectName, uploadID string, parts []MultipartPart) error
	MultipartUploadCancel(ctx context.Context, objectName, uploadID string) error
}

// NewStorageByURL creates a new storage based on the type from the url scheme, for example "datalake://my-datalake-endpoint"
func NewStorageByURL(ctx context.Context, u *url.URL, storageType, token, workspace string) (Storage, error) {
	if workspace == "" {
		return nil, errors.New("workspace is missed")
	}
	switch storageType {
	case "datalake":
		if token == "" {
			return nil, errors.New("token is missed")
		}
		return NewDatalakeStorage(ctx, u.String(), workspace, token), nil
	case "s3":
		return NewS3(ctx, u.String(), workspace), nil
	default:
		return nil, errors.New("unknown scheme")
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
