# WorkPlan Backend API

A Node.js/Express backend API for the WorkPlan personnel planning application.

## Features

- **Authentication**: JWT-based authentication for companies and employees
- **Company Management**: Register companies, manage settings
- **Employee Management**: Add, update, delete employees with vacation tracking
- **Project Management**: Create projects with favorite employee assignments and priorities
- **Schedule Generation**: Automatic scheduling based on employee availability and project preferences
- **Database**: MongoDB with Mongoose ODM

## Prerequisites

- Node.js (v14 or higher)
- MongoDB (local or cloud instance)

## Installation

1. Clone the repository
2. Navigate to the backend directory
3. Install dependencies:
   ```bash
   npm install
   ```

4. Copy environment variables:
   ```bash
   cp .env.example .env
   ```

5. Update `.env` with your configuration:
   - `PORT`: Server port (default: 3001)
   - `MONGODB_URI`: MongoDB connection string
   - `JWT_SECRET`: Secret key for JWT tokens

6. Start MongoDB service

7. Start the server:
   ```bash
   npm start
   ```

For development with auto-restart:
```bash
npm run dev
```

## API Endpoints

### Authentication
- `POST /api/auth/register` - Register a new company
- `POST /api/auth/login` - Login for companies and employees
- `GET /api/auth/me` - Get current user info

### Companies
- `GET /api/companies` - Get company data (admin only)
- `PUT /api/companies/settings` - Update company settings

### Employees
- `GET /api/employees` - Get all employees (admin only)
- `POST /api/employees` - Add new employee
- `PUT /api/employees/:id` - Update employee
- `DELETE /api/employees/:id` - Delete employee
- `POST /api/employees/:id/vacations` - Add vacation
- `GET /api/employees/:id/vacations` - Get employee vacations
- `DELETE /api/employees/:id/vacations/:vacationId` - Delete vacation

### Projects
- `GET /api/projects` - Get all projects (admin only)
- `POST /api/projects` - Add new project
- `PUT /api/projects/:id` - Update project
- `DELETE /api/projects/:id` - Delete project
- `POST /api/projects/:id/favorites` - Add favorite employee
- `PUT /api/projects/:id/favorites/:employeeId` - Update priority
- `DELETE /api/projects/:id/favorites/:employeeId` - Remove favorite

### Schedule
- `GET /api/schedule/generate` - Generate automatic schedule

## Authentication

Include the JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Data Models

### Company
- code: Unique company code
- name: Company name
- email: Admin email
- password: Hashed password
- employees: Array of employee IDs
- projects: Array of project IDs
- settings: Max hours and min rest settings

### Employee
- name: Employee name
- email: Employee email
- referralCode: Unique login code
- tempPassword: Temporary password (hashed)
- company: Reference to company
- vacations: Array of vacation periods

### Project
- name: Project name
- company: Reference to company
- favoriteEmployees: Array of favorite employees with priorities

## Testing

Run tests with:
```bash
npm test
```

## License

MIT