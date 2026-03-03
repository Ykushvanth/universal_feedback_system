# Feedback System - Frontend

A modern React-based frontend for the Feedback Management System that allows administrators to create and manage feedback forms, and students to submit responses.

## Tech Stack

- **React** 19.2.4 - JavaScript library for building user interfaces
- **React Router DOM** 6.20.0 - Routing library for React
- **Axios** 1.6.2 - Promise-based HTTP client
- **React Toastify** 9.1.3 - Toast notifications
- **React Icons** 5.0.1 - Icon library
- **Recharts** 2.5.0 - Charting library for analytics
- **React Beautiful DnD** 13.1.1 - Drag and drop functionality (optional)

## Project Structure

```
frontend/
├── public/
│   ├── index.html
│   ├── manifest.json
│   └── robots.txt
├── src/
│   ├── components/
│   │   └── ProtectedRoute/
│   │       ├── ProtectedRoute.js
│   │       └── ProtectedRoute.css
│   ├── config/
│   │   ├── api.js           # API base URL configuration
│   │   └── axios.js         # Axios instance with interceptors
│   ├── context/
│   │   └── AuthContext.js   # Authentication context provider
│   ├── pages/
│   │   ├── Login/
│   │   │   ├── Login.js
│   │   │   └── Login.css
│   │   ├── Signup/
│   │   │   ├── Signup.js
│   │   │   └── Signup.css
│   │   ├── Dashboard/
│   │   │   ├── Dashboard.js
│   │   │   └── Dashboard.css
│   │   ├── CreateForm/
│   │   │   ├── CreateForm.js
│   │   │   └── CreateForm.css
│   │   ├── StudentForm/
│   │   │   ├── StudentForm.js
│   │   │   └── StudentForm.css
│   │   ├── FormResponses/
│   │   │   ├── FormResponses.js
│   │   │   └── FormResponses.css
│   │   └── FormAnalysis/
│   │       ├── FormAnalysis.js
│   │       └── FormAnalysis.css
│   ├── services/
│   │   ├── authService.js      # Authentication API calls
│   │   ├── formService.js      # Form CRUD operations
│   │   ├── responseService.js  # Response submission/retrieval
│   │   └── analysisService.js  # Analytics API calls
│   ├── App.js
│   ├── App.css
│   ├── index.js
│   ├── index.css
│   └── setupTests.js
├── package.json
└── README.md
```

## Setup Instructions

### Prerequisites

- Node.js (v16 or higher)
- npm or yarn
- Backend server running (see backend README)

### Installation

1. Navigate to the frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install --legacy-peer-deps
```

**Note:** The `--legacy-peer-deps` flag is needed because `react-beautiful-dnd` has peer dependency conflicts with React 19. If you encounter issues, you can:
- Use `npm install --force` instead
- Or consider replacing `react-beautiful-dnd` with `@dnd-kit/core` (React 19 compatible)

3. Create a `.env` file in the frontend directory:
```env
REACT_APP_API_URL=http://localhost:5000/api
```

4. Start the development server:
```bash
npm start
```

The app will open at `http://localhost:3000`

## Features

### Authentication
- **Login** - User authentication with JWT tokens
- **Signup** - User registration with validation
- **Protected Routes** - Secure routes requiring authentication

### Dashboard
- View all forms with filter tabs (All, Active, Draft, Closed)
- Quick actions: View, Edit, Responses, Analysis, Duplicate, Delete
- Form statistics display

### Form Builder (CreateForm)
- Create and edit forms
- Add multiple sections
- Support for various question types:
  - Text (short answer)
  - Textarea (long answer)
  - Radio (single choice)
  - Checkbox (multiple choice)
  - Rating (1-5 stars)
- Form settings:
  - Domain restriction
  - Duplicate response prevention
  - Auto-total score calculation

### Student Form
- Public form view for students
- General details collection:
  - Name, Email
  - Degree, Department, Section, Year
- Dynamic question rendering
- Form validation
- Success confirmation

### Form Responses
- View all responses for a form
- Cascading filters:
  - Degree → Department → Section → Year
- Response cards with details
- Export to CSV functionality
- Navigate to analysis view

### Form Analysis
- **Overview Tab:**
  - Total responses stat
  - Average score
  - Overall sentiment
  - Completion rate
  - Sentiment distribution pie chart
  - Key insights from AI
  
- **Question Analysis Tab:**
  - Question-wise response rates
  - Average ratings for rating questions
  - Response distribution bar charts
  - Common themes for text responses

## Available Scripts

### `npm start`
Runs the app in development mode on [http://localhost:3000](http://localhost:3000)

### `npm test`
Launches the test runner in interactive watch mode

### `npm run build`
Builds the app for production to the `build` folder

### `npm run eject`
**Note: this is a one-way operation!**

## API Integration

The frontend communicates with the backend via RESTful APIs:

- **Authentication**: `/auth/register`, `/auth/login`
- **Forms**: `/forms` (CRUD operations)
- **Responses**: `/responses` (submit, retrieve, filter)
- **Analysis**: `/analysis/:formId` (AI-powered analytics)

All API calls include JWT authentication tokens in headers (except public routes).

## Environment Variables

Required environment variables:

```env
REACT_APP_API_URL=http://localhost:5000/api
```

## Styling

The application uses:
- Custom CSS with consistent design system
- Purple gradient theme (#667eea → #764ba2)
- Material Design-inspired components
- Fully responsive layouts
- Smooth animations and transitions

## Browser Support

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)

## Troubleshooting

### Dependency Installation Issues

If you encounter peer dependency conflicts:

```bash
# Option 1: Use legacy peer deps
npm install --legacy-peer-deps

# Option 2: Force installation
npm install --force

# Option 3: Use npm 6 (doesn't check peer deps)
npm install --legacy-peer-deps
```

### CORS Issues

If you encounter CORS errors:
1. Ensure backend is running on correct port (5000)
2. Check CORS configuration in backend
3. Verify `REACT_APP_API_URL` in `.env` file

### Authentication Issues

If login doesn't work:
1. Check backend is running
2. Verify JWT token storage in localStorage
3. Check browser console for errors
4. Clear localStorage and try again

### Chart Not Rendering

If charts don't display:
1. Ensure `recharts` is installed
2. Check browser console for errors
3. Verify analysis data structure from backend

## Development Guidelines

### Adding a New Page

1. Create folder in `src/pages/PageName/`
2. Create `PageName.js` and `PageName.css`
3. Add route in `App.js`
4. Use `ProtectedRoute` wrapper if authentication required

### Adding a New API Service

1. Create service file in `src/services/`
2. Import axios instance from `config/axios.js`
3. Export functions for API calls
4. Handle errors consistently

### State Management

- Use `AuthContext` for global auth state
- Use local state (useState) for component-specific data
- Use useEffect for data fetching on mount

## Deployment

### Build for Production

```bash
npm run build
```

This creates an optimized production build in the `build` folder.

### Deploy to Vercel

```bash
npm install -g vercel
vercel
```

### Deploy to Netlify

```bash
npm install -g netlify-cli
netlify deploy --prod
```

### Environment Variables in Production

Set the following in your hosting platform:
- `REACT_APP_API_URL` - Your production API URL

## Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## License

MIT License - See LICENSE file for details

## Support

For issues or questions:
- Check the troubleshooting section
- Review backend API documentation
- Check browser console for errors
- Verify environment configuration
