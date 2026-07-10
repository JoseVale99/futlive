import { Component, input, inject, ElementRef, viewChild, effect, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatchStream } from '../../../core/models/stream-model';
import { buildSafeEmbedUrl } from '../../../shared/utils/stream-url-util';

declare global {
  interface Window {
    Hls?: any;
  }
}

let hlsScriptPromise: Promise<void> | null = null;

function loadHlsJs(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve();
  if (window.Hls) return Promise.resolve();
  if (hlsScriptPromise) return hlsScriptPromise;
  hlsScriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = 'https://cdn.jsdelivr.net/npm/hls.js@1.5.13/dist/hls.min.js';
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('failed to load hls.js'));
    document.head.appendChild(s);
  });
  return hlsScriptPromise;
}

/**
 * Client-side resolver: fetches la12hd.com via CORS proxy and extracts .m3u8 URL.
 * Needed because la12hd.com is iframe-blocked (SSL cert mismatch) and the server
 * is often geo-blocked. The user's browser can reach la12hd.com directly.
 */
async function resolveLa12hdClient(url: string): Promise<string | null> {
  const proxies = [
    (u: string) => `https://corsproxy.io/?${encodeURIComponent(u)}`,
    (u: string) => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
  ];
  for (const wrap of proxies) {
    try {
      const res = await fetch(wrap(url), {
        headers: {
          'Referer': 'https://futbollibrex.net/',
          'Origin': 'https://futbollibrex.net',
        },
      });
      if (!res.ok) continue;
      const html = await res.text();
      const m = html.match(/(https?:\/\/[^\s"'<>]+\.m3u8(?:\?[^\s"'<>]*)?)/);
      if (m) return m[1];
    } catch {
      // try next proxy
    }
  }
  return null;
}

@Component({
  selector: 'app-iframe-player',
  standalone: true,
  template: `
    @if (stream() && !failed()) {
      @if (resolvedM3u8()) {
        <div class="aspect-video w-full overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 bg-black">
          <video
            #videoEl
            class="w-full h-full"
            controls
            autoplay
            playsinline
            muted
          ></video>
        </div>
      } @else if (isResolving()) {
        <div class="aspect-video w-full bg-gray-900 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
          <div class="text-center p-8">
            <div class="w-10 h-10 mx-auto mb-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
            <p class="text-gray-400 text-sm">Cargando transmisión…</p>
          </div>
        </div>
      } @else if (safeUrl()) {
        <div class="aspect-video w-full overflow-hidden rounded-xl shadow-lg border border-gray-200 dark:border-gray-700">
          <iframe
            [src]="safeUrl()!"
            [title]="stream()?.embed_name || 'Transmisión en vivo'"
            class="w-full h-full border-0"
            allow="autoplay; fullscreen; encrypted-media; picture-in-picture; clipboard-write"
            allowfullscreen
          ></iframe>
        </div>
      }
    } @else {
      <div class="aspect-video w-full bg-gray-900 rounded-xl flex items-center justify-center shadow-lg border border-gray-700">
        <div class="text-center p-8">
          <div class="w-20 h-20 mx-auto mb-4 bg-gray-800 rounded-full flex items-center justify-center border border-gray-700">
            <svg class="w-10 h-10 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="1.5" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"></path>
            </svg>
          </div>
          <h3 class="text-white text-lg font-bold mb-1">Transmisión no disponible</h3>
          <p class="text-gray-400 text-sm">Este partido no tiene señal activa en este momento</p>
        </div>
      </div>
    }
  `
})
export class IframePlayerComponent {
  stream = input<MatchStream | null>(null);
  private sanitizer = inject(DomSanitizer);
  private videoEl = viewChild<ElementRef<HTMLVideoElement>>('videoEl');
  protected failed = signal(false);
  protected resolvedM3u8 = signal<string | null>(null);
  protected isResolving = signal(false);

  constructor() {
    effect(() => {
      const stream = this.stream();
      const video = this.videoEl()?.nativeElement;
      const m3u8 = this.resolvedM3u8();
      if (!stream) {
        this.resolvedM3u8.set(null);
        return;
      }
      if (m3u8 && video) {
        this.playM3u8(video, m3u8);
      }
    });

    effect(() => {
      const stream = this.stream();
      if (!stream) {
        this.resolvedM3u8.set(null);
        this.isResolving.set(false);
        return;
      }
      const url = stream.embed_url || '';
      if (this.isM3u8Url(url)) {
        this.resolvedM3u8.set(url);
        return;
      }
      // Only resolve for futbollibrex source (la12hd.com pages)
      if (stream.source?.toLowerCase() !== 'futbollibrex') return;
      if (!/la12hd\.com/.test(url)) return;

      this.isResolving.set(true);
      this.resolvedM3u8.set(null);
      resolveLa12hdClient(url).then((m3u8) => {
        this.isResolving.set(false);
        if (m3u8) this.resolvedM3u8.set(m3u8);
        else this.failed.set(true);
      });
    });
  }

  isM3u8(): boolean {
    return !!this.resolvedM3u8() || this.isM3u8Url(this.stream()?.embed_url || '');
  }

  private isM3u8Url(url: string): boolean {
    return /\.m3u8(\?|$)/i.test(url);
  }

  safeUrl(): SafeResourceUrl | null {
    const url = buildSafeEmbedUrl(this.stream()?.embed_url || '');
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }

  private async playM3u8(video: HTMLVideoElement, url: string): Promise<void> {
    try {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
        await video.play().catch(() => {});
        return;
      }

      await loadHlsJs();
      const Hls = window.Hls;
      if (!Hls || !Hls.isSupported()) {
        this.failed.set(true);
        return;
      }
      const hls = new Hls({ enableWorker: true, lowLatencyMode: true });
      hls.loadSource(url);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {});
      });
      hls.on(Hls.Events.ERROR, (_: any, data: any) => {
        if (data?.fatal) this.failed.set(true);
      });
    } catch {
      this.failed.set(true);
    }
  }
}