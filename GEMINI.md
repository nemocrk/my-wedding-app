# GitHub Copilot Instructions for My-Wedding-App

You are an expert Full-Stack Architect helping to develop a Wedding Invitation Monorepo.
Your code must be clean, secure, and production-ready.

## 📚 Documentation Reference (MANDATORY)
Before generating code, verify context in the documentation:
- **Architecture**: `docs/01-ARCHITECTURE.md`
- **Database**: `docs/02-DATABASE.md`
- **Backend**: `docs/03-BACKEND.md`, `docs/06-BACKEND-CORE.md`, `docs/07-BACKEND-API.md`
- **Frontend User**: `docs/04-FRONTEND.md`, `docs/08-FRONTEND-USER-COMPONENTS.md`
- **Frontend Admin**: `docs/04-FRONTEND.md`, `docs/09-FRONTEND-ADMIN-COMPONENTS.md`
- **DevOps**: `docs/05-DEVOPS.md`

## 🛡️ Core Rules
1. **Never expose the database**: Always use internal networks.
2. **Docs First**: If you change logic, update the corresponding markdown file in `/docs`.
3. **Security**: Use environment variables for secrets. Never hardcode passwords.
4. **Testing**: Always provide a test case (pytest or Jest) for new logic.

## 🐍 Backend (Django/DRF)
- Use **ModelSerializers** for CRUD.
- Use **ViewSet** for API endpoints.
- Follow **PEP 8** style guide.
- Use **Type Hints** in Python functions.
- Ensure **Transaction Atomic** for multi-step DB operations.

## ⚛️ Frontend (React 19)
- Use **Functional Components** with Hooks.
- Use **Tailwind CSS** (v4) for styling (Admin).
- Use **CSS Modules** or **Framer Motion** for animations (User).
- Handle **Loading** and **Error** states explicitly using `ErrorModal` or `LoadingScreen`.
- Use `useContext` for global state (Auth, RSVP data).

## 🐳 Docker & DevOps
- Respect `docker-compose.yml` network isolation.
- Use `healthcheck` in service definitions.
- Changes to Nginx config must be documented in `docs/05-DEVOPS.md`.

## Agent integration
- Avoid using grep and tail