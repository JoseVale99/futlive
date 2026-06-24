import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { describe, it, expect, beforeEach } from 'vitest';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { ENVIRONMENT_TOKEN } from './core/config/environment';

describe('App', () => {
  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [App, HttpClientTestingModule],
      providers: [
        { provide: ENVIRONMENT_TOKEN, useValue: { supabaseUrl: '', supabaseKey: '' } }
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('should render brand name', async () => {
    const fixture = TestBed.createComponent(App);
    fixture.detectChanges();
    await fixture.whenStable();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.querySelector('h1')?.textContent).toContain('FutLive');
  });
});
