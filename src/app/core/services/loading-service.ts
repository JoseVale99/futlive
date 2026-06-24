import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private readonly _routeLoading = signal(false);
  private readonly _httpPending = signal(0);

  /** True when route navigation is in progress */
  readonly routeLoading = this._routeLoading.asReadonly();

  /** True when any HTTP request is pending */
  readonly httpLoading = computed(() => this._httpPending() > 0);

  /** True when anything is loading (route or HTTP) */
  readonly isLoading = computed(() => this._routeLoading() || this._httpPending() > 0);

  setRouteLoading(loading: boolean): void {
    this._routeLoading.set(loading);
  }

  incrementHttp(): void {
    this._httpPending.update(v => v + 1);
  }

  decrementHttp(): void {
    this._httpPending.update(v => Math.max(0, v - 1));
  }
}
