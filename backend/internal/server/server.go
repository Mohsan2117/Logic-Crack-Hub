package server

import (
	"bytes"
	"context"
	"crypto/rand"
	"database/sql"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/mail"
	"net/url"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/go-chi/cors"

	"logiccrackhub/api/internal/auth"
	"logiccrackhub/api/internal/config"
)

type Server struct {
	db          *sql.DB
	cfg         config.Config
	rateLimiter *rateLimiter
}

type apiResponse struct {
	Success bool `json:"success"`
	Data    any  `json:"data,omitempty"`
	Error   any  `json:"error,omitempty"`
}

type siteSettings struct {
	StudioName           string `json:"studio_name"`
	HeroTitle            string `json:"hero_title"`
	HeroTagline          string `json:"hero_tagline"`
	HeroDescription      string `json:"hero_description"`
	ContactEmail         string `json:"contact_email"`
	ContactPhone         string `json:"contact_phone"`
	Location             string `json:"location"`
	SecondaryLocation    string `json:"secondary_location"`
	MapURL               string `json:"map_url"`
	ContactFormRecipient string `json:"contact_form_recipient,omitempty"`
	FooterDescription    string `json:"footer_description"`
}

type sectionSetting struct {
	SectionKey   string `json:"section_key"`
	IsEnabled    bool   `json:"is_enabled"`
	DisplayOrder int    `json:"display_order"`
}

type game struct {
	ID               string     `json:"id"`
	Title            string     `json:"title"`
	Slug             string     `json:"slug"`
	ShortDescription string     `json:"short_description"`
	Description      string     `json:"description"`
	Genre            string     `json:"genre"`
	IconURL          string     `json:"icon_url"`
	PlayStoreURL     string     `json:"play_store_url"`
	PackageID        string     `json:"package_id"`
	Status           string     `json:"status"`
	Version          string     `json:"version"`
	ReleaseDate      *time.Time `json:"release_date,omitempty"`
	DisplayOrder     int        `json:"display_order"`
	IsActive         bool       `json:"is_active"`
	CreatedAt        time.Time  `json:"created_at"`
}

type teamMember struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`
	Role            string    `json:"role"`
	ShortBio        string    `json:"short_bio"`
	ProfileImageURL string    `json:"profile_image_url"`
	DisplayOrder    int       `json:"display_order"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
}

type job struct {
	ID             string    `json:"id"`
	Title          string    `json:"title"`
	Department     string    `json:"department"`
	EmploymentType string    `json:"employment_type"`
	Location       string    `json:"location"`
	Description    string    `json:"description"`
	Requirements   string    `json:"requirements"`
	Status         string    `json:"status"`
	DisplayOrder   int       `json:"display_order"`
	CreatedAt      time.Time `json:"created_at"`
}

type application struct {
	ID           string    `json:"id"`
	JobID        string    `json:"job_id"`
	Position     string    `json:"position"`
	FullName     string    `json:"full_name"`
	Email        string    `json:"email"`
	Phone        string    `json:"phone"`
	PortfolioURL string    `json:"portfolio_url"`
	LinkedInURL  string    `json:"linkedin_url"`
	Experience   string    `json:"experience"`
	CoverMessage string    `json:"cover_message"`
	ResumeURL    string    `json:"resume_url"`
	Status       string    `json:"status"`
	CreatedAt    time.Time `json:"created_at"`
}

type contactMessage struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Phone     string    `json:"phone"`
	Subject   string    `json:"subject"`
	Message   string    `json:"message"`
	Status    string    `json:"status"`
	CreatedAt time.Time `json:"created_at"`
}

type socialLink struct {
	ID           string    `json:"id"`
	Platform     string    `json:"platform"`
	URL          string    `json:"url"`
	IsActive     bool      `json:"is_active"`
	DisplayOrder int       `json:"display_order"`
	CreatedAt    time.Time `json:"created_at"`
}

func New(db *sql.DB, cfg config.Config) *Server {
	return &Server{db: db, cfg: cfg, rateLimiter: newRateLimiter()}
}

func (s *Server) Routes() http.Handler {
	r := chi.NewRouter()
	r.Use(cors.Handler(cors.Options{
		AllowedOrigins:   s.cfg.CORSAllowedOrigins,
		AllowedMethods:   []string{"GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"},
		AllowedHeaders:   []string{"Accept", "Authorization", "Content-Type"},
		AllowCredentials: true,
		MaxAge:           300,
	}))
	r.Use(securityHeaders)

	r.Get("/health", func(w http.ResponseWriter, r *http.Request) {
		ok(w, map[string]string{"status": "ok"})
	})

	r.Route("/api/v1", func(r chi.Router) {
		r.Get("/site", s.publicSite)
		r.Get("/settings/public", s.publicSettings)
		r.Get("/sections", s.publicSections)
		r.Get("/games", s.publicGames)
		r.Get("/games/{slug}", s.publicGame)
		r.Get("/team", s.publicTeam)
		r.Get("/jobs", s.publicJobs)
		r.Get("/social-links", s.publicSocialLinks)
		r.With(s.limit("ai-chat", 12, 10*time.Minute)).Post("/ai/chat", s.aiChat)
		r.With(s.limit("contact", 6, 10*time.Minute)).Post("/contact", s.createContact)
		r.With(s.limit("applications", 4, 20*time.Minute)).Post("/applications", s.createApplication)

		r.With(s.limit("admin-login", 8, 10*time.Minute)).Post("/admin/login", s.adminLogin)
		r.Group(func(r chi.Router) {
			r.Use(s.adminRequired)
			r.Get("/admin/dashboard", s.adminDashboard)
			r.Get("/admin/settings", s.adminSettings)
			r.Put("/admin/settings", s.updateSettings)
			r.Get("/admin/sections", s.adminSections)
			r.Put("/admin/sections/{key}", s.updateSection)

			r.Get("/admin/games", s.adminGames)
			r.Post("/admin/games", s.createGame)
			r.Put("/admin/games/{id}", s.updateGame)
			r.Delete("/admin/games/{id}", s.deleteGame)

			r.Get("/admin/team", s.adminTeam)
			r.Post("/admin/team", s.createTeam)
			r.Put("/admin/team/{id}", s.updateTeam)
			r.Delete("/admin/team/{id}", s.deleteTeam)

			r.Get("/admin/jobs", s.adminJobs)
			r.Post("/admin/jobs", s.createJob)
			r.Put("/admin/jobs/{id}", s.updateJob)
			r.Delete("/admin/jobs/{id}", s.deleteJob)

			r.Get("/admin/applications", s.adminApplications)
			r.Get("/admin/applications/{id}", s.adminApplication)
			r.Patch("/admin/applications/{id}/status", s.updateApplicationStatus)

			r.Get("/admin/contact-messages", s.adminContactMessages)
			r.Patch("/admin/contact-messages/{id}/status", s.updateContactStatus)

			r.Get("/admin/social-links", s.adminSocialLinks)
			r.Post("/admin/social-links", s.createSocialLink)
			r.Put("/admin/social-links/{id}", s.updateSocialLink)
			r.Delete("/admin/social-links/{id}", s.deleteSocialLink)
		})
	})
	return r
}

