# Wander PRD

Version: 0.2
Date: June 13, 2026
Status: Working PRD for initial implementation
Owner: Preetham

## 1. Product Summary

Wander is a modern app for serendipitous web discovery.

It brings back the feeling of tapping once and landing somewhere unexpectedly wonderful, while using modern personalization, curation, and a polished mobile-first interface to keep discoveries high-signal instead of random noise.

Core promise:

> Wander into wonder.

One tap. Beautiful discovery. Growing personalization that still leaves room for surprise.

## 2. Positioning

Wander sits between StumbleUpon-style randomness, Product Hunt-style curation, and algorithmic social feeds.

It is not a passive feed. It is an intentional discovery loop: open the app, tap Wander, get one great destination, react, optionally save or visit, then continue.

Wander should feel:

- Fast and effortless
- Curious and joyful
- Curated, not spammy
- Personal, but not trapped in a filter bubble
- Useful enough to save discoveries, not just consume them

## 3. Problem

The modern internet is full of interesting places, but discovery has become fragmented and exhausting. Social feeds optimize for engagement, search requires intent, and curated directories often feel static. People who want inspiration, useful tools, weird internet gems, creative projects, essays, demos, and niche websites do not have a simple daily habit for finding them.

Wander solves this by giving users a fast, delightful discovery loop backed by a curated catalog and lightweight personalization.

## 4. Target Users

### Primary Persona: Curious Explorer

Curious Explorers are creative, technical, or intellectually restless people who like finding interesting things online. They may use Reddit, Hacker News, Product Hunt, X, personal blogs, newsletters, or saved-link tools, but they want something lighter and more magical than searching or scrolling.

Typical motivations:

- Find inspiration
- Kill a few minutes without doomscrolling
- Discover tools, projects, essays, art, references, and oddities
- Save useful things for later

### Secondary Personas

- Power discoverer: saves many links, organizes collections, submits links.
- Casual browser: opens Wander when bored or seeking a quick spark.
- Creator / curator: submits interesting destinations and wants recognition later.

## 5. Product Principles

- One discovery at a time: avoid becoming another infinite feed.
- Quality over quantity: catalog trust matters more than catalog size.
- Surprise with control: personalization should help, but serendipity is part of the product.
- Actions teach the system: Love, Skip, Save, Visit, and time spent should improve recommendations.
- Curation is a product surface: ingestion, review, enrichment, and quality scoring are first-class systems.
- Ship the loop first: the MVP exists to prove that the core discovery loop feels good.

## 6. MVP Scope

The MVP is a deployable web/PWA prototype that proves the core Wander loop with a small, curated catalog.

### In Scope

- Basic account system
- Lightweight onboarding with interest selection
- Seeded destination catalog
- Wander action that returns one preview card at a time
- Preview card with title, description, image/screenshot, tags, source, and actions
- Love, Skip, Save, and Visit interactions
- Default Saved collection
- Basic history
- Simple tag-weighted recommendation logic
- Admin-only seed/import path for destinations
- Basic internal moderation/status fields for catalog items
- Basic analytics event capture for product learning

### Out of Scope for MVP

- Public user submissions
- Social profiles, following, comments, or public collections
- Advanced AI sidebar
- Premium subscriptions
- Native mobile apps
- Full crawler infrastructure
- Sophisticated embeddings-based recommender
- Push notifications
- Multi-collection management beyond a default Saved collection

## 7. MVP User Experience

### Onboarding

Goal: get the user to their first discovery in under 60 seconds.

Flow:

1. User lands on Wander.
2. User creates an account or signs in.
3. User selects interests from a short list of chips.
4. User may choose Surprise Me to skip detailed setup.
5. User lands on the main Wander screen.

Initial interest tags:

- Technology
- Design
- Science
- Art
- Creative Tools
- Productivity
- Learning
- Weird Internet
- Indie Web
- Writing
- Games
- Culture

### Core Wander Loop

Flow:

