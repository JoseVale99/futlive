import { Component, input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatchStream } from '../../../core/models/stream-model';
import { buildSafeEmbedUrl } from '../../../shared/utils/stream-url-util';

@Component({
  selector: 'app-iframe-player',
  standalone: true,
  template: `
    @if (stream() && safeUrl()) {
      <div class="aspect-video w-full max-w-[1280px] mx-auto rounded-xl overflow-hidden shadow-2xl border border-gray-200 dark:border-gray-700">
        <iframe
          [src]="safeUrl()!"
          [title]="stream()?.embed_name || 'Transmisión en vivo'"
          class="w-full h-full border-0"
          allow="autoplay; fullscreen; encrypted-media; picture-in-picture"
          allowfullscreen
          referrerpolicy="no-referrer"
        ></iframe>
      </div>
    } @else {
      <div class="aspect-video w-full max-w-[1280px] mx-auto bg-gray-900 rounded-xl flex items-center justify-center shadow-xl border border-gray-700">
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

  safeUrl(): SafeResourceUrl | null {
    const url = buildSafeEmbedUrl(this.stream()?.embed_url || '');
    return url ? this.sanitizer.bypassSecurityTrustResourceUrl(url) : null;
  }
}
