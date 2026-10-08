import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  computed,
  output,
  signal,
  viewChild,
} from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

export interface AircraftPhoto {
  id: string;
  title: string;
  subtitle: string;
  aircraft: string;
  category: 'all' | 'seating' | 'dining' | 'stateroom' | 'cockpit' | 'amenities';
  imageUrl: string;
  badge: string;
  specs: { label: string; value: string }[];
  description: string;
  amenitiesList: string[];
}

@Component({
  selector: 'app-aircraft-carousel',
  imports: [MatIconModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="aircraft-carousel relative w-full select-none"
      role="region"
      aria-roledescription="carousel"
      aria-label="Aircraft Interior and Luxury Amenities Gallery"
      tabindex="0"
      (keydown.arrowleft)="prev()"
      (keydown.arrowright)="next()"
      (keydown.home)="goToSlide(0)"
      (keydown.end)="goToSlide(filteredPhotos().length - 1)"
      (mouseenter)="onMouseEnter()"
      (mouseleave)="onMouseLeave()"
    >
      <!-- Top Bar: Category Filter Tabs & Slide Counter -->
      <div class="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
        <!-- Filter Tabs -->
        <div class="flex items-center flex-wrap gap-1.5 p-1 bg-black/5 rounded-2xl w-full sm:w-auto">
          @for (tab of categoryTabs; track tab.id) {
            <button
              type="button"
              (click)="selectCategory(tab.id)"
              [class.bg-white]="selectedCategory() === tab.id"
              [class.text-gray-900]="selectedCategory() === tab.id"
              [class.shadow-sm]="selectedCategory() === tab.id"
              [class.font-semibold]="selectedCategory() === tab.id"
              [class.text-gray-600]="selectedCategory() !== tab.id"
              class="px-3 py-1.5 rounded-xl text-xs font-medium transition-all cursor-pointer flex items-center gap-1.5 hover:text-gray-900"
            >
              <mat-icon class="text-sm! w-4! h-4! leading-none">{{ tab.icon }}</mat-icon>
              <span>{{ tab.label }}</span>
              <span class="text-[10px] opacity-60 ml-0.5">({{ getCategoryCount(tab.id) }})</span>
            </button>
          }
        </div>

        <!-- Controls: Autoplay toggle, Fullscreen & Counter -->
        <div class="flex items-center gap-2 self-end sm:self-auto text-xs text-gray-600">
          <!-- Autoplay Button -->
          <button
            type="button"
            (click)="toggleAutoplay()"
            [title]="isAutoplay() ? 'Pause auto-slideshow' : 'Play auto-slideshow'"
            class="px-2.5 py-1.5 rounded-xl border border-black/10 bg-white/70 hover:bg-white text-gray-700 transition-colors flex items-center gap-1 cursor-pointer"
          >
            <mat-icon class="text-xs! w-3.5! h-3.5! leading-none">
              {{ isAutoplay() ? 'pause' : 'play_arrow' }}
            </mat-icon>
            <span class="text-[11px] font-medium">{{ isAutoplay() ? 'Auto' : 'Paused' }}</span>
          </button>

          <!-- Lightbox Zoom Button -->
          <button
            type="button"
            (click)="openLightbox()"
            title="Expand to Fullscreen HD View"
            class="p-1.5 rounded-xl border border-black/10 bg-white/70 hover:bg-white text-gray-700 transition-colors flex items-center justify-center cursor-pointer"
          >
            <mat-icon class="text-sm! w-4! h-4! leading-none">fullscreen</mat-icon>
          </button>

          <!-- Current Slide Indicator -->
          <span class="font-mono text-xs font-semibold px-2.5 py-1 bg-white/80 border border-black/5 rounded-xl text-[#202A36]">
            {{ currentSlideNumber() }} / {{ totalSlides() }}
          </span>
        </div>
      </div>

      <!-- Main Carousel Stage Area -->
      <div
        #carouselContainer
        class="relative overflow-hidden rounded-2xl md:rounded-3xl shadow-xl bg-black/90 group min-h-[360px] md:min-h-[440px] cursor-grab active:cursor-grabbing border border-black/10"
        (touchstart)="onTouchStart($event)"
        (touchmove)="onTouchMove($event)"
        (touchend)="onTouchEnd()"
        (pointerdown)="onPointerDown($event)"
        (pointermove)="onPointerMove($event)"
        (pointerup)="onPointerUp()"
        (pointercancel)="onPointerUp()"
      >
        <!-- Slides Track -->
        <div
          class="flex w-full h-full min-h-[360px] md:min-h-[440px] transition-transform duration-500 ease-out"
          [style.transform]="trackTransform()"
        >
          @for (photo of filteredPhotos(); track photo.id; let i = $index) {
            <div class="w-full shrink-0 relative min-h-[360px] md:min-h-[440px] flex flex-col justify-end overflow-hidden">
              <!-- High-Resolution Image -->
              <img
                [src]="photo.imageUrl"
                [alt]="photo.title + ' - ' + photo.aircraft"
                referrerpolicy="no-referrer"
                loading="eager"
                class="absolute inset-0 w-full h-full object-cover object-center pointer-events-none transition-transform duration-700 ease-out group-hover:scale-105"
              />

              <!-- Atmospheric Vignette & Contrast Overlay -->
              <div
                class="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/10 pointer-events-none"
              ></div>

              <!-- Top Floating Badges on Image -->
              <div class="absolute top-4 left-4 right-4 flex items-center justify-between pointer-events-none z-10">
                <span
                  class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-black/60 backdrop-blur-md text-white border border-white/20 shadow-sm"
                >
                  <mat-icon class="text-xs! w-3.5! h-3.5! text-emerald-400">verified</mat-icon>
                  {{ photo.badge }}
                </span>

                <span
                  class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold bg-white/90 backdrop-blur-md text-[#202A36] shadow-sm"
                >
                  <mat-icon class="text-xs! w-3.5! h-3.5!">flight</mat-icon>
                  {{ photo.aircraft }}
                </span>
              </div>

              <!-- Bottom Slide Caption Card -->
              <div class="relative z-10 p-5 md:p-7 text-white space-y-3">
                <div class="flex flex-col md:flex-row md:items-end justify-between gap-3">
                  <div class="space-y-1 max-w-xl">
                    <p class="text-xs uppercase tracking-widest text-emerald-300 font-semibold">
                      {{ photo.subtitle }}
                    </p>
                    <h3 class="text-xl md:text-2xl font-bold tracking-tight text-white drop-shadow-sm">
                      {{ photo.title }}
                    </h3>
                    <p class="text-xs md:text-sm text-gray-200 line-clamp-2 leading-relaxed">
                      {{ photo.description }}
                    </p>
                  </div>

                  <!-- Quick Book / Inquire Button for this specific aircraft -->
                  <div class="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      (click)="onSelectJet(photo.aircraft)"
                      class="px-4 py-2 rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-semibold text-xs transition-colors shadow-lg flex items-center gap-1.5 cursor-pointer active:scale-95"
                    >
                      <mat-icon class="text-sm! w-4! h-4!">event_seat</mat-icon>
                      <span>Reserve {{ photo.aircraft.includes('Bush') ? 'PC-24' : (photo.aircraft.includes('Challenger') ? 'Challenger' : 'Jet') }}</span>
                    </button>
                    <button
                      type="button"
                      (click)="openLightbox()"
                      class="p-2 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white transition-colors cursor-pointer"
                      title="Enlarge photo"
                    >
                      <mat-icon class="text-sm! w-4! h-4!">zoom_in</mat-icon>
                    </button>
                  </div>
                </div>

                <!-- Amenity Pills & Specifications Row -->
                <div class="pt-2 border-t border-white/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                  <!-- Amenities Pills -->
                  <div class="flex flex-wrap items-center gap-1.5">
                    @for (item of photo.amenitiesList; track item) {
                      <span
                        class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-white/15 backdrop-blur-sm text-white/90 text-[11px] font-medium border border-white/10"
                      >
                        <mat-icon class="text-[10px]! w-3! h-3! text-emerald-300">check_circle</mat-icon>
                        {{ item }}
                      </span>
                    }
                  </div>

                  <!-- Specs Breakdown -->
                  <div class="flex items-center gap-3 text-[11px] text-gray-300">
                    @for (spec of photo.specs; track spec.label) {
                      <div class="flex items-center gap-1">
                        <span class="text-gray-400">{{ spec.label }}:</span>
                        <span class="font-medium text-white">{{ spec.value }}</span>
                      </div>
                    }
                  </div>
                </div>
              </div>
            </div>
          }
        </div>

        <!-- Left Prev Nav Button (Absolute) -->
        <button
          type="button"
          (click)="prev(); $event.stopPropagation()"
          aria-label="Previous aircraft interior slide"
          class="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/70 active:scale-95 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 cursor-pointer shadow-lg"
        >
          <mat-icon class="text-xl! w-6! h-6! leading-none">chevron_left</mat-icon>
        </button>

        <!-- Right Next Nav Button (Absolute) -->
        <button
          type="button"
          (click)="next(); $event.stopPropagation()"
          aria-label="Next aircraft interior slide"
          class="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 md:w-12 md:h-12 rounded-full bg-black/40 hover:bg-black/70 active:scale-95 text-white backdrop-blur-md border border-white/20 flex items-center justify-center transition-all opacity-80 group-hover:opacity-100 z-20 cursor-pointer shadow-lg"
        >
          <mat-icon class="text-xl! w-6! h-6! leading-none">chevron_right</mat-icon>
        </button>

        <!-- Touch / Drag Swipe Prompt Overlay for Mobile -->
        <div
          class="absolute bottom-2 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-black/40 backdrop-blur-md text-white/70 text-[10px] pointer-events-none md:hidden flex items-center gap-1"
        >
          <mat-icon class="text-xs! w-3! h-3!">swipe</mat-icon>
          <span>Swipe left or right</span>
        </div>

        <!-- Progress Bar for Autoplay -->
        @if (isAutoplay()) {
          <div class="absolute bottom-0 left-0 right-0 h-1 bg-white/20 z-20 overflow-hidden">
            <div
              class="h-full bg-emerald-400 transition-all ease-linear"
              [style.width.%]="autoplayProgress()"
            ></div>
          </div>
        }
      </div>

      <!-- Thumbnail Strip & Navigation Dots -->
      <div class="mt-4 flex flex-col sm:flex-row items-center justify-between gap-3">
        <!-- Pagination Dots -->
        <div class="flex items-center gap-1.5" role="tablist" aria-label="Slide thumbnails">
          @for (photo of filteredPhotos(); track photo.id; let i = $index) {
            <button
              type="button"
              role="tab"
              [attr.aria-selected]="currentIndex() === i"
              [attr.aria-label]="'Go to photo ' + (i + 1) + ': ' + photo.title"
              (click)="goToSlide(i)"
              class="h-2 rounded-full transition-all cursor-pointer"
              [class.w-7]="currentIndex() === i"
              [class.bg-[#202A36]]="currentIndex() === i"
              [class.w-2]="currentIndex() !== i"
              [class.bg-gray-300]="currentIndex() !== i"
              [class.hover:bg-gray-400]="currentIndex() !== i"
            ></button>
          }
        </div>

        <!-- Interactive Thumbnail Strip -->
        <div class="flex items-center gap-2 overflow-x-auto max-w-full pb-1 custom-scrollbar">
          @for (photo of filteredPhotos(); track photo.id; let i = $index) {
            <button
              type="button"
              (click)="goToSlide(i)"
              [class.ring-2]="currentIndex() === i"
              [class.ring-[#202A36]]="currentIndex() === i"
              [class.scale-105]="currentIndex() === i"
              [class.opacity-100]="currentIndex() === i"
              [class.opacity-60]="currentIndex() !== i"
              class="relative w-14 h-10 md:w-16 md:h-11 rounded-lg overflow-hidden shrink-0 border border-black/10 transition-all hover:opacity-100 cursor-pointer shadow-xs"
              [title]="photo.title"
            >
              <img
                [src]="photo.imageUrl"
                [alt]="photo.title"
                referrerpolicy="no-referrer"
                loading="lazy"
                class="w-full h-full object-cover"
              />
              @if (currentIndex() === i) {
                <div class="absolute inset-0 bg-emerald-500/20"></div>
              }
            </button>
          }
        </div>
      </div>
    </div>

    <!-- Fullscreen HD Lightbox Modal -->
    @if (isLightboxOpen()) {
      <div
        class="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
        aria-label="HD Photo Lightbox"
      >
        <!-- Backdrop Button -->
        <button
          type="button"
          aria-label="Close HD Lightbox backdrop"
          (click)="closeLightbox()"
          class="fixed inset-0 bg-black/90 backdrop-blur-xl w-full h-full cursor-default border-0"
        ></button>

        <div
          class="relative z-10 max-w-6xl w-full max-h-[94vh] flex flex-col rounded-3xl overflow-hidden bg-black border border-white/20 shadow-2xl"
        >
          <!-- Top Lightbox Header -->
          <div class="p-4 px-6 flex items-center justify-between border-b border-white/15 bg-black/60 text-white z-10">
            <div>
              <span class="text-xs uppercase tracking-wider text-emerald-400 font-semibold">
                {{ activePhoto().subtitle }}
              </span>
              <h4 class="text-lg md:text-xl font-bold text-white">{{ activePhoto().title }}</h4>
            </div>

            <div class="flex items-center gap-2">
              <span class="text-xs text-gray-400 font-mono">
                {{ currentIndex() + 1 }} / {{ filteredPhotos().length }}
              </span>
              <button
                type="button"
                (click)="closeLightbox()"
                class="w-9 h-9 rounded-full bg-white/10 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
                aria-label="Close HD Lightbox"
              >
                <mat-icon class="text-lg! w-5! h-5!">close</mat-icon>
              </button>
            </div>
          </div>

          <!-- Lightbox Image Stage with Previous & Next Navigation -->
          <div class="relative flex-1 min-h-[380px] md:min-h-[560px] flex items-center justify-center bg-black overflow-hidden">
            <img
              [src]="activePhoto().imageUrl"
              [alt]="activePhoto().title"
              referrerpolicy="no-referrer"
              class="max-h-[70vh] w-auto max-w-full object-contain mx-auto transition-transform duration-300"
            />

            <!-- Prev Button -->
            <button
              type="button"
              (click)="prev(); $event.stopPropagation()"
              class="absolute left-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            >
              <mat-icon class="text-2xl! w-7! h-7!">chevron_left</mat-icon>
            </button>

            <!-- Next Button -->
            <button
              type="button"
              (click)="next(); $event.stopPropagation()"
              class="absolute right-4 top-1/2 -translate-y-1/2 w-12 h-12 rounded-full bg-white/15 hover:bg-white/30 text-white backdrop-blur-md flex items-center justify-center transition-all cursor-pointer"
            >
              <mat-icon class="text-2xl! w-7! h-7!">chevron_right</mat-icon>
            </button>
          </div>

          <!-- Lightbox Bottom Details -->
          <div class="p-5 px-6 bg-black/80 border-t border-white/15 text-white flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
            <div class="max-w-2xl space-y-1">
              <p class="text-sm text-gray-300">{{ activePhoto().description }}</p>
              <div class="flex flex-wrap gap-2 pt-1">
                @for (amenity of activePhoto().amenitiesList; track amenity) {
                  <span class="text-xs bg-white/10 px-2.5 py-0.5 rounded-full text-gray-200">
                    ✓ {{ amenity }}
                  </span>
                }
              </div>
            </div>

            <div class="flex items-center gap-3 shrink-0">
              <button
                type="button"
                (click)="onSelectJet(activePhoto().aircraft); closeLightbox()"
                class="px-5 py-2.5 rounded-full bg-emerald-500 hover:bg-emerald-400 text-gray-950 font-bold text-xs uppercase tracking-wider transition-colors shadow-lg cursor-pointer"
              >
                Inquire & Book Flight
              </button>
            </div>
          </div>
        </div>
      </div>
    }
  `,
})
export class AircraftCarousel implements OnInit, OnDestroy {
  // Container element reference for swipe gesture detection
  readonly carouselContainer = viewChild<ElementRef<HTMLElement>>('carouselContainer');

  // Output event to trigger parent booking modal with aircraft
  readonly jetSelected = output<string>();

  // State signals
  readonly currentIndex = signal(0);
  readonly selectedCategory = signal<string>('all');
  readonly isAutoplay = signal(true);
  readonly autoplayProgress = signal(0);
  readonly isLightboxOpen = signal(false);

  // Swipe / Drag gesture tracking
  private touchStartX = 0;
  private touchStartY = 0;
  private isPointerDragging = false;
  private pointerStartX = 0;
  private dragDelta = 0;
  private autoplayTimer: ReturnType<typeof setInterval> | null = null;
  private progressTimer: ReturnType<typeof setInterval> | null = null;

  // Filter Categories
  readonly categoryTabs = [
    { id: 'all', label: 'All Amenities', icon: 'auto_awesome' },
    { id: 'seating', label: 'VIP Seating', icon: 'airline_seat_recline_extra' },
    { id: 'dining', label: 'Bar & Dining', icon: 'restaurant' },
    { id: 'stateroom', label: 'Stateroom', icon: 'bed' },
    { id: 'amenities', label: 'Cabin Luxury', icon: 'room_service' },
    { id: 'cockpit', label: 'Avionics', icon: 'flight_takeoff' },
  ];

  // Curated High-Definition Aircraft Interior & Luxury Amenities Collection
  readonly allPhotos: AircraftPhoto[] = [
    {
      id: 'pc24-club',
      title: 'Executive Club Seating & Bush Cabin',
      subtitle: 'Pilatus PC-24 Super Bush Jet',
      aircraft: 'Pilatus PC-24 Bush Jet',
      category: 'seating',
      imageUrl: '/images/carousel/cabin_club_seating.jpg',
      badge: 'Maasai Mara Certified',
      specs: [
        { label: 'Configuration', value: 'Double Club 8-Seat' },
        { label: 'Leather', value: 'Hand-Stitched Italian' },
        { label: 'Headroom', value: '5 ft 1 in Continuous' },
      ],
      description:
        'Ergonomic 180° swivel armchairs engineered for bush flights into the Maasai Mara, Lewa, and Amboseli. Features foldaway acacia wood work desks and individual micro-climate zones.',
      amenitiesList: ['180° Swivel & Recline', 'Burlwood Executive Desks', 'USB-C & AC Power', 'Acoustic Soundproofing'],
    },
    {
      id: 'executive-forward',
      title: 'Ultra-VIP Forward Cabin Recliners',
      subtitle: 'Hand-Stitched Leather Armchairs',
      aircraft: 'Executive Fleet Wide',
      category: 'seating',
      imageUrl: '/images/carousel/executive_forward_cabin.jpg',
      badge: 'VIP Club Comfort',
      specs: [
        { label: 'Pitch', value: 'Generous 48-inch' },
        { label: 'Upholstery', value: 'Supple Beige Leather' },
        { label: 'Acoustics', value: 'Ultra-Quiet Soundproofing' },
      ],
      description:
        'Deep-cushioned executive club leather seating with extended legroom, foldaway cocktail consoles, and acoustic dampening for peaceful travel across Kenya and beyond.',
      amenitiesList: ['Contoured Lumbar Support', 'Bespoke In-Arm Tables', 'Warm Ambient LED Rails', 'Noise-Cancelling Stowage'],
    },
    {
      id: 'champagne-bar',
      title: 'Bespoke In-Flight Champagne & Bar',
      subtitle: 'Executive Fleet Wide Sommelier Curation',
      aircraft: 'Executive Fleet Wide',
      category: 'dining',
      imageUrl: '/images/carousel/challenger_galley_bar.jpg',
      badge: 'VIP Hospitality',
      specs: [
        { label: 'Cellar', value: 'Vintage Dom Pérignon & Krug' },
        { label: 'Service', value: 'Dedicated Cabin Host' },
        { label: 'Glassware', value: 'Fine Crystal Stemware' },
      ],
      description:
        'Chilled onboard wine cellar and crystal glassware service. Every charter includes tailored sommelier pairings, rare single malts, and freshly brewed Kenyan single-estate Arabica coffee.',
      amenitiesList: ['Chilled Wine Chiller', 'Riedel Crystal Flutes', 'Kenya Single-Estate Coffee', 'Curated Reserve Spirits'],
    },
    {
      id: 'safari-dining',
      title: 'Artisan Safari Gastronomy Galley',
      subtitle: 'Farm-to-Flight Nairobi Atelier Catering',
      aircraft: 'Executive Fleet Wide',
      category: 'dining',
      imageUrl: '/images/carousel/in_flight_galley_dining.jpg',
      badge: 'Culinary Excellence',
      specs: [
        { label: 'Sourcing', value: 'Naivasha & Mount Kenya Organic' },
        { label: 'Preparation', value: 'Executive Chef Handcrafted' },
        { label: 'Manifest', value: 'Custom Dietary Requirements' },
      ],
      description:
        'Personalized gourmet repasts prepared fresh at our Wilson Airport culinary atelier. Equipped with warm convection galley ovens, silverware service, and customized safari dietary curation.',
      amenitiesList: ['Warm Convection Galley', 'Fresh Swahili Seafood', 'Kosher/Halal/Vegan Curations', 'Silverware Service'],
    },
    {
      id: 'challenger-stateroom',
      title: 'Private Master Stateroom & Berthing',
      subtitle: 'Bombardier Challenger 650 Intercontinental',
      aircraft: 'Bombardier Challenger 650',
      category: 'stateroom',
      imageUrl: '/images/carousel/challenger_850_stateroom.jpg',
      badge: 'Intercontinental Berthing',
      specs: [
        { label: 'Berthing', value: 'Lie-Flat Double Divan' },
        { label: 'Linens', value: '400TC Egyptian Cotton' },
        { label: 'Acoustics', value: 'Whisper-Quiet Soundproofing' },
      ],
      description:
        'Engineered for nonstop intercontinental journeys between Nairobi (JKIA/WIL) and London, Dubai, or Geneva. Converts smoothly into a private stateroom with lie-flat double sleeping divan.',
      amenitiesList: ['Full Lie-Flat Bed', 'Privacy Acoustic Partition', 'Cashmere Duvets', 'Ambient Mood Lighting'],
    },
    {
      id: 'savanna-views',
      title: 'Panoramic Safari Observation Lounge',
      subtitle: 'Low-Altitude Scenic Windows',
      aircraft: 'Pilatus PC-24 & Citation XLS+',
      category: 'amenities',
      imageUrl: '/images/carousel/falcon_7x_lounge.jpg',
      badge: 'Scenic Flight Experience',
      specs: [
        { label: 'Window Size', value: '1.5x Standard Jet Port' },
        { label: 'Shades', value: 'Electrochromic Tint' },
        { label: 'Optics', value: 'Anti-Glare Aviation Glass' },
      ],
      description:
        'Expansive passenger viewing lounge designed for low-altitude safari sightseeing over the Great Rift Valley escarpment, Mount Kilimanjaro, and the Great Migration river crossings.',
      amenitiesList: ['Panoramic Ports', 'Wildlife Binoculars Stowage', 'Scenic Safari Routing', 'GPS Tablet Sync'],
    },
    {
      id: 'cockpit-avionics',
      title: 'Next-Gen Glass Cockpit Flight Deck',
      subtitle: 'Integrated Multi-Function Avionics',
      aircraft: 'Citation XLS+ & Pilatus PC-24',
      category: 'cockpit',
      imageUrl: '/images/carousel/citation_glass_cockpit.jpg',
      badge: 'Dual Commercial Captains',
      specs: [
        { label: 'Audit', value: 'Wyvern & ARGUS Audited' },
        { label: 'Vision System', value: 'Synthetic 3D Vision' },
        { label: 'Avionics', value: 'Integrated Weather Radar' },
      ],
      description:
        'Piloted by two veteran East African commercial captains with thousands of logged flight hours across Rift Valley crosswinds, featuring 3D synthetic vision and real-time weather radar uplink.',
      amenitiesList: ['Dual Captain Crew', 'Real-time Radar Uplink', 'Bush Approach Guidance', 'Satellite Telemetry'],
    },
    {
      id: 'luxury-lavatory',
      title: 'Enclosed Vanity & Private Lavatory',
      subtitle: 'Executive Refreshment Sanctuary',
      aircraft: 'Challenger 650 & Pilatus PC-24',
      category: 'amenities',
      imageUrl: '/images/carousel/challenger_lavatory_vanity.jpg',
      badge: 'Full Enclosed Privacy',
      specs: [
        { label: 'Lavatory', value: 'Fully Enclosed Rigid Door' },
        { label: 'Water', value: 'Hot & Cold Running Vanity' },
        { label: 'Botanicals', value: 'Cinnabar Green Kenyan Organic' },
      ],
      description:
        'Spacious executive aft lavatory featuring solid acoustic privacy door, illuminated vanity mirror, pressurized hot running water basin, and organic botanicals crafted in Nanyuki, Kenya.',
      amenitiesList: ['Solid Acoustic Door', 'Illuminated Vanity Mirror', 'Artisan Kenyan Toiletries', 'Wardrobe Dressing Suite'],
    },
    {
      id: 'safari-cargo',
      title: 'In-Flight Accessible Safari Cargo Bay',
      subtitle: 'Direct Luggage & Camera Gear Access',
      aircraft: 'Pilatus PC-24 Super Bush Jet',
      category: 'amenities',
      imageUrl: '/images/carousel/pilatus_pc24_cargo_exterior.jpg',
      badge: 'Pallet-Sized Cargo Door',
      specs: [
        { label: 'Door Dimensions', value: '4.25 ft × 4.1 ft Pallet Size' },
        { label: 'Internal Access', value: 'Accessible During Flight' },
        { label: 'Payload', value: 'Heavy Safari Pelican Gear' },
      ],
      description:
        'The PC-24 is the only executive jet equipped with a standard pallet-sized cargo door, giving guests continuous access to heavy camera equipment, golf bags, and safari luggage during flight.',
      amenitiesList: ['In-Flight Baggage Door', 'Custom Camera Foam Cradles', 'Golf Bag Capacity', 'Pressurized & Heated Bay'],
    },
    {
      id: 'gulfstream-suite',
      title: 'Executive Workstation & Meeting Suite',
      subtitle: 'High-Altitude Productivity Suite',
      aircraft: 'Bombardier Challenger 650',
      category: 'seating',
      imageUrl: '/images/carousel/gulfstream_650_interior.jpg',
      badge: 'Airborne Boardroom',
      specs: [
        { label: 'Table', value: 'Hi-Lo Polished Conference Table' },
        { label: 'Connectivity', value: 'High-Speed Ka-Band Satellite' },
        { label: 'Displays', value: 'Dual 24-inch HD Bulkhead Screens' },
      ],
      description:
        'Executive business cabin grouping with wide polished meeting table, international AC power ports, and satellite data connectivity for seamless airborne business.',
      amenitiesList: ['Satellite Ka-Band Wi-Fi', 'HDMI & AirPlay Bulkhead Link', 'Noise-Cancelling Headsets', 'Conference Call Audio'],
    },
  ];

  // Computed filtered photos
  readonly filteredPhotos = computed(() => {
    const cat = this.selectedCategory();
    if (cat === 'all') return this.allPhotos;
    return this.allPhotos.filter((p) => p.category === cat);
  });

  readonly totalSlides = computed(() => this.filteredPhotos().length);
  readonly currentSlideNumber = computed(() => this.currentIndex() + 1);

  readonly activePhoto = computed(() => {
    const list = this.filteredPhotos();
    const idx = this.currentIndex();
    return list[idx] ?? list[0];
  });

  readonly trackTransform = computed(() => {
    const idx = this.currentIndex();
    return `translateX(-${idx * 100}%)`;
  });

  ngOnInit(): void {
    this.startAutoplay();
  }

  ngOnDestroy(): void {
    this.stopAutoplay();
  }

  selectCategory(categoryId: string): void {
    this.selectedCategory.set(categoryId);
    this.currentIndex.set(0);
    this.resetAutoplayProgress();
  }

  getCategoryCount(categoryId: string): number {
    if (categoryId === 'all') return this.allPhotos.length;
    return this.allPhotos.filter((p) => p.category === categoryId).length;
  }

  goToSlide(index: number): void {
    const total = this.totalSlides();
    if (total === 0) return;
    const safeIdx = Math.max(0, Math.min(index, total - 1));
    this.currentIndex.set(safeIdx);
    this.resetAutoplayProgress();
  }

  next(): void {
    const total = this.totalSlides();
    if (total === 0) return;
    const nextIdx = (this.currentIndex() + 1) % total;
    this.currentIndex.set(nextIdx);
    this.resetAutoplayProgress();
  }

  prev(): void {
    const total = this.totalSlides();
    if (total === 0) return;
    const prevIdx = (this.currentIndex() - 1 + total) % total;
    this.currentIndex.set(prevIdx);
    this.resetAutoplayProgress();
  }

  toggleAutoplay(): void {
    const nextState = !this.isAutoplay();
    this.isAutoplay.set(nextState);
    if (nextState) {
      this.startAutoplay();
    } else {
      this.stopAutoplay();
    }
  }

  private startAutoplay(): void {
    this.stopAutoplay();
    if (!this.isAutoplay()) return;

    const intervalMs = 5000;
    const stepMs = 50;
    let elapsed = 0;

    this.progressTimer = setInterval(() => {
      elapsed += stepMs;
      const pct = Math.min(100, (elapsed / intervalMs) * 100);
      this.autoplayProgress.set(pct);
      if (elapsed >= intervalMs) {
        elapsed = 0;
        this.next();
      }
    }, stepMs);
  }

  private stopAutoplay(): void {
    if (this.progressTimer) {
      clearInterval(this.progressTimer);
      this.progressTimer = null;
    }
    if (this.autoplayTimer) {
      clearInterval(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }

  private resetAutoplayProgress(): void {
    this.autoplayProgress.set(0);
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  onMouseEnter(): void {
    if (this.isAutoplay()) {
      this.stopAutoplay();
    }
  }

  onMouseLeave(): void {
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  // Touch Swipe Handling
  onTouchStart(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    this.touchStartX = touch.clientX;
    this.touchStartY = touch.clientY;
    this.dragDelta = 0;
    this.stopAutoplay();
  }

  onTouchMove(e: TouchEvent): void {
    const touch = e.touches[0];
    if (!touch) return;
    const deltaX = touch.clientX - this.touchStartX;
    const deltaY = touch.clientY - this.touchStartY;

    // If mainly horizontal swipe, track delta
    if (Math.abs(deltaX) > Math.abs(deltaY)) {
      this.dragDelta = deltaX;
    }
  }

  onTouchEnd(): void {
    const threshold = 40;
    if (this.dragDelta < -threshold) {
      this.next();
    } else if (this.dragDelta > threshold) {
      this.prev();
    }
    this.dragDelta = 0;
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  // Pointer / Mouse Drag Handling (for desktop users to drag/swipe)
  onPointerDown(e: PointerEvent): void {
    // Only drag with left click or primary pointer
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    this.isPointerDragging = true;
    this.pointerStartX = e.clientX;
    this.dragDelta = 0;
    this.stopAutoplay();
  }

  onPointerMove(e: PointerEvent): void {
    if (!this.isPointerDragging) return;
    this.dragDelta = e.clientX - this.pointerStartX;
  }

  onPointerUp(): void {
    if (!this.isPointerDragging) return;
    this.isPointerDragging = false;
    const threshold = 50;
    if (this.dragDelta < -threshold) {
      this.next();
    } else if (this.dragDelta > threshold) {
      this.prev();
    }
    this.dragDelta = 0;
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  // Lightbox view
  openLightbox(): void {
    this.isLightboxOpen.set(true);
    this.stopAutoplay();
  }

  closeLightbox(): void {
    this.isLightboxOpen.set(false);
    if (this.isAutoplay()) {
      this.startAutoplay();
    }
  }

  // Booking CTA
  onSelectJet(aircraft: string): void {
    this.jetSelected.emit(aircraft);
  }
}
