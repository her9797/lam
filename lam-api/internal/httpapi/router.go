package httpapi

import (
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"

	"github.com/her9797/lam/lam-api/internal/config"
	"github.com/her9797/lam/lam-api/internal/store"
)

func NewMux(repository *store.Repository, cfg config.Config) http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, _ *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("/api/v1/bootstrap", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w)
			return
		}

		data, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusOK, data)
	}))

	mux.HandleFunc("/api/v1/menu", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w)
			return
		}

		data, err := repository.GetMenuData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusOK, data)
	}))

	mux.HandleFunc("/api/v1/menu-images/", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			writeMethodNotAllowed(w)
			return
		}

		imageID, ok := strings.CutPrefix(r.URL.Path, "/api/v1/menu-images/")
		if !ok || !strings.HasSuffix(imageID, "/content") {
			http.NotFound(w, r)
			return
		}

		imageID = strings.TrimSuffix(imageID, "/content")
		imageID = strings.Trim(imageID, "/")
		if imageID == "" {
			http.NotFound(w, r)
			return
		}

		content, err := repository.GetMenuImageContent(r.Context(), imageID)
		if err != nil {
			writeStoreError(w, err)
			return
		}

		w.Header().Set("Content-Type", content.MimeType)
		w.Header().Set("Cache-Control", "public, max-age=300")
		_, _ = w.Write(content.Content)
	}))

	mux.HandleFunc("/api/v1/admin/categories", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}

		var payload createCategoryRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.CreateCategory(r.Context(), strings.TrimSpace(payload.ID), strings.TrimSpace(payload.Label), payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusCreated, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/categories/", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method == http.MethodDelete {
			id, ok := parseResourceID(r.URL.Path, "/api/v1/admin/categories/")
			if !ok {
				http.NotFound(w, r)
				return
			}

			if err := repository.DeleteCategory(r.Context(), id); err != nil {
				writeStoreError(w, err)
				return
			}

			bootstrap, err := repository.GetBootstrapData(r.Context())
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			writeJSON(w, http.StatusOK, bootstrap)
			return
		}

		if r.Method != http.MethodPatch {
			writeMethodNotAllowed(w)
			return
		}

		id, ok := parseVisibilityResourceID(r.URL.Path, "/api/v1/admin/categories/")
		if !ok {
			http.NotFound(w, r)
			return
		}

		var payload updateVisibilityRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.UpdateCategoryVisibility(r.Context(), id, payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusOK, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/menu-items", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}

		var payload createMenuItemRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.CreateMenuItem(r.Context(), store.CreateMenuItemInput{
			CategoryID:  strings.TrimSpace(payload.CategoryID),
			Badge:       strings.TrimSpace(payload.Badge),
			Name:        strings.TrimSpace(payload.Name),
			Description: strings.TrimSpace(payload.Description),
			Price:       strings.TrimSpace(payload.Price),
			IsVisible:   payload.IsVisible,
		}); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusCreated, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/menu-items/", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method != http.MethodPost &&
			r.Method != http.MethodPatch &&
			r.Method != http.MethodDelete {
			writeMethodNotAllowed(w)
			return
		}

		path := strings.TrimPrefix(r.URL.Path, "/api/v1/admin/menu-items/")

		if r.Method == http.MethodDelete {
			id, ok := parseResourceID(r.URL.Path, "/api/v1/admin/menu-items/")
			if !ok {
				http.NotFound(w, r)
				return
			}

			if err := repository.DeleteMenuItem(r.Context(), id); err != nil {
				writeStoreError(w, err)
				return
			}

			bootstrap, err := repository.GetBootstrapData(r.Context())
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			writeJSON(w, http.StatusOK, bootstrap)
			return
		}

		if strings.HasSuffix(path, "/images") {
			menuItemID := strings.TrimSuffix(path, "/images")
			menuItemID = strings.Trim(menuItemID, "/")
			if menuItemID == "" || r.Method != http.MethodPost {
				http.NotFound(w, r)
				return
			}

			if err := r.ParseMultipartForm(8 << 20); err != nil {
				writeError(w, http.StatusBadRequest, err)
				return
			}

			file, header, err := r.FormFile("image")
			if err != nil {
				writeError(w, http.StatusBadRequest, err)
				return
			}
			defer file.Close()

			content, err := io.ReadAll(file)
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			isPrimary := strings.EqualFold(strings.TrimSpace(r.FormValue("isPrimary")), "true")
			displayArea := strings.TrimSpace(r.FormValue("displayArea"))
			focusX, _ := strconv.Atoi(strings.TrimSpace(r.FormValue("focusX")))
			focusY, _ := strconv.Atoi(strings.TrimSpace(r.FormValue("focusY")))
			if err := repository.CreateMenuImage(r.Context(), store.CreateMenuImageInput{
				MenuItemID:  menuItemID,
				Filename:    header.Filename,
				MimeType:    header.Header.Get("Content-Type"),
				Content:     content,
				IsPrimary:   isPrimary,
				DisplayArea: displayArea,
				FocusX:      focusX,
				FocusY:      focusY,
			}); err != nil {
				writeStoreError(w, err)
				return
			}
		} else {
			id, ok := parseVisibilityResourceID(r.URL.Path, "/api/v1/admin/menu-items/")
			if !ok || r.Method != http.MethodPatch {
				http.NotFound(w, r)
				return
			}

			var payload updateVisibilityRequest
			if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
				writeError(w, http.StatusBadRequest, err)
				return
			}

			if err := repository.UpdateMenuItemVisibility(r.Context(), id, payload.IsVisible); err != nil {
				writeStoreError(w, err)
				return
			}
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusCreated, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/request-guides", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}

		var payload createNoticeRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.CreateRequestGuide(r.Context(), strings.TrimSpace(payload.Text), payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusCreated, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/request-guides/", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method == http.MethodDelete {
			id, ok := parseResourceID(r.URL.Path, "/api/v1/admin/request-guides/")
			if !ok {
				http.NotFound(w, r)
				return
			}

			if err := repository.DeleteRequestGuide(r.Context(), id); err != nil {
				writeStoreError(w, err)
				return
			}

			bootstrap, err := repository.GetBootstrapData(r.Context())
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			writeJSON(w, http.StatusOK, bootstrap)
			return
		}

		if r.Method != http.MethodPatch {
			writeMethodNotAllowed(w)
			return
		}

		id, ok := parseVisibilityResourceID(r.URL.Path, "/api/v1/admin/request-guides/")
		if !ok {
			http.NotFound(w, r)
			return
		}

		var payload updateVisibilityRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.UpdateRequestGuideVisibility(r.Context(), id, payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusOK, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/notices", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method != http.MethodPost {
			writeMethodNotAllowed(w)
			return
		}

		var payload createNoticeRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.CreateNotice(r.Context(), strings.TrimSpace(payload.Text), payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusCreated, bootstrap)
	}))

	mux.HandleFunc("/api/v1/admin/notices/", withCORS(cfg.AllowedOrigin, func(w http.ResponseWriter, r *http.Request) {
		if !requireAdminAuth(w, r, cfg.AdminAPIToken) {
			return
		}

		if r.Method == http.MethodDelete {
			id, ok := parseResourceID(r.URL.Path, "/api/v1/admin/notices/")
			if !ok {
				http.NotFound(w, r)
				return
			}

			if err := repository.DeleteNotice(r.Context(), id); err != nil {
				writeStoreError(w, err)
				return
			}

			bootstrap, err := repository.GetBootstrapData(r.Context())
			if err != nil {
				writeError(w, http.StatusInternalServerError, err)
				return
			}

			writeJSON(w, http.StatusOK, bootstrap)
			return
		}

		if r.Method != http.MethodPatch {
			writeMethodNotAllowed(w)
			return
		}

		id, ok := parseVisibilityResourceID(r.URL.Path, "/api/v1/admin/notices/")
		if !ok {
			http.NotFound(w, r)
			return
		}

		var payload updateVisibilityRequest
		if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
			writeError(w, http.StatusBadRequest, err)
			return
		}

		if err := repository.UpdateNoticeVisibility(r.Context(), id, payload.IsVisible); err != nil {
			writeStoreError(w, err)
			return
		}

		bootstrap, err := repository.GetBootstrapData(r.Context())
		if err != nil {
			writeError(w, http.StatusInternalServerError, err)
			return
		}

		writeJSON(w, http.StatusOK, bootstrap)
	}))

	return mux
}

