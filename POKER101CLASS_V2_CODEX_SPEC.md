# Poker101Class V2 — Codex Master Build Specification

**Purpose:** Authoritative product, design, architecture, and implementation specification for rebuilding Poker101Class into a professional poker dealer training platform while protecting the existing trainer and production access flow.

**Production domain:** `poker101class.com`  
**Production branch:** `main`  
**Development branch:** `dev`  
**Recommended website stack:** Next.js + TypeScript + Tailwind CSS + Vercel  
**Core strategy:** Build the new website shell first. Integrate existing training engines second. Add persistent accounts/progress third. Add commercial features last.

---

## 1. Product Mission

Poker101Class should evolve from a single poker trainer into a professional training platform for:

- dealer-school students
- new poker dealers
- working dealers improving speed and accuracy
- future dealer-school instructors and classes

The platform should ultimately support:

- Poker Dealer Simulator
- Dealer Mental Math
- Hand Reading
- Pot Tracking
- PLO POT Math
- Side Pot Construction
- Betting Rules
- Complete / Incomplete Raise Training
- Short All-In / Reopening Action Training
- Timed Tests
- Performance Tracking
- Audition Mode
- future instructor/classroom accounts

The product philosophy is:

> **Train the exact skills a poker dealer must perform quickly, accurately, and repeatedly at a live table.**

The site must feel like a **professional training application**, not an online casino and not a generic AI-generated landing page.

---

## 2. Non-Negotiable Legacy Trainer Rule

The existing Poker101Class dealer simulator is a **protected legacy training engine**.

During the V2 website build, do **not** refactor, rewrite, rename, reorganize, convert to React, convert to TypeScript, modernize, restyle, or otherwise alter the simulator's internal poker engine unless explicitly instructed.

Build the V2 website **around** it first.

The trainer may contain:

- approved poker logic
- room-specific training rules
- PLO rules
- rake/jackpot logic
- side-pot logic
- hand-reading logic
- minimum-raise logic
- short-all-in behavior
- locked Desktop layout coordinates
- locked Laptop layout coordinates
- DEV Seat Tuner
- DEV Scenario Lab
- regression checks
- custom class training behavior

These are high-risk systems and must not be changed merely to modernize the website.

If the trainer must be moved, move/copy it as an isolated standalone asset without changing runtime behavior.

---

## 3. Repository and Deployment Rules

Before changing code, Codex must inspect the repository and identify:

1. current production entrypoint
2. current framework
3. current `main` branch state
4. current `dev` branch state
5. existing trainer file(s)
6. existing private-access implementation
7. Vercel configuration
8. environment-variable names only
9. current asset/logo locations
10. current routing behavior

Known project conventions:

- `main` = LIVE / production
- `dev` = development / Vercel Preview
- GitHub is connected to Vercel
- production domain is `poker101class.com`

Known support files may include:

- `index.html`
- `access.html`
- `middleware.js`
- `package.json`

Do not delete, replace, or migrate these blindly.

The repository is the source of truth. Do not assume a locally generated file has already been deployed.

Never expose production secrets. If a secret is found, report its existence without printing it.

---

## 4. Git Workflow

All V2 development begins on `dev`.

Do not push V2 directly to `main`.

Recommended workflow:

1. preserve stable `main`
2. work on `dev`
3. use feature branches for risky changes when useful
4. deploy to Vercel Preview
5. test desktop/laptop/mobile
6. verify private access
7. verify trainer launch
8. user reviews preview
9. merge/promote to `main` only after explicit approval

Suggested feature branches:

- `feature/v2-shell`
- `feature/v2-dashboard`
- `feature/mental-math`
- `feature/progress-tracking`

Keep commits focused and reversible.

---

## 5. Recommended V2 Architecture

Use Next.js + TypeScript + App Router + Tailwind CSS for the **new website/application shell**.

Do not use this migration as an excuse to rewrite the trainer.

High-level architecture:

