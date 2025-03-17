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

// Package token provides functions to work with platform tokens
package token

import (
	"fmt"
	"time"

	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
)

// Token represents Claims for the platform token
type Token struct {
	jwt.RegisteredClaims
	Account   string                 `json:"account"`
	Workspace string                 `json:"workspace,omitempty"`
	Extra     map[string]interface{} `json:"extra,omitempty"`
}

// NewToken creates a new platform token
func NewToken(serverSecret, workspace, issuer, audience string) (string, error) {
	var res = Token{
		Account:   uuid.NewString(),
		Workspace: workspace,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    issuer,
			Audience:  jwt.ClaimStrings{audience},
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour * 12)),
		},
	}
	return res.Encode(serverSecret)
}

// Encode signes a token object and converts it to string
func (t *Token) Encode(serverSecret string) (string, error) {
	var token = jwt.NewWithClaims(jwt.SigningMethodHS256, t)
	var tokenString, err = token.SignedString([]byte(serverSecret))

	if err != nil {
		return "", err
	}

	return tokenString, nil
}

// Decode decodes a token by a passed configuration
func Decode(secretKey, tokenString string) (*Token, error) {
	token, err := jwt.ParseWithClaims(tokenString, &Token{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
		}
		return []byte(secretKey), nil
	})

	if err != nil {
		return nil, fmt.Errorf("failed to parse token: %w", err)
	}

	if claims, ok := token.Claims.(*Token); ok && token.Valid {
		return claims, nil
	}

	return nil, fmt.Errorf("invalid token: can't parse claims")
}
