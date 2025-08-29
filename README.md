# Sync.a - Web App Builder for Local Businesses

<div align="center">
  <img src="https://img.shields.io/badge/React-18.x-blue?style=for-the-badge&logo=react" alt="React">
  <img src="https://img.shields.io/badge/TypeScript-5.x-blue?style=for-the-badge&logo=typescript" alt="TypeScript">
  <img src="https://img.shields.io/badge/Node.js-18+-green?style=for-the-badge&logo=node.js" alt="Node.js">
  <img src="https://img.shields.io/badge/Tailwind_CSS-3.x-38B2AC?style=for-the-badge&logo=tailwind-css" alt="Tailwind CSS">
  <img src="https://img.shields.io/badge/Express.js-4.x-black?style=for-the-badge&logo=express" alt="Express.js">
</div>

<br />

**Sync.a** is a powerful, user-friendly web app builder designed specifically for local businesses like cafés, restaurants, bars, and shops. Create stunning, professional websites in minutes without any technical expertise.

## ✨ Features

### 🎨 **Distinct Template Designs**
- **4 Unique Templates**: Minimalist, Creative & Bold, Professional & Elegant, Modern & Sleek
- Each template has completely different layouts, navigation styles, and animations
- Templates feel like different apps, not just color variations

### 🖌️ **Interactive Design System**
- **Live Preview**: Fully interactive iPhone-style preview with real-time updates
- **Color Selector Dots**: Quick theme switching with 4 preset color schemes
- **Smart Auto-Save**: Automatically saves progress to the backend
- **Responsive Design**: Mobile-first approach with perfect mobile optimization

### 🔧 **Complete Business Setup**
- **Business Information**: Name, type, location, slogan, and unique descriptions
- **Menu/Product Management**: Add items, descriptions, prices, and categories
- **Opening Hours**: Flexible scheduling with day-specific hours
- **Contact Integration**: Multiple contact methods, social media links
- **Reservation System**: Table booking functionality for restaurants
- **Gallery Support**: Photo uploads and management

### 🚀 **Backend Integration**
- **Auto-Save**: Real-time configuration saving with 3-second debouncing
- **Dashboard**: Manage multiple website configurations
- **Publishing System**: One-click publishing with custom or subdomain URLs
- **Session Management**: User tracking and configuration persistence
- **RESTful API**: Full CRUD operations for configurations

### 📱 **User Experience**
- **Step-by-Step Wizard**: Guided setup process across 5 phases
- **Progress Tracking**: Visual progress indicators and phase management
- **Interactive Elements**: Clickable menus, hover effects, and smooth animations
- **Error Handling**: Graceful error management with user feedback

## 🛠 Tech Stack

### Frontend
- **React 18** with TypeScript for type-safe component development
- **Vite** for fast development and optimized builds
- **Tailwind CSS** for utility-first styling and responsive design
- **Radix UI** for accessible, unstyled UI primitives
- **Lucide React** for beautiful, consistent icons
- **React Router** for client-side routing
- **TanStack Query** for server state management

### Backend
- **Node.js** with Express.js for robust API development
- **TypeScript** for type safety across the stack
- **Zod** for runtime type validation and schema enforcement
- **CORS** for cross-origin resource sharing
- **File-based Storage** (easily replaceable with database)

### Development Tools
- **ESLint & Prettier** for code quality and formatting
- **Vitest** for unit testing
- **PostCSS** for CSS processing
- **Path Mapping** for clean imports

## 🚀 Quick Start

### Prerequisites
- **Node.js** 18+ and npm/yarn/pnpm
- **Git** for version control

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/sync-a-builder.git
   cd sync-a-builder
   ```

2. **Install dependencies**
   ```bash
   npm install
   # or
   yarn install
   # or
   pnpm install
   ```

3. **Start the development server**
   ```bash
   npm run dev
   # or
   yarn dev
   # or
   pnpm dev
   ```

4. **Open your browser**
   ```
   http://localhost:5173
   ```

The app will start with hot-reloading enabled. The backend API will be available at `http://localhost:5173/api`.

## 📁 Project Structure

