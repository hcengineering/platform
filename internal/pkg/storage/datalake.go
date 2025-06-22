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
	"net/textproto"
	"os"
	"path/filepath"
	"strings"
	"time"

	"github.com/hcengineering/stream/internal/pkg/log"
	"github.com/pkg/errors"
	"github.com/valyala/fasthttp"
	"go.uber.org/zap"
)

type uploadResult struct {
	key   string
	error string
}

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
		client: fasthttp.Client{
			MaxIdleConnDuration: 5 * time.Second,
			MaxConnsPerHost:     100,
		},
	}
}

var quoteEscaper = strings.NewReplacer("\\", "\\\\", `"`, "\\\"")

func escapeQuotes(s string) string {
	return quoteEscaper.Replace(s)
}

// multipart writer CreateFormFile function does not support custom content type
// here we have to have a modified copy that uses actual type instead of application/octet-stream
// see https://github.com/golang/go/issues/49329
func createFormFile(writer *multipart.Writer, fieldname, filename, contentType string) (io.Writer, error) {
	h := make(textproto.MIMEHeader)
	h.Set("Content-Disposition", fmt.Sprintf(`form-data; name="%s"; filename="%s"`, escapeQuotes(fieldname), escapeQuotes(filename)))
	h.Set("Content-Type", contentType)
	return writer.CreatePart(h)
}

func getObjectKeyFromPath(s string) string {
	var _, objectKey = filepath.Split(s)
	return objectKey
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

	var objectKey = getObjectKeyFromPath(fileName)
	var logger = d.logger.With(zap.String("upload", d.workspace), zap.String("fileName", fileName))

	logger.Debug("start")

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)

	part, err := createFormFile(writer, "file", objectKey, getContentType(objectKey))
	if err != nil {
		return errors.Wrapf(err, "failed to create form file")
	}

	_, err = io.Copy(part, file)
	if err != nil {
		return errors.Wrapf(err, "failed to copy file data")
	}

	err = writer.Close()
	if err != nil {
		return errors.Wrapf(err, "failed to close multipart writer")
	}

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
		logRequestError(logger, err, "upload failed", res)
		return errors.Wrapf(err, "upload failed")
	}

	var result []uploadResult
	if err := json.Unmarshal(res.Body(), &result); err != nil {
		return errors.Wrapf(err, "parse error")
	}

	for _, res := range result {
		if res.error != "" {
			return fmt.Errorf("upload error: %v %v", res.key, res.error)
		}
	}

	logger.Debug("uploaded")

	return nil
}

// DeleteFile deletes file from the datalake
func (d *DatalakeStorage) DeleteFile(ctx context.Context, fileName string) error {
	var logger = d.logger.With(zap.String("delete", d.workspace), zap.String("fileName", fileName))
	logger.Debug("start")

	var objectKey = getObjectKeyFromPath(fileName)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)

	res := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(res)

	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodDelete)
	req.Header.Add("Authorization", "Bearer "+d.token)

	if err := d.client.Do(req, res); err != nil {
		logRequestError(logger, err, "delete failed", res)
		return errors.Wrapf(err, "delete failed")
	}

	if err := okResponse(res); err != nil {
		logRequestError(logger, err, "bad status code", res)
		return err
	}

	logger.Debug("deleted")

	return nil
}

// PatchMeta patches metadata for the object
func (d *DatalakeStorage) PatchMeta(ctx context.Context, filename string, md *Metadata) error {
	var logger = d.logger.With(zap.String("patch meta", d.workspace), zap.String("fileName", filename))
	logger.Debug("start")
	defer logger.Debug("finished")

	var objectKey = getObjectKeyFromPath(filename)

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
		logRequestError(logger, err, "request failed", resp)
		return err
	}

	if err := okResponse(resp); err != nil {
		logRequestError(logger, err, "bad status code", resp)
		return err
	}

	return nil
}

// GetMeta gets metadata related to the object
func (d *DatalakeStorage) GetMeta(ctx context.Context, filename string) (*Metadata, error) {
	var logger = d.logger.With(zap.String("get meta", d.workspace), zap.String("fileName", filename))
	logger.Debug("start")

	var objectKey = getObjectKeyFromPath(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/meta/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodGet)
	req.Header.Add("Authorization", "Bearer "+d.token)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		logRequestError(logger, err, "request failed", resp)
		return nil, err
	}

	if err := okResponse(resp); err != nil {
		logRequestError(logger, err, "bad status code", resp)
		return nil, err
	}

	var md Metadata
	var err = json.Unmarshal(resp.Body(), &md)

	return &md, err
}