func (s *Server) publicSite(w http.ResponseWriter, r *http.Request) {
	settings, _ := s.getSettings(r.Context())
	sections, _ := s.sectionMap(r.Context())
	games, _ := s.listGames(r.Context(), false)
	team, _ := s.listTeam(r.Context(), false)
	jobs, _ := s.listJobs(r.Context(), false)
	socials, _ := s.listSocialLinks(r.Context(), false)
	ok(w, map[string]any{
		"settings":     settings,
		"sections":     sections,
		"games":        games,
		"team":         team,
		"jobs":         jobs,
		"social_links": socials,
	})
}

func (s *Server) publicSettings(w http.ResponseWriter, r *http.Request) {
	settings, err := s.getSettings(r.Context())
	respondResult(w, settings, err)
}

func (s *Server) publicSections(w http.ResponseWriter, r *http.Request) {
	sections, err := s.sectionMap(r.Context())
	respondResult(w, sections, err)
}

func (s *Server) publicGames(w http.ResponseWriter, r *http.Request) {
	games, err := s.listGames(r.Context(), false)
	respondResult(w, games, err)
}

func (s *Server) publicGame(w http.ResponseWriter, r *http.Request) {
	var item game
	err := queryRowContext(s.db, r.Context(), gameSelect()+` WHERE slug = ? AND is_active = TRUE AND status <> 'hidden'`, chi.URLParam(r, "slug")).Scan(
		&item.ID, &item.Title, &item.Slug, &item.ShortDescription, &item.Description, &item.Genre, &item.IconURL,
		&item.PlayStoreURL, &item.PackageID, &item.Status, &item.Version, &item.ReleaseDate, &item.DisplayOrder, &item.IsActive, &item.CreatedAt,
	)
	if errors.Is(err, sql.ErrNoRows) {
		fail(w, http.StatusNotFound, "NOT_FOUND", "Game not found.")
		return
	}
	respondResult(w, item, err)
}

func (s *Server) publicTeam(w http.ResponseWriter, r *http.Request) {
	team, err := s.listTeam(r.Context(), false)
	respondResult(w, team, err)
}

func (s *Server) publicJobs(w http.ResponseWriter, r *http.Request) {
	jobs, err := s.listJobs(r.Context(), false)
	respondResult(w, jobs, err)
}

func (s *Server) publicSocialLinks(w http.ResponseWriter, r *http.Request) {
	links, err := s.listSocialLinks(r.Context(), false)
	respondResult(w, links, err)
}

func (s *Server) aiChat(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Message string `json:"message"`
		History []struct {
			Role    string `json:"role"`
			Content string `json:"content"`
		} `json:"history"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	message := clean(input.Message, 1200)
	if strings.TrimSpace(message) == "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Please enter a message.")
		return
	}

	settings, _ := s.getSettings(r.Context())
	games, _ := s.listGames(r.Context(), false)
	team, _ := s.listTeam(r.Context(), false)
	jobs, _ := s.listJobs(r.Context(), false)

	answer := groundedAssistantAnswer(message, settings, games, team, jobs)
	ok(w, map[string]string{"message": answer})
}

func (s *Server) createContact(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Name    string `json:"name"`
		Email   string `json:"email"`
		Phone   string `json:"phone"`
		Subject string `json:"subject"`
		Message string `json:"message"`
		Company string `json:"company"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if strings.TrimSpace(input.Company) != "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Message could not be submitted.")
		return
	}
	input.Name = clean(input.Name, 120)
	input.Phone = clean(input.Phone, 80)
	input.Subject = clean(input.Subject, 180)
	input.Message = clean(input.Message, 3000)
	email, validEmail := normalizeEmail(input.Email)
	if input.Name == "" || !validEmail || input.Subject == "" || input.Message == "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name, valid email, subject, and message are required.")
		return
	}
	_, err := execContext(s.db, r.Context(),
		`INSERT INTO contact_messages (name, email, phone, subject, message, status) VALUES (?, ?, ?, ?, ?, 'new')`,
		input.Name, email, input.Phone, input.Subject, input.Message,
	)
	respondResult(w, map[string]string{"status": "saved"}, err)
}

