# After-Sales Internal Dashboard - Development Plan

## Design Guidelines

### Design References
- **Vercel Dashboard**: Clean, professional, data-focused
- **Linear App**: Minimalist sidebar, excellent data visualization
- **Style**: Professional Corporate Dashboard + Dark Mode Support

### Color Palette
- Primary: #0F172A (Slate 900 - background)
- Secondary: #1E293B (Slate 800 - cards/sidebar)
- Accent: #3B82F6 (Blue 500 - highlights/CTAs)
- Success: #10B981 (Green 500)
- Warning: #F59E0B (Amber 500)
- Danger: #EF4444 (Red 500)
- Text: #F8FAFC (Slate 50), #94A3B8 (Slate 400 - secondary)

### Typography
- Heading1: Inter font-weight 700 (32px)
- Heading2: Inter font-weight 600 (24px)
- Heading3: Inter font-weight 600 (18px)
- Body: Inter font-weight 400 (14px)
- Labels: Inter font-weight 500 (12px)

### Key Component Styles
- **Sidebar**: Collapsible, dark theme (#1E293B), 280px expanded, 80px collapsed
- **Cards**: White background with subtle shadow, 8px rounded
- **Tables**: Striped rows, hover effects, sortable headers
- **Charts**: Use recharts library with blue/green color scheme

### Layout & Spacing
- Sidebar: Fixed left, full height
- Main content: Responsive padding (24px), max-width for readability
- Card spacing: 16px gaps between cards
- Section padding: 24px internal padding

---

## Development Tasks

### 1. Project Setup & Data Integration
- Copy ticket.json to public/data/
- Create data parsing utilities
- Set up TypeScript interfaces for ticket data

### 2. Core Layout Components
- AppLayout.tsx - Main layout with collapsible sidebar
- Sidebar.tsx - Navigation with 3 main tabs
- Header.tsx - Top bar with user info and controls

### 3. Dealership Analysis (1001) Page
- Overview cards: Total tickets, active dealers, average response time
- Dealer list table with sorting/filtering
- Per-dealer analysis:
  - Tickets by chassis number
  - Ticket type distribution
  - Status breakdown
  - Time range analysis

### 4. Internal Employees (40) Page
- Employee workload overview
- Ticket status distribution per employee
- Time consumption analysis (Days/Hours/Minutes breakdown)
- Performance metrics dashboard
- Active vs completed tickets

### 5. Repair Analysis (43) Page
- Repair cost analysis
- Quote distribution charts
- Repair type categorization
- Average repair time
- Cost trends over time

### 6. Shared Components
- StatCard.tsx - Metric display cards
- DataTable.tsx - Reusable sortable table
- ChartCard.tsx - Wrapper for chart components
- FilterBar.tsx - Common filtering controls
- StatusBadge.tsx - Ticket status indicators

### 7. Data Utilities
- parseTicketData.ts - Parse and transform JSON data
- timeParser.ts - Parse "131 D 17 H 32 M" format
- aggregations.ts - Calculate statistics and metrics

### 8. Styling & Polish
- Responsive design for all screen sizes
- Dark mode support
- Loading states
- Empty states
- Error handling

### 9. Testing & Optimization
- Test with provided data
- Ensure all calculations are accurate
- Optimize performance for large datasets
- Cross-browser compatibility