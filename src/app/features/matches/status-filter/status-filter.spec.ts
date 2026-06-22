import { ComponentFixture, TestBed } from '@angular/core/testing';
import { StatusFilterComponent } from './status-filter';
import { MatchStatus } from '../../../core/models/match-model';
import { describe, it, expect, beforeEach, vi } from 'vitest';

describe('StatusFilterComponent', () => {
  let component: StatusFilterComponent;
  let fixture: ComponentFixture<StatusFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusFilterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(StatusFilterComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should emit statusChange when a status is selected', () => {
    const spy = vi.spyOn(component.statusChange, 'emit');
    component.selectStatus('scheduled');
    expect(spy).toHaveBeenCalledWith('scheduled');
  });

  it('should highlight the active tab', () => {
    // Usamos setInput para asignar el valor del input signal
    fixture.componentRef.setInput('activeStatus', 'live');
    fixture.detectChanges();
    
    const compiled = fixture.nativeElement as HTMLElement;
    const liveButton = compiled.querySelector('button:nth-child(1)');
    expect(liveButton?.classList.contains('bg-white')).toBe(true);
  });
});