func (s *Server) createApplication(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseMultipartForm(12 << 20); err != nil {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Application form is too large.")
		return
	}
	if strings.TrimSpace(r.FormValue("company")) != "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Application could not be submitted.")
		return
	}
	email, validEmail := normalizeEmail(r.FormValue("email"))
	fullName := clean(r.FormValue("full_name"), 140)
	jobID := strings.TrimSpace(r.FormValue("job_id"))
	cover := clean(r.FormValue("cover_message"), 4000)
	if fullName == "" || !validEmail || jobID == "" || cover == "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Full name, valid email, position, and cover message are required.")
		return
	}
	file, header, err := r.FormFile("resume")
	if err != nil {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Resume/CV is required.")
		return
	}
	defer file.Close()
	if header.Size > 8<<20 {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Resume/CV must be 8 MB or smaller.")
		return
	}
	ext := strings.ToLower(filepath.Ext(header.Filename))
	if ext != ".pdf" && ext != ".doc" && ext != ".docx" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Resume/CV must be PDF, DOC, or DOCX.")
		return
	}
	content, err := io.ReadAll(io.LimitReader(file, 8<<20+1))
	if err != nil || len(content) == 0 || len(content) > 8<<20 {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Resume/CV could not be read.")
		return
	}
	resumeURL, err := s.uploadObject(r.Context(), "resumes/"+time.Now().UTC().Format("20060102")+"/"+randomID()+ext, contentType(ext), content)
	if err != nil {
		fail(w, http.StatusInternalServerError, "STORAGE_ERROR", "Resume/CV could not be uploaded.")
		return
	}
	_, err = execContext(s.db, r.Context(),
		`INSERT INTO job_applications (job_id, full_name, email, phone, portfolio_url, linkedin_url, experience, cover_message, resume_url, status)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'new')`,
		jobID, fullName, email, clean(r.FormValue("phone"), 80), clean(r.FormValue("portfolio_url"), 500),
		clean(r.FormValue("linkedin_url"), 500), clean(r.FormValue("experience"), 500), cover, resumeURL,
	)
	respondResult(w, map[string]string{"status": "submitted"}, err)
}

