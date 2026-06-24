import { Component, inject } from '@angular/core';
import { LoadingService } from '../../../core/services/loading-service';

@Component({
  selector: 'app-loading-bar',
  standalone: true,
  template: `
    @if (loadingService.isLoading()) {
      <div class="fixed top-0 left-0 right-0 z-50 h-[3px] overflow-hidden">
        <div class="h-full w-full bg-linear-to-r from-blue-500 via-indigo-500 to-violet-500 animate-loading-bar"></div>
      </div>
    }
  `,
})
export class LoadingBarComponent {
  protected readonly loadingService = inject(LoadingService);
}
