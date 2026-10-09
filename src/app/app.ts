import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  afterNextRender,
  computed,
  signal,
  viewChild,
} from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { FlightTracker } from './flight-tracker';
import { AircraftCarousel } from './aircraft-carousel';
import { saveCharterInquiry } from './firebase';

interface FleetJet {
  name: string;
  category: string;
  passengers: string;
  range: string;
  speed: string;
  hourlyRate: string;
  description: string;
}

export interface NavSubItem {
  id: string;
  label: string;
  description: string;
  icon: string;
  badge?: string;
  badgeType?: 'amber' | 'accent' | 'sky';
  action: 'rates' | 'dispatch' | 'faq' | 'interiors' | 'fleet' | 'benefits' | 'radar' | 'weather' | 'story' | 'safety';
}

export interface NavGroup {
  id: string;
  title: string;
  shortTitle: string;
  hasLiveBadge?: boolean;
  items: NavSubItem[];
}

interface NavSectionContent {
  title: string;
  subtitle: string;
  items: { label: string; detail: string }[];
}

export interface AirstripWeather {
  id: string;
  name: string;
  code: string;
  icao: string;
  type: string;
  lat: number;
  lng: number;
  elevation: string;
  tempC: number;
  condition: string;
  windKnots: number;
  windDir: number;
  flightCategory: 'VFR' | 'MVFR' | 'IFR';
  runwayStatus: string;
  humidity: number;
  loading: boolean;
  lastUpdated: string;
}

@Component({
  selector: 'app-root',
  imports: [ReactiveFormsModule, MatIconModule, FlightTracker, AircraftCarousel],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './app.html',
  host: {
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'onEscapeKey()',
  },
})
export class App {
  private heroVideoAutoplayFallbackBound = false;

  constructor() {
    afterNextRender(() => {
      this.playHeroVideoMuted();
    });
  }

  // Mobile Menu state
  readonly isMobileMenuOpen = signal(false);

  // Grouped Navigation state
  readonly activeDesktopDropdown = signal<string | null>(null);
  readonly activeMobileGroup = signal<string | null>('charter');

  readonly navGroups: NavGroup[] = [
    {
      id: 'charter',
      title: 'Charter & Booking',
      shortTitle: 'Charter',
      items: [
        {
          id: 'rates',
          label: 'Charter Quotes & Pricing',
          description: 'Tailored itineraries, transparent quotes within 24 hours',
          icon: 'payments',
          action: 'rates',
        },
        {
          id: 'dispatch',
          label: 'Wilson Airport Operations',
          description: 'Charter dispatch, ground handling & cross-border clearance',
          icon: 'flight_takeoff',
          action: 'dispatch',
        },
        {
          id: 'faq',
          label: 'Charter Planning FAQs',
          description: 'Remote strips, medical cargo, passengers & customs',
          icon: 'help_outline',
          action: 'faq',
        },
      ],
    },
    {
      id: 'fleet',
      title: 'Fleet & Cabin Configurations',
      shortTitle: 'Fleet',
      items: [
        {
          id: 'interiors',
          label: 'Cabin Layouts & Medical Fit-Outs',
          description: 'Executive seating, stretcher configs & amenity gallery',
          icon: 'photo_library',
          badge: 'CAROUSEL',
          badgeType: 'amber',
          action: 'interiors',
        },
        {
          id: 'fleet',
          label: 'Charter Aircraft Specifications',
          description: 'Pilatus PC-12 turboprop & Citation Sovereign C680 jet',
          icon: 'airplanemode_active',
          action: 'fleet',
        },
        {
          id: 'benefits',
          label: 'Why Charter With Us',
          description: 'Remote airstrips, urgent departures & dedicated crew',
          icon: 'workspace_premium',
          action: 'benefits',
        },
      ],
    },
    {
      id: 'live',
      title: 'Live Operations',
      shortTitle: 'Live Ops',
      hasLiveBadge: true,
      items: [
        {
          id: 'radar',
          label: 'Live Charter Radar',
          description: 'Simulated fleet movements across East African corridors',
          icon: 'radar',
          badge: 'D3 MAP',
          badgeType: 'accent',
          action: 'radar',
        },
        {
          id: 'weather',
          label: 'Airstrip Weather (METAR)',
          description: 'Winds, visibility & runway conditions for flight planning',
          icon: 'wb_sunny',
          badge: 'LIVE METAR',
          badgeType: 'accent',
          action: 'weather',
        },
      ],
    },
    {
      id: 'about',
      title: 'About SkyElite',
      shortTitle: 'About',
      items: [
        {
          id: 'story',
          label: 'Aviation Heritage & Impact',
          description: 'Aero-medical legacy meets purposeful charter aviation',
          icon: 'auto_stories',
          action: 'story',
        },
        {
          id: 'safety',
          label: 'Safety & Crew Standards',
          description: 'KCAA-certified operations & experienced flight crews',
          icon: 'verified_user',
          action: 'safety',
        },
      ],
    },
  ];