func (s *Server) adminLogin(w http.ResponseWriter, r *http.Request) {
	var input struct {
		Email    string `json:"email"`
		Password string `json:"password"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	email, okEmail := normalizeEmail(input.Email)
	if !okEmail || input.Password == "" {
		fail(w, http.StatusUnauthorized, "AUTH_ERROR", "Invalid email or password.")
		return
	}
	var id int64
	var name, passwordHash, role string
	err := queryRowContext(s.db, r.Context(), `SELECT id, name, password_hash, role FROM users WHERE email = ?`, email).Scan(&id, &name, &passwordHash, &role)
	if errors.Is(err, sql.ErrNoRows) || role != "admin" || !auth.CheckPassword(passwordHash, input.Password) {
		fail(w, http.StatusUnauthorized, "AUTH_ERROR", "Invalid email or password.")
		return
	}
	if err != nil {
		fail(w, http.StatusInternalServerError, "SERVER_ERROR", "Could not sign in.")
		return
	}
	token, err := auth.GenerateToken(s.cfg.JWTSecret, id, role)
	if err != nil {
		fail(w, http.StatusInternalServerError, "SERVER_ERROR", "Could not create session.")
		return
	}
	ok(w, map[string]any{"token": token, "user": map[string]string{"name": name, "email": email, "role": role}})
}

func (s *Server) adminDashboard(w http.ResponseWriter, r *http.Request) {
	settings, _ := s.getSettings(r.Context())
	sections, _ := s.listSections(r.Context())
	games, _ := s.listGames(r.Context(), true)
	team, _ := s.listTeam(r.Context(), true)
	jobs, _ := s.listJobs(r.Context(), true)
	apps, _ := s.listApplications(r.Context())
	messages, _ := s.listContactMessages(r.Context())
	socials, _ := s.listSocialLinks(r.Context(), true)
	ok(w, map[string]any{
		"settings":         settingsToMap(settings),
		"sections":         sections,
		"games":            games,
		"team":             team,
		"jobs":             jobs,
		"applications":     apps,
		"contact_messages": messages,
		"social_links":     socials,
	})
}

func (s *Server) adminSettings(w http.ResponseWriter, r *http.Request) { s.publicSettings(w, r) }

func (s *Server) updateSettings(w http.ResponseWriter, r *http.Request) {
	values := map[string]string{}
	if !decodeJSON(w, r, &values) {
		return
	}
	allowed := map[string]bool{
		"studio_name": true, "hero_title": true, "hero_tagline": true, "hero_description": true,
		"contact_email": true, "contact_phone": true, "location": true, "secondary_location": true, "map_url": true,
		"contact_form_recipient": true, "footer_description": true,
	}
	for key, value := range values {
		if allowed[key] {
			_, err := execContext(s.db, r.Context(), `UPDATE site_settings SET value = ?, updated_at = now() WHERE key = ?`, clean(value, 4000), key)
			if err != nil {
				respondResult(w, nil, err)
				return
			}
		}
	}
	ok(w, map[string]string{"status": "saved"})
}

func (s *Server) adminSections(w http.ResponseWriter, r *http.Request) {
	sections, err := s.listSections(r.Context())
	respondResult(w, sections, err)
}

func (s *Server) updateSection(w http.ResponseWriter, r *http.Request) {
	var input struct {
		IsEnabled bool `json:"is_enabled"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	_, err := execContext(s.db, r.Context(), `UPDATE section_settings SET is_enabled = ?, updated_at = now() WHERE section_key = ?`, input.IsEnabled, chi.URLParam(r, "key"))
	respondResult(w, map[string]string{"status": "updated"}, err)
}

func (s *Server) adminGames(w http.ResponseWriter, r *http.Request) { games, err := s.listGames(r.Context(), true); respondResult(w, games, err) }
func (s *Server) adminTeam(w http.ResponseWriter, r *http.Request) { team, err := s.listTeam(r.Context(), true); respondResult(w, team, err) }
func (s *Server) adminJobs(w http.ResponseWriter, r *http.Request) { jobs, err := s.listJobs(r.Context(), true); respondResult(w, jobs, err) }
func (s *Server) adminApplications(w http.ResponseWriter, r *http.Request) { apps, err := s.listApplications(r.Context()); respondResult(w, apps, err) }
func (s *Server) adminContactMessages(w http.ResponseWriter, r *http.Request) { messages, err := s.listContactMessages(r.Context()); respondResult(w, messages, err) }
func (s *Server) adminSocialLinks(w http.ResponseWriter, r *http.Request) { links, err := s.listSocialLinks(r.Context(), true); respondResult(w, links, err) }

func (s *Server) createGame(w http.ResponseWriter, r *http.Request) { s.saveGame(w, r, "") }
func (s *Server) updateGame(w http.ResponseWriter, r *http.Request) { s.saveGame(w, r, chi.URLParam(r, "id")) }
func (s *Server) deleteGame(w http.ResponseWriter, r *http.Request) { softDelete(w, r, s.db, "games") }
func (s *Server) createTeam(w http.ResponseWriter, r *http.Request) { s.saveTeam(w, r, "") }
func (s *Server) updateTeam(w http.ResponseWriter, r *http.Request) { s.saveTeam(w, r, chi.URLParam(r, "id")) }
func (s *Server) deleteTeam(w http.ResponseWriter, r *http.Request) { softDelete(w, r, s.db, "team_members") }
func (s *Server) createJob(w http.ResponseWriter, r *http.Request) { s.saveJob(w, r, "") }
func (s *Server) updateJob(w http.ResponseWriter, r *http.Request) { s.saveJob(w, r, chi.URLParam(r, "id")) }
func (s *Server) deleteJob(w http.ResponseWriter, r *http.Request) { hardDelete(w, r, s.db, "jobs") }
func (s *Server) createSocialLink(w http.ResponseWriter, r *http.Request) { s.saveSocial(w, r, "") }
func (s *Server) updateSocialLink(w http.ResponseWriter, r *http.Request) { s.saveSocial(w, r, chi.URLParam(r, "id")) }
func (s *Server) deleteSocialLink(w http.ResponseWriter, r *http.Request) { hardDelete(w, r, s.db, "social_links") }

func (s *Server) saveGame(w http.ResponseWriter, r *http.Request, id string) {
	var input game
	if !decodeJSON(w, r, &input) {
		return
	}
	input.Title = clean(input.Title, 180)
	if input.Slug == "" {
		input.Slug = slugify(input.Title)
	} else {
		input.Slug = slugify(input.Slug)
	}
	input.ShortDescription = clean(input.ShortDescription, 500)
	input.Description = clean(input.Description, 5000)
	input.Genre = clean(input.Genre, 120)
	input.IconURL = clean(input.IconURL, 700)
	input.PlayStoreURL = clean(input.PlayStoreURL, 700)
	input.PackageID = clean(input.PackageID, 240)
	input.Version = clean(input.Version, 60)
	if input.Title == "" || input.Slug == "" || !validEnum(input.Status, "development", "pre_registration", "published", "hidden") {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title, slug, and valid status are required.")
		return
	}
	var err error
	if id == "" {
		_, err = execContext(s.db, r.Context(),
			`INSERT INTO games (title, slug, short_description, description, genre, icon_url, play_store_url, package_id, status, version, display_order, is_active)
			 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			input.Title, input.Slug, input.ShortDescription, input.Description, input.Genre, input.IconURL, input.PlayStoreURL, input.PackageID, input.Status, input.Version, input.DisplayOrder, input.IsActive)
	} else {
		_, err = execContext(s.db, r.Context(),
			`UPDATE games SET title=?, slug=?, short_description=?, description=?, genre=?, icon_url=?, play_store_url=?, package_id=?, status=?, version=?, display_order=?, is_active=?, updated_at=now() WHERE id=?`,
			input.Title, input.Slug, input.ShortDescription, input.Description, input.Genre, input.IconURL, input.PlayStoreURL, input.PackageID, input.Status, input.Version, input.DisplayOrder, input.IsActive, id)
	}
	respondResult(w, map[string]string{"status": "saved"}, err)
}

func (s *Server) saveTeam(w http.ResponseWriter, r *http.Request, id string) {
	var input teamMember
	if !decodeJSON(w, r, &input) {
		return
	}
	input.Name, input.Role, input.ShortBio, input.ProfileImageURL = clean(input.Name, 140), clean(input.Role, 140), clean(input.ShortBio, 1200), clean(input.ProfileImageURL, 700)
	if input.Name == "" || input.Role == "" {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Name and role are required.")
		return
	}
	var err error
	if id == "" {
		_, err = execContext(s.db, r.Context(), `INSERT INTO team_members (name, role, short_bio, profile_image_url, display_order, is_active) VALUES (?, ?, ?, ?, ?, ?)`, input.Name, input.Role, input.ShortBio, input.ProfileImageURL, input.DisplayOrder, input.IsActive)
	} else {
		_, err = execContext(s.db, r.Context(), `UPDATE team_members SET name=?, role=?, short_bio=?, profile_image_url=?, display_order=?, is_active=?, updated_at=now() WHERE id=?`, input.Name, input.Role, input.ShortBio, input.ProfileImageURL, input.DisplayOrder, input.IsActive, id)
	}
	respondResult(w, map[string]string{"status": "saved"}, err)
}

func (s *Server) saveJob(w http.ResponseWriter, r *http.Request, id string) {
	var input job
	if !decodeJSON(w, r, &input) {
		return
	}
	input.Title, input.Department, input.EmploymentType, input.Location = clean(input.Title, 180), clean(input.Department, 120), clean(input.EmploymentType, 80), clean(input.Location, 140)
	input.Description, input.Requirements = clean(input.Description, 5000), clean(input.Requirements, 5000)
	if input.Title == "" || !validEnum(input.Status, "draft", "open", "closed") {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Title and valid status are required.")
		return
	}
	var err error
	if id == "" {
		_, err = execContext(s.db, r.Context(), `INSERT INTO jobs (title, department, employment_type, location, description, requirements, status, display_order) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`, input.Title, input.Department, input.EmploymentType, input.Location, input.Description, input.Requirements, input.Status, input.DisplayOrder)
	} else {
		_, err = execContext(s.db, r.Context(), `UPDATE jobs SET title=?, department=?, employment_type=?, location=?, description=?, requirements=?, status=?, display_order=?, updated_at=now() WHERE id=?`, input.Title, input.Department, input.EmploymentType, input.Location, input.Description, input.Requirements, input.Status, input.DisplayOrder, id)
	}
	respondResult(w, map[string]string{"status": "saved"}, err)
}

func (s *Server) saveSocial(w http.ResponseWriter, r *http.Request, id string) {
	var input socialLink
	if !decodeJSON(w, r, &input) {
		return
	}
	input.Platform, input.URL = clean(input.Platform, 80), clean(input.URL, 700)
	if input.Platform == "" || !validHTTPURL(input.URL, true) {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Platform and valid URL are required.")
		return
	}
	var err error
	if id == "" {
		_, err = execContext(s.db, r.Context(), `INSERT INTO social_links (platform, url, is_active, display_order) VALUES (?, ?, ?, ?)`, input.Platform, input.URL, input.IsActive, input.DisplayOrder)
	} else {
		_, err = execContext(s.db, r.Context(), `UPDATE social_links SET platform=?, url=?, is_active=?, display_order=?, updated_at=now() WHERE id=?`, input.Platform, input.URL, input.IsActive, input.DisplayOrder, id)
	}
	respondResult(w, map[string]string{"status": "saved"}, err)
}

func (s *Server) adminApplication(w http.ResponseWriter, r *http.Request) {
	apps, err := s.listApplications(r.Context())
	if err != nil {
		respondResult(w, nil, err)
		return
	}
	for _, item := range apps {
		if item.ID == chi.URLParam(r, "id") {
			ok(w, item)
			return
		}
	}
	fail(w, http.StatusNotFound, "NOT_FOUND", "Application not found.")
}

func (s *Server) updateApplicationStatus(w http.ResponseWriter, r *http.Request) {
	s.updateStatus(w, r, "job_applications", "new", "reviewing", "shortlisted", "rejected", "accepted")
}

func (s *Server) updateContactStatus(w http.ResponseWriter, r *http.Request) {
	s.updateStatus(w, r, "contact_messages", "new", "read", "archived")
}

func (s *Server) updateStatus(w http.ResponseWriter, r *http.Request, table string, allowed ...string) {
	var input struct {
		Status string `json:"status"`
	}
	if !decodeJSON(w, r, &input) {
		return
	}
	if !validEnum(input.Status, allowed...) {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid status.")
		return
	}
	_, err := execContext(s.db, r.Context(), `UPDATE `+table+` SET status = ? WHERE id = ?`, input.Status, chi.URLParam(r, "id"))
	respondResult(w, map[string]string{"status": "updated"}, err)
}

func (s *Server) getSettings(ctx context.Context) (siteSettings, error) {
	rows, err := queryContext(s.db, ctx, `SELECT key, value FROM site_settings`)
	if err != nil {
		return defaultSettings(), err
	}
	defer rows.Close()
	values := settingsToMap(defaultSettings())
	for rows.Next() {
		var key, value string
		if err := rows.Scan(&key, &value); err != nil {
			return defaultSettings(), err
		}
		values[key] = value
	}
	return mapToSettings(values), rows.Err()
}

func (s *Server) listSections(ctx context.Context) ([]sectionSetting, error) {
	rows, err := queryContext(s.db, ctx, `SELECT section_key, is_enabled, display_order FROM section_settings ORDER BY display_order, section_key`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []sectionSetting{}
	for rows.Next() {
		var item sectionSetting
		if err := rows.Scan(&item.SectionKey, &item.IsEnabled, &item.DisplayOrder); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) sectionMap(ctx context.Context) (map[string]bool, error) {
	items, err := s.listSections(ctx)
	values := map[string]bool{}
	for _, item := range items {
		values[item.SectionKey] = item.IsEnabled
	}
	return values, err
}

func (s *Server) listGames(ctx context.Context, admin bool) ([]game, error) {
	query := gameSelect()
	if !admin {
		query += ` WHERE is_active = TRUE AND status <> 'hidden'`
	}
	query += ` ORDER BY display_order, created_at DESC`
	rows, err := queryContext(s.db, ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []game{}
	for rows.Next() {
		var item game
		if err := rows.Scan(&item.ID, &item.Title, &item.Slug, &item.ShortDescription, &item.Description, &item.Genre, &item.IconURL, &item.PlayStoreURL, &item.PackageID, &item.Status, &item.Version, &item.ReleaseDate, &item.DisplayOrder, &item.IsActive, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func gameSelect() string {
	return `SELECT id::text, title, slug, COALESCE(short_description,''), COALESCE(description,''), COALESCE(genre,''), COALESCE(icon_url,''), COALESCE(play_store_url,''), COALESCE(package_id,''), status, COALESCE(version,''), release_date, display_order, is_active, created_at FROM games`
}

func (s *Server) listTeam(ctx context.Context, admin bool) ([]teamMember, error) {
	query := `SELECT id::text, name, role, COALESCE(short_bio,''), COALESCE(profile_image_url,''), display_order, is_active, created_at FROM team_members`
	if !admin {
		query += ` WHERE is_active = TRUE`
	}
	query += ` ORDER BY display_order, created_at DESC`
	rows, err := queryContext(s.db, ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []teamMember{}
	for rows.Next() {
		var item teamMember
		if err := rows.Scan(&item.ID, &item.Name, &item.Role, &item.ShortBio, &item.ProfileImageURL, &item.DisplayOrder, &item.IsActive, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) listJobs(ctx context.Context, admin bool) ([]job, error) {
	query := `SELECT id::text, title, COALESCE(department,''), COALESCE(employment_type,''), COALESCE(location,''), COALESCE(description,''), COALESCE(requirements,''), status, display_order, created_at FROM jobs`
	if !admin {
		query += ` WHERE status = 'open'`
	}
	query += ` ORDER BY display_order, created_at DESC`
	rows, err := queryContext(s.db, ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []job{}
	for rows.Next() {
		var item job
		if err := rows.Scan(&item.ID, &item.Title, &item.Department, &item.EmploymentType, &item.Location, &item.Description, &item.Requirements, &item.Status, &item.DisplayOrder, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) listApplications(ctx context.Context) ([]application, error) {
	rows, err := queryContext(s.db, ctx,
		`SELECT ja.id::text, ja.job_id::text, COALESCE(j.title,''), ja.full_name, ja.email, COALESCE(ja.phone,''), COALESCE(ja.portfolio_url,''), COALESCE(ja.linkedin_url,''), COALESCE(ja.experience,''), ja.cover_message, ja.resume_url, ja.status, ja.created_at
		 FROM job_applications ja LEFT JOIN jobs j ON j.id = ja.job_id ORDER BY ja.created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []application{}
	for rows.Next() {
		var item application
		if err := rows.Scan(&item.ID, &item.JobID, &item.Position, &item.FullName, &item.Email, &item.Phone, &item.PortfolioURL, &item.LinkedInURL, &item.Experience, &item.CoverMessage, &item.ResumeURL, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) listContactMessages(ctx context.Context) ([]contactMessage, error) {
	rows, err := queryContext(s.db, ctx, `SELECT id::text, name, email, COALESCE(phone,''), subject, message, status, created_at FROM contact_messages ORDER BY created_at DESC`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []contactMessage{}
	for rows.Next() {
		var item contactMessage
		if err := rows.Scan(&item.ID, &item.Name, &item.Email, &item.Phone, &item.Subject, &item.Message, &item.Status, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) listSocialLinks(ctx context.Context, admin bool) ([]socialLink, error) {
	query := `SELECT id::text, platform, url, is_active, display_order, created_at FROM social_links`
	if !admin {
		query += ` WHERE is_active = TRUE AND url <> ''`
	}
	query += ` ORDER BY display_order, created_at DESC`
	rows, err := queryContext(s.db, ctx, query)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	items := []socialLink{}
	for rows.Next() {
		var item socialLink
		if err := rows.Scan(&item.ID, &item.Platform, &item.URL, &item.IsActive, &item.DisplayOrder, &item.CreatedAt); err != nil {
			return nil, err
		}
		items = append(items, item)
	}
	return items, rows.Err()
}

func (s *Server) uploadObject(ctx context.Context, objectPath, contentType string, content []byte) (string, error) {
	baseURL := strings.TrimRight(s.cfg.SupabaseURL, "/")
	serviceKey := strings.TrimSpace(s.cfg.SupabaseServiceKey)
	if baseURL == "" || serviceKey == "" {
		return "", errors.New("supabase storage is not configured")
	}
	bucket := strings.Trim(s.cfg.SupabaseAssetBucket, "/")
	if bucket == "" {
		bucket = "assets"
	}
	uploadURL := fmt.Sprintf("%s/storage/v1/object/%s/%s", baseURL, url.PathEscape(bucket), objectPath)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, uploadURL, bytes.NewReader(content))
	if err != nil {
		return "", err
	}
	req.Header.Set("Authorization", "Bearer "+serviceKey)
	req.Header.Set("apikey", serviceKey)
	req.Header.Set("Content-Type", contentType)
	req.Header.Set("Cache-Control", "3600")
	req.Header.Set("x-upsert", "true")
	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return "", err
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		body, _ := io.ReadAll(io.LimitReader(resp.Body, 1024))
		return "", fmt.Errorf("supabase storage returned %d: %s", resp.StatusCode, strings.TrimSpace(string(body)))
	}
	return fmt.Sprintf("%s/storage/v1/object/public/%s/%s", baseURL, url.PathEscape(bucket), objectPath), nil
}

func (s *Server) adminRequired(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		raw := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		claims, err := auth.ParseToken(s.cfg.JWTSecret, raw)
		if err != nil || claims.Role != "admin" {
			fail(w, http.StatusUnauthorized, "AUTH_REQUIRED", "Admin authentication is required.")
			return
		}
		next.ServeHTTP(w, r)
	})
}

func softDelete(w http.ResponseWriter, r *http.Request, db *sql.DB, table string) {
	_, err := execContext(db, r.Context(), `UPDATE `+table+` SET is_active = FALSE, updated_at = now() WHERE id = ?`, chi.URLParam(r, "id"))
	respondResult(w, map[string]string{"status": "removed"}, err)
}

func hardDelete(w http.ResponseWriter, r *http.Request, db *sql.DB, table string) {
	_, err := execContext(db, r.Context(), `DELETE FROM `+table+` WHERE id = ?`, chi.URLParam(r, "id"))
	respondResult(w, map[string]string{"status": "removed"}, err)
}

func defaultSettings() siteSettings {
	return siteSettings{
		StudioName:        "Logic Crack Studio",
		HeroTitle:         "We Build Engaging Android Games",
		HeroTagline:       "Turning Ideas Into Android Games",
		HeroDescription:   "Logic Crack Studio creates engaging Unity-powered Android games, combining gameplay, design, optimization, and polished mobile experiences for Google Play.",
		ContactEmail:      "logiccrack864@gmail.com",
		ContactPhone:      "+92-304-3285741",
		Location:          "Post Office Chak No. 42-A, Chak No. 41 ABS, Tehsil Liaquatpur, District Rahim Yar Khan, Punjab, Pakistan.",
		SecondaryLocation: "Bahawalpur, Pakistan. Near Satellite Town, Bahawalpur, Punjab, Pakistan.",
		MapURL:            "https://www.google.com/maps/search/?api=1&query=Post%20Office%20Chak%20No.%2042-A%2C%20Chak%20No.%2041%20ABS%2C%20Tehsil%20Liaquatpur%2C%20District%20Rahim%20Yar%20Khan%2C%20Punjab%2C%20Pakistan",
		FooterDescription: "Logic Crack Studio is focused on creating Unity-powered Android games with polished gameplay, responsive interfaces, and release-ready mobile performance.",
	}
}

func settingsToMap(s siteSettings) map[string]string {
	return map[string]string{
		"studio_name":            s.StudioName,
		"hero_title":             s.HeroTitle,
		"hero_tagline":           s.HeroTagline,
		"hero_description":       s.HeroDescription,
		"contact_email":          s.ContactEmail,
		"contact_phone":          s.ContactPhone,
		"location":               s.Location,
		"secondary_location":     s.SecondaryLocation,
		"map_url":                s.MapURL,
		"contact_form_recipient": s.ContactFormRecipient,
		"footer_description":     s.FooterDescription,
	}
}

func mapToSettings(values map[string]string) siteSettings {
	return siteSettings{
		StudioName:           values["studio_name"],
		HeroTitle:            values["hero_title"],
		HeroTagline:          values["hero_tagline"],
		HeroDescription:      values["hero_description"],
		ContactEmail:         values["contact_email"],
		ContactPhone:         values["contact_phone"],
		Location:             values["location"],
		SecondaryLocation:    values["secondary_location"],
		MapURL:               values["map_url"],
		ContactFormRecipient: values["contact_form_recipient"],
		FooterDescription:    values["footer_description"],
	}
}

func groundedAssistantAnswer(message string, settings siteSettings, games []game, team []teamMember, jobs []job) string {
	question := strings.ToLower(message)
	studioName := settings.StudioName
	if studioName == "" {
		studioName = "Logic Crack Studio"
	}

	switch {
	case containsAny(question, "contact", "email", "phone", "location", "address", "map"):
		parts := []string{}
		if settings.ContactEmail != "" {
			parts = append(parts, "Email: "+settings.ContactEmail)
		}
		if settings.ContactPhone != "" {
			parts = append(parts, "Phone: "+settings.ContactPhone)
		}
		if settings.Location != "" {
			parts = append(parts, "Location: "+settings.Location)
		}
		if settings.SecondaryLocation != "" {
			parts = append(parts, "Also listed: "+settings.SecondaryLocation)
		}
		if len(parts) == 0 {
			return "Contact information is not configured yet."
		}
		return strings.Join(parts, "\n")

	case containsAny(question, "career", "job", "hiring", "apply", "opening", "position"):
		if len(jobs) == 0 {
			return "There are no open positions listed right now. If Careers is enabled later, open roles will appear on the website."
		}
		titles := []string{}
		for _, item := range jobs {
			titles = append(titles, item.Title)
		}
		return "Open positions currently listed: " + strings.Join(titles, ", ") + ". You can apply through the Careers section when it is visible."

	case containsAny(question, "game", "games", "published", "release", "google play", "development"):
		published := []string{}
		upcoming := []string{}
		for _, item := range games {
			switch item.Status {
			case "published":
				published = append(published, item.Title)
			case "development", "pre_registration":
				upcoming = append(upcoming, item.Title)
			}
		}
		if len(published) == 0 && len(upcoming) == 0 {
			return studioName + " is currently building its first Android gaming experiences. No published games are listed yet."
		}
		parts := []string{}
		if len(published) > 0 {
			parts = append(parts, "Published games: "+strings.Join(published, ", "))
		}
		if len(upcoming) > 0 {
			parts = append(parts, "Games in development or pre-registration: "+strings.Join(upcoming, ", "))
		}
		return strings.Join(parts, "\n")

	case containsAny(question, "service", "services", "android", "unity", "ui", "ux", "optimization", "testing", "qa", "2d", "3d"):
		return studioName + " focuses on Unity-powered Android game development. Services include Android game development, Unity development, game UI/UX, 2D and 3D game development, game optimization, and game testing/QA."

	case containsAny(question, "team", "member", "people", "staff"):
		if len(team) == 0 {
			return "No public team members are listed right now. The Team section only appears when real active profiles are configured."
		}
		names := []string{}
		for _, item := range team {
			names = append(names, item.Name+" - "+item.Role)
		}
		return "Public team members currently listed:\n" + strings.Join(names, "\n")

	case containsAny(question, "about", "studio", "who are you", "what is logic", "logic crack"):
		if settings.HeroDescription != "" {
			return settings.HeroDescription
		}
		return studioName + " is a Unity game development studio focused on Android games for Google Play."

	default:
		return "I can help with factual information about " + studioName + ": Android game development, Unity services, games, careers, team, and contact details. I do not have information about clients, ratings, downloads, or unpublished details unless they are listed on the site."
	}
}

func containsAny(value string, needles ...string) bool {
	for _, needle := range needles {
		if strings.Contains(value, needle) {
			return true
		}
	}
	return false
}

func ok(w http.ResponseWriter, data any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(http.StatusOK)
	_ = json.NewEncoder(w).Encode(apiResponse{Success: true, Data: data})
}

func fail(w http.ResponseWriter, status int, code, message string) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	_ = json.NewEncoder(w).Encode(apiResponse{Success: false, Error: map[string]string{"code": code, "message": message}})
}

func respondResult(w http.ResponseWriter, data any, err error) {
	if err != nil {
		fail(w, http.StatusInternalServerError, "SERVER_ERROR", "The request could not be completed.")
		return
	}
	ok(w, data)
}

func decodeJSON(w http.ResponseWriter, r *http.Request, target any) bool {
	if err := json.NewDecoder(io.LimitReader(r.Body, 1<<20)).Decode(target); err != nil {
		fail(w, http.StatusBadRequest, "VALIDATION_ERROR", "Invalid request body.")
		return false
	}
	return true
}

func securityHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		next.ServeHTTP(w, r)
	})
}