func parseVisibilityResourceID(path string, prefix string) (string, bool) {
	resourceID, ok := strings.CutPrefix(path, prefix)
	if !ok || !strings.HasSuffix(resourceID, "/visibility") {
		return "", false
	}

	resourceID = strings.TrimSuffix(resourceID, "/visibility")
	resourceID = strings.Trim(resourceID, "/")
	if resourceID == "" {
		return "", false
	}

	return resourceID, true
}

func parseResourceID(path string, prefix string) (string, bool) {
	resourceID, ok := strings.CutPrefix(path, prefix)
	if !ok {
		return "", false
	}

	resourceID = strings.Trim(resourceID, "/")
	if resourceID == "" || strings.Contains(resourceID, "/") {
		return "", false
	}

	return resourceID, true
}

func withCORS(allowedOrigin string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", allowedOrigin)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}

		next(w, r)
	}
}

func requireAdminAuth(w http.ResponseWriter, r *http.Request, adminAPIToken string) bool {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	expected := "Bearer " + adminAPIToken
	if authHeader != expected {
		writeJSON(w, http.StatusUnauthorized, map[string]string{"error": "admin authorization required"})
		return false
	}

	return true
}

func writeMethodNotAllowed(w http.ResponseWriter) {
	writeJSON(w, http.StatusMethodNotAllowed, map[string]string{"error": "method not allowed"})
}

func writeStoreError(w http.ResponseWriter, err error) {
	switch {
	case errors.Is(err, store.ErrInvalidInput):
		writeError(w, http.StatusBadRequest, err)
	case errors.Is(err, store.ErrAlreadyExists):
		writeError(w, http.StatusConflict, err)
	case errors.Is(err, store.ErrNotFound):
		writeError(w, http.StatusNotFound, err)
	default:
		writeError(w, http.StatusInternalServerError, err)
	}
}

func writeError(w http.ResponseWriter, status int, err error) {
	writeJSON(w, status, map[string]string{"error": err.Error()})
}

func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(payload)
}
