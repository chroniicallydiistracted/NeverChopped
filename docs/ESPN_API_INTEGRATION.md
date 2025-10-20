# ESPN API Integration

This document explains the ESPN API integration in the NeverChopped project.

## Overview

The ESPN data integration has been refactored to work in a browser environment. Previously, the application was attempting to execute Python scripts directly from the browser, which is not possible due to security restrictions.

## Architecture

The new architecture consists of:

1. **ESPN API Server** (`espn-api-server.js`): A Node.js/Express server that executes Python scripts and provides REST API endpoints.
2. **Frontend Integration** (`src/lib/api/espn-data.ts`): Updated to make HTTP requests to the API server instead of trying to execute Python scripts.
3. **Vite Configuration** (`vite.config.ts`): Updated with polyfills and proxy configuration for the ESPN API.

## Usage

### Starting the Application

To run the full application with ESPN API support:

```bash
npm install
npm run dev:full
```

This will start both the Vite development server and the ESPN API server concurrently.

### Running Just the API Server

If you only need to run the ESPN API server:

```bash
npm run api:espn
```

### Running Just the Frontend

If you only need to run the frontend development server:

```bash
npm run dev
```

## API Endpoints

The ESPN API server provides the following endpoints:

1. **Get ESPN Game Data**
   - Endpoint: `GET /api/espn/game/:gameId`
   - Parameters:
     - `gameId`: The ESPN game ID
   - Returns: JSON object with game data and plays

2. **Get ESPN Schedule**
   - Endpoint: `GET /api/espn/schedule/:week/:year`
   - Parameters:
     - `week`: The week number
     - `year`: The season year
   - Returns: JSON object with schedule data

## Technical Details

### Browser Compatibility Issues

The original implementation attempted to use Node.js modules (`child_process`, `fs`, `path`) in the browser, which caused compatibility issues. The new implementation:

1. Uses a server-side API to handle Python script execution
2. Uses standard HTTP requests from the browser
3. Includes polyfills for Node.js modules in the Vite configuration

### Proxy Configuration

The Vite configuration includes a proxy to forward ESPN API requests from the frontend to the API server:

```typescript
proxy: {
  '/api/espn': {
    target: 'http://localhost:3001',
    changeOrigin: true,
    secure: false,
  },
}
```

## Dependencies

The following dependencies were added to support the ESPN API integration:

- `express`: Web server framework
- `cors`: Enable CORS for the API server
- `concurrently`: Run multiple npm scripts simultaneously
- `node-assert`: Polyfill for Node.js assert module
- `path-browserify`: Polyfill for Node.js path module