func clean(value string, max int) string {
	value = strings.TrimSpace(value)
	if len(value) > max {
		return value[:max]
	}
	return value
}

func normalizeEmail(email string) (string, bool) {
	email = strings.ToLower(strings.TrimSpace(email))
	if len(email) > 190 {
		return "", false
	}
	parsed, err := mail.ParseAddress(email)
	if err != nil || parsed.Address != email {
		return "", false
	}
	return email, true
}

func validHTTPURL(value string, required bool) bool {
	value = strings.TrimSpace(value)
	if value == "" {
		return !required
	}
	parsed, err := url.ParseRequestURI(value)
	if err != nil || parsed.Host == "" {
		return false
	}
	return parsed.Scheme == "http" || parsed.Scheme == "https"
}

func validEnum(value string, allowed ...string) bool {
	for _, item := range allowed {
		if value == item {
			return true
		}
	}
	return false
}

func slugify(value string) string {
	value = strings.ToLower(strings.TrimSpace(value))
	var builder strings.Builder
	lastDash := false
	for _, char := range value {
		switch {
		case char >= 'a' && char <= 'z', char >= '0' && char <= '9':
			builder.WriteRune(char)
			lastDash = false
		default:
			if !lastDash && builder.Len() > 0 {
				builder.WriteByte('-')
				lastDash = true
			}
		}
	}
	return strings.Trim(builder.String(), "-")
}