```
sync-a-builder/
├── client/                    # Frontend React application
│   ├── components/           # Reusable UI components
│   │   └── ui/              # Shadcn/ui components
│   ├── hooks/               # Custom React hooks
│   ├── lib/                 # Utility functions and API client
│   ├── pages/               # Page components
│   │   ├── Index.tsx        # Landing page
│   │   ├── Configurator.tsx # Main builder interface
│   │   ├── Dashboard.tsx    # Configuration management
│   │   └── NotFound.tsx     # 404 page
│   ├── App.tsx              # App root with routing
│   └── global.css           # Global styles
├── server/                   # Backend Express application
│   ├── routes/              # API route handlers
│   │   ├── configurations.ts # Main CRUD operations
│   │   └── demo.ts          # Demo/example routes
│   └── index.ts             # Server setup and middleware
├── shared/                   # Shared types and utilities
├── data/                     # File-based storage (auto-created)
├── public/                   # Static assets
└── dist/                     # Build output (auto-created)
```

## 🔧 Configuration

### Environment Variables

Create a `.env` file in the project root:

```env
# Server Configuration
PORT=3000
NODE_ENV=development

# Optional: Custom ping message for health checks
PING_MESSAGE="Sync.a API is running!"

# Database Configuration (for future database integration)
# DATABASE_URL=your_database_url
# REDIS_URL=your_redis_url

# Authentication (for future auth integration)
# JWT_SECRET=your_jwt_secret
# SESSION_SECRET=your_session_secret
```

### Backend Storage

The application currently uses **file-based storage** for configurations, stored in the `data/` directory. This is perfect for development and small-scale deployments.

#### Migrating to a Database

To replace file storage with a database (PostgreSQL, MongoDB, etc.):

1. **Install database driver**:
   ```bash
   npm install pg @types/pg  # For PostgreSQL
   # or
   npm install mongodb       # For MongoDB
   ```

2. **Update `server/routes/configurations.ts`**:
   Replace the file-based functions (`loadConfigurations`, `saveConfigurations`) with database operations.

3. **Add connection logic** in `server/index.ts`

## 🌐 API Documentation

### Base URL
```
http://localhost:5173/api
```

### Authentication
The API uses a simple user ID system via the `x-user-id` header. In production, replace this with proper authentication.

### Endpoints

#### **Configurations**

```http
POST /api/configurations
```
Create or update a configuration.

**Headers:**
- `x-user-id: string` - User identifier
- `Content-Type: application/json`

**Request Body:**
```json
{
  "businessName": "Bella's Café",
  "businessType": "cafe",
  "template": "minimalist",
  "primaryColor": "#2563EB",
  "secondaryColor": "#7C3AED",
  // ... other configuration fields
}
```

**Response:**
```json
{
  "success": true,
  "configuration": {
    "id": "abc123",
    "businessName": "Bella's Café",
    // ... full configuration object
    "createdAt": "2024-01-01T00:00:00Z",
    "updatedAt": "2024-01-01T00:00:00Z"
  }
}
```

---

```http
GET /api/configurations
```
Get all user configurations.

**Headers:**
- `x-user-id: string`

**Response:**
```json
{
  "success": true,
  "configurations": [
    {
      "id": "abc123",
      "businessName": "Bella's Café",
      "status": "published",
      "publishedUrl": "https://bellas-cafe-abc123.sync.app",
      // ... other fields
    }
  ]
}
```

---

```http
GET /api/configurations/:id
```
Get a specific configuration.

```http
DELETE /api/configurations/:id
```
Delete a configuration.

```http
POST /api/configurations/:id/publish
```
Publish a configuration and generate a live URL.

#### **Published Sites**

```http
GET /api/sites/:subdomain
```
Get published site data by subdomain or domain.

## 🎨 Customization

### Adding New Templates

1. **Define the template** in `client/pages/Configurator.tsx`:
   ```typescript
   const templates = [
     // ... existing templates
     {
       id: 'your-template',
       name: 'Your Template Name',
       description: 'Template description',
       preview: 'bg-gradient-to-br from-blue-50 to-indigo-100',
       style: {
         background: '#FFFFFF',
         accent: '#3B82F6',
         text: '#1F2937',
         secondary: '#F8FAFC',
         layout: 'custom-layout',
         navigation: 'custom-nav',
         typography: 'custom-typography'
       }
     }
   ];
   ```

