## Architecture

- Backend: Node.js + Express
- Frontend: React (functional components only)
- Database: PostgreSQL

- Follow clean architecture:
  - controllers → services → repositories → db
- No business logic inside controllers
- All logic must live in services