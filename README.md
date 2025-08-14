# Handy Hands Calculator

A beautiful, animated calculator built with Next.js, shadcn/ui, and motion.dev (Framer Motion).

## Features

- 🧮 Full-featured calculator with basic operations (+, -, ×, ÷)
- 🎨 Modern UI using shadcn/ui components with CSS variables
- ✨ Smooth animations powered by Framer Motion
- 🌙 Dark theme with glassmorphism effects
- 📱 Responsive design that works on all devices
- ⚡ Built with Next.js 14 and TypeScript

## Tech Stack

- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with CSS variables
- **UI Components**: shadcn/ui
- **Animations**: Framer Motion (motion.dev)
- **Language**: TypeScript
- **Styling System**: CSS Variables for theming

## Getting Started

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd handyhands-calculator
```

2. Install dependencies:
```bash
npm install
```

3. Run the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
src/
├── app/
│   ├── globals.css          # Global styles with CSS variables
│   ├── layout.tsx           # Root layout
│   └── page.tsx             # Main page with calculator
├── components/
│   ├── ui/                  # shadcn/ui components
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   └── label.tsx
│   └── calculator.tsx       # Main calculator component
└── lib/
    └── utils.ts             # Utility functions
```

## Calculator Features

- **Basic Operations**: Addition, subtraction, multiplication, division
- **Additional Functions**: Percentage, sign change, clear all
- **Decimal Support**: Full decimal number support
- **Memory**: Remembers previous operations
- **Responsive**: Works on desktop and mobile devices

## Animation Features

- **Entrance Animations**: Staggered fade-in effects
- **Button Interactions**: Hover and tap animations
- **Smooth Transitions**: CSS transitions for color changes
- **Performance**: Optimized animations using Framer Motion

## Styling System

The project uses CSS variables for consistent theming:

- **Color System**: Semantic color variables (primary, secondary, accent, etc.)
- **Dark Mode**: Built-in dark theme support
- **Glassmorphism**: Modern backdrop blur effects
- **Responsive**: Mobile-first design approach

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run start` - Start production server
- `npm run lint` - Run ESLint

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## License

This project is open source and available under the [MIT License](LICENSE).

## Acknowledgments

- [shadcn/ui](https://ui.shadcn.com/) for beautiful UI components
- [Framer Motion](https://www.framer.com/motion/) for smooth animations
- [Tailwind CSS](https://tailwindcss.com/) for utility-first CSS
- [Next.js](https://nextjs.org/) for the React framework
