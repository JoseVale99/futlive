import { Component, inject } from '@angular/core';
import { RouterModule } from '@angular/router';
import { ThemeToggleComponent } from './shared/components/theme-toggle/theme-toggle';
import { ThemeService } from './core/services/theme-service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterModule, ThemeToggleComponent],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  // Inject to ensure ThemeService initializes on bootstrap
  protected readonly themeService = inject(ThemeService);
}
