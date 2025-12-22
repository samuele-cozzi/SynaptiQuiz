# SynaptiQuiz

A modern, multiplayer quiz game application built with Next.js, featuring role-based access control, comprehensive content management, and real-time gameplay.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-blue)
![Prisma](https://img.shields.io/badge/Prisma-7-2D3748)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-18-336791)

## ✨ Features

### 🔐 Authentication & Authorization
- **Multiple Login Methods**: Guest, Credentials, Google OAuth
- **Role-Based Access**: ADMIN, EDITOR, PLAYER with granular permissions
- **Secure**: bcrypt password hashing, JWT sessions

### 🎨 User Experience
- **Responsive Design**: Mobile-first with glassmorphism effects
- **Theme Support**: Light/Dark mode with persistence
- **Internationalization**: English and Italian languages
- **Modern UI**: Gradient backgrounds, smooth animations, intuitive navigation

### 📊 Content Management

#### Topics Management (Admin/Editor)
- Create, edit, delete quiz topics
- Optional image URLs for visual appeal
- Search functionality

#### Questions Management (Admin/Editor)
- Create questions with 4 answers (1 correct)
- Advanced filtering by text, topic, difficulty (1-5), language
- Plausibility scoring (0-100%) for each answer
- Validation ensures exactly one correct answer

#### Players Management (Admin Only)
- View all users with avatars
- Edit user roles
- Delete users (with protections)
- Filter by name and role
- Distinguishes guest vs registered users

#### Games Management (Admin/Editor)
- **Create Games**: Select players and questions with validation
- **Duplicate Games**: Copy existing games with current user preselected
- **Filter Games**: By name, status (CREATED/STARTED/ENDED), language
- **Smart Validation**: Questions count must be divisible by player count
- **Role-Based Access**: Users only see games they're part of

### 🎮 Gameplay (Coming Soon)
- Turn-based question selection
- Answer submission with scoring
- Difficulty-based points (10/20/50/100/150)
- Real-time leaderboards
- Game completion tracking

## 🚀 Quick Start

### Prerequisites
- Node.js 20+
- Docker & Docker Compose (for local database)
- PostgreSQL (or use Docker)

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd synaptiquiz
```

2. **Install dependencies**
```bash
npm install
```

3. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env`:
```env
DATABASE_URL="postgresql://postgres:password@localhost:5432/synaptiquiz"
NEXTAUTH_SECRET="your-secret-key-here"
NEXTAUTH_URL="http://localhost:3000"

# Optional: Google OAuth
GOOGLE_CLIENT_ID=""
GOOGLE_CLIENT_SECRET=""
NEXT_PUBLIC_GOOGLE_AUTH_ENABLED="false"
```

4. **Start the database**
```bash
docker-compose up -d
```

5. **Run migrations**
```bash
npx prisma migrate dev
```

6. **Generate Prisma Client**
```bash
npx prisma generate
```

7. **Start the development server**
```bash
npm run dev
```

8. **Open your browser**
Navigate to [http://localhost:3000](http://localhost:3000)

## 📁 Project Structure

```
synaptiquiz/
├── prisma/
│   ├── schema.prisma              # Database schema
│   └── migrations/                # Migration history
├── src/
│   ├── app/
│   │   ├── api/                   # API routes
│   │   ├── auth/                  # Authentication pages
│   │   ├── dashboard/             # Dashboard pages
│   │   ├── layout.tsx             # Root layout
│   │   └── providers.tsx          # Context providers
│   ├── contexts/
│   │   └── ThemeContext.tsx       # Theme management
│   └── lib/
│       ├── auth.ts                # NextAuth configuration
│       ├── prisma.ts              # Prisma client
│       └── i18n/                  # Internationalization
├── public/
│   └── manifest.json              # PWA manifest
├── docker-compose.yml             # Database container
└── package.json
```

## 🗄️ Database Schema

- **User**: Authentication, roles, profiles
- **Topic**: Question categories
- **Question**: Quiz questions with difficulty
- **Answer**: 4 answers per question with plausibility
- **Game**: Game instances with status tracking
- **GamePlayer**: Player participation and scores
- **GameQuestion**: Question assignment to games
- **PlayerAnswer**: Answer tracking for scoring

## 🔧 Development

### Database Management

**View database in Prisma Studio:**
```bash
npx prisma studio
```

**Create a new migration:**
```bash
npx prisma migrate dev --name migration_name
```

**Reset database:**
```bash
npx prisma migrate reset
```

### Code Quality

**Type checking:**
```bash
npm run type-check
```

**Linting:**
```bash
npm run lint
```

## 📦 Deployment

### Option 1: Vercel + Supabase

1. Create a Supabase project and get the database URL
2. Deploy to Vercel
3. Add environment variables in Vercel dashboard
4. Run migrations: `npx prisma migrate deploy`

### Option 2: Docker (Self-Hosted)

See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

## 🎯 User Roles

### ADMIN
- Full access to all features
- Manage all users, topics, questions, and games
- Delete any content

### EDITOR
- Create and manage topics and questions
- Create and manage own games
- Cannot manage users

### PLAYER
- View and play assigned games
- View own statistics
- Cannot create or manage content

## 🌐 Internationalization

Currently supported languages:
- 🇬🇧 English (en)
- 🇮🇹 Italian (it)

To add a new language:
1. Add translations to `src/lib/i18n/locales.json`
2. Update language selector in Options page

## 🎨 Theming

The application supports light and dark themes with:
- CSS variables for easy customization
- Persistent user preference
- System preference detection
- Smooth transitions

## 📝 Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `DATABASE_URL` | Yes | PostgreSQL connection string |
| `NEXTAUTH_SECRET` | Yes | Secret for NextAuth.js (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Yes | Base URL of your application |
| `GOOGLE_CLIENT_ID` | No | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | No | Google OAuth client secret |
| `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED` | No | Enable Google OAuth (`true`/`false`) |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License.

## 🙏 Acknowledgments

- [Next.js](https://nextjs.org/) - React framework
- [Prisma](https://www.prisma.io/) - Database ORM
- [NextAuth.js](https://next-auth.js.org/) - Authentication
- [Tailwind CSS](https://tailwindcss.com/) - Styling
- [Lucide Icons](https://lucide.dev/) - Icon library
- [DiceBear](https://dicebear.com/) - Avatar generation

## 📞 Support

For issues and questions, please open an issue on GitHub.

---

**Status**: ✅ Management System Complete | 🚧 Gameplay Coming Soon

Built with ❤️ using Next.js and TypeScript
