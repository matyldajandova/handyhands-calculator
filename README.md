# Handy Hands Calculator

A Next.js-based maintenance price calculator for residential buildings and new constructions, built with shadcn/ui components and Framer Motion animations.

## Features

- **Service Type Selection**: Choose from various property types (currently only residential buildings implemented)
- **Dynamic Form System**: JSON-driven form configuration for easy maintenance
- **Real-time Validation**: Zod schema validation with custom error messages
- **Responsive Design**: Mobile-first design with Tailwind CSS
- **Dark Mode Support**: Full dark/light theme switching
- **Deep Linking**: Direct access to specific forms via URL parameters
- **PDF Export**: Download calculation results (mock implementation)

## Deep Linking

The application supports deep linking to specific service forms using SEO-friendly URL slugs:

### Available Deep Links

- **Residential Buildings**: `/cinzovni-domy-novostavby`
  - Direct access to the residential building calculator
  - Form includes general cleaning, winter maintenance, and location options

### Deep Link Structure

```
/{service_slug}
```

Where `service_slug` corresponds to the service type:
- `cinzovni-domy-novostavby` = Činžovní domy, novostavby (Residential Buildings, New Constructions)
- `rodinne-domy` = Rodinné domy (Family Homes) - Coming soon
- `skladove-haly` = Skladové haly (Warehouse Halls) - Coming soon
- `obchodni-prostory` = Obchodní prostory (Commercial Spaces) - Coming soon
- `kancelarske-budovy` = Kancelářské budovy (Office Buildings) - Coming soon
- `vyrobni-haly` = Výrobní haly (Production Halls) - Coming soon
- `skoly-a-univerzity` = Školy a univerzity (Schools and Universities) - Coming soon
- `administrativni-budovy` = Administrativní budovy (Administrative Buildings) - Coming soon

### Security Features

- **History Protection**: Users can navigate back to service selection using browser history
- **Warning Dialog**: Prevents accidental data loss when users try to leave with unsaved changes
- **Tab Close Protection**: Warns users before closing/refreshing tab with unsaved changes
- **State Management**: Application state prevents unauthorized access to calculation results

## Development

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
npm install
```

### Development Server

```bash
npm run dev
```

The application will be available at `http://localhost:3000`

### Building

```bash
npm run build
```

## Architecture

### Components

- **ServiceTypeSelector**: Main service selection interface
- **UniversalForm**: Dynamic form renderer based on JSON configuration
- **CalculatingScreen**: Animated progress screen during calculation
- **SuccessScreen**: Results display with PDF download option

### Configuration

- **Form Configs**: JSON-based form definitions in `src/config/forms/`
- **Service Types**: Service definitions in `src/config/services.ts`
- **Validation**: Zod schemas for type-safe form validation

### State Management

The application uses a state machine approach with four main states:
1. `service-selection` - Choose service type
2. `form` - Fill out the selected form
3. `calculating` - Show calculation progress
4. `success` - Display results and download options

## Future Enhancements

- Additional service types (family homes, commercial buildings, etc.)
- Real PDF generation with jsPDF or similar
- Backend integration for actual price calculations
- User accounts and calculation history
- Multi-language support

## Technologies Used

- **Next.js 15** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Component library with CSS variables
- **Framer Motion** - Animation library
- **React Hook Form** - Form state management
- **Zod** - Schema validation
- **Lucide React** - Icon library
