# TripNect India - Frontend

A modern Next.js TypeScript frontend for TripNect India's explore trips feature.

## Features

### 🌍 Explore Trips
- **Trip Discovery**: Browse and filter available trips
- **Advanced Search**: Filter by destination, dates, budget, and preferences
- **Trip Details**: Comprehensive trip information and participant lists
- **Join Requests**: Request to join trips with messaging

### 👥 Trip Management
- **Create Trips**: Post new trips with detailed information
- **Manage Requests**: Accept/reject join requests as a host
- **Participant Management**: View and manage trip members
- **Group Chat**: Real-time communication for trip participants

### 🎨 Design Features
- **Responsive Design**: Optimized for all device sizes
- **Modern UI**: Clean, intuitive interface with smooth animations
- **Accessibility**: WCAG compliant with proper contrast and navigation
- **Performance**: Optimized loading and caching strategies

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **UI Components**: Custom component library
- **State Management**: React hooks and context
- **HTTP Client**: Axios with interceptors
- **Form Handling**: React Hook Form with Zod validation
- **Notifications**: React Hot Toast

## Getting Started

### Prerequisites
- Node.js 18+
- Your FastAPI backend running on port 8000
- Your Node.js auth backend running on port 3001

### Installation

1. Install dependencies:
```bash
npm install
```

2. Set up environment variables:
```bash
cp .env.local.example .env.local
# Edit .env.local with your API URLs
```

3. Run the development server:
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Structure

```
src/
├── app/                 # Next.js app router pages
├── components/          # Reusable UI components
│   ├── ui/             # Base UI components
│   ├── layout/         # Layout components
│   ├── trips/          # Trip-related components
│   └── requests/       # Request-related components
├── hooks/              # Custom React hooks
├── lib/                # Utility functions and API client
├── types/              # TypeScript type definitions
└── styles/             # Global styles
```

## API Integration

The frontend integrates with your FastAPI backend through:

- **Trip Management**: Create, read, update trips
- **Request System**: Send and manage join requests
- **Participant Management**: Handle trip memberships
- **Chat System**: Group messaging for trip participants

## Authentication

Currently uses mock authentication. To integrate with your Node.js auth backend:

1. Update the login/register pages to call your auth API
2. Modify the `useAuth` hook to handle real JWT tokens
3. Update the API client to use proper authentication headers

## Deployment

### Build for Production
```bash
npm run build
```

### Deploy to Vercel
```bash
npm install -g vercel
vercel
```

## Environment Variables

- `NEXT_PUBLIC_API_URL`: FastAPI backend URL
- `NEXT_PUBLIC_AUTH_URL`: Node.js auth backend URL

## Contributing

1. Follow the existing code structure and naming conventions
2. Use TypeScript for all new components
3. Implement proper error handling and loading states
4. Add responsive design for all new features
5. Test on multiple devices and browsers