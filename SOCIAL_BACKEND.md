# Social Features - Backend Implementation

## Database Schema (Prisma + SQLite)

### Tables Created:
- **users** - User accounts with auth, XP, level, streaks
- **friends** - Bidirectional friendship relationships
- **friend_requests** - Pending friend requests
- **shared_decks** - Public/private word decks
- **deck_memberships** - User-deck membership with roles
- **deck_words** - Words in shared decks
- **word_reviews** - Spaced repetition tracking

### API Endpoints:

#### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login
- `GET /api/auth/me` - Get current user
- `PATCH /api/auth/profile` - Update profile

#### Friends
- `GET /api/friends` - Get friends & requests
- `POST /api/friends/request` - Send friend request
- `POST /api/friends/respond` - Accept/decline request

#### Decks
- `POST /api/decks` - Create new deck
- `GET /api/decks/list` - List public & user decks
- `POST /api/decks/join` - Join a deck
- `GET /api/decks/:id/words` - Get deck words
- `POST /api/decks/:id/words` - Add word to deck

#### Reviews
- `POST /api/reviews` - Record word review (spaced repetition)
- `GET /api/stats` - Get analytics & leaderboard

## Components
- `SocialTab.tsx` - Main social interface
- `AuthModal.tsx` - Login/Register modal

## To Run Locally
1. Database is auto-created at `dev.db` (SQLite)
2. Start server: `bun run dev`
3. Sign up at the Social tab

## Migration to Production
Replace SQLite with PostgreSQL by changing `schema.prisma`:
```prisma
datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}
```

Then run:
```bash
npx prisma migrate dev
```
