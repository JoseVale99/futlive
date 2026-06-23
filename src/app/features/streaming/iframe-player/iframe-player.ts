import { Component, input, inject } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { MatchStream } from '../../../core/models/stream-model';
import { buildSafeEmbedUrl } from '../../../shared/utils/stream-url-util';

@Component({
  selector: 'app-iframe-player',
  standalone: true,
  template: `
    @if (stream() && safeUrl()) {
      <div class="aspect-video w-full max-w-[1280px] mx-auto rounded-xl overflow-hidden shadow-2xl">
        <iframe
          [src]="safeUrl()!"
          [title]="stream()?.embed_name || 'Transmisión en vivo'"
          class="w-full h-full border-0"
          allow="autoplay; fullscreen; encrypted-media"
          sandbox="allow-scripts allow-same-origin allow-presentation"
        ></iframe>
      </div>
    } @else {
      <div class="aspect-video w-full max-w-[1280px] mx-auto bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center justify-center shadow-xl">
        <div class="text-center p-6">
          <div class="text-4xl mb-3">📺</div>
          <p class="text-gray-600 dark:text-gray-300 text-lg font-medium">No hay transmisión disponible</p>
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