  // Modals & Panels state
  readonly isBookingModalOpen = signal(false);
  readonly isDiscoverModalOpen = signal(false);
  readonly discoverModalTab = signal<'interiors' | 'fleet'>('interiors');
  readonly isFlightTrackerOpen = signal(false);
  readonly activeNavModal = signal<string | null>(null);
  readonly isVideoMuted = signal(true);
  readonly bookingSuccess = signal(false);

  // Video element reference
  readonly bgVideoRef = viewChild<ElementRef<HTMLVideoElement>>('bgVideo');

  // Live Airstrip Meteorological State & Modal Navigation Tab
  readonly navModalTab = signal<'overview' | 'weather' | 'tracker'>('weather');
  readonly selectedWeatherFilter = signal<string>('all');
  readonly isWeatherLoading = signal(false);
  readonly weatherLastFetched = signal<string>('Just now');
  readonly airstripsWeather = signal<AirstripWeather[]>([
    {
      id: 'wilson',
      name: 'Nairobi Wilson Airport',
      code: 'WIL',
      icao: 'HKNW',
      type: 'Charter Hub & Aero-Medical Dispatch',
      lat: -1.3217,
      lng: 36.8148,
      elevation: '5,536 ft / 1,687 m',
      tempC: 23,
      condition: 'Partly Cloudy',
      windKnots: 8,
      windDir: 90,
      flightCategory: 'VFR',
      runwayStatus: 'Dry · Active Tarmac',
      humidity: 58,
      loading: false,
      lastUpdated: 'Live METAR',
    },
    {
      id: 'mara',
      name: 'Maasai Mara (Keekorok / Serena)',
      code: 'MRE',
      icao: 'HKKE',
      type: 'Safari Reserve Bush Strip',
      lat: -1.5861,
      lng: 35.2444,
      elevation: '5,400 ft / 1,646 m',
      tempC: 27,
      condition: 'Clear Sky',
      windKnots: 6,
      windDir: 110,
      flightCategory: 'VFR',
      runwayStatus: 'Dry Turf · Unrestricted Bush Landings',
      humidity: 46,
      loading: false,
      lastUpdated: 'Live METAR',
    },
    {
      id: 'vipingo',
      name: 'Vipingo Ridge Airstrip',
      code: 'VPG',
      icao: 'HKVR',
      type: 'Coastal Estate & Golf Sanctuary',
      lat: -3.8167,
      lng: 39.8167,
      elevation: '426 ft / 130 m',
      tempC: 29,
      condition: 'Coastal Sea Breeze',
      windKnots: 11,
      windDir: 140,
      flightCategory: 'VFR',
      runwayStatus: 'Paved Asphalt · Clear',
      humidity: 68,
      loading: false,
      lastUpdated: 'Live METAR',
    },
    {
      id: 'lewa',
      name: 'Lewa Wildlife Conservancy',
      code: 'LWR',
      icao: 'HKLW',
      type: 'Northern Conservancy Runway',
      lat: 0.2000,
      lng: 37.5333,
      elevation: '5,500 ft / 1,675 m',
      tempC: 24,
      condition: 'Scattered Clouds',
      windKnots: 7,
      windDir: 85,
      flightCategory: 'VFR',
      runwayStatus: 'Prepared Gravel · Active',
      humidity: 52,
      loading: false,
      lastUpdated: 'Live METAR',
    },
    {
      id: 'diani',
      name: 'Diani Beach (Ukunda Airstrip)',
      code: 'UKA',
      icao: 'HKUK',
      type: 'South Coast Marine & Beach Strip',
      lat: -4.2974,
      lng: 39.5714,
      elevation: '98 ft / 30 m',
      tempC: 30,
      condition: 'Sunny & Sea Breeze',
      windKnots: 12,
      windDir: 135,
      flightCategory: 'VFR',
      runwayStatus: 'Paved Asphalt · Unrestricted',
      humidity: 71,
      loading: false,
      lastUpdated: 'Live METAR',
    },
    {
      id: 'amboseli',
      name: 'Amboseli National Park Airstrip',
      code: 'ASV',
      icao: 'HKAM',
      type: 'Kilimanjaro Plains Bush Strip',
      lat: -2.6482,
      lng: 37.2514,
      elevation: '3,757 ft / 1,145 m',
      tempC: 28,
      condition: 'Clear Sky · Mt. Kilimanjaro Visible',
      windKnots: 9,
      windDir: 100,
      flightCategory: 'VFR',
      runwayStatus: 'Firm Compacted Earth · Open',
      humidity: 42,
      loading: false,
      lastUpdated: 'Live METAR',
    },
  ]);

