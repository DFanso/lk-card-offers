# Product Requirements Document: Sri Lanka Credit Card Offers Platform

**Version**: 1.0  
**Date**: 2026-04-21  
**Author**: Sarah (Product Owner)  
**Quality Score**: 91/100

---

## Executive Summary

Build full-stack web platform for Sri Lankan credit/debit card offers. Product helps users quickly discover valid bank card promotions, while maintainers/admins keep offer data fresh and structured. Compared with current market sites, key differentiation is role-based contribution workflow plus faster publishing.

Platform uses Next.js + Auth.js + TanStack Query + Drizzle + PostgreSQL + Zod + Zustand + shadcn/ui. Logged-in users can submit offers, maintainers can approve user submissions, and maintainers can publish direct offers immediately. Admins manage core master data (banks, card types), and super admins govern admin-level access and system controls.

---

## Problem Statement

**Current Situation**: Sri Lanka card-offer discovery is fragmented. Offer pages often become stale, fields are inconsistent, and users cannot easily filter by useful dimensions like bank, card type, category, validity window, or seasonal tags.

**Proposed Solution**: Centralized offer platform with structured entities (Bank, CardType, Merchant, Offer, Category), role-based publishing workflow, and clear expiry lifecycle.

**Business Impact**: Increase repeat user visits for ongoing offer discovery and create trusted, continuously updated offer catalog with low friction contribution model.

---

## Success Metrics

**Primary KPIs:**
- **Monthly Active Users (MAU)**: primary north-star metric for user adoption and retention.
- **Active Valid Offers**: number of non-expired public offers (quality + coverage proxy).
- **Submission-to-Publish Time**: median time from user submission to maintainer approval.

**Validation**: Track weekly in admin dashboard; review monthly for product iteration priorities.

---

## User Personas

### Primary: Everyday Card User
- **Role**: Registered user / offer consumer
- **Goals**: Find best available card offers quickly and reliably
- **Pain Points**: Expired offers, poor filtering, unclear terms
- **Technical Level**: Novice to Intermediate

### Secondary: Maintainer
- **Role**: Content operator
- **Goals**: Add/approve offers quickly, keep catalog fresh
- **Pain Points**: Unstructured submissions, unclear source credibility
- **Technical Level**: Intermediate

### Tertiary: Admin / Super Admin
- **Role**: Governance and data integrity
- **Goals**: Manage master data and permissions safely
- **Pain Points**: Unauthorized edits, inconsistent taxonomy
- **Technical Level**: Intermediate to Advanced

---

## User Stories & Acceptance Criteria

### Story 1: Discover Offers

**As a** user  
**I want to** browse and filter offers by bank/card type/category/date  
**So that** I can find relevant deals fast

**Acceptance Criteria:**
- [ ] Public listing supports filters: bank, card type (credit/debit), category/subcategory, status.
- [ ] Offer card shows title, bank(s), date window, status, and source link.
- [ ] Expired offers are hidden from primary public listing.

### Story 2: Submit Offer as User

**As a** logged-in normal user  
**I want to** submit new offer  
**So that** community data grows quickly

**Acceptance Criteria:**
- [ ] Submission form validates required fields with Zod.
- [ ] New user submission enters `pending_review` state.
- [ ] Maintainers can see pending queue and approve/reject with reason.

### Story 3: Maintainer Publishing

**As a** maintainer  
**I want to** create direct offers and approve user submissions  
**So that** content stays current

**Acceptance Criteria:**
- [ ] Maintainer direct offer publish is immediate.
- [ ] Maintainer can approve pending submissions from normal users.
- [ ] Approval action records approver and timestamp.

### Story 4: Admin Master Data Management

**As an** admin  
**I want to** manage banks and card types  
**So that** taxonomy remains clean

**Acceptance Criteria:**
- [ ] Admin can CRUD banks and card types.
- [ ] Role-guarded routes prevent non-admin access.
- [ ] Changes are visible to maintainers in offer form selectors.

---

## Functional Requirements

### Core Features

**Feature 1: Authentication + RBAC**
- Description: Auth.js login/session with role hierarchy.
- User flow: Sign in → role in JWT/session → route/server-action guard.
- Edge cases: revoked role should lose protected access next session check.
- Error handling: unauthorized requests return 403/redirect.

**Feature 2: Offer Lifecycle Management**
- Description: Create, review, publish, expire offers.
- User flow: User submits → pending queue → maintainer approves → published.
- Edge cases: duplicate offers from same bank/merchant/date window.
- Error handling: validation errors surfaced inline; conflicting record blocked.

