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
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"os"
	"path/filepath"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/pkg/errors"
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"
)

// DatalakeStorage represents datalake storage
type DatalakeStorage struct {
	baseURL   string
	workspace string
	token     string
	logger    *zap.Logger
	client    fasthttp.Client
}

// NewDatalakeStorage creates a new datalake client
func NewDatalakeStorage(ctx context.Context, baseURL, workspace, token string) Storage {
	return &DatalakeStorage{
		baseURL:   baseURL,
		token:     token,
		workspace: workspace,
		logger:    log.FromContext(ctx).With(zap.String("storage", "datalake")),
	}
}

// PutFile uploads file to the datalake
func (d *DatalakeStorage) PutFile(ctx context.Context, fileName string) error {
	// #nosec
	file, err := os.Open(fileName)
	if err != nil {
		return err
	}
	defer func() {
		_ = file.Close()
	}()

	var objectKey = getObjectKey(fileName)
	var logger = d.logger.With(zap.String("upload", d.workspace), zap.String("fileName", fileName))

	logger.Debug("start")

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

	if err := d.client.Do(req, res); err != nil {
		logger.Error("upload failed", zap.Error(err))
		return errors.Wrapf(err, "upload failed")
	}

	logger.Debug("uploaded")

	return nil
}

// DeleteFile deletes file from the datalake
func (d *DatalakeStorage) DeleteFile(ctx context.Context, fileName string) error {
	var logger = d.logger.With(zap.String("delete", d.workspace), zap.String("fileName", fileName))
	logger.Debug("start")

	var objectKey = getObjectKey(fileName)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)

	res := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(res)

	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodDelete)
	req.Header.Add("Authorization", "Bearer "+d.token)

	if err := d.client.Do(req, res); err != nil {
		logger.Error("delete failed", zap.Error(err))
		return errors.Wrapf(err, "delete failed")
	}

	logger.Debug("deleted")

	return nil
}

func getObjectKey(s string) string {
	var _, objectKey = filepath.Split(s)
	return objectKey
}

// PatchMeta patches metadata for the object
func (d *DatalakeStorage) PatchMeta(ctx context.Context, filename string, md *Metadata) error {
	var logger = d.logger.With(zap.String("patch meta", d.workspace), zap.String("fileName", filename))
	logger.Debug("start")
	defer logger.Debug("finished")

	var objectKey = getObjectKey(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/meta/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodPatch)
	req.Header.Add("Authorization", "Bearer "+d.token)
	req.Header.SetContentType("application/json")

	b, err := json.Marshal(md)

	if err != nil {
		return err
	}
	req.SetBody(b)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		return err
	}

	if resp.StatusCode() != fasthttp.StatusOK {
		var err = fmt.Errorf("unexpected status code: %d", resp.StatusCode())
		logger.Debug("bad status code", zap.Error(err))
		return err
	}

	fmt.Println(string(resp.Body()))

	return nil
}

// GetMeta gets metadata related to the object
func (d *DatalakeStorage) GetMeta(ctx context.Context, filename string) (*Metadata, error) {
	var logger = d.logger.With(zap.String("get meta", d.workspace), zap.String("fileName", filename))
	logger.Debug("start")

	var objectKey = getObjectKey(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/meta/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodGet)
	req.Header.Add("Authorization", "Bearer "+d.token)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		return nil, err
	}

	if resp.StatusCode() != fasthttp.StatusOK {
		var err = fmt.Errorf("unexpected status code: %d", resp.StatusCode())
		logger.Debug("bad status code", zap.Error(err))
		return nil, err
	}

	var md Metadata
	fmt.Println(string(resp.Body()))
	var err = json.Unmarshal(resp.Body(), &md)

	return &md, err
}

// GetFile gets file from the storage
func (d *DatalakeStorage) GetFile(ctx context.Context, filename, destination string) error {
	var logger = d.logger.With(zap.String("get", d.workspace), zap.String("fileName", filename), zap.String("destination", destination))
	logger.Debug("start")

	var objectKey = getObjectKey(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodGet)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		return err
	}

	// Check the response status code
	if resp.StatusCode() != fasthttp.StatusOK {
		var err = fmt.Errorf("unexpected status code: %d", resp.StatusCode())
		logger.Debug("bad status code", zap.Error(err))
		return err
	}

	// #nosec
	file, err := os.Create(destination)
	if err != nil {
		logger.Debug("can't create a file", zap.Error(err))
		return err
	}
	defer func() {
		_ = file.Close()
	}()
	if err := resp.BodyWriteTo(file); err != nil {
		logger.Debug("can't write to file", zap.Error(err))
		return err
	}

	logger.Debug("file downloaded successfully")
	return nil
}

var _ Storage = (*DatalakeStorage)(nil)
var _ MetaProvider = (*DatalakeStorage)(nil)