1. User opens the home screen.
2. User taps the primary Wander action.
3. App displays a destination preview card.
4. User chooses one of the main actions:
   - Love: strong positive signal and advances or keeps card depending on UI.
   - Skip: negative signal and advances to the next card.
   - Save: adds destination to Saved.
   - Visit: opens destination in an in-app viewer or new browser tab.
5. User can continue wandering.

Preview card must show:

- Hero image or screenshot
- Destination title
- Short hook or description
- Tags
- Source domain
- Visit action
- Love, Skip, and Save controls

### Saved

MVP includes one default Saved collection.

Users can:

- Save a destination from the preview card
- View saved destinations
- Reopen a saved destination
- Remove a saved destination

### History

Users can view recent destinations they have seen, including skipped and visited items.

History is useful for recovery: "what was that site I saw earlier?"

## 8. Curation Engine

The curation engine is the system that keeps Wander from becoming random, stale, or low quality.

For MVP, the curation engine should be simple but structurally real. It should support manual seeding, enrichment fields, approval status, and recommendation inputs.

### Catalog Object

Each destination should include:

- Canonical URL
- Domain
- Title
- Short description / hook
- Optional longer summary
- Hero image or screenshot URL
- Tags
- Source type
- Quality score
- Status
- Content flags
- Created timestamp
- Updated timestamp
- Last checked timestamp

Recommended status values:

- draft
- approved
- rejected
- needs_review
- archived

Recommended source types:

- seed
- admin_import
- user_submission
- api_ingestion

### MVP Catalog Strategy

Start with a manually reviewed seed catalog of 500 to 2,000 destinations.

Seed sources should prioritize evergreen and delightful content:

- Excellent personal sites and blogs
- Creative coding projects
- Indie tools
- Educational explainers
- Public demos and experiments
- Design references
- Useful directories
- High-quality open-source project pages

Avoid for MVP:

- Time-sensitive news
- Paywalled articles
- Thin affiliate content
- Aggressive SEO pages
- NSFW content
- Broken or heavily gated pages
- Content that depends on scraping private or restricted sources

### AI-Assisted Enrichment

AI enrichment is allowed in MVP only as an internal helper, not as a product-critical dependency.

Useful enrichment outputs:

- Short hook
- Suggested tags
- Summary
- Quality notes
- Safety/moderation hints

Human review remains the quality gate for seeded MVP catalog items.

## 9. Recommendation Logic

MVP recommendations should be understandable and easy to change.

Initial scoring inputs:

- User onboarding interests
- Destination tags
- Destination quality score
- User interactions: Love, Skip, Save, Visit
- Previously seen destinations

Basic behavior:

- Do not show the same destination repeatedly.
- Prefer approved destinations.
- Prefer destinations matching selected interests.
- Mix in some high-quality destinations outside selected interests.
- Down-rank tags and domains the user repeatedly skips.
- Up-rank tags and domains the user loves or saves.

MVP does not require embeddings. The data model should leave room for embeddings later.

## 10. Data Model

Core entities:

- User
- Destination
- Tag
- UserInterest
- Interaction
- SavedDestination
- Collection
- CatalogImport

### Interaction Types

- viewed
- loved
- skipped
- saved
- unsaved
- visited
- reported

### Collection Model

MVP requires a default Saved collection per user.

The model should support named collections later, but the UI does not need to expose multi-collection management in MVP.

## 11. Analytics

Track enough events to understand whether the discovery loop is working.

MVP events:

- account_created
- onboarding_completed
- wander_requested
- destination_viewed
- destination_loved
- destination_skipped
- destination_saved
- destination_unsaved
- destination_visited
- session_started

Key MVP metrics:

- Activation: percent of users who complete onboarding and view at least 5 destinations
- Engagement: average destinations viewed per session
- Quality: love rate, save rate, visit rate, skip rate
- Retention: D1 and D7 return rate
- Catalog health: approved destination count, broken destination count, average quality score

## 12. Non-Functional Requirements