// GetFile gets file from the storage
func (d *DatalakeStorage) GetFile(ctx context.Context, filename, destination string) error {
	var logger = d.logger.With(zap.String("get", d.workspace), zap.String("fileName", filename), zap.String("destination", destination))
	logger.Debug("start")

	var objectKey = getObjectKeyFromPath(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodGet)
	req.Header.Add("Authorization", "Bearer "+d.token)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		logRequestError(logger, err, "request failed", resp)
		return err
	}

	if err := okResponse(resp); err != nil {
		logRequestError(logger, err, "bad status code", resp)
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
	if err = resp.BodyWriteTo(file); err != nil {
		logger.Debug("can't write to file", zap.Error(err))
		return err
	}

	stat, err := os.Stat(destination)
	if err != nil {
		logger.Error("can't stat the file", zap.Error(err))
		return err
	}

	logger.Info("file downloaded successfully", zap.Int64("size", stat.Size()))
	return nil
}

// StatFile gets file stat from the storage
func (d *DatalakeStorage) StatFile(ctx context.Context, filename string) (*BlobInfo, error) {
	var logger = d.logger.With(zap.String("head", d.workspace), zap.String("fileName", filename))
	logger.Debug("start")

	var objectKey = getObjectKeyFromPath(filename)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey)
	req.Header.SetMethod(fasthttp.MethodHead)
	req.Header.Add("Authorization", "Bearer "+d.token)

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		logRequestError(logger, err, "request failed", resp)
		return nil, err
	}

	if err := okResponse(resp); err != nil {
		logRequestError(logger, err, "bad status code", resp)
		return nil, err
	}

	var info BlobInfo
	info.Size = int64(resp.Header.ContentLength())
	info.Type = string(resp.Header.ContentType())
	info.ETag = string(resp.Header.Peek("ETag"))

	logger.Debug("finished")
	return &info, nil
}

// SetParent updates blob parent reference
func (d *DatalakeStorage) SetParent(ctx context.Context, filename, parent string) error {
	var logger = d.logger.With(zap.String("workspace", d.workspace), zap.String("fileName", filename), zap.String("parent", parent))

	logger.Debug("start")

	var objectKey = getObjectKeyFromPath(filename)
	var parentKey = getObjectKeyFromPath(parent)

	req := fasthttp.AcquireRequest()
	defer fasthttp.ReleaseRequest(req)
	req.SetRequestURI(d.baseURL + "/blob/" + d.workspace + "/" + objectKey + "/parent")
	req.Header.SetMethod(fasthttp.MethodPatch)
	req.Header.Add("Authorization", "Bearer "+d.token)
	req.Header.SetContentType("application/json")

	body := map[string]any{
		"parent": parentKey,
	}

	if err := json.NewEncoder(req.BodyWriter()).Encode(body); err != nil {
		logger.Debug("can not encode body", zap.Error(err))
		return err
	}

	resp := fasthttp.AcquireResponse()
	defer fasthttp.ReleaseResponse(resp)

	if err := d.client.Do(req, resp); err != nil {
		logRequestError(logger, err, "request failed", resp)
		return err
	}

	if err := okResponse(resp); err != nil {
		logRequestError(logger, err, "bad status code", resp)
		return err
	}

	return nil
}

func okResponse(res *fasthttp.Response) error {
	var statusOK = res.StatusCode() >= 200 && res.StatusCode() < 300

	if !statusOK {
		return fmt.Errorf("unexpected status code: %d", res.StatusCode())
	}

	return nil
}

func logRequestError(logger *zap.Logger, err error, msg string, res *fasthttp.Response) {
	logger.Error(
		msg,
		zap.Error(err),
		zap.Int("status", res.StatusCode()),
		zap.String("headers", res.Header.String()),
		zap.String("response", res.String()),
	)
}

var _ Storage = (*DatalakeStorage)(nil)
var _ MetaProvider = (*DatalakeStorage)(nil)