```text
Poker101Class V2
│
├── Marketing Website
│   ├── Home
│   ├── Training
│   ├── How It Works
│   ├── Pricing
│   ├── About
│   ├── FAQ
│   └── Login / Private Beta
│
├── Training Platform
│   ├── Dashboard
│   ├── Dealer Simulator
│   ├── Mental Math
│   ├── Hand Reading
│   ├── PLO Training
│   ├── Side Pots
│   ├── Betting Rules
│   ├── Progress
│   └── Settings
│
└── Protected Legacy Engines
    └── Existing Poker Dealer Simulator
```

---

## 6. Legacy Trainer Integration

The trainer must remain isolated from the new React/Next.js app during initial migration.

Preferred approach:

- preserve trainer as a standalone static route/asset
- launch it from the V2 dashboard
- do not import trainer JS into React
- do not merge its CSS into the main app
- do not rename trainer IDs/functions
- do not change trainer localStorage keys
- do not alter locked coordinates

Possible protected structure after repository audit:

```text
/public/legacy/
  poker-dealer-trainer.html
```

or an equivalent route chosen after inspecting the current repository.

Avoid iframe integration by default. Use an iframe only if direct standalone routing cannot preserve isolation safely.

---

## 7. Public Navigation

Desktop navigation:

**Left:** Poker101Class logo

**Primary links:**

- Training
- How It Works
- Pricing
- About

**Right:**

- Log In
- Start Training

Mobile:

- compact logo
- hamburger menu
- Start Training remains easy to reach

---

## 8. Logged-In Navigation

Primary navigation:

- Dashboard
- Training
- Progress

Account menu:

- Settings
- Account
- Log Out

Training menu:

- Dealer Simulator
- Mental Math
- Hand Reading
- PLO
- Side Pots
- Betting Rules

Production navigation must never expose developer tools.

---

## 9. Route Map

Recommended routes:

```text
/
/training
/how-it-works
/pricing
/about
/faq
/login

/app
/app/training
/app/trainer
/app/mental-math
/app/hand-reading
/app/plo
/app/side-pots
/app/betting-rules
/app/progress
/app/settings
```

The actual legacy trainer session route must be chosen after repository audit.

---

## 10. Homepage — Hero

The homepage must answer within seconds:

1. What is Poker101Class?
2. Who is it for?
3. What can I train?
4. How do I start?

### Headline

> **Train Like a Poker Dealer. Perform Like One at the Table.**

### Supporting copy

> Interactive poker dealer training for pot calculation, hand reading, betting rules, side pots, PLO, and real-table procedure.

### CTAs

Primary:

> **START TRAINING**

Secondary:

> **EXPLORE TRAINING**

### Hero visual

Prefer an actual Poker101Class product screenshot.

Do not use fake casino dashboards, stock gambling photography, or slot-machine visuals as the main hero.

---

## 11. Homepage Credibility Strip

Use concise proof points:

- REAL DEALER SCENARIOS
- INSTANT FEEDBACK
- SPEED TRAINING
- PROGRESS TRACKING

Do not invent user counts, testimonials, endorsements, certifications, partnerships, or success statistics.

---

## 12. Homepage Training Modules

Section heading:

> **Everything You Need to Practice**

Cards:

### Poker Dealer Simulator
Practice complete live-dealer situations.

### Mental Math
Pot calculations, multiplication, betting trails, and speed drills.

### Hand Reading
Identify the correct best five-card hand and winning player.

### Side Pot Training
Practice main pots, side pots, dead money, and all-in situations.

### PLO Training
Practice PLO POT calculations and PLO-specific dealer situations.

### Betting Rules
Practice minimum raises, incomplete raises, short all-ins, and reopening action.

Available module CTA:

> **PRACTICE MODULE**

Unavailable module label:

> **COMING SOON**

Never make unavailable features look active.

---

## 13. Homepage — How It Works

### 1 — Choose a Skill
Select the exact dealer skill to practice.

### 2 — Practice Real Situations
Work through realistic dealer scenarios instead of passive lessons.

### 3 — Get Immediate Feedback
Correct answers continue. Incorrect answers explain what happened and why.

### 4 — Improve Weak Areas
Future progress tracking identifies skills that need more practice.

---

## 14. Homepage Dealer Skills Section

Heading:

> **Train the Skills Dealers Actually Need**

Include:

- Pot tracking
- Rake and jackpot calculations
- Minimum raise calculations
- Side pots
- Hand reading
- PLO POT calculations
- Action order
- Short all-ins
- Complete vs incomplete raises
- Reopening action
- Speed
- Accuracy

Position Poker101Class as dealer training, not poker strategy.

---

## 15. Product Preview Section

Use real screenshots where available:

- Visual Dealer Mode
- Dealer Mental Math
- Hand Reading
- Side Pot Training
- Progress / Performance

Do not fabricate screenshots of features that do not exist.

If a concept is shown, clearly label it as a preview/concept.

---

## 16. Homepage Final CTA

Heading:

> **Ready to Start Training?**

Supporting copy:

> Build speed, accuracy, and confidence before you sit in the box.

CTA:

> **START TRAINING**

Then show FAQ preview and footer.

---

## 17. Footer

Include:

- Poker101Class
- Training
- Pricing
- About
- FAQ
- Login
- Privacy
- Terms
- Contact

Keep it professional and simple.

---

## 18. Login / Private Beta Page

Route:

```text
/login
```

Current beta state:

### Heading

> **Private Beta Access**

### Copy

> Poker101Class is currently available to invited beta testers.

Field:

- Access Code

CTA:

> **CONTINUE**

Secondary:

- Back to Home

Preserve the current working server-side access mechanism during Phase 1 unless explicitly replacing it.

Do not downgrade a server-side gate into a client-side-only password.

Future login design should be ready for email/password without implementing a provider prematurely.

---

## 19. Training Dashboard

Route:

```text
/app
```

This becomes the logged-in home.

### Top section

> **Welcome back**

If no account profile exists yet, do not over-personalize.

### Continue Training

If real history exists, show:

- last module
- last session date
- previous accuracy
- Continue button

If history is not yet implemented, show:

> **Start a Training Session**

Do not fake session history.

### Training Module Cards

- Dealer Simulator
- Mental Math
- Hand Reading
- PLO Training
- Side Pots
- Betting Rules

Each card includes:

- module name
- one-line purpose
- status
- CTA

Statuses:

- AVAILABLE
- BETA
- COMING SOON

---

## 20. Dashboard Performance Snapshot

Phase 3 feature.

When real data exists, show:

- Accuracy
- Average Response Time
- Sessions Completed
- Current Training Streak

Skill breakdown:

- Pot Math
- Hand Reading
- Side Pots
- PLO
- Betting Rules
- Multiplication

Until data exists, use a clean empty state. Never populate fake numbers.

---

## 21. Dealer Simulator Module

Route:

```text
/app/trainer
```

Landing page heading:

> **Poker Dealer Simulator**

Game options should only list games actually present in the integrated trainer, such as:

- $1/$2 NLH
- $1/$2 PLO

Mode cards:

### Real Table Mode
Use physical chips while the simulator controls action and dealer questions.

### Visual Dealer Mode
Practice directly on screen with cards, stacks, bets, and table action.

### Audition Mode
If not ready:

> **COMING SOON**

CTA:

> **BEGIN SESSION**

The session launches the protected legacy simulator.

Do not rewrite the simulator for this page.

---

## 22. Dealer Mental Math Module

Route:

```text
/app/mental-math
```

This module should be mobile-first.

Modes:

- Multiplication Tables 2–12
- PLO ×3
- Triple + Trail
- Make 100
- Rapid Fire
- Timed Test
- Weak Number Training

Required interaction behavior:

- one problem at a time
- large problem display
- large answer input
- Enter submits
- correct answers advance automatically after brief confirmation
- wrong answers show detailed explanation
- wrong explanation remains until DONE
- no calculator
- large touch targets
- no childish game graphics

Performance fields:

- correct
- incorrect
- accuracy
- current streak
- best streak
- average response time
- fastest answer
- slowest answer
- weak facts

Persistent storage belongs to Phase 3 unless explicitly implemented earlier.

---

## 23. Multiplication Training

Tables:

- 2 through 12
- ×1 through ×12

Modes:

- Learn in Order
- Random Quiz
- Speed Challenge
- Perfect Table Test
- Full 2–12 Test

Difficulty:

- Beginner: 2, 5, 10
- Easy: 2, 3, 4, 5, 10
- Intermediate: 6, 7, 8
- Advanced: 9, 11, 12
- Mastery: all tables mixed

Slow/wrong facts should eventually receive more repetition.

---

## 24. PLO ×3 Mental Math Training

Use $5 increments.

Example facts:

- 15 × 3
- 25 × 3
- 35 × 3
- 45 × 3
- 65 × 3
- 75 × 3
- 85 × 3
- 95 × 3
- 125 × 3
- 165 × 3

Preferred teaching method for numbers ending in 5:

```text
85 × 3
80 × 3 = 240
5 × 3 = 15
240 + 15 = 255
```

Include a study/reference table.

---

## 25. Triple + Trail Training

Use the exact room/class training formula supplied by the product owner:

> **POT = Last Bet × 3 + Betting Trail**

Example:

```text
LAST BET: $65
BETTING TRAIL: $85

65 × 3 = 195
195 + 85 = 280

POT = $280
```

Do not silently replace this with a generic poker formula.

If generic PLO rules are added later, clearly separate:

- room/class profile
- generic rules profile

Never mix them invisibly.

---

## 26. Make-100 Addition Training

Teach decomposition.

Example:

```text
195 + 85
195 + 5 = 200
80 remains
200 + 80 = 280
```

Example:

```text
225 + 95
225 + 75 = 300
20 remains
300 + 20 = 320
```

Use realistic dealer amounts in roughly the $100–$500 range.

---

## 27. Hand Reading Module

Route:

```text
/app/hand-reading
```

Modes:

- Practice
- Timed

Flow:

1. Flop
2. Turn
3. River
4. Final winner

Important Hold’em rule:

Compare the best five-card hand. Unused sixth/seventh cards do not break ties.

Wrong feedback should identify:

- exact best five cards
- hand category
- comparison logic
- unused cards when relevant

---

## 28. PLO Training Center

Route:

```text
/app/plo
```

Potential sections:

- POT Math
- Full PLO Dealer Simulator
- $5 Wager Training
- Short All-In Training
- Side Pot Training

Only activate modules that actually exist.

The page may serve as a hub that launches legacy training flows.

---

## 29. Side Pot Training Module

Route:

```text
/app/side-pots
```

Levels:

### Beginner
One side pot.

### Intermediate
One or two side pots.

### Advanced
Multiple all-ins, dead money, uncalled excess, and continued deeper-stack betting.

Progressive construction flow:

1. Main Pot
2. Side Pot 1
3. Side Pot 2
4. Additional side pots if required

Do not reveal every pot at once.

---

## 30. Betting Rules Module

Route:

```text
/app/betting-rules
```

Topics:

- Minimum Raise
- Complete Raise
- Incomplete Raise
- Silent Attempted Under-Raise
- 50% Standard
- Declared Raise
- True Short All-In
- Reopening Action
- Player Already Acted
- Player Not Yet Acted
- Current Wager
- Last Full Raise Increment

Questions should train reasoning, not only arithmetic.

Examples:

- Is the raise complete?
- Must the player complete the raise?
- Is this a call?
- Does betting reopen?
- What can the next player do?
- What can a player who already acted do?
- What is the current wager?
- What is the minimum full raise?

Room/rule-set differences must be explicit.

---

## 31. Progress Page

Route:

```text
/app/progress
```

Phase 3 feature.

Filters:

- 7 Days
- 30 Days
- All Time

Metrics:

- Overall Accuracy
- Average Response Time
- Training Time
- Problems Solved
- Sessions Completed

Skills:

- Multiplication
- PLO ×3
- Pot Math
- Hand Reading
- Side Pots
- Betting Rules

Only show recommendations derived from real user data.

---

## 32. Session Results Pattern

All modules should eventually use a consistent results screen.

Example:

```text
SESSION COMPLETE

22 / 25 Correct

Accuracy: 88%
Average Time: 3.7 sec
Fastest: 1.8 sec
Slowest: 8.2 sec
Best Streak: 14
```

Then:

### Needs More Practice

Examples based on real session data:

- 85 × 3
- 95 × 3
- adding near $200
- side-pot construction

Actions:

- PRACTICE WEAK AREAS
- TRY AGAIN
- BACK TO DASHBOARD

---

## 33. Pricing Page

Route:

