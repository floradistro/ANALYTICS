# WhaleTools Analytics Dashboard

A comprehensive analytics and reporting dashboard for retail store management.

## Features

- **Sales Analytics** - Track revenue, orders, and sales trends
- **Product Management** - Categories, pricing templates, and inventory
- **Customer Insights** - Customer segments and purchase behavior
- **Staff Performance** - Order fulfillment tracking and metrics
- **Operations Dashboard** - Order management and shipment tracking
- **Marketing Campaigns** - Email campaigns and customer segments
- **QR Code Tracking** - Generate and track QR codes for products and campaigns
- **Reports Builder** - Custom report generation with PDF export

## Tech Stack

- **Framework**: Next.js 14 (App Router)
- **Database**: Supabase (PostgreSQL)
- **State Management**: Zustand
- **Styling**: Tailwind CSS
- **Charts**: Recharts, Nivo
- **PDF Export**: jsPDF, html2canvas
- **Shipping**: EasyPost integration
- **Email**: Resend integration

## Getting Started

### Prerequisites

- Node.js 18+
- Supabase account
- Environment variables configured

### Installation

```bash
npm install
```

### Environment Variables

Create a `.env.local` file with:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
EASYPOST_API_KEY=your_easypost_key
RESEND_API_KEY=your_resend_key
```

### Development

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) to view the dashboard.

### Build

```bash
npm run build
```

## Project Structure

```
src/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes
│   └── dashboard/         # Dashboard pages
├── components/            # React components
│   ├── charts/           # Chart components
│   ├── filters/          # Filter components
│   ├── layout/           # Layout components
│   ├── marketing/        # Marketing components
│   ├── modals/           # Modal components
│   ├── products/         # Product components
│   └── reports/          # Report components
├── lib/                   # Utility libraries
├── stores/               # Zustand state stores
└── types/                # TypeScript types
```

## Documentation

- [Staff Performance Tracking](./STAFF_PERFORMANCE_TRACKING.md) - Order fulfillment metrics system