func contentType(ext string) string {
	switch ext {
	case ".pdf":
		return "application/pdf"
	case ".doc":
		return "application/msword"
	case ".docx":
		return "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
	default:
		return "application/octet-stream"
	}
}

func randomID() string {
	bytes := make([]byte, 16)
	if _, err := rand.Read(bytes); err != nil {
		return strconv.FormatInt(time.Now().UnixNano(), 36)
	}
	return hex.EncodeToString(bytes)
}

type rateLimiter struct {
	mu       sync.Mutex
	attempts map[string][]time.Time
}

func newRateLimiter() *rateLimiter {
	return &rateLimiter{attempts: map[string][]time.Time{}}
}

func (s *Server) limit(scope string, maxAttempts int, window time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			key := scope + ":" + clientIP(r)
			if !s.rateLimiter.allow(key, maxAttempts, window) {
				fail(w, http.StatusTooManyRequests, "RATE_LIMITED", "Too many attempts, please wait and try again.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}

func (l *rateLimiter) allow(key string, maxAttempts int, window time.Duration) bool {
	now := time.Now()
	cutoff := now.Add(-window)
	l.mu.Lock()
	defer l.mu.Unlock()
	hits := l.attempts[key]
	kept := hits[:0]
	for _, hit := range hits {
		if hit.After(cutoff) {
			kept = append(kept, hit)
		}
	}
	if len(kept) >= maxAttempts {
		l.attempts[key] = kept
		return false
	}
	l.attempts[key] = append(kept, now)
	return true
}

func clientIP(r *http.Request) string {
	for _, header := range []string{"X-Forwarded-For", "X-Real-IP"} {
		value := strings.TrimSpace(r.Header.Get(header))
		if value == "" {
			continue
		}
		if header == "X-Forwarded-For" {
			value = strings.TrimSpace(strings.Split(value, ",")[0])
		}
		if parsed := net.ParseIP(value); parsed != nil {
			return parsed.String()
		}
	}
	host, _, err := net.SplitHostPort(r.RemoteAddr)
	if err == nil {
		return host
	}
	return r.RemoteAddr
}

type sqlRunner interface {
	ExecContext(context.Context, string, ...any) (sql.Result, error)
	QueryContext(context.Context, string, ...any) (*sql.Rows, error)
	QueryRowContext(context.Context, string, ...any) *sql.Row
}

func execContext(db sqlRunner, ctx context.Context, query string, args ...any) (sql.Result, error) {
	return db.ExecContext(ctx, postgresQuery(query), args...)
}

func queryContext(db sqlRunner, ctx context.Context, query string, args ...any) (*sql.Rows, error) {
	return db.QueryContext(ctx, postgresQuery(query), args...)
}

func queryRowContext(db sqlRunner, ctx context.Context, query string, args ...any) *sql.Row {
	return db.QueryRowContext(ctx, postgresQuery(query), args...)
}

func postgresQuery(query string) string {
	var builder strings.Builder
	builder.Grow(len(query) + 8)
	index := 1
	for _, char := range query {
		if char != '?' {
			builder.WriteRune(char)
			continue
		}
		builder.WriteByte('$')
		builder.WriteString(strconv.Itoa(index))
		index++
	}
	return builder.String()
}