```text
/pricing
```

Build the page now, but do not invent final prices.

Beta version:

### Poker101Class Private Beta

> Full access is currently available to invited beta testers.

CTA:

> **REQUEST ACCESS**

Future architecture may support:

- Free
- Poker101 Pro
- Dealer School

Do not add Stripe during Phase 1.

---

## 34. About Page

Route:

```text
/about
```

Heading:

> **Built for People Learning to Deal Poker**

Explain that dealer training requires:

- math
- speed
- procedure
- accuracy
- situational judgment

Poker101Class lets those skills be practiced repeatedly without requiring a full live table.

Keep copy concise.

---

## 35. FAQ Page

Route:

```text
/faq
```

Include questions such as:

### Is Poker101Class for players or dealers?
Primarily poker dealers and dealer-school students.

### Do I need physical chips?
Real Table Mode can be used with physical chips. Visual training does not require them.

### Which games are supported?
Only list currently available games.

### Does it work on mobile?
Marketing pages and Mental Math should be mobile-friendly.

Do not claim the full table simulator is mobile-ready until it actually is.

---

## 36. Settings Page

Route:

```text
/app/settings
```

Future sections:

- Profile
- Training
- Audio
- Appearance
- Data
- Account

Production settings must never expose:

- Seat Tuner
- coordinate controls
- Scenario Lab
- debug flags
- DEV regression controls
- internal engine state

These remain DEV-only.

---

## 37. Visual Direction

Poker101Class should feel like:

> **professional poker education + sports training + premium software**

It should not feel like:

- an online casino
- a sportsbook
- a slot-machine app
- a children’s math game
- a generic AI startup template

Visual principles:

- dark restrained surfaces
- strong whitespace
- highly readable typography
- subtle poker identity
- minimal gradients
- minimal glow
- clean card hierarchy
- consistent spacing
- premium but not flashy

Use poker imagery as supporting context, not wallpaper.

---

## 38. Color System

Recommended starting tokens:

```css
--bg: #0B0F0D;
--surface: #121816;
--surface-2: #18211D;
--border: #28342F;

--text: #F3F5F2;
--text-muted: #AAB4AE;

--brand-green: #1F6B4F;
--brand-green-hover: #2B7D5F;

--brand-gold: #C5A55A;
--brand-gold-muted: #8E7744;

--success: #3AA76D;
--warning: #D1A647;
--danger: #D15C5C;
```

Usage:

- green = primary actions, selection, progress
- gold = restrained premium accent
- red = error/incorrect/destructive only

Do not use neon green as body text.

Do not put glowing gold borders around every card.

---

## 39. Typography

Preferred:

- Geist Sans
- Inter
- system-ui fallback

Avoid decorative casino fonts for normal UI text.

Display/poker typography may be used sparingly in branding only.

---

## 40. Spacing and Layout

Use a consistent spacing scale:

```text
4
8
12
16
24
32
48
64
96
```

Marketing content max width:

- approximately 1200–1280 px

Use narrower line lengths for text-heavy content.

Avoid full-width stretched paragraphs.

---

## 41. Reusable Component System

Create reusable components for:

- Header
- Mobile Navigation
- Footer
- Primary Button
- Secondary Button
- Module Card
- Feature Card
- Stat Card
- Progress Bar
- Page Header
- Empty State
- Coming Soon Badge
- Beta Badge
- Session Summary
- Dialog / Modal
- Tabs
- Form Input
- Select
- Toast / Feedback
- Skeleton Loading
- Error State

Do not duplicate styling across pages.

---

## 42. Button Hierarchy

Primary:

- solid brand green
- high contrast
- clear hover/focus/active state

Secondary:

- neutral surface
- visible border

Tertiary:

- text/link button

Danger:

- red only for destructive actions

Buttons must have mobile-friendly hit areas.

---

## 43. Responsive Design

Marketing pages and the V2 application shell must work at:

- 320 px mobile
- 375 px mobile
- 390/430 px modern iPhone widths
- tablet
- laptop
- desktop
- large desktop

Requirements:

- no essential hover-only behavior
- no page-level horizontal scrolling
- cards stack/reflow intelligently
- navigation collapses cleanly
- large inputs do not overflow mobile

