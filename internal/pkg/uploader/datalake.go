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
	"bytes"
	"context"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/huly-stream/internal/pkg/log"
	"github.com/pkg/errors"
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"
)

// DatalakeStorage represents datalake storage
type DatalakeStorage struct {
	baseURL   string
	workspace string
	token     string
}

// NewDatalakeStorage creates a new datalake client
func NewDatalakeStorage(baseURL, workspace, token string) Storage {
	return &DatalakeStorage{
		baseURL:   "https://" + baseURL,
		token:     token,
		workspace: workspace,
	}
}

// UploadFile uploads file to the datalake
func (d *DatalakeStorage) UploadFile(ctx context.Context, fileName string) error {
	// #nosec
	file, err := os.Open(fileName)
	if err != nil {
		return err
	}
	defer func() {
		_ = file.Close()
	}()

	var _, objectKey = filepath.Split(fileName)
	var logger = log.FromContext(ctx).With(zap.String("datalake upload", d.workspace), zap.String("fileName", fileName))

	logger.Debug("start uploading")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := writer.CreateFormFile("file", objectKey)
	if err != nil {
		return errors.Wrapf(err, "failed to create form file")
	}

	_, err = io.Copy(part, file)
	if err != nil {
		return errors.Wrapf(err, "failed to copy file data")
	}

	_ = writer.Close()

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)

	res := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(res)

	req.SetRequestURI(d.baseURL + "/upload/form-data/" + d.workspace)
	req.Header.SetMethod(fasthttp.MethodPost)
	req.Header.Add("Authorization", "Bearer "+d.token)
	req.Header.SetContentType(writer.FormDataContentType())
	req.SetBody(body.Bytes())

	client := fasthttp.Client{}
	if err := client.Do(req, res); err != nil {
		return errors.Wrapf(err, "upload failed")
	}

	logger.Debug("file uploaded")

	return nil
}

// DeleteFile deletes file from the datalake
func (d *DatalakeStorage) DeleteFile(ctx context.Context, fileName string) error {
	var logger = log.FromContext(ctx).With(zap.String("datalake delete", d.workspace), zap.String("fileName", fileName))
	logger.Debug("start deleting")

	var _, objectKey = filepath.Split(fileName)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)

	res := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(res)

	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodDelete)
	req.Header.Add("Authorization", "Bearer "+d.token)

	client := fasthttp.Client{}
	if err := client.Do(req, res); err != nil {
		return errors.Wrapf(err, "delete failed")
	}

	logger.Debug("file deleted")

	return nil
}