  readonly filteredAirstripsWeather = computed(() => {
    const filter = this.selectedWeatherFilter();
    const list = this.airstripsWeather();
    if (filter === 'wilson') return list.filter((a) => a.id === 'wilson');
    if (filter === 'safari') return list.filter((a) => a.id === 'mara' || a.id === 'lewa' || a.id === 'amboseli');
    if (filter === 'coastal') return list.filter((a) => a.id === 'vipingo' || a.id === 'diani');
    return list;
  });

  // Web Audio API engine state for continuous background jet sound synthesis
  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private isEngineRunning = false;

  // Booking Form with Kenya defaults
  readonly bookingForm = new FormGroup({
    tripType: new FormControl<'one-way' | 'round-trip'>('one-way', { nonNullable: true }),
    departureAirport: new FormControl('Nairobi Wilson (WIL)', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    arrivalAirport: new FormControl('Kisumu (KIS) — Regional Hospital Corridor', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    flightDate: new FormControl('2026-10-15', {
      nonNullable: true,
      validators: [Validators.required],
    }),
    passengers: new FormControl(4, {
      nonNullable: true,
      validators: [Validators.required, Validators.min(1), Validators.max(16)],
    }),
    jetTier: new FormControl('Pilatus PC-12 (Turboprop)', { nonNullable: true }),
    contactName: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.minLength(2)],
    }),
    contactEmail: new FormControl('', {
      nonNullable: true,
      validators: [Validators.required, Validators.email],
    }),
  });

  // Popular Kenya charter routes for quick selection
  readonly kenyaRoutes = [
    { from: 'Nairobi Wilson (WIL)', to: 'Kisumu (KIS)', label: 'Wilson → Kisumu Regional', duration: '50 mins' },
    { from: 'Nairobi Wilson (WIL)', to: 'Mombasa (MBA)', label: 'Wilson → Mombasa Coast', duration: '55 mins' },
    { from: 'Nairobi Wilson (WIL)', to: 'Lokichogio (LKG)', label: 'Wilson → Remote North', duration: '1h 45m' },
    { from: 'Nairobi Wilson (WIL)', to: 'Entebbe (EBB)', label: 'Wilson → Entebbe Cross-Border', duration: '1h 05m' },
  ];

  selectKenyaRoute(route: { from: string; to: string }): void {
    this.bookingForm.patchValue({
      departureAirport: route.from,
      arrivalAirport: route.to,
    });
  }

  // Fleet data for Discover Modal
  readonly fleet: FleetJet[] = [
    {
      name: 'Pilatus PC-12',
      category: 'Regional & Remote-Strip Turboprop',
      passengers: 'Up to 9 passengers',
      range: '1,800 nm',
      speed: '290 kts cruise',
      hourlyRate: 'Personalised quote within 24 hours',
      description:
        'Versatile single-engine turboprop — ideal for regional charters and remote airstrip access across Africa, with premium interiors configured for your mission.',
    },
    {
      name: 'Cessna Citation Sovereign (C680)',
      category: 'Mid-Size Business Jet',
      passengers: 'Up to 9 passengers',
      range: '3,200 nm',
      speed: '458 kts cruise',
      hourlyRate: 'Personalised quote within 24 hours',
      description:
        'Long-range mid-size jet combining executive comfort with international charter capability for cross-border and continental itineraries from Wilson Airport.',
    },
  ];

  // Nav Sections details contextualized for Kenya
  readonly navDetails: Record<string, NavSectionContent> = {
    Start: {
      title: 'Charter Flights from Wilson Airport',
      subtitle:
        'Purpose-driven air charters from Nairobi Wilson (WIL) — flexible scheduling, remote airstrip access, and full ground handling for corporate, NGO, and urgent travel across East Africa.',
      items: [
        {
          label: '24/7 Charter Request Desk',
          detail:
            'Submit an itinerary online or by phone; receive a personalised quote, routing plan, and aircraft recommendation typically within one business day.',
        },
        {
          label: 'Remote & Unpaved Airstrip Access',
          detail:
            'Turboprop fleet certified for short runways and bush strips where road access is limited — ideal for field programmes and last-mile connectivity.',
        },
        {
          label: 'Cross-Border Coordination',
          detail:
            'Customs, overflight permits, and ground ambulance handoffs coordinated for Uganda, Tanzania, Rwanda, South Sudan, and wider Africa as required.',
        },
      ],
    },
    Story: {
      title: 'Trusted Aviation, Purposeful Impact',
      subtitle:
        'SkyElite demonstrates how a leading East African aviation operator can pair decades of aero-medical expertise with premium charter services that fund health programmes across the continent.',
      items: [
        {
          label: 'Wilson Airport Heritage',
          detail:
            'Operations anchored at Wilson Airport with crews experienced in time-critical missions, remote logistics, and passenger care under pressure.',
        },
        {
          label: 'KCAA-Certified Operations',
          detail:
            'Aircraft maintained to Kenya Civil Aviation Authority standards with documented SMS practices and recurrent crew training.',
        },
        {
          label: 'Charter With Meaning',
          detail:
            'Every charter booking modelled after impact aviation: a portion of commercial charter revenue supports maternal and community health outreach (demo narrative for client POC).',
        },
      ],
    },
    Rates: {
      title: 'Charter Pricing & Quote Model',
      subtitle:
        'Transparent, route-based quotes in USD and Kenyan Shillings — no hidden handling fees; pricing reflects aircraft type, crew duty, and strip complexity.',
      items: [
        {
          label: 'Regional Turboprop Charters',
          detail:
            'Indicative from $3,200/leg (Wilson to Kisumu, Nakuru, or Eldoret; ~45–55 min block time, PC-12 class).',
        },
        {
          label: 'Coastal & Cross-Border',
          detail:
            'Indicative from $4,500/leg (Wilson to Mombasa or Entebbe; includes standard ground handling at Wilson).',
        },
        {
          label: 'Jet & Urgent Dispatch',
          detail:
            'Citation-class jet and priority same-day departures priced hourly on request — medical escort and cargo configurations quoted separately.',
        },
      ],
    },
    Benefits: {
      title: 'Charter Services Built on Trust',
      subtitle:
        'Fly on your schedule with medical-grade discipline: experienced dispatch, rigorous briefing, and cabins configured for executive teams or assisted passengers.',
      items: [
        {
          label: 'Flexible Itineraries',
          detail:
            'Multi-leg days, stand-by aircraft, and last-minute route changes handled by dedicated charter coordinators.',
        },
        {
          label: 'Medical & Executive Cabins',
          detail:
            'Layout options from club seating to stretcher-capable configurations with oxygen and secure medical kit stowage when required.',
        },
        {
          label: 'Integrated Ground Support',
          detail:
            'Ambulance meet-and-greet, hotel transfers, and facility coordination available at Wilson and major regional destinations.',
        },
      ],
    },
    FAQ: {
      title: 'Charter Booking Guide',
      subtitle:
        'Answers for programme managers, corporate travel desks, and families arranging private charters in Kenya and the wider region.',
      items: [
        {
          label: 'How do I book a charter flight?',
          detail:
            'Use the Book Flight form with departure, destination, date, and passenger count. Our team confirms aircraft availability, pricing, and ground logistics.',
        },
        {
          label: 'Can you land on remote airstrips?',
          detail:
            'Yes — turboprop aircraft in our demo fleet are spec’d for short and unpaved strips subject to runway survey and daylight operating rules.',
        },
        {
          label: 'Is this the same as an air ambulance?',
          detail:
            'Charter flights are scheduled private transport. Time-critical medical evacuations require a separate medevac activation — this POC focuses on charter sales workflow.',
        },
      ],
    },
  };

  toggleMobileMenu(): void {
    this.isMobileMenuOpen.update((open) => !open);
  }

  closeMobileMenu(): void {
    this.isMobileMenuOpen.set(false);
  }

  toggleDesktopDropdown(groupId: string, event?: Event): void {
    if (event) {
      event.stopPropagation();
    }
    this.activeDesktopDropdown.update((cur) => (cur === groupId ? null : groupId));
  }

  setDesktopDropdown(groupId: string): void {
    this.activeDesktopDropdown.set(groupId);
  }

  clearDesktopDropdown(): void {
    this.activeDesktopDropdown.set(null);
  }

  toggleMobileGroup(groupId: string): void {
    this.activeMobileGroup.update((cur) => (cur === groupId ? null : groupId));
  }

  executeNavAction(action: NavSubItem['action']): void {
    this.clearDesktopDropdown();
    this.closeMobileMenu();

    switch (action) {
      case 'rates':
        this.openNavModal('Rates');
        break;
      case 'dispatch':
        this.openNavModal('Start');
        break;
      case 'faq':
        this.openNavModal('FAQ');
        break;
      case 'interiors':
        this.openDiscoverModal('interiors');
        break;
      case 'fleet':
        this.openDiscoverModal('fleet');
        break;
      case 'benefits':
        this.openNavModal('Benefits');
        break;
      case 'radar':
        this.openFlightTracker();
        break;
      case 'weather':
        this.openNavModal('Start', 'weather');
        break;
      case 'story':
      case 'safety':
        this.openNavModal('Story');
        break;
    }
  }

  onDocumentClick(event: MouseEvent): void {
    const target = event.target as HTMLElement | null;
    if (!target?.closest('.nav-dropdown-group')) {
      this.clearDesktopDropdown();
    }
  }

  onEscapeKey(): void {
    this.clearDesktopDropdown();
    if (this.isMobileMenuOpen()) {
      this.closeMobileMenu();
    }
  }

  openBookingModal(): void {
    this.bookingSuccess.set(false);
    this.isBookingModalOpen.set(true);
    this.closeMobileMenu();
  }

  closeBookingModal(): void {
    this.isBookingModalOpen.set(false);
  }

  openDiscoverModal(tab: 'interiors' | 'fleet' = 'interiors'): void {
    this.discoverModalTab.set(tab);
    this.isDiscoverModalOpen.set(true);
    this.closeMobileMenu();
  }

  closeDiscoverModal(): void {
    this.isDiscoverModalOpen.set(false);
  }

  setDiscoverModalTab(tab: 'interiors' | 'fleet'): void {
    this.discoverModalTab.set(tab);
  }

  onSelectJetFromCarousel(aircraft: string): void {
    if (aircraft.includes('PC-12')) {
      this.bookingForm.patchValue({ jetTier: 'Pilatus PC-12 (Turboprop)' });
    } else {
      this.bookingForm.patchValue({ jetTier: 'Citation Sovereign C680 (Jet)' });
    }
    this.closeDiscoverModal();
    this.openBookingModal();
  }

  openFlightTracker(): void {
    this.isFlightTrackerOpen.set(true);
    this.closeMobileMenu();
  }

  closeFlightTracker(): void {
    this.isFlightTrackerOpen.set(false);
  }

  planCharterRoute(event: { origin: string; destination: string }): void {
    this.bookingForm.patchValue({
      departureAirport: event.origin,
      arrivalAirport: event.destination,
    });
    this.closeFlightTracker();
    this.closeNavModal();
    this.openBookingModal();
  }

  openNavModal(key: string, tab: 'overview' | 'weather' | 'tracker' = 'weather'): void {
    this.activeNavModal.set(key);
    this.navModalTab.set(key === 'Start' || key === 'Benefits' ? tab : 'overview');
    this.closeMobileMenu();

    // Automatically refresh live airstrip weather when viewing Start or Benefits
    if (key === 'Start' || key === 'Benefits') {
      this.fetchLiveAirstripWeather();
    }
  }

  setNavModalTab(tab: 'overview' | 'weather' | 'tracker'): void {
    this.navModalTab.set(tab);
  }

  setWeatherFilter(filter: string): void {
    this.selectedWeatherFilter.set(filter);
  }

  getWindDirectionLabel(deg: number): string {
    const directions = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE', 'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round((deg % 360) / 22.5) % 16;
    return directions[index] ?? 'VRB';
  }

  getWeatherIcon(condition: string): string {
    const c = condition.toLowerCase();
    if (c.includes('storm')) return 'thunderstorm';
    if (c.includes('rain') || c.includes('shower') || c.includes('drizzle')) return 'grain';
    if (c.includes('overcast')) return 'cloud';
    if (c.includes('partly') || c.includes('scattered')) return 'partly_cloudy_day';
    if (c.includes('clear') || c.includes('sunny')) return 'wb_sunny';
    if (c.includes('mist') || c.includes('fog')) return 'foggy';
    return 'air';
  }

  toFahrenheit(celsius: number): number {
    return Math.round((celsius * 9) / 5 + 32);
  }

  closeNavModal(): void {
    this.activeNavModal.set(null);
  }

  /**
   * Fetches real-time meteorological conditions for Kenyan executive airstrips via Open-Meteo API.
   */
  async fetchLiveAirstripWeather(): Promise<void> {
    if (typeof window === 'undefined') return;

    this.isWeatherLoading.set(true);

    try {
      const currentList = this.airstripsWeather();
      const updatedList: AirstripWeather[] = await Promise.all(
        currentList.map(async (strip) => {
          try {
            const url = `https://api.open-meteo.com/v1/forecast?latitude=${strip.lat}&longitude=${strip.lng}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,wind_direction_10m&wind_speed_unit=kn`;
            const resp = await fetch(url);
            if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
            const data = await resp.json();

            const cur = data.current;
            const code = cur?.weather_code ?? 0;
            const temp = Math.round(cur?.temperature_2m ?? strip.tempC);
            const windKnots = Math.round(cur?.wind_speed_10m ?? strip.windKnots);
            const windDir = Math.round(cur?.wind_direction_10m ?? strip.windDir);
            const humidity = Math.round(cur?.relative_humidity_2m ?? strip.humidity);
            const condition = this.decodeWeatherCode(code);

            // Flight category determination for bush flight safety
            let flightCategory: 'VFR' | 'MVFR' | 'IFR' = 'VFR';
            if (code >= 95 || windKnots > 28) {
              flightCategory = 'IFR';
            } else if (code >= 45 || windKnots > 18) {
              flightCategory = 'MVFR';
            }

            return {
              ...strip,
              tempC: temp,
              condition,
              windKnots,
              windDir,
              humidity,
              flightCategory,
              loading: false,
              lastUpdated: 'Live Just Now',
            };
          } catch {
            // Keep resilient baseline data with updated flag if network is limited
            return {
              ...strip,
              loading: false,
              lastUpdated: 'Cached Dispatch',
            };
          }
        }),
      );

      this.airstripsWeather.set(updatedList);
      this.weatherLastFetched.set(
        new Date().toLocaleTimeString('en-KE', { hour: '2-digit', minute: '2-digit' }),
      );
    } finally {
      this.isWeatherLoading.set(false);
    }
  }

  private decodeWeatherCode(code: number): string {
    switch (code) {
      case 0:
        return 'Clear Sky';
      case 1:
        return 'Mainly Clear';
      case 2:
        return 'Partly Cloudy';
      case 3:
        return 'Overcast';
      case 45:
      case 48:
        return 'Light Mist';
      case 51:
      case 53:
      case 55:
        return 'Light Drizzle';
      case 61:
      case 63:
      case 65:
        return 'Light Rain';
      case 80:
      case 81:
      case 82:
        return 'Passing Showers';
      case 95:
      case 96:
      case 99:
        return 'Isolated Storm';
      default:
        return 'Fair VFR Skies';
    }
  }

  /**
   * Pre-fills the charter booking form directly from an airstrip weather card.
   */
  selectAirstripForCharter(strip: AirstripWeather): void {
    if (strip.code === 'WIL') {
      this.bookingForm.patchValue({
        departureAirport: `${strip.name} (${strip.code})`,
        arrivalAirport: 'Maasai Mara (MRE)',
      });
    } else {
      this.bookingForm.patchValue({
        departureAirport: 'Nairobi Wilson (WIL)',
        arrivalAirport: `${strip.name} (${strip.code})`,
      });
    }
    this.closeNavModal();
    this.openBookingModal();
  }

  /**
   * Starts the hero background video muted (visual only). Sound stays off until the user toggles audio.
   */
  onHeroVideoReady(event: Event): void {
    event.stopPropagation();
    this.playHeroVideoMuted(event.target as HTMLVideoElement);
  }

  private playHeroVideoMuted(videoEl?: HTMLVideoElement | null): void {
    if (typeof window === 'undefined') return;

    const video = videoEl ?? this.bgVideoRef()?.nativeElement;
    if (!video) return;

    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;

    if (!video.paused && !video.ended) {
      return;
    }

    void video.play().catch(() => {
      this.bindHeroVideoAutoplayFallback();
    });
  }

  private bindHeroVideoAutoplayFallback(): void {
    if (this.heroVideoAutoplayFallbackBound || typeof document === 'undefined') {
      return;
    }
    this.heroVideoAutoplayFallbackBound = true;
    document.addEventListener(
      'pointerdown',
      () => this.playHeroVideoMuted(),
      { once: true, passive: true },
    );
  }

  /**
   * Initializes or resumes the Web Audio API context upon user interaction.
   */
  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    if (!this.audioCtx) {
      const AudioContextClass =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (AudioContextClass) {
        this.audioCtx = new AudioContextClass();
      }
    }
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }
    return this.audioCtx;
  }

  /**
   * Initializes and maintains a continuous, ultra-realistic twin-turbofan
   * private jet engine sound generator that runs continuously in the background.
   */
  private initContinuousJetEngine(): void {
    if (this.isEngineRunning) return;

    const ctx = this.getAudioContext();
    if (!ctx) return;

    this.isEngineRunning = true;
    const now = ctx.currentTime;

    // Master gain: starts muted at 0.00001 until unmuted
    const master = ctx.createGain();
    master.gain.setValueAtTime(0.00001, now);
    master.connect(ctx.destination);
    this.masterGain = master;

    // 1. Aerodynamic Airflow Rush (Continuous Pink Noise via Boundary Layer Filtering)
    const bufferSize = ctx.sampleRate * 3.0;
    const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.08;
      b6 = white * 0.115926;
    }

    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuffer;
    noise.loop = true;

    // Fuselage boundary layer lowpass filter
    const airFilter = ctx.createBiquadFilter();
    airFilter.type = 'lowpass';
    airFilter.frequency.setValueAtTime(480, now);
    airFilter.Q.setValueAtTime(1.4, now);

    // Ultra-slow LFO (0.12 Hz) to simulate natural high-altitude atmospheric drift
    const lfo = ctx.createOscillator();
    lfo.type = 'sine';
    lfo.frequency.setValueAtTime(0.12, now);

    const lfoGain = ctx.createGain();
    lfoGain.gain.setValueAtTime(35, now); // modulates filter frequency +/- 35Hz
    lfo.connect(lfoGain);
    lfoGain.connect(airFilter.frequency);
    lfo.start(now);

    const noiseGain = ctx.createGain();
    noiseGain.gain.setValueAtTime(0.38, now);

    noise.connect(airFilter);
    airFilter.connect(noiseGain);
    noiseGain.connect(master);
    noise.start(now);

    // 2. Twin Engine Acoustic Interference (Engine 1 vs Engine 2 Phasing/Beating)
    // Left Engine Core (~84.0 Hz triangle wave)
    const engine1Core = ctx.createOscillator();
    engine1Core.type = 'triangle';
    engine1Core.frequency.setValueAtTime(84.0, now);

    const engine1Filter = ctx.createBiquadFilter();
    engine1Filter.type = 'lowpass';
    engine1Filter.frequency.setValueAtTime(170, now);

    const engine1Gain = ctx.createGain();
    engine1Gain.gain.setValueAtTime(0.24, now);

    engine1Core.connect(engine1Filter);
    engine1Filter.connect(engine1Gain);
    engine1Gain.connect(master);
    engine1Core.start(now);

    // Right Engine Core (~84.8 Hz triangle wave) - produces the authentic 0.8 Hz acoustic beat!
    const engine2Core = ctx.createOscillator();
    engine2Core.type = 'triangle';
    engine2Core.frequency.setValueAtTime(84.8, now);

    const engine2Filter = ctx.createBiquadFilter();
    engine2Filter.type = 'lowpass';
    engine2Filter.frequency.setValueAtTime(170, now);

    const engine2Gain = ctx.createGain();
    engine2Gain.gain.setValueAtTime(0.24, now);

    engine2Core.connect(engine2Filter);
    engine2Filter.connect(engine2Gain);
    engine2Gain.connect(master);
    engine2Core.start(now);

    // 3. High-Bypass Fan Blade Spool Whine (Williams International / Rolls-Royce tone)
    const turbine1 = ctx.createOscillator();
    turbine1.type = 'sine';
    turbine1.frequency.setValueAtTime(282.0, now);

    const turbine1Gain = ctx.createGain();
    turbine1Gain.gain.setValueAtTime(0.1, now);
    turbine1.connect(turbine1Gain);
    turbine1Gain.connect(master);
    turbine1.start(now);

    const turbine2 = ctx.createOscillator();
    turbine2.type = 'sine';
    turbine2.frequency.setValueAtTime(284.5, now);

    const turbine2Gain = ctx.createGain();
    turbine2Gain.gain.setValueAtTime(0.1, now);
    turbine2.connect(turbine2Gain);
    turbine2Gain.connect(master);
    turbine2.start(now);

    // 4. Sub-bass Thrust Core Foundation (48 Hz deep resonance)
    const subOsc = ctx.createOscillator();
    subOsc.type = 'sine';
    subOsc.frequency.setValueAtTime(48.0, now);

    const subGain = ctx.createGain();
    subGain.gain.setValueAtTime(0.18, now);
    subOsc.connect(subGain);
    subGain.connect(master);
    subOsc.start(now);

    // 5. Higher Compressor Stage Harmonic (~565 Hz)
    const harmonicOsc = ctx.createOscillator();
    harmonicOsc.type = 'sine';
    harmonicOsc.frequency.setValueAtTime(566.0, now);

    const harmonicGain = ctx.createGain();
    harmonicGain.gain.setValueAtTime(0.035, now);
    harmonicOsc.connect(harmonicGain);
    harmonicGain.connect(master);
    harmonicOsc.start(now);
  }

  /**
   * Plays an authentic executive aircraft passenger cabin chime.
   */
  private playCabinChime(ctx: AudioContext, startTime: number): void {
    const tones = [739.99, 932.33]; // Harmonious F#5 -> A#5 chime
    tones.forEach((freq, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, startTime + idx * 0.16);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.0001, startTime + idx * 0.16);
      gain.gain.linearRampToValueAtTime(0.06, startTime + idx * 0.16 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, startTime + idx * 0.16 + 0.65);

      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(startTime + idx * 0.16);
      osc.stop(startTime + idx * 0.16 + 0.7);
    });
  }

  /**
   * Toggles the audio icon right next to the "Book Flight" button.
   * Keeps the realistic jet engine audio running continuously behind the scenes!
   * Turning on smoothly ramps up the volume; turning off smoothly mutes while remaining in continuous flight.
   */
  toggleAudio(): void {
    const video = this.bgVideoRef()?.nativeElement;
    const currentlyMuted = this.isVideoMuted();

    // Ensure persistent engine is initialized
    if (!this.isEngineRunning) {
      this.initContinuousJetEngine();
    }

    const ctx = this.getAudioContext();
    if (ctx && ctx.state === 'suspended') {
      ctx.resume().catch((resumeErr) => {
        void resumeErr;
      });
    }

    if (currentlyMuted) {
      // UNMUTE: Ramp engine volume up seamlessly (already running behind the scenes)
      if (this.masterGain && ctx) {
        const now = ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.32, now + 0.25);
        this.playCabinChime(ctx, now);
      }
      if (video) {
        video.muted = false;
        video.play().catch((playErr) => {
          void playErr;
        });
      }
      this.isVideoMuted.set(false);
    } else {
      // MUTE: Smoothly silence volume, but keep engine playing continuously in the background!
      if (this.masterGain && ctx) {
        const now = ctx.currentTime;
        this.masterGain.gain.cancelScheduledValues(now);
        this.masterGain.gain.setValueAtTime(this.masterGain.gain.value, now);
        this.masterGain.gain.linearRampToValueAtTime(0.00001, now + 0.2);
      }
      if (video) {
        video.muted = true;
      }
      this.isVideoMuted.set(true);
    }
  }

  submitBooking(): void {
    if (this.bookingForm.valid) {
      const formVal = this.bookingForm.getRawValue();
      this.bookingSuccess.set(true);

      // Persist flight manifest request to Firestore
      saveCharterInquiry({
        tripType: formVal.tripType,
        departureAirport: formVal.departureAirport,
        arrivalAirport: formVal.arrivalAirport,
        flightDate: formVal.flightDate,
        passengers: Number(formVal.passengers),
        jetTier: formVal.jetTier,
        contactName: formVal.contactName,
        contactEmail: formVal.contactEmail,
        createdAt: new Date().toISOString(),
      }).catch((err) => {
        // Log gracefully while maintaining optimistic UI confirmation for client
        console.warn('Firestore sync note:', err);
      });
    } else {
      this.bookingForm.markAllAsTouched();
    }
  }
}