**Feature 3: Search & Filter UX**
- Description: Fast discoverability with practical dimensions.
- User flow: open listing → apply filters → open details.
- Edge cases: empty result sets and partial filters.
- Error handling: graceful empty state + reset filters action.

**Feature 4: Master Data Administration**
- Description: Admin manages bank list and card types.
- User flow: admin dashboard CRUD forms.
- Edge cases: deleting bank/card type used by live offers.
- Error handling: soft-delete or dependency warning required.

### Out of Scope (Initial Release)
- Automated scraping/crawling bots for bank sites
- Advanced personalization/recommendation engine
- Financial advice or eligibility decisioning beyond static rules

---

## Technical Constraints

### Performance
- Listing page initial response target: < 500ms server-side (cached path where applicable).
- Filter interactions should feel near-instant via TanStack Query caching/pagination.

### Security
- Auth.js session-based auth with role claims in JWT/session callbacks.
- Baseline compliance choice: **A (basic disclaimer only)**.
- No financial-advice claims; clear disclaimer on public offer pages.

### Integration
- PostgreSQL via Drizzle ORM for all persistent entities.
- Zod for server/client input validation.
- TanStack Query for client fetch/mutation state.
- Zustand only for lightweight client UI/global state.

### Technology Stack
- Next.js App Router (fullstack)
- Auth.js (NextAuth v5 style)
- Drizzle + PostgreSQL
- Zod, Zustand, TanStack Query
- Tailwind + shadcn/ui

---

## Proposed Data Model (MVP)

### Entities
- `User` (id, name, email, role)
- `MaintainerRequest` (userId, status, reviewedBy, reviewedAt, note)
- `Bank` (name, slug, logoUrl, isActive)
- `CardType` (name: credit/debit/other, isActive)
- `Merchant` (name, logoUrl, contact, location summary)
- `Category` / `SubCategory`
- `Offer` (title, description, bankIds, cardTypeIds, merchantId, category, startDate, endDate, status, sourceUrl, locationScope, scheduleJson)
- `OfferSubmission` (submittedByUserId, payload, status, approvedByMaintainerId)

### Offer Status Enum
- `pending_review`
- `published`
- `expired`
- `rejected`

### Freshness Rule (selected)
- **2.A**: auto-expire offers on/after `endDate` and hide from public listing; retain archived record internally.

---

## MVP Scope & Phasing

### Phase 1: MVP (Required for Initial Launch)
- Auth + RBAC (user, maintainer, admin, super admin)
- Offer CRUD + submission workflow
- Maintainer approval queue for user submissions
- Admin CRUD for banks and card types
- Public listing, detail page, core filters
- Auto-expiry lifecycle

**MVP Definition**: end-to-end usable platform where users can discover offers and contribute submissions while maintainers/admins keep data governed and current.

### Phase 2: Enhancements (Post-Launch)
- Favorites/watchlist
- Card comparison view
- Analytics dashboard depth expansion
- Expiry reminders and quality scoring

### Future Considerations
- Recommendation engine based on spend profile
- Automated source verification integrations
- Seasonal campaign management toolkit

---

## Risk Assessment

| Risk | Probability | Impact | Mitigation Strategy |
|------|------------|--------|---------------------|
| Stale/incorrect offers | Med | High | Auto-expiry + source URL requirement in form + maintainer review queue |
| Role abuse / bad moderation | Low | High | Strict RBAC in middleware/server actions + audit fields |
| Taxonomy drift (bank/card naming inconsistency) | Med | Med | Admin-owned master data + constrained selectors |

---

## Dependencies & Blockers

**Dependencies:**
- Auth.js role propagation in JWT/session callbacks
- Drizzle schema migration setup for new entities
- Admin UI patterns for secure CRUD and approvals

**Known Blockers:**
- KPI numeric target values beyond MAU not finalized
- Legal wording of disclaimer may need local review

---

## Appendix

### Glossary
- **RBAC**: Role-Based Access Control
- **MAU**: Monthly Active Users
- **MVP**: Minimum Viable Product

### References
- https://www.mypromo.lk/promotions/banksandcards
- https://authjs.dev/guides/role-based-access-control
- https://authjs.dev/getting-started/session-management/protecting

---

*This PRD was created through iterative requirements gathering and research synthesis to ensure actionable product scope and technical alignment.*
