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

	"github.com/pkg/errors"
)

// Metadata represents file's metadata
type Metadata map[string]any

// MetaProvider provides simple api for working with files metadata
type MetaProvider interface {
	GetMeta(ctx context.Context, filename string) (*Metadata, error)
	PatchMeta(ctx context.Context, filename string, value *Metadata) error
}

// Storage represents file-based storage
type Storage interface {
	PutFile(ctx context.Context, fileName string) error
	DeleteFile(ctx context.Context, fileName string) error
	GetFile(ctx context.Context, fileName, destination string) error
}

// NewStorageByURL creates a new storage based on the type from the url scheme, for example "datalake://my-datalake-endpoint"
func NewStorageByURL(ctx context.Context, u *url.URL, storageType, token, worksapce string) (Storage, error) {
	if worksapce == "" {
		return nil, errors.New("workspace is missed")
	}
	switch storageType {
	case "datalake":
		if token == "" {
			return nil, errors.New("token is missed")
		}
		return NewDatalakeStorage(ctx, u.String(), worksapce, token), nil
	case "s3":
		return NewS3(ctx, u.String(), worksapce), nil
	default:
		return nil, errors.New("unknown scheme")
	}
}