---

## 44. Full Trainer Responsiveness Rule

The website shell must be responsive.

The legacy poker table simulator may remain Desktop/Laptop-first initially.

Do not force the existing locked table coordinates into mobile scaling if that breaks gameplay.

Initial mobile support may be:

- Marketing: supported
- Dashboard: supported
- Mental Math: supported
- Account/Progress: supported
- Full Dealer Simulator: desktop/laptop recommended until dedicated mobile profile exists

Do not claim full simulator mobile support prematurely.

---

## 45. Accessibility

Target WCAG AA where practical.

Required:

- semantic HTML
- keyboard navigation
- visible focus states
- proper form labels
- sufficient contrast
- no color-only correctness indicator
- readable validation text
- `aria-live` for dynamic correctness feedback where useful
- reduced-motion support
- large touch targets
- meaningful alt text

Never remove focus outlines without an accessible replacement.

---

## 46. Motion

Use motion sparingly.

Allowed:

- subtle card entrance
- menu transitions
- button feedback
- progress updates
- brief correct/incorrect transitions

Avoid:

- constant pulsing
- casino-like flashing
- spinning chips for decoration
- excessive glow
- distracting animated backgrounds

Respect `prefers-reduced-motion`.

---

## 47. Content Tone

Voice:

- concise
- professional
- instructional
- confident
- dealer-focused
- non-hype

Avoid:

- “Become a poker master overnight”
- “Crush the casino”
- fake urgency
- unsupported claims
- fake statistics

Preferred vocabulary:

- Train
- Practice
- Improve
- Accuracy
- Speed
- Procedure
- Dealer Skills
- Real Scenarios
- Immediate Feedback

---

## 48. SEO

Public pages should include:

- meaningful page title
- meta description
- canonical URL
- Open Graph metadata
- logical heading hierarchy
- sitemap
- robots.txt

Training/private pages may be noindex where appropriate.

Do not expose gated beta content to search engines if it is meant to remain private.

---

## 49. Performance

Requirements:

- minimize client JS on marketing pages
- optimize images
- responsive image sizes
- lazy-load noncritical screenshots
- no huge background video
- do not load legacy trainer on homepage
- load training engines only when requested

The legacy trainer must not become part of the main Next.js bundle.

---

## 50. Security

Never expose:

- access-code secrets
- session signing secrets
- credentials
- private environment values

Do not convert server-side authorization into client-side-only checks.

Do not rotate production secrets automatically without authorization.

If a secret is found in source history, report the risk without printing the secret.

---

## 51. Private Beta Protection

Phase 1 must preserve the working beta gate unless explicitly replacing it.

Acceptance requirements:

- unauthenticated users cannot bypass protection via client-side routing
- protected app routes remain protected
- legacy trainer does not accidentally become publicly accessible if beta access is intended

Verify after migration.

---

## 52. Data Architecture — Phase 3

Do not force a backend choice during Phase 1.

When accounts/progress are approved, likely entities include:

### User

- id
- email
- displayName
- createdAt
- status/plan

### TrainingSession

- id
- userId
- module
- mode
- startedAt
- completedAt
- score
- correct
- incorrect
- accuracy
- averageResponseMs
- fastestResponseMs
- slowestResponseMs

### TrainingAttempt

- id
- sessionId
- skill
- problemKey
- promptData
- answer
- correctAnswer
- wasCorrect
- responseMs

### SkillProgress

- userId
- skill
- attempts
- correct
- accuracy
- averageResponseMs
- masteryScore
- lastPracticedAt

Select the actual backend/auth stack at the beginning of Phase 3.

---

## 53. Weak-Area Recommendation Engine — Future

Start deterministic, not AI-heavy.

Possible rules:

- accuracy below target → increase frequency
- response time above target → increase frequency
- repeated misses → spaced repetition
- long time since practice → refresher
- mastered facts → reduce frequency

Do not add AI complexity where simple rules are sufficient.

---

## 54. Phase Plan

### Phase 0 — Repository Audit

Deliver:

- current architecture summary
- repository tree
- legacy trainer location
- private-access flow
- Vercel setup
- risk list
- migration proposal

No destructive changes.

### Phase 1 — Professional Website Shell

