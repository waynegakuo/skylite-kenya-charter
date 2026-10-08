import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import * as d3 from 'd3';

export interface FlightTelemetry {
  callsign: string;
  jetModel: string;
  tailNumber: string;
  originCode: string;
  originName: string;
  destCode: string;
  destName: string;
  routeTitle: string;
  progress: number; // 0 to 1
  speedKnots: number;
  altitudeFt: number;
  headingDeg: number;
  squawk: string;
  passengers: string;
  captain: string;
  fuelHours: string;
  status: 'Cruising' | 'Descending' | 'On Approach' | 'Scenic Orbit' | 'Climbing';
  waypoints: [number, number][]; // [lng, lat]
  history: [number, number][]; // recent [lng, lat] for trail
  currentPos: [number, number]; // [lng, lat]
  color: string;
  category: 'bush' | 'executive' | 'heavy' | 'scenic';
  highlightLandmark: string;
}

export interface LandmarkFeature {
  id: string;
  name: string;
  elevation: string;
  category: 'mountain' | 'safari' | 'rift' | 'coastal' | 'airport';
  coordinates: [number, number]; // [lng, lat]
  description: string;
  runwayInfo?: string;
  distanceFromWilsonNm: number;
  badge: string;
}

@Component({
  selector: 'app-flight-tracker',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="flight-tracker-container flex flex-col h-full bg-[#0d141c] text-white rounded-3xl overflow-hidden shadow-2xl border border-white/10 select-none">
      <!-- Radar HUD Top Bar -->
      <div class="px-5 py-4 bg-[#111b26]/90 border-b border-white/10 flex flex-wrap items-center justify-between gap-3 backdrop-blur-md">
        <div class="flex items-center gap-3">
          <div class="relative flex h-3.5 w-3.5 items-center justify-center">
            <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span class="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </div>
          <div>
            <div class="flex items-center gap-2">
              <h2 class="text-base sm:text-lg font-semibold tracking-wide text-white">Live Flight Radar</h2>
              <span class="px-2 py-0.5 rounded text-[10px] font-mono font-medium tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                KCAA ADS-B FEED
              </span>
            </div>
            <p class="text-xs text-slate-400 font-mono">
              Kenyan Airspace · Wilson Airport (HKNW) Radar Center · 01°19'S 36°48'E
            </p>
          </div>
        </div>

        <!-- Controls: Simulation Speed & Layer Toggles -->
        <div class="flex items-center flex-wrap gap-2">
          <!-- Filter Buttons -->
          <div class="flex items-center bg-[#172331] rounded-xl p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              (click)="setFilter('all')"
              [class.bg-emerald-600]="activeFilter() === 'all'"
              [class.text-white]="activeFilter() === 'all'"
              [class.text-slate-300]="activeFilter() !== 'all'"
              class="px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer"
            >
              All ({{ flights().length }})
            </button>
            <button
              type="button"
              (click)="setFilter('mara')"
              [class.bg-emerald-600]="activeFilter() === 'mara'"
              [class.text-white]="activeFilter() === 'mara'"
              [class.text-slate-300]="activeFilter() !== 'mara'"
              class="px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer flex items-center gap-1"
            >
              Maasai Mara
            </button>
            <button
              type="button"
              (click)="setFilter('mtkenya')"
              [class.bg-emerald-600]="activeFilter() === 'mtkenya'"
              [class.text-white]="activeFilter() === 'mtkenya'"
              [class.text-slate-300]="activeFilter() !== 'mtkenya'"
              class="px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer flex items-center gap-1"
            >
              Mt Kenya
            </button>
            <button
              type="button"
              (click)="setFilter('coast')"
              [class.bg-emerald-600]="activeFilter() === 'coast'"
              [class.text-white]="activeFilter() === 'coast'"
              [class.text-slate-300]="activeFilter() !== 'coast'"
              class="px-2.5 py-1 rounded-lg transition-all font-medium cursor-pointer flex items-center gap-1"
            >
              Coast
            </button>
          </div>

          <!-- Speed Multiplier -->
          <div class="flex items-center bg-[#172331] rounded-xl p-0.5 border border-white/10 text-xs font-mono">
            <button
              type="button"
              (click)="togglePause()"
              [title]="isPaused() ? 'Resume Radar simulation' : 'Pause simulation'"
              class="px-2 py-1 rounded-lg text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center"
            >
              <mat-icon class="text-sm leading-none">{{ isPaused() ? 'play_arrow' : 'pause' }}</mat-icon>
            </button>
            <button
              type="button"
              (click)="setSimSpeed(1)"
              [class.bg-sky-600]="simSpeed() === 1 && !isPaused()"
              [class.text-white]="simSpeed() === 1 && !isPaused()"
              class="px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              1x
            </button>
            <button
              type="button"
              (click)="setSimSpeed(2)"
              [class.bg-sky-600]="simSpeed() === 2 && !isPaused()"
              [class.text-white]="simSpeed() === 2 && !isPaused()"
              class="px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              2x
            </button>
            <button
              type="button"
              (click)="setSimSpeed(4)"
              [class.bg-sky-600]="simSpeed() === 4 && !isPaused()"
              [class.text-white]="simSpeed() === 4 && !isPaused()"
              class="px-2 py-1 rounded-lg transition-colors cursor-pointer"
            >
              4x
            </button>
          </div>

          <!-- Zoom Controls -->
          <div class="flex items-center bg-[#172331] rounded-xl p-0.5 border border-white/10 text-xs">
            <button
              type="button"
              (click)="zoomIn()"
              title="Zoom in"
              class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm leading-none">add</mat-icon>
            </button>
            <button
              type="button"
              (click)="zoomOut()"
              title="Zoom out"
              class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm leading-none">remove</mat-icon>
            </button>
            <button
              type="button"
              (click)="resetView()"
              title="Reset radar center"
              class="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            >
              <mat-icon class="text-sm leading-none">my_location</mat-icon>
            </button>
          </div>

          <!-- Close Modal button if inside modal -->
          @if (closable()) {
            <button
              type="button"
              (click)="closeModal.emit()"
              class="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
              title="Close Flight Radar"
            >
              <mat-icon class="text-base">close</mat-icon>
            </button>
          }
        </div>
      </div>

      <!-- Main Radar Workspace: Map (D3) + Overlay HUD Panels -->
      <div class="relative flex-1 min-h-[480px] sm:min-h-[560px] lg:min-h-[620px] overflow-hidden bg-[#091017]">
        <!-- D3 SVG Map Container -->
        <div #mapContainer class="w-full h-full cursor-grab active:cursor-grabbing select-none"></div>

        <!-- Radar Sweep Overlay Indicator -->
        <div class="absolute top-4 left-4 pointer-events-none flex items-center gap-2 bg-[#121c27]/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
          <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
          <span class="text-slate-300">SWEEP 360° · WILSON PRIMARY RADAR</span>
          <span class="text-slate-500">|</span>
          <span class="text-emerald-400 font-semibold">{{ activeAirborneCount() }} ACTIVE JETS</span>
        </div>

        <!-- Map Layer Legend (Bottom Left) -->
        <div class="absolute bottom-4 left-4 z-10 flex flex-wrap items-center gap-2 bg-[#121c27]/85 backdrop-blur-md px-3.5 py-2 rounded-xl border border-white/10 text-[11px] text-slate-300">
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full bg-amber-400 border border-white/50"></span>
            <span>Charter Jet</span>
          </div>
          <span class="text-slate-600">·</span>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-indigo-400 border border-white/50"></span>
            <span>Mount Kenya (5,199m)</span>
          </div>
          <span class="text-slate-600">·</span>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-sm bg-emerald-500 border border-white/50"></span>
            <span>Maasai Mara Sanctuary</span>
          </div>
          <span class="text-slate-600">·</span>
          <div class="flex items-center gap-1.5">
            <span class="w-2.5 h-2.5 rounded-full border border-sky-400/80 border-dashed"></span>
            <span>Range Rings (50/100/150nm)</span>
          </div>
        </div>

        <!-- Floating Aircraft Fleet List (Top Right / Collapsible) -->
        <div class="absolute top-4 right-4 z-10 w-72 sm:w-80 max-h-[calc(100%-2rem)] flex flex-col gap-2 pointer-events-auto">
          <!-- Active Jet Roster Card -->
          <div class="bg-[#101a25]/90 backdrop-blur-md rounded-2xl border border-white/15 p-3.5 shadow-xl overflow-hidden flex flex-col">
            <div class="flex items-center justify-between pb-2 mb-2 border-b border-white/10 text-xs">
              <span class="font-semibold text-slate-200 tracking-wider flex items-center gap-1.5 font-mono">
                <mat-icon class="text-sm text-sky-400">flight_takeoff</mat-icon>
                KENYA FLEET TELEMETRY
              </span>
              <span class="text-[10px] text-slate-400 font-mono">Click jet to track</span>
            </div>

            <!-- Jet Items List -->
            <div class="flex flex-col gap-2 max-h-52 sm:max-h-60 overflow-y-auto pr-1 custom-scrollbar">
              @for (flight of filteredFlights(); track flight.callsign) {
                <button
                  type="button"
                  (click)="selectFlight(flight)"
                  [class.bg-sky-950]="selectedFlight()?.callsign === flight.callsign"
                  [class.border-sky-500]="selectedFlight()?.callsign === flight.callsign"
                  [class.bg-[#172332]/70]="selectedFlight()?.callsign !== flight.callsign"
                  [class.border-white/10]="selectedFlight()?.callsign !== flight.callsign"
                  class="w-full text-left rounded-xl p-2.5 border transition-all cursor-pointer hover:border-sky-400/60 hover:bg-[#1a293a] flex flex-col gap-1 text-xs"
                >
                  <div class="flex items-center justify-between">
                    <div class="flex items-center gap-2">
                      <span class="font-bold text-white tracking-wider font-mono">{{ flight.callsign }}</span>
                      <span class="px-1.5 py-0.2 rounded text-[10px] bg-sky-500/20 text-sky-300 font-mono">
                        {{ flight.jetModel.split(' ')[0] }} {{ flight.jetModel.split(' ')[1] }}
                      </span>
                    </div>
                    <span
                      class="text-[10px] font-mono px-1.5 py-0.5 rounded font-medium"
                      [class.bg-emerald-500/20]="flight.status === 'Cruising' || flight.status === 'Scenic Orbit'"
                      [class.text-emerald-300]="flight.status === 'Cruising' || flight.status === 'Scenic Orbit'"
                      [class.bg-amber-500/20]="flight.status === 'Descending' || flight.status === 'On Approach'"
                      [class.text-amber-300]="flight.status === 'Descending' || flight.status === 'On Approach'"
                    >
                      {{ flight.status }}
                    </span>
                  </div>

                  <div class="flex items-center justify-between text-slate-300 text-[11px]">
                    <div class="flex items-center gap-1 font-mono">
                      <span>{{ flight.originCode }}</span>
                      <mat-icon class="text-xs text-slate-500">east</mat-icon>
                      <span class="text-white font-semibold">{{ flight.destCode }}</span>
                    </div>
                    <div class="font-mono text-slate-400 text-[10px]">
                      {{ flight.altitudeFt.toLocaleString() }} ft · {{ flight.speedKnots }} kts
                    </div>
                  </div>

                  <div class="text-[10px] text-amber-300/90 font-medium truncate">
                    Over: {{ flight.highlightLandmark }}
                  </div>
                </button>
              }
            </div>
          </div>

          <!-- Selected Flight Telemetry HUD Inspector (if jet is selected) -->
          @if (selectedFlight(); as f) {
            <div class="bg-[#0f1924]/95 backdrop-blur-lg rounded-2xl border border-sky-400/40 p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div class="flex items-start justify-between pb-2 mb-2 border-b border-white/10">
                <div>
                  <div class="flex items-center gap-2">
                    <span class="text-base font-bold text-white font-mono tracking-wider">{{ f.callsign }}</span>
                    <span class="text-xs text-slate-400 font-mono">({{ f.tailNumber }})</span>
                  </div>
                  <div class="text-xs text-sky-300 font-medium">{{ f.jetModel }}</div>
                </div>
                <button
                  type="button"
                  (click)="clearSelectedFlight()"
                  class="w-6 h-6 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>

              <!-- Route & Progress Bar -->
              <div class="mb-3 bg-[#172332] rounded-xl p-2.5 border border-white/10">
                <div class="flex items-center justify-between text-xs font-mono mb-1.5">
                  <div class="flex flex-col">
                    <span class="text-[10px] text-slate-400">ORIGIN</span>
                    <span class="text-white font-bold">{{ f.originCode }} · {{ f.originName }}</span>
                  </div>
                  <mat-icon class="text-sky-400 text-sm">flight</mat-icon>
                  <div class="flex flex-col items-end">
                    <span class="text-[10px] text-slate-400">DESTINATION</span>
                    <span class="text-white font-bold">{{ f.destCode }} · {{ f.destName }}</span>
                  </div>
                </div>

                <!-- Progress Bar -->
                <div class="w-full bg-slate-700/60 rounded-full h-1.5 overflow-hidden my-1">
                  <div
                    class="bg-gradient-to-r from-sky-400 to-emerald-400 h-full rounded-full transition-all duration-300"
                    [style.width.%]="f.progress * 100"
                  ></div>
                </div>
                <div class="flex justify-between text-[10px] font-mono text-slate-400">
                  <span>Wheels Up</span>
                  <span class="text-emerald-400 font-semibold">{{ Math.round(f.progress * 100) }}% Route Flown</span>
                  <span>Arrival ETA ~{{ Math.round((1 - f.progress) * 45) + 5 }}m</span>
                </div>
              </div>

              <!-- Telemetry Gauge Grid -->
              <div class="grid grid-cols-3 gap-2 mb-3 text-center font-mono">
                <div class="bg-[#14202d] rounded-xl p-2 border border-white/5">
                  <span class="text-[10px] text-slate-400 block">ALTITUDE</span>
                  <span class="text-xs font-bold text-emerald-400">{{ f.altitudeFt.toLocaleString() }} FT</span>
                </div>
                <div class="bg-[#14202d] rounded-xl p-2 border border-white/5">
                  <span class="text-[10px] text-slate-400 block">GROUNDSPEED</span>
                  <span class="text-xs font-bold text-sky-400">{{ f.speedKnots }} KTS</span>
                </div>
                <div class="bg-[#14202d] rounded-xl p-2 border border-white/5">
                  <span class="text-[10px] text-slate-400 block">HEADING</span>
                  <span class="text-xs font-bold text-amber-400">{{ Math.round(f.headingDeg) }}° MAG</span>
                </div>
              </div>

              <!-- Manifest Details -->
              <div class="space-y-1 text-[11px] text-slate-300 mb-3 bg-[#14202d] rounded-xl p-2.5 border border-white/5">
                <div class="flex justify-between">
                  <span class="text-slate-400">Mission:</span>
                  <span class="font-medium text-white">{{ f.routeTitle }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Guests on Board:</span>
                  <span class="font-medium text-white">{{ f.passengers }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">Pilot in Command:</span>
                  <span class="font-medium text-white">{{ f.captain }}</span>
                </div>
                <div class="flex justify-between">
                  <span class="text-slate-400">SSR Squawk:</span>
                  <span class="font-mono text-emerald-300">{{ f.squawk }}</span>
                </div>
              </div>

              <!-- Direct Action: Plan Charter along this corridor -->
              <button
                type="button"
                (click)="bookThisRoute(f)"
                class="w-full py-2 px-3 rounded-xl bg-gradient-to-r from-sky-600 to-emerald-600 hover:from-sky-500 hover:to-emerald-500 text-white font-medium text-xs transition-all flex items-center justify-center gap-1.5 shadow-md cursor-pointer"
              >
                <mat-icon class="text-sm">airplane_ticket</mat-icon>
                <span>Charter Route ({{ f.originCode }} ➔ {{ f.destCode }})</span>
              </button>
            </div>
          }

          <!-- Selected Landmark Inspector (if landmark clicked) -->
          @if (selectedLandmark(); as lm) {
            <div class="bg-[#0f1924]/95 backdrop-blur-lg rounded-2xl border border-indigo-400/40 p-4 shadow-2xl animate-in fade-in zoom-in-95 duration-150">
              <div class="flex items-start justify-between pb-2 mb-2 border-b border-white/10">
                <div>
                  <span class="text-[10px] font-mono uppercase tracking-wider text-indigo-400">{{ lm.badge }}</span>
                  <h4 class="text-base font-bold text-white">{{ lm.name }}</h4>
                  <div class="text-xs text-slate-400 font-mono">{{ lm.elevation }}</div>
                </div>
                <button
                  type="button"
                  (click)="clearSelectedLandmark()"
                  class="w-6 h-6 rounded-full hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
                >
                  <mat-icon class="text-sm">close</mat-icon>
                </button>
              </div>

              <p class="text-xs text-slate-300 leading-relaxed mb-3">
                {{ lm.description }}
              </p>

              @if (lm.runwayInfo) {
                <div class="bg-[#14202d] rounded-xl p-2.5 border border-white/5 mb-3 text-xs">
                  <span class="text-[10px] text-slate-400 block font-mono">AIRSTRIP STATUS</span>
                  <span class="text-emerald-300 font-medium">{{ lm.runwayInfo }}</span>
                </div>
              }

              <div class="flex items-center justify-between text-xs font-mono text-slate-400 bg-[#14202d] rounded-xl p-2 mb-3">
                <span>Wilson (WIL) Distance:</span>
                <span class="text-white font-bold">{{ lm.distanceFromWilsonNm }} NM</span>
              </div>

              <button
                type="button"
                (click)="planFlightToLandmark(lm)"
                class="w-full py-2 px-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shadow-sm"
              >
                <mat-icon class="text-sm">explore</mat-icon>
                <span>Plan Charter to {{ lm.name }}</span>
              </button>
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`
    .custom-scrollbar::-webkit-scrollbar {
      width: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-track {
      background: rgba(255, 255, 255, 0.05);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb {
      background: rgba(255, 255, 255, 0.2);
      border-radius: 4px;
    }
    .custom-scrollbar::-webkit-scrollbar-thumb:hover {
      background: rgba(255, 255, 255, 0.35);
    }
  `],
})
export class FlightTracker implements OnInit, AfterViewInit, OnDestroy {
  readonly closable = input<boolean>(false);
  readonly closeModal = output<void>();
  readonly planCharter = output<{ origin: string; destination: string }>();

  readonly mapContainer = viewChild<ElementRef<HTMLDivElement>>('mapContainer');

  readonly Math = Math;

  // Active flights in simulation
  readonly flights = signal<FlightTelemetry[]>([
    {
      callsign: '5Y-SKY',
      jetModel: 'Pilatus PC-24 Super Bush Jet',
      tailNumber: '5Y-SKY · Kenya Registry',
      originCode: 'WIL',
      originName: 'Nairobi Wilson',
      destCode: 'MRE',
      destName: 'Maasai Mara (Keekorok)',
      routeTitle: 'VIP Great Migration Safari Express',
      progress: 0.62,
      speedKnots: 415,
      altitudeFt: 11500,
      headingDeg: 254,
      squawk: '4521',
      passengers: '6 Safari Guests (Luxury Tented Camp)',
      captain: 'Capt. David Kariuki (14,000 hrs Bush PIC)',
      fuelHours: '3h 40m',
      status: 'Descending',
      category: 'bush',
      color: '#f59e0b',
      highlightLandmark: 'Approaching Maasai Mara Escarpment & Talek',
      currentPos: [35.55, -1.38],
      waypoints: [
        [36.81, -1.32], // Nairobi Wilson
        [36.50, -1.25], // Ngong Hills / Rift descent
        [36.00, -1.18], // Narok Basin
        [35.55, -1.38], // Mara outer gate
        [35.18, -1.52], // Keekorok Airstrip
      ],
      history: [
        [36.81, -1.32],
        [36.45, -1.24],
        [36.10, -1.20],
        [35.80, -1.30],
        [35.55, -1.38],
      ],
    },
    {
      callsign: '5Y-ELT',
      jetModel: 'Cessna Citation XLS+',
      tailNumber: '5Y-ELT · Corporate Fleet',
      originCode: 'WIL',
      originName: 'Nairobi Wilson',
      destCode: 'VPG',
      destName: 'Vipingo Ridge Coastal',
      routeTitle: 'Executive Indian Ocean Corridor',
      progress: 0.48,
      speedKnots: 442,
      altitudeFt: 29000,
      headingDeg: 136,
      squawk: '3204',
      passengers: '8 Corporate Executives & Golf Delegates',
      captain: 'Capt. Achieng Oduor',
      fuelHours: '4h 15m',
      status: 'Cruising',
      category: 'executive',
      color: '#38bdf8',
      highlightLandmark: 'Cruising over Tsavo East & Athi River Basin',
      currentPos: [38.25, -2.52],
      waypoints: [
        [36.81, -1.32], // Nairobi Wilson
        [37.40, -1.85], // Machakos/Sultan Hamud
        [38.25, -2.52], // Tsavo Corridor
        [39.10, -3.20], // Voi / Coastal Plains
        [39.81, -3.81], // Vipingo Ridge
      ],
      history: [
        [36.81, -1.32],
        [37.20, -1.65],
        [37.65, -2.05],
        [38.00, -2.32],
        [38.25, -2.52],
      ],
    },
    {
      callsign: '5Y-MRU',
      jetModel: 'Pilatus PC-12 NGX Turboprop',
      tailNumber: '5Y-MRU · Mountain Expedition',
      originCode: 'LWR',
      originName: 'Lewa Wildlife Conservancy',
      destCode: 'WIL',
      destName: 'Nairobi Wilson (via Peak)',
      routeTitle: 'Mount Kenya Scenic Overflight Tour',
      progress: 0.38,
      speedKnots: 265,
      altitudeFt: 15200,
      headingDeg: 198,
      squawk: '2177',
      passengers: '5 National Geographic Photographers',
      captain: 'Capt. Mark Mwangi',
      fuelHours: '4h 50m',
      status: 'Scenic Orbit',
      category: 'scenic',
      color: '#a855f7',
      highlightLandmark: 'Orbiting Mount Kenya Summit (Nelion Peak 5,199m)',
      currentPos: [37.31, -0.16],
      waypoints: [
        [37.45, 0.20], // Lewa Downs
        [37.38, 0.05], // Timau slopes
        [37.31, -0.16], // Batian / Nelion peak orbit
        [37.15, -0.50], // Nyeri Valley
        [36.81, -1.32], // Nairobi Wilson
      ],
      history: [
        [37.45, 0.20],
        [37.40, 0.08],
        [37.34, -0.05],
        [37.31, -0.16],
      ],
    },
    {
      callsign: '5Y-KNY',
      jetModel: 'Bombardier Challenger 650',
      tailNumber: '5Y-KNY · Diplomatic Wing',
      originCode: 'EBB',
      originName: 'Entebbe International',
      destCode: 'WIL',
      destName: 'Nairobi Wilson VIP',
      routeTitle: 'East African Community Diplomatic Shuttle',
      progress: 0.76,
      speedKnots: 468,
      altitudeFt: 18400,
      headingDeg: 106,
      squawk: '5612',
      passengers: '11 Diplomatic Delegates & Security Detail',
      captain: 'Capt. Samuel Kibet',
      fuelHours: '5h 30m',
      status: 'Descending',
      category: 'heavy',
      color: '#10b981',
      highlightLandmark: 'Descending over Great Rift Valley & Naivasha',
      currentPos: [36.32, -0.78],
      waypoints: [
        [34.20, 0.05], // Uganda/Kenya border
        [34.75, -0.10], // Kisumu Lake basin
        [35.60, -0.40], // Mau Forest Summit
        [36.32, -0.78], // Lake Naivasha / Rift Escarpment
        [36.81, -1.32], // Nairobi Wilson
      ],
      history: [
        [34.80, -0.12],
        [35.30, -0.28],
        [35.80, -0.52],
        [36.32, -0.78],
      ],
    },
    {
      callsign: '5Y-AMB',
      jetModel: 'Beechcraft King Air 350i',
      tailNumber: '5Y-AMB · Executive Bush',
      originCode: 'ASV',
      originName: 'Amboseli National Park',
      destCode: 'WIL',
      destName: 'Nairobi Wilson FBO',
      routeTitle: 'Kilimanjaro Foothills Bush Shuttle',
      progress: 0.55,
      speedKnots: 310,
      altitudeFt: 14000,
      headingDeg: 334,
      squawk: '1403',
      passengers: '7 Safari Expedition Guests',
      captain: 'Capt. Grace Wanjiku',
      fuelHours: '3h 15m',
      status: 'Cruising',
      category: 'bush',
      color: '#f97316',
      highlightLandmark: 'North of Mount Kilimanjaro (Kibo Peak backdrop)',
      currentPos: [37.05, -2.05],
      waypoints: [
        [37.26, -2.65], // Amboseli airstrip
        [37.18, -2.35], // Namanga corridor
        [37.05, -2.05], // Kajiado plains
        [36.88, -1.60], // Athi River approach
        [36.81, -1.32], // Wilson Airport
      ],
      history: [
        [37.26, -2.65],
        [37.18, -2.35],
        [37.05, -2.05],
      ],
    },
  ]);

  // Key Kenyan Landmarks & Aviation Points
  readonly landmarks: LandmarkFeature[] = [
    {
      id: 'mtkenya',
      name: 'Mount Kenya (Batian & Nelion)',
      elevation: '5,199 m / 17,057 ft',
      category: 'mountain',
      coordinates: [37.308, -0.152],
      description:
        'Africa’s second highest peak and UNESCO World Heritage sanctuary. Key landmark for northern flights with scenic glacial tarns and severe mountain wave updrafts.',
      distanceFromWilsonNm: 78,
      badge: 'UNESCO Peak',
    },
    {
      id: 'mara',
      name: 'Maasai Mara National Reserve',
      elevation: '1,580 m / 5,183 ft',
      category: 'safari',
      coordinates: [35.144, -1.488],
      description:
        'World-famous safari arena and migration stage. Accommodates bush aircraft at Keekorok, Mara Serena, and Angama Mara airstrips.',
      runwayInfo: 'Active unpaved bush runways: Keekorok (1,280m), Serena (1,200m).',
      distanceFromWilsonNm: 115,
      badge: 'Safari Reserve',
    },
    {
      id: 'wilson',
      name: 'Nairobi Wilson Airport (WIL / HKNW)',
      elevation: '1,687 m / 5,536 ft',
      category: 'airport',
      coordinates: [36.8148, -1.3217],
      description:
        'Primary operations hub for SkyElite Kenya charters. Africa’s busiest general aviation airfield with 24/7 private VIP terminal handling.',
      runwayInfo: 'Runway 07/25 (1,563m Asphalt) · Runway 14/32 (1,463m Asphalt)',
      distanceFromWilsonNm: 0,
      badge: 'SkyElite Hub',
    },
    {
      id: 'kilimanjaro',
      name: 'Mount Kilimanjaro & Amboseli',
      elevation: '5,895 m / 19,341 ft',
      category: 'mountain',
      coordinates: [37.355, -2.90],
      description:
        'Roof of Africa rising immediately south of Amboseli airstrips. Dramatic snowcapped backdrop on all southern charter approaches.',
      runwayInfo: 'Amboseli Airstrip (HKAM): 1,180m Tarmac',
      distanceFromWilsonNm: 95,
      badge: 'Summit View',
    },
    {
      id: 'rift',
      name: 'Great Rift Valley (Lake Naivasha)',
      elevation: '1,884 m / 6,181 ft',
      category: 'rift',
      coordinates: [36.35, -0.85],
      description:
        'Monumental geological trench separating Nairobi from Western Kenya. Home to geothermal plumes at Olkaria and Hell’s Gate canyons.',
      distanceFromWilsonNm: 44,
      badge: 'Geological Rift',
    },
    {
      id: 'lewa',
      name: 'Lewa Wildlife Conservancy',
      elevation: '1,676 m / 5,500 ft',
      category: 'safari',
      coordinates: [37.45, 0.20],
      description:
        'Prestigious wildlife sanctuary north of Mount Kenya. Private airstrip connects guests to world-class conservation lodges.',
      runwayInfo: 'Lewa Downs Airstrip: 1,300m All-Weather Murram',
      distanceFromWilsonNm: 102,
      badge: 'Rhino Sanctuary',
    },
    {
      id: 'vipingo',
      name: 'Vipingo Ridge Coastal Strip',
      elevation: '140 m / 460 ft',
      category: 'coastal',
      coordinates: [39.816, -3.816],
      description:
        'Licensed paved private strip atop the Vipingo Ridge golf sanctuary. Exclusive gateway to the Kenyan Indian Ocean coastline.',
      runwayInfo: 'Runway 15/33 (1,500m Paved Tarmac · Night Lighting)',
      distanceFromWilsonNm: 242,
      badge: 'Paved Coastal Strip',
    },
  ];

  // Radar State
  readonly activeFilter = signal<'all' | 'mara' | 'mtkenya' | 'coast'>('all');
  readonly selectedFlight = signal<FlightTelemetry | null>(null);
  readonly selectedLandmark = signal<LandmarkFeature | null>(null);
  readonly simSpeed = signal<number>(1);
  readonly isPaused = signal<boolean>(false);

  readonly filteredFlights = computed(() => {
    const filter = this.activeFilter();
    const all = this.flights();
    if (filter === 'all') return all;
    if (filter === 'mara') return all.filter((f) => f.destCode === 'MRE' || f.originCode === 'MRE');
    if (filter === 'mtkenya') return all.filter((f) => f.callsign === '5Y-MRU');
    if (filter === 'coast') return all.filter((f) => f.destCode === 'VPG' || f.originCode === 'VPG');
    return all;
  });

  readonly activeAirborneCount = computed(() => this.flights().length);

  private simulationInterval: ReturnType<typeof setInterval> | null = null;
  private radarSweepAngle = 0;
  private d3Svg: d3.Selection<SVGSVGElement, unknown, null, undefined> | null = null;
  private d3Zoom: d3.ZoomBehavior<SVGSVGElement, unknown> | null = null;
  private gRoot: d3.Selection<SVGGElement, unknown, null, undefined> | null = null;
  private projection!: d3.GeoProjection;

  ngOnInit(): void {
    // Initial selection
    this.selectedFlight.set(this.flights()[0]);
  }

  ngOnDestroy(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
      this.simulationInterval = null;
    }
  }

  // After container is available, render D3 map
  ngAfterViewInit(): void {
    this.initD3Map();
    this.startFlightSimulation();
  }

  setFilter(filter: 'all' | 'mara' | 'mtkenya' | 'coast'): void {
    this.activeFilter.set(filter);
    const filtered = this.filteredFlights();
    if (filtered.length > 0) {
      this.selectFlight(filtered[0]);
    }
  }

  setSimSpeed(speed: number): void {
    this.isPaused.set(false);
    this.simSpeed.set(speed);
  }

  togglePause(): void {
    this.isPaused.update((p) => !p);
  }

  selectFlight(flight: FlightTelemetry): void {
    this.selectedFlight.set(flight);
    this.selectedLandmark.set(null);
    this.updateD3AircraftHighlights();
  }

  clearSelectedFlight(): void {
    this.selectedFlight.set(null);
    this.updateD3AircraftHighlights();
  }

  selectLandmark(landmark: LandmarkFeature): void {
    this.selectedLandmark.set(landmark);
    this.selectedFlight.set(null);
    this.updateD3AircraftHighlights();
  }

  clearSelectedLandmark(): void {
    this.selectedLandmark.set(null);
  }

  bookThisRoute(flight: FlightTelemetry): void {
    this.planCharter.emit({
      origin: flight.originName,
      destination: flight.destName,
    });
  }

  planFlightToLandmark(landmark: LandmarkFeature): void {
    this.planCharter.emit({
      origin: 'Nairobi Wilson Airport (WIL)',
      destination: landmark.name,
    });
  }

  zoomIn(): void {
    if (this.d3Svg && this.d3Zoom) {
      this.d3Svg.transition().duration(300).call(this.d3Zoom.scaleBy, 1.3);
    }
  }

  zoomOut(): void {
    if (this.d3Svg && this.d3Zoom) {
      this.d3Svg.transition().duration(300).call(this.d3Zoom.scaleBy, 0.77);
    }
  }

  resetView(): void {
    if (this.d3Svg && this.d3Zoom) {
      this.d3Svg.transition().duration(400).call(this.d3Zoom.transform, d3.zoomIdentity);
    }
  }

  /**
   * Initialize D3 SVG Map of Kenya with geographic projection, landmarks, radar rings, and aircraft
   */
  private initD3Map(): void {
    const container = this.mapContainer()?.nativeElement;
    if (!container) return;

    // Clear prior SVG
    d3.select(container).selectAll('*').remove();

    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    // Kenya centered projection (lat ~0.3N, lng ~37.9E)
    this.projection = d3
      .geoMercator()
      .center([37.6, 0.35])
      .scale(Math.min(width, height) * 5.2)
      .translate([width / 2, height / 2]);

    const svg = d3
      .select(container)
      .append('svg')
      .attr('width', '100%')
      .attr('height', '100%')
      .attr('viewBox', `0 0 ${width} ${height}`)
      .attr('preserveAspectRatio', 'xMidYMid meet')
      .style('background', '#0a121c');

    this.d3Svg = svg;

    // Setup zoom & pan
    const gRoot = svg.append('g').attr('class', 'radar-root');
    this.gRoot = gRoot;

    const zoom = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.8, 5])
      .on('zoom', (event) => {
        gRoot.attr('transform', event.transform);
      });

    this.d3Zoom = zoom;
    svg.call(zoom);

    // Defs: Gradients & Radar Pulse Filters
    const defs = svg.append('defs');

    // Radar scan gradient
    const radarGrad = defs
      .append('radialGradient')
      .attr('id', 'radar-grid-glow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    radarGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', '0.08');
    radarGrad.append('stop').attr('offset', '80%').attr('stop-color', '#0ea5e9').attr('stop-opacity', '0.02');
    radarGrad.append('stop').attr('offset', '100%').attr('stop-color', '#0369a1').attr('stop-opacity', '0');

    // Mount Kenya Peak glow
    const mtGrad = defs
      .append('radialGradient')
      .attr('id', 'mt-kenya-glow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    mtGrad.append('stop').attr('offset', '0%').attr('stop-color', '#818cf8').attr('stop-opacity', '0.4');
    mtGrad.append('stop').attr('offset', '100%').attr('stop-color', '#4f46e5').attr('stop-opacity', '0');

    // Maasai Mara Sanctuary glow
    const maraGrad = defs
      .append('radialGradient')
      .attr('id', 'mara-glow')
      .attr('cx', '50%')
      .attr('cy', '50%')
      .attr('r', '50%');
    maraGrad.append('stop').attr('offset', '0%').attr('stop-color', '#10b981').attr('stop-opacity', '0.35');
    maraGrad.append('stop').attr('offset', '100%').attr('stop-color', '#059669').attr('stop-opacity', '0');

    // 1. Render Background Radar Grid
    this.renderRadarGrid(gRoot);

    // 2. Render Kenya Geographic Outlines & Boundaries
    this.renderKenyaGeography(gRoot);

    // 3. Render Wilson Airport Radar Range Rings
    this.renderRangeRings(gRoot);

    // 4. Render Key Kenyan Landmarks (Mt Kenya, Maasai Mara, etc.)
    this.renderLandmarks(gRoot);

    // 5. Render Flight Corridors & Airways
    this.renderAirways(gRoot);

    // 6. Groups for Flight Trails and Aircraft Icons
    gRoot.append('g').attr('class', 'layer-flight-trails');
    gRoot.append('g').attr('class', 'layer-aircraft');

    // 7. Radar Sweep Line
    this.renderRadarSweep(gRoot);

    // Initial render of aircraft
    this.renderAircraft();
  }

  /**
   * Ambient latitude/longitude radar coordinate grid
   */
  private renderRadarGrid(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const gridGroup = g.append('g').attr('class', 'layer-grid').attr('opacity', 0.25);

    // Longitude lines (34E to 42E)
    for (let lng = 34; lng <= 42; lng += 2) {
      const p1 = this.projection([lng, 5.0]);
      const p2 = this.projection([lng, -5.0]);
      if (p1 && p2) {
        gridGroup
          .append('line')
          .attr('x1', p1[0])
          .attr('y1', p1[1])
          .attr('x2', p2[0])
          .attr('y2', p2[1])
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '3,4');

        gridGroup
          .append('text')
          .attr('x', p2[0] + 4)
          .attr('y', p2[1] - 4)
          .attr('fill', '#64748b')
          .attr('font-size', '9px')
          .attr('font-family', "'B612 Mono', monospace")
          .text(`${lng}°E`);
      }
    }

    // Latitude lines (4N to 4S)
    for (let lat = -4; lat <= 4; lat += 2) {
      const p1 = this.projection([34.0, lat]);
      const p2 = this.projection([42.0, lat]);
      if (p1 && p2) {
        gridGroup
          .append('line')
          .attr('x1', p1[0])
          .attr('y1', p1[1])
          .attr('x2', p2[0])
          .attr('y2', p2[1])
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 0.75)
          .attr('stroke-dasharray', '3,4');

        gridGroup
          .append('text')
          .attr('x', p1[0] + 4)
          .attr('y', p1[1] - 4)
          .attr('fill', '#64748b')
          .attr('font-size', '9px')
          .attr('font-family', "'B612 Mono', monospace")
          .text(lat === 0 ? 'EQUATOR 0°' : `${Math.abs(lat)}°${lat > 0 ? 'N' : 'S'}`);
      }
    }
  }

  /**
   * Geographic terrain polygons representing Kenya, Lake Victoria, and Indian Ocean
   */
  private renderKenyaGeography(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const geoGroup = g.append('g').attr('class', 'layer-geography');

    // Approximate high-detail border of Kenya [lng, lat]
    const kenyaBorderPoints: [number, number][] = [
      [34.1, 0.1], // Lake Victoria / Busia
      [34.2, 0.6],
      [34.56, 1.14], // Mt Elgon
      [35.0, 1.8], // Kitale / West Pokot
      [35.3, 2.5], // Turkana West
      [35.8, 3.8],
      [35.9, 4.6], // Lake Turkana North
      [36.8, 4.2], // Chalbi desert north
      [37.5, 3.8],
      [39.05, 3.52], // Moyale / Ethiopia border
      [40.5, 3.6],
      [41.86, 3.93], // Mandera tri-point
      [41.0, 2.0], // Somalia border
      [40.8, 0.5],
      [41.0, -0.5],
      [41.54, -1.75], // Lamu Kiunga coast
      [40.9, -2.3], // Lamu archipelago
      [40.1, -3.2], // Malindi
      [39.81, -3.81], // Vipingo
      [39.67, -4.05], // Mombasa
      [39.55, -4.3], // Diani Beach
      [39.22, -4.67], // Vanga (Tanzania border)
      [38.5, -3.8], // Taita Hills
      [37.8, -3.2], // Tsavo West
      [37.35, -2.9], // Kilimanjaro / Amboseli border
      [36.8, -2.3], // Namanga / Kajiado
      [35.8, -1.8], // Loita Hills
      [35.0, -1.5], // Maasai Mara southern boundary
      [34.47, -1.24], // Isebania / Lake Victoria south
      [34.1, -0.8], // Homa Bay / Rusinga Island
      [34.1, 0.1], // Closed polygon
    ];

    const kenyaPathData = this.pointsToSvgPath(kenyaBorderPoints);
    if (kenyaPathData) {
      // Kenya sovereign landmass fill
      geoGroup
        .append('path')
        .attr('d', kenyaPathData)
        .attr('fill', '#111d29')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1.8)
        .attr('stroke-opacity', 0.6)
        .attr('filter', 'drop-shadow(0 0 10px rgba(56, 189, 248, 0.15))');

      // Inner subtle glow
      geoGroup
        .append('path')
        .attr('d', kenyaPathData)
        .attr('fill', 'none')
        .attr('stroke', '#0ea5e9')
        .attr('stroke-width', 3)
        .attr('stroke-opacity', 0.15);
    }

    // Lake Victoria polygon (water body on western border)
    const lakeVictoria: [number, number][] = [
      [34.1, 0.2],
      [34.4, 0.0],
      [34.73, -0.1], // Kisumu Bay
      [34.6, -0.4],
      [34.2, -0.6],
      [34.1, -1.1],
      [33.9, -0.8],
      [33.9, 0.1],
    ];
    const lakeVictoriaPath = this.pointsToSvgPath(lakeVictoria);
    if (lakeVictoriaPath) {
      geoGroup
        .append('path')
        .attr('d', lakeVictoriaPath)
        .attr('fill', '#07243b')
        .attr('stroke', '#38bdf8')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5);

      const lakeLabel = this.projection([34.3, -0.3]);
      if (lakeLabel) {
        geoGroup
          .append('text')
          .attr('x', lakeLabel[0])
          .attr('y', lakeLabel[1])
          .attr('fill', '#38bdf8')
          .attr('opacity', 0.6)
          .attr('font-size', '10px')
          .attr('font-family', 'sans-serif')
          .attr('text-anchor', 'middle')
          .text('Lake Victoria');
      }
    }

    // Lake Turkana polygon (northern Kenya)
    const lakeTurkana: [number, number][] = [
      [35.8, 4.4],
      [36.1, 4.2],
      [36.3, 3.5],
      [36.4, 2.7],
      [36.6, 2.5],
      [36.4, 2.4],
      [36.1, 3.0],
      [35.8, 3.8],
    ];
    const lakeTurkanaPath = this.pointsToSvgPath(lakeTurkana);
    if (lakeTurkanaPath) {
      geoGroup
        .append('path')
        .attr('d', lakeTurkanaPath)
        .attr('fill', '#07243b')
        .attr('stroke', '#14b8a6')
        .attr('stroke-width', 1)
        .attr('stroke-opacity', 0.5);

      const turkanaLabel = this.projection([36.2, 3.4]);
      if (turkanaLabel) {
        geoGroup
          .append('text')
          .attr('x', turkanaLabel[0])
          .attr('y', turkanaLabel[1])
          .attr('fill', '#14b8a6')
          .attr('opacity', 0.6)
          .attr('font-size', '9px')
          .attr('font-family', 'sans-serif')
          .attr('text-anchor', 'middle')
          .text('Lake Turkana (Jade Sea)');
      }
    }

    // Great Rift Valley Escarpment Fault line
    const riftLine: [number, number][] = [
      [36.1, 1.8], // Baringo
      [36.0, 0.5], // Nakuru
      [36.35, -0.85], // Naivasha / Hell's Gate
      [36.5, -1.5], // Suswa / Magadi
      [36.3, -2.0],
    ];
    const riftPath = this.pointsToSvgPath(riftLine);
    if (riftPath) {
      geoGroup
        .append('path')
        .attr('d', riftPath)
        .attr('fill', 'none')
        .attr('stroke', '#f59e0b')
        .attr('stroke-width', 1.5)
        .attr('stroke-dasharray', '4,4')
        .attr('stroke-opacity', 0.55);

      const riftLabel = this.projection([36.45, -0.6]);
      if (riftLabel) {
        geoGroup
          .append('text')
          .attr('x', riftLabel[0] + 6)
          .attr('y', riftLabel[1])
          .attr('fill', '#f59e0b')
          .attr('opacity', 0.7)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text('GREAT RIFT VALLEY ESCARPMENT');
      }
    }

    // Indian Ocean Coast Shading
    const indianOceanLabel = this.projection([41.0, -3.5]);
    if (indianOceanLabel) {
      geoGroup
        .append('text')
        .attr('x', indianOceanLabel[0])
        .attr('y', indianOceanLabel[1])
        .attr('fill', '#0284c7')
        .attr('opacity', 0.5)
        .attr('font-size', '13px')
        .attr('font-weight', 'bold')
        .attr('letter-spacing', '3px')
        .text('INDIAN OCEAN');
    }
  }

  /**
   * Wilson Airport Radar Rings (50 NM, 100 NM, 150 NM, 200 NM)
   */
  private renderRangeRings(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const wilsonCoords: [number, number] = [36.8148, -1.3217];
    const center = this.projection(wilsonCoords);
    if (!center) return;

    const ringGroup = g.append('g').attr('class', 'layer-range-rings');

    // Radii in pixels calculated from nautical miles (1 NM ~ 1.852 km ~ 0.0166 degrees)
    // 50 NM, 100 NM, 150 NM, 200 NM
    const nauticalMiles = [50, 100, 150, 200];

    nauticalMiles.forEach((nm) => {
      // 1 degree latitude ~ 60 NM
      const latOffset = nm / 60;
      const targetPoint = this.projection([wilsonCoords[0], wilsonCoords[1] + latOffset]);
      if (!targetPoint) return;

      const radiusPx = Math.abs(center[1] - targetPoint[1]);

      ringGroup
        .append('circle')
        .attr('cx', center[0])
        .attr('cy', center[1])
        .attr('r', radiusPx)
        .attr('fill', 'none')
        .attr('stroke', '#0284c7')
        .attr('stroke-width', 0.75)
        .attr('stroke-dasharray', '4,6')
        .attr('stroke-opacity', 0.4);

      // Range label
      ringGroup
        .append('text')
        .attr('x', center[0] + radiusPx - 6)
        .attr('y', center[1] - 4)
        .attr('fill', '#38bdf8')
        .attr('opacity', 0.5)
        .attr('font-size', '8px')
        .attr('font-family', "'B612 Mono', monospace")
        .attr('text-anchor', 'end')
        .text(`${nm} NM`);
    });

    // Wilson central radar hub symbol
    ringGroup
      .append('circle')
      .attr('cx', center[0])
      .attr('cy', center[1])
      .attr('r', 5)
      .attr('fill', '#0284c7')
      .attr('stroke', '#ffffff')
      .attr('stroke-width', 1.5);
  }

  /**
   * Highlights specific landmarks like Mount Kenya, Maasai Mara, Kilimanjaro, Amboseli, etc.
   */
  private renderLandmarks(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const landmarkGroup = g.append('g').attr('class', 'layer-landmarks');

    this.landmarks.forEach((lm) => {
      const pos = this.projection(lm.coordinates);
      if (!pos) return;

      const group = landmarkGroup
        .append('g')
        .attr('class', `landmark landmark-${lm.id}`)
        .attr('transform', `translate(${pos[0]}, ${pos[1]})`)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          this.selectLandmark(lm);
        });

      // Special highlight styling per category
      if (lm.id === 'mtkenya') {
        // Mount Kenya Peak Contours & Snowcap icon
        group.append('circle').attr('r', 32).attr('fill', 'url(#mt-kenya-glow)');

        // Mountain elevation contour rings
        group
          .append('circle')
          .attr('r', 16)
          .attr('fill', 'none')
          .attr('stroke', '#818cf8')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,2');

        // Mountain summit triangle symbol
        group
          .append('polygon')
          .attr('points', '0,-12 9,6 -9,6')
          .attr('fill', '#6366f1')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        // Snowcap top
        group.append('polygon').attr('points', '0,-12 4,-5 -4,-5').attr('fill', '#ffffff');

        // Label
        group
          .append('text')
          .attr('x', 14)
          .attr('y', -4)
          .attr('fill', '#e0e7ff')
          .attr('font-weight', 'bold')
          .attr('font-size', '11px')
          .text('Mount Kenya');

        group
          .append('text')
          .attr('x', 14)
          .attr('y', 9)
          .attr('fill', '#a5b4fc')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text('5,199m · Batian & Nelion');
      } else if (lm.id === 'mara') {
        // Maasai Mara wildlife reserve polygon / sanctuary glow
        group.append('circle').attr('r', 38).attr('fill', 'url(#mara-glow)');

        group
          .append('rect')
          .attr('x', -24)
          .attr('y', -16)
          .attr('width', 48)
          .attr('height', 32)
          .attr('rx', 8)
          .attr('fill', '#065f46')
          .attr('fill-opacity', 0.4)
          .attr('stroke', '#10b981')
          .attr('stroke-width', 1.5)
          .attr('stroke-dasharray', '3,3');

        // Wildlife migration icon / beacon
        group
          .append('circle')
          .attr('r', 5)
          .attr('fill', '#10b981')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        // Label
        group
          .append('text')
          .attr('x', 0)
          .attr('y', 24)
          .attr('fill', '#34d399')
          .attr('font-weight', 'bold')
          .attr('font-size', '10px')
          .attr('text-anchor', 'middle')
          .text('Maasai Mara Reserve');

        group
          .append('text')
          .attr('x', 0)
          .attr('y', 36)
          .attr('fill', '#6ee7b7')
          .attr('font-size', '8.5px')
          .attr('font-family', 'monospace')
          .attr('text-anchor', 'middle')
          .text('Keekorok / Serena Bush Strips');
      } else if (lm.id === 'wilson') {
        // Wilson Airport VIP Hub icon
        group
          .append('circle')
          .attr('r', 7)
          .attr('fill', '#0284c7')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.5);

        group
          .append('text')
          .attr('x', 12)
          .attr('y', -3)
          .attr('fill', '#38bdf8')
          .attr('font-weight', 'bold')
          .attr('font-size', '11px')
          .text('WILSON (WIL)');

        group
          .append('text')
          .attr('x', 12)
          .attr('y', 9)
          .attr('fill', '#94a3b8')
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text('SkyElite Base · VIP FBO');
      } else if (lm.id === 'kilimanjaro') {
        // Mount Kilimanjaro summit icon
        group
          .append('polygon')
          .attr('points', '0,-10 8,5 -8,5')
          .attr('fill', '#4f46e5')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1.2);

        group
          .append('text')
          .attr('x', 12)
          .attr('y', 0)
          .attr('fill', '#c7d2fe')
          .attr('font-size', '10px')
          .attr('font-weight', 'semibold')
          .text('Mt Kilimanjaro');

        group
          .append('text')
          .attr('x', 12)
          .attr('y', 11)
          .attr('fill', '#a5b4fc')
          .attr('font-size', '8.5px')
          .attr('font-family', 'monospace')
          .text('5,895m (Amboseli HKAM)');
      } else {
        // Standard landmark pin
        group
          .append('circle')
          .attr('r', 4.5)
          .attr('fill', '#0ea5e9')
          .attr('stroke', '#ffffff')
          .attr('stroke-width', 1);

        group
          .append('text')
          .attr('x', 8)
          .attr('y', 3)
          .attr('fill', '#cbd5e1')
          .attr('font-size', '9.5px')
          .text(lm.name);
      }
    });
  }

  /**
   * Flight corridors & Airways connecting key Kenyan destinations
   */
  private renderAirways(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const airwayGroup = g.append('g').attr('class', 'layer-airways').attr('opacity', 0.35);

    const corridors: [string, [number, number], [number, number]][] = [
      ['UG656 (WIL ➔ MRE)', [36.81, -1.32], [35.18, -1.52]],
      ['UW24 (WIL ➔ VPG)', [36.81, -1.32], [39.81, -3.81]],
      ['UN18 (WIL ➔ LWR)', [36.81, -1.32], [37.45, 0.2]],
      ['UA400 (WIL ➔ ASV)', [36.81, -1.32], [37.26, -2.65]],
      ['UQ12 (KIS ➔ WIL)', [34.73, -0.1], [36.81, -1.32]],
    ];

    corridors.forEach(([, p1, p2]) => {
      const c1 = this.projection(p1);
      const c2 = this.projection(p2);
      if (c1 && c2) {
        airwayGroup
          .append('line')
          .attr('x1', c1[0])
          .attr('y1', c1[1])
          .attr('x2', c2[0])
          .attr('y2', c2[1])
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 1)
          .attr('stroke-dasharray', '2,4');
      }
    });
  }

  /**
   * 360° Rotating Radar Sweep Line centered at Wilson Airport
   */
  private renderRadarSweep(g: d3.Selection<SVGGElement, unknown, null, undefined>): void {
    const center = this.projection([36.8148, -1.3217]);
    if (!center) return;

    const sweepGroup = g.append('g').attr('class', 'layer-radar-sweep');

    // Sweep line
    const sweepLine = sweepGroup
      .append('line')
      .attr('x1', center[0])
      .attr('y1', center[1])
      .attr('x2', center[0] + 340)
      .attr('y2', center[1])
      .attr('stroke', '#10b981')
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.7);

    // Animation loop for radar sweep rotation
    const rotateSweep = () => {
      this.radarSweepAngle = (this.radarSweepAngle + 1.2) % 360;
      const rad = (this.radarSweepAngle * Math.PI) / 180;
      const sweepLength = 320;
      const x2 = center[0] + Math.cos(rad) * sweepLength;
      const y2 = center[1] + Math.sin(rad) * sweepLength;

      sweepLine.attr('x2', x2).attr('y2', y2);
      requestAnimationFrame(rotateSweep);
    };

    requestAnimationFrame(rotateSweep);
  }

  /**
   * Continuous real-time simulated flight dynamics & updates
   */
  private startFlightSimulation(): void {
    if (this.simulationInterval) {
      clearInterval(this.simulationInterval);
    }

    this.simulationInterval = setInterval(() => {
      if (this.isPaused()) return;

      const speedFactor = this.simSpeed();
      const dt = 0.003 * speedFactor;

      const updated = this.flights().map((flight) => {
        let nextProgress = flight.progress + dt;
        if (nextProgress > 1) {
          // Loop or reverse flight direction
          nextProgress = 0.05;
        }

        // Interpolate position along waypoints
        const { pos, heading } = this.interpolatePath(flight.waypoints, nextProgress);

        // Keep 8-point history trail
        const history = [...flight.history];
        const lastHist = history[history.length - 1];
        if (!lastHist || Math.hypot(pos[0] - lastHist[0], pos[1] - lastHist[1]) > 0.03) {
          history.push(pos);
          if (history.length > 10) history.shift();
        }

        // Altitude changes
        let altitude = flight.altitudeFt;
        if (flight.status === 'Descending') {
          altitude = Math.max(6200, altitude - Math.round(15 * speedFactor));
        } else if (flight.status === 'Climbing') {
          altitude = Math.min(31000, altitude + Math.round(18 * speedFactor));
        } else if (flight.status === 'Scenic Orbit') {
          altitude = 14800 + Math.round(Math.sin(nextProgress * 20) * 400);
        }

        // Speed fluctuation
        const speed = flight.speedKnots + (Math.random() > 0.5 ? 1 : -1) * Math.floor(Math.random() * 2);

        return {
          ...flight,
          progress: nextProgress,
          currentPos: pos,
          headingDeg: heading,
          altitudeFt: altitude,
          speedKnots: speed,
          history,
        };
      });

      this.flights.set(updated);

      // Keep selected flight in sync
      const currentSelected = this.selectedFlight();
      if (currentSelected) {
        const found = updated.find((f) => f.callsign === currentSelected.callsign);
        if (found) this.selectedFlight.set(found);
      }

      // Re-render D3 aircraft layer
      this.renderAircraft();
    }, 120);
  }

  /**
   * Render or update aircraft symbols and trails in D3
   */
  private renderAircraft(): void {
    if (!this.gRoot) return;

    const trailLayer = this.gRoot.select('.layer-flight-trails');
    const planeLayer = this.gRoot.select('.layer-aircraft');

    // 1. Render Breadcrumb Trails
    trailLayer.selectAll('*').remove();
    this.flights().forEach((flight) => {
      if (flight.history.length < 2) return;

      const pathData = this.pointsToSvgPath(flight.history);
      if (pathData) {
        trailLayer
          .append('path')
          .attr('d', pathData)
          .attr('fill', 'none')
          .attr('stroke', flight.color)
          .attr('stroke-width', 2)
          .attr('stroke-opacity', 0.5)
          .attr('stroke-dasharray', '3,3');
      }

      // Future projected route line
      const fullRoute = this.pointsToSvgPath(flight.waypoints);
      if (fullRoute) {
        trailLayer
          .append('path')
          .attr('d', fullRoute)
          .attr('fill', 'none')
          .attr('stroke', flight.color)
          .attr('stroke-width', 0.75)
          .attr('stroke-opacity', 0.2);
      }
    });

    // 2. Render Aircraft Glyphs
    planeLayer.selectAll('*').remove();
    const isSelectedCallsign = this.selectedFlight()?.callsign;

    this.flights().forEach((flight) => {
      const p = this.projection(flight.currentPos);
      if (!p) return;

      const isSelected = isSelectedCallsign === flight.callsign;

      const planeG = planeLayer
        .append('g')
        .attr('class', `aircraft-node aircraft-${flight.callsign}`)
        .attr('transform', `translate(${p[0]}, ${p[1]})`)
        .style('cursor', 'pointer')
        .on('click', (event) => {
          event.stopPropagation();
          this.selectFlight(flight);
        });

      // Selection pulse ring
      if (isSelected) {
        planeG
          .append('circle')
          .attr('r', 18)
          .attr('fill', 'none')
          .attr('stroke', '#38bdf8')
          .attr('stroke-width', 1.8)
          .attr('stroke-opacity', 0.8)
          .attr('stroke-dasharray', '3,3');
      }

      // Aircraft glyph rotated by heading
      const jetSymbol = planeG.append('g').attr('transform', `rotate(${flight.headingDeg})`);

      // Shadow / halo
      jetSymbol
        .append('circle')
        .attr('r', 8)
        .attr('fill', flight.color)
        .attr('fill-opacity', isSelected ? 0.35 : 0.2);

      // Jet silhouette SVG path (Aeronautical Jet glyph)
      jetSymbol
        .append('path')
        .attr(
          'd',
          'M0,-9 L2,-3 L8,1 L8,3 L2,1 L2,7 L5,9 L5,10 L0,9 L-5,10 L-5,9 L-2,7 L-2,1 L-8,3 L-8,1 L-2,-3 Z'
        )
        .attr('fill', isSelected ? '#ffffff' : flight.color)
        .attr('stroke', '#0d1520')
        .attr('stroke-width', 0.75);

      // Transponder beacon dot
      planeG
        .append('circle')
        .attr('r', 2)
        .attr('fill', isSelected ? '#38bdf8' : '#ffffff');

      // Callsign & Telemetry Tag
      const tagG = planeG.append('g').attr('transform', 'translate(12, -8)');

      // Background pill for readability
      tagG
        .append('rect')
        .attr('x', -2)
        .attr('y', -9)
        .attr('width', isSelected ? 96 : 60)
        .attr('height', isSelected ? 24 : 14)
        .attr('rx', 4)
        .attr('fill', '#09121a')
        .attr('fill-opacity', 0.85)
        .attr('stroke', isSelected ? '#38bdf8' : 'rgba(255,255,255,0.15)')
        .attr('stroke-width', 1);

      tagG
        .append('text')
        .attr('x', 3)
        .attr('y', 2)
        .attr('fill', isSelected ? '#ffffff' : flight.color)
        .attr('font-size', '9.5px')
        .attr('font-weight', 'bold')
        .attr('font-family', "'B612 Mono', monospace")
        .text(flight.callsign);

      if (isSelected) {
        tagG
          .append('text')
          .attr('x', 3)
          .attr('y', 12)
          .attr('fill', '#94a3b8')
          .attr('font-size', '8px')
          .attr('font-family', "'B612 Mono', monospace")
          .text(`${flight.altitudeFt}ft · ${flight.speedKnots}kt`);
      }
    });
  }

  private updateD3AircraftHighlights(): void {
    this.renderAircraft();
  }

  /**
   * Helper to convert geographic coordinate array to SVG path string
   */
  private pointsToSvgPath(points: [number, number][]): string | null {
    if (!this.projection || points.length === 0) return null;

    const projected = points
      .map((p) => this.projection(p))
      .filter((p): p is [number, number] => p !== null);

    if (projected.length === 0) return null;

    return (
      'M' +
      projected
        .map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`)
        .join(' L')
    );
  }

  /**
   * Calculate position and heading along polyline waypoints for progress t in [0, 1]
   */
  private interpolatePath(
    waypoints: [number, number][],
    t: number
  ): { pos: [number, number]; heading: number } {
    if (waypoints.length < 2) {
      return { pos: waypoints[0] || [36.81, -1.32], heading: 0 };
    }

    const segments = waypoints.length - 1;
    const scaledT = Math.max(0, Math.min(0.9999, t)) * segments;
    const segIndex = Math.floor(scaledT);
    const localT = scaledT - segIndex;

    const p0 = waypoints[segIndex];
    const p1 = waypoints[segIndex + 1];

    const lng = p0[0] + (p1[0] - p0[0]) * localT;
    const lat = p0[1] + (p1[1] - p0[1]) * localT;

    // Calculate heading in degrees (0 = North, 90 = East)
    const dLng = p1[0] - p0[0];
    const dLat = p1[1] - p0[1];
    let heading = (Math.atan2(dLng, dLat) * 180) / Math.PI;
    if (heading < 0) heading += 360;

    return { pos: [lng, lat], heading };
  }
}