- Performance: Wander action should feel instant; target under 1 second after initial load when possible.
- Reliability: broken destinations should be easy to flag and remove.
- Privacy: users must be able to understand what behavior is tracked.
- Accessibility: target WCAG 2.1 AA.
- Security: authenticate protected user data; avoid exposing admin import/moderation surfaces to normal users.
- Portability: design for a monorepo with independent app, backend, and shared package boundaries.
- Extensibility: recommendation, enrichment, and catalog review logic should be replaceable without rewriting the app.

## 13. Suggested Monorepo Deliverables

Initial repository shape:

```text
apps/
  web/
packages/
  shared/
  config/
docs/
  decisions/
  research/
PRD.md
```

MVP deliverables:

- Web/PWA app
- Backend/API layer
- Database schema and migrations
- Seed catalog ingestion script
- Admin-only catalog management path
- Recommendation service v0
- Event tracking pipeline v0
- Basic deployment setup
- Product analytics dashboard or queryable event table

Technology choices are intentionally not locked by this PRD. Choose based on implementation speed, maintainability, and fit with the eventual app architecture.

## 14. Roadmap

### Phase 0: Product Foundation

- Finalize PRD
- Initialize repository
- Decide initial technical stack
- Define schema
- Create initial seed catalog format
- Define catalog quality guidelines

### Phase 1: MVP Core Loop

- Auth
- Onboarding
- Destination catalog
- Wander flow
- Preview cards
- Love, Skip, Save, Visit
- Saved and History
- Tag-weighted recommendation logic
- Basic analytics
- Deployable web/PWA prototype

Success criteria:

- A new user can sign up, select interests, and view at least 10 destinations in one session.
- Preview cards feel fast and polished.
- User actions are recorded.
- Saved and History work reliably.
- The catalog contains at least 500 approved destinations before meaningful external testing.

### Phase 2: Curation Engine v1

- User submission flow
- Metadata fetching
- Screenshot generation
- AI-assisted enrichment
- Review queue
- Reporting flow
- Quality scoring improvements
- Catalog grows to 5,000+ approved destinations

### Phase 3: Personalization v1

- Better recommendation scoring
- Optional embeddings
- More like this
- Less of this tag/domain
- Serendipity control
- Explanation text such as "because you liked creative tools"

### Phase 4: Polish and Retention

- Improved transitions and animations
- Dark mode
- Better empty states
- Notification strategy
- Mobile app evaluation
- Accessibility audit

### Phase 5: Community

- Public collections
- Curator profiles
- Follow topics or curators
- Submission reputation
- Community picks

### Phase 6: Monetization and Advanced Workflows

- Premium tier exploration
- Export and advanced organization
- Sponsorship experiments
- Agent/workspace integrations
- Advanced curation analytics

## 15. Risks and Mitigations

### Low Catalog Quality

Mitigation: seed manually, keep the catalog small at first, require approval status, and track quality signals from day one.

### Recommendations Become Boring

Mitigation: include exploration outside selected interests and later expose serendipity controls.

### MVP Scope Creep

Mitigation: ship one excellent discovery loop before building community, submissions, AI sidebars, or monetization.

### Legal or Scraping Issues

Mitigation: prioritize manually curated sources, user submissions, official APIs, RSS feeds, and respectful public data. Avoid aggressive crawling.

### Moderation Burden

Mitigation: keep submissions out of MVP, add review queues before opening community growth, and use AI only as assistance rather than automatic trust.

## 16. Open Decisions

These should be resolved before implementation starts:

- Technical stack for the monorepo
- Auth provider
- Database
- Hosting/deployment target
- Whether MVP Visit opens an in-app viewer, external tab, or both
- Initial seed catalog format
- Quality score formula v0
- Analytics provider or internal event table

## 17. Current Product Decisions

- Product name is Wander, not Wanderly.
- MVP target is web/PWA first.
- MVP uses a curated seed catalog, not open submissions.
- MVP personalization is tag-weighted, not embeddings-first.
- MVP includes one default Saved collection.
- Curation, recommendation, and app UI should be designed as separate concerns from the beginning.