Build:

- Next.js/TypeScript/Tailwind shell
- Homepage
- Public navigation
- Footer
- Training overview
- How It Works
- Pricing beta page
- About
- FAQ
- Private Beta/Login page
- Dashboard shell
- Training module cards
- responsive design
- design system

Do not rewrite the simulator.

### Phase 2 — Training Integration

Integrate:

- Dealer Simulator
- Mental Math
- Hand Reading

Keep legacy trainer isolated.

### Phase 3 — Accounts + Progress

Implement:

- user accounts
- persistent sessions
- accuracy
- response time
- weak-area tracking
- progress page
- recommendations

### Phase 4 — Commercial Product

Potential:

- subscriptions
- billing
- Free/Pro tiers
- dealer-school accounts
- instructor dashboards
- classroom features
- advanced Audition Mode
- dedicated mobile simulator

---

## 55. Phase 1 Out of Scope

Do not implement during Phase 1 unless explicitly requested:

- Stripe
- subscriptions
- instructor accounts
- school dashboards
- AI tutoring
- complete trainer refactor
- React conversion of simulator
- new poker-game engine
- mobile rewrite of full poker table
- complex backend
- social features
- chat
- leaderboards

Focus first on making the platform professional and navigable.

---

## 56. DEV-Only Requirements

DEV may retain:

- Seat Tuner
- Scenario Lab
- Audition testing
- regression helpers
- layout profile forcing
- debug output

Production must not expose these unless explicitly approved.

When integrating a DEV trainer file, verify the production version does not accidentally inherit DEV tools.

---

## 57. Locked Trainer Layouts

Approved Desktop and Laptop layouts are locked.

Do not:

- shift seats
- change table dimensions
- rescale seat positions globally
- alter card anchors
- alter wager positions
- alter dealer-button positions

unless explicitly instructed.

Gameplay changes must not silently change layout profiles.

---

## 58. Poker Logic Preservation

Website work must not change poker outcomes.

Protected logic categories include:

- Hold’em best-five comparison
- PLO POT calculations
- room/class PLO rules
- side-pot construction
- short all-ins
- minimum raises
- rake
- jackpot
- action order
- showdown
- hand reading

---

## 59. Testing Requirements

Before presenting a V2 preview, run:

### Build / static checks

- install succeeds
- typecheck
- lint
- production build
- no build errors

### Browser checks

- homepage
- desktop nav
- mobile nav
- login/private beta
- dashboard
- training cards
- legacy trainer launch
- back/return flow
- 404
- major error states

### Viewports

At minimum:

- 390×844
- 768×1024
- 1366×768
- 1440×900
- 1920×1080

### Accessibility

- keyboard navigation
- focus visibility
- labels
- contrast
- responsive text
- reduced motion

Do not claim browser testing unless it was actually performed.

---

## 60. Legacy Trainer Regression Check

Before and after integration verify:

- trainer loads
- main menu loads
- expected games appear
- Real Table Mode launches
- Visual Dealer Mode launches
- settings work
- no immediate JS errors
- table layout remains unchanged
- localStorage-dependent behavior still works
- private access protects route when required

If DEV:

- Seat Tuner remains available
- Scenario Lab remains available
- Audition remains testable if intentionally enabled

---

## 61. Phase 1 Acceptance Criteria

Phase 1 is complete only when:

1. Site looks like a professional training platform.
2. Homepage clearly explains Poker101Class.
3. Mobile navigation works.
4. Public pages are responsive.
5. Dashboard exists.
6. Training modules are organized clearly.
7. Available vs Coming Soon is truthful.
8. Private beta access still works.
9. Legacy trainer still works.
10. Legacy trainer was not unnecessarily rewritten.
11. DEV and LIVE remain separate.
12. No secrets are exposed.
13. Build passes.
14. Lint/typecheck pass.
15. No obvious console errors.
16. Vercel Preview is reviewed before production merge.

---

## 62. Visual Acceptance Criteria

Reject the design if it looks like:

- a gambling affiliate site
- a cryptocurrency dashboard
- a slot machine
- a children’s math game
- a generic SaaS template with poker icons pasted onto it

Accept it when it feels like:

- premium training software
- modern
- disciplined
- highly readable
- easy for older users to understand
- poker-specific without clutter

---

## 63. Copy Accuracy Rules

Do not claim:

- thousands of users
- partnerships
- certifications
- dealer-school endorsements
- guaranteed job placement
- guaranteed audition success
- features that are not live
- “official” universal rules where room rules differ

Use truthful labels:

- Beta
- Coming Soon
- In Development

---

## 64. Error / Empty States

Examples:

### No Training History

> Complete your first training session to begin tracking progress.

### Module Coming Soon

> This training module is currently in development.

### No Recommendation Yet

> Complete more practice sessions to unlock personalized recommendations.

Never display fake performance numbers to make the dashboard appear populated.

---

## 65. Branding Assets

During implementation:

1. inspect repository for current Poker101Class logo/assets
2. reuse approved assets where appropriate
3. do not invent a completely new logo without approval
4. optimize image formats
5. preserve transparent originals

If no complete brand system exists, use the V2 design tokens without permanently redesigning the logo.

---

## 66. Screenshot Rule

Prefer screenshots of the actual product.

Do not imply nonexistent functionality using fake screenshots.

If a concept image is used, label it as a concept/preview.

---

## 67. Code Quality Requirements

- TypeScript strict where practical
- reusable components
- clear feature folders
- no giant all-purpose component files
- no unused dependencies
- no large uncontrolled CSS dump
- no unnecessary global-state library
- no premature abstraction
- no duplicated page structures
- descriptive naming
- comments around non-obvious legacy integration constraints

---

## 68. Proposed Folder Structure

Example only; adjust after repository audit:

```text
app/
  (marketing)/
    page.tsx
    training/page.tsx
    how-it-works/page.tsx
    pricing/page.tsx
    about/page.tsx
    faq/page.tsx
  login/page.tsx
  app/
    layout.tsx
    page.tsx
    training/page.tsx
    trainer/page.tsx
    mental-math/page.tsx
    hand-reading/page.tsx
    plo/page.tsx
    side-pots/page.tsx
    betting-rules/page.tsx
    progress/page.tsx
    settings/page.tsx

components/
  marketing/
  app/
  training/
  ui/

lib/
  constants/
  data/
  utils/

public/
  brand/
  screenshots/
  legacy/

styles/
```

---

## 69. First Codex Execution Instruction

When this specification is first supplied to Codex, **do not immediately rebuild the repository**.

First perform **Phase 0 — Repository Audit**.

Return:

1. current repository structure
2. current framework
3. current production entrypoint
4. current Vercel configuration
5. current private-access implementation
6. current trainer location
7. files that must be protected
8. migration risks
9. proposed V2 folder structure
10. step-by-step Phase 1 implementation plan

Then wait for approval before making large structural changes.

---

## 70. Codex Working Behavior

For every major task:

1. state what will change
2. list affected files
3. list protected files that will not change
4. implement the smallest coherent change
5. run relevant tests
6. report test results
7. note unresolved risks
8. do not claim browser testing unless performed
9. keep DEV separate from production
10. never silently deploy to `main`

---

## 71. Final Product Goal

Poker101Class V2 should make a first-time visitor think:

> **“This is a real poker dealer training platform.”**

After logging in:

> **“There are specific skills here that I can practice.”**

After repeated sessions:

> **“The platform shows me what I need to improve.”**

The website is not the product by itself.

The product is:

> **Structured, repeatable poker dealer skill training.**

The V2 website must make that product easy to understand, easy to navigate, and professional enough to support future paid subscriptions and dealer-school use without risking the existing trainer engine.

---

## 72. Master Instruction to Codex

Use this specification as the authoritative V2 product/build plan.

When repository reality conflicts with an assumption in this document:

1. do not guess
2. inspect the repository
3. explain the conflict
4. recommend the safest implementation
5. preserve working production behavior
6. wait for approval before destructive migration

Priority order:

1. **Do not break the working trainer**
2. **Do not break private access**
3. **Do not expose secrets**
4. **Keep DEV and LIVE separate**
5. **Build a professional responsive website shell**
6. **Integrate existing training modules safely**
7. **Add progress/accounts later**
8. **Add commercial features last**