2. **Create the render function** in the `LivePreview` component:
   ```typescript
   const renderYourTemplate = () => (
     <div className="h-full overflow-y-auto bg-white">
       {/* Your custom template JSX */}
     </div>
   );
   ```

3. **Add to the switch statement**:
   ```typescript
   switch (formData.template) {
     case 'your-template':
       return renderYourTemplate();
     // ... other cases
   }
   ```

### Adding New Business Types

Update the `businessTypes` array in `client/pages/Configurator.tsx`:

```typescript
const businessTypes = [
  // ... existing types
  {
    value: 'your-type',
    label: 'Your Business Type',
    icon: <YourIcon className="w-6 h-6" />,
    gradient: 'from-blue-400 to-indigo-500'
  }
];
```

### Styling Customization

The app uses **Tailwind CSS** with a custom design system:

- **Colors**: Defined in `tailwind.config.ts`
- **Components**: Shadcn/ui components in `client/components/ui/`
- **Custom Classes**: Global styles in `client/global.css`

## 🚀 Deployment

### Building for Production

```bash
# Build both client and server
npm run build

# The output will be in the dist/ directory
```

### Vercel Deployment

1. **Install Vercel CLI**:
   ```bash
   npm install -g vercel
   ```

2. **Deploy**:
   ```bash
   vercel
   ```

3. **Configure**:
   - Framework Preset: **Other**
   - Build Command: `npm run build`
   - Output Directory: `dist/spa`
   - Install Command: `npm install`

### Netlify Deployment

1. **Build settings**:
   - Build command: `npm run build`
   - Publish directory: `dist/spa`

2. **Functions** (for API):
   - Functions directory: `netlify/functions`
   - The API is configured to work with Netlify Functions

### Custom Server Deployment

1. **Build the project**:
   ```bash
   npm run build
   ```

2. **Start the production server**:
   ```bash
   npm start
   ```

3. **Environment setup**:
   - Set `NODE_ENV=production`
   - Configure your reverse proxy (nginx, Apache)
   - Set up SSL certificates
   - Configure database connections

### Domain Configuration

The app supports both custom domains and subdomains:

- **Custom domains**: Users can connect their own domains
- **Sync.a subdomains**: Auto-generated `business-name-id.sync.app` format

Update the domain logic in `server/routes/configurations.ts` for your domain setup.

## 🤝 Contributing

We welcome contributions! Please follow these steps:

1. **Fork the repository**
2. **Create a feature branch**: `git checkout -b feature/amazing-feature`
3. **Make your changes** with proper TypeScript types
4. **Add tests** for new functionality
5. **Run the test suite**: `npm test`
6. **Format your code**: `npm run format.fix`
7. **Commit your changes**: `git commit -m 'Add amazing feature'`
8. **Push to the branch**: `git push origin feature/amazing-feature`
9. **Open a Pull Request**

### Development Guidelines

- **TypeScript**: Use proper typing for all functions and components
- **Testing**: Add tests for new features
- **Performance**: Consider performance implications of changes
- **Accessibility**: Ensure all UI changes are accessible
- **Mobile**: Test on mobile devices and different screen sizes

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🆘 Support

- **Documentation**: Check this README and inline code comments
- **Issues**: Report bugs and request features on GitHub Issues
- **Discussions**: Join community discussions on GitHub Discussions

## 🗺 Roadmap

### Upcoming Features
- [ ] **Database Integration**: PostgreSQL/MongoDB support
- [ ] **User Authentication**: Proper user accounts and security
- [ ] **Advanced Templates**: More design options and customization
- [ ] **E-commerce Integration**: Online store functionality
- [ ] **Analytics Dashboard**: Website performance metrics
- [ ] **Multi-language Support**: Internationalization
- [ ] **Mobile App**: React Native companion app
- [ ] **White-label Solution**: Brand customization for agencies

### Current Version: v1.0.0
- ✅ Core builder functionality
- ✅ 4 distinct templates
- ✅ Backend integration
- ✅ Publishing system
- ✅ Dashboard management
- ✅ Mobile-responsive design

---

<div align="center">
  <p>Built with ❤️ for local businesses</p>
  <p>
    <a href="https://sync.app">Website</a> •
    <a href="https://github.com/your-username/sync-a-builder">GitHub</a> •
    <a href="https://twitter.com/syncapp">Twitter</a>
  </p>
</div>
