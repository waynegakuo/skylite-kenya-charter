# SkyElite Kenya — Premium Private Jet Charter Visualizer

> **Disclaimer & Demonstration Notice**  
> **This application is an interactive concept visualizer and prototype.**  
> All flight telemetry, radar positions, aircraft callsigns, charter rates, weather reports, and booking records represent **simulated / dummy data**. This project demonstrates how an executive private aviation charter service, live operations tracking hub, and fleet showcase platform can look, feel, and perform in a modern web environment.

---

## ✈️ About SkyElite Kenya

**SkyElite Kenya** represents a visionary digital platform for an ultra-luxury private jet and safari charter operator based out of **Wilson Airport (WIL / HKNW)** in Nairobi, Kenya. The platform caters to high-net-worth individuals, safari expeditions, corporate leadership, and diplomatic missions traveling across East Africa and the Indian Ocean coast.

The application blends high-performance 3D graphics, interactive geographic mapping, and streamlined booking workflows into an aerospace-inspired digital experience.

---

## 🌟 Key Features

### 1. 🛫 Centered 3D Aircraft Experience
- Interactive Three.js 3D executive jet visualization centrally positioned on the landing page.
- Smooth aerodynamics, realistic lighting, and customized camera framing tuned for a balanced desktop and mobile view.

### 2. 📡 Interactive Kenya Flight Radar Visualizer
- **High-Fidelity Flight Telemetry**: Real-time simulated aircraft tracking across authentic Kenyan air corridors (Safari Circuit, Indian Ocean Coastline, Mount Kenya Scenic Route, and Regional Diplomatic Shuttles).
- **Interactive D3.js Map**: Geographic projection of Kenya featuring major hub airports, unpaved bush airstrips (Keekorok, Lewa, Serena), UNESCO landmarks (Mt. Kenya, Mt. Kilimanjaro), and the Great Rift Valley.
- **Flight Controls**: Simulation speed adjustment (1x, 2x, 4x), pause/play toggle, corridor filters, and live breadcrumb trail history.
- **Direct Corridor Booking**: Click any airborne flight to inspect captain info, squawk code, altitude, speed, and instantly quote a charter along that route.

### 3. 📑 Grouped Responsive Navigation
- **Desktop Dropdowns**: Clutter-free grouped menus:
  - **Charter**: Charter Rates & Pricing, Wilson Airport Operations, Charter FAQs.
  - **Fleet & Cabins**: Interactive Cabin Interiors, Aircraft Fleet Specs, Executive Flying Benefits.
  - **Live Ops & Weather**: Live Kenya Flight Radar, Wilson Airport METAR & Coastal Weather.
  - **About**: Brand Story & Heritage, Contact & Wilson Concierge.
- **Mobile Accordion**: One collapsible dropdown per group with clean sub-menus and touch-optimized actions.

### 4. 💺 Luxury Fleet & Cabin Showcase
- Interactive fleet carousel highlighting:
  - **Pilatus PC-24 Super Bush Jet** (Rough/unpaved safari runway capable)
  - **Cessna Citation XLS+** (Coastline executive shuttle)
  - **Pilatus PC-12 NGX** (Scenic high-altitude turboprop)
  - **Bombardier Challenger 650** (Intercontinental & diplomatic cabin)
  - **Beechcraft Super King Air 350i** (Safari workhorse)
- Cabin interior amenity inspections, specifications, speed, range, and hourly rate guides.

### 5. 💳 Instant Charter Quotation & Booking
- Multi-destination trip planner connecting Nairobi Wilson to the Maasai Mara, Diani Beach, Vipingo Ridge, Lewa Downs, Entebbe, and Zanzibar.
- Calculation of estimated flight duration, distance in nautical miles, passenger configuration, and VIP tarmac handling requests.

### 6. 🔤 Aviation Typographic Design
- **Avionics & Telemetry**: Powered by **B612** and **B612 Mono**, the open-source typeface commissioned by **Airbus** and aeronautical engineers for maximum legibility in cockpit displays.
- **Brand & Display**: Crafted with **Outfit**, an aerodynamic geometric sans-serif delivering a sleek, luxury aerospace identity.

---

## 🛠️ Technology Stack

- **Framework**: Angular 22 (Zoneless, OnPush change detection, Signals)
- **Styling**: Tailwind CSS v4 with custom aerospace glassmorphism
- **3D Graphics**: Three.js
- **Radar & Mapping**: D3.js (Geographic Mercator projection & SVG telemetry layers)
- **Icons**: Angular Material Icons
- **Typography**: Google Fonts (`Outfit`, `B612`, `B612 Mono`)

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v20+ recommended)
- npm

### Installation
```bash
npm install
```

### Development Server
```bash
npm start
```
The application will be served locally at `http://localhost:3000`.

### Production Build
```bash
npm run build
```

---

## 📌 Project Architecture

```
├── src/
│   ├── app/
│   │   ├── aircraft-carousel.ts     # Luxury fleet & cabin gallery
│   │   ├── flight-tracker.html      # Radar map & telemetry UI template
│   │   ├── flight-tracker.ts        # D3-powered live flight radar simulation
│   │   ├── app.html                 # Main landing layout, header & modals
│   │   └── app.ts                   # Navigation, state signals & booking logic
│   ├── styles.css                   # Global Tailwind CSS and aviation font variables
│   └── index.html                   # Entry HTML with preloaded aviation typography
└── README.md                        # Project documentation
```

---

## 📄 License
This project is created for demonstration and visualization purposes.
