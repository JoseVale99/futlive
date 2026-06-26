import { InjectionToken } from '@angular/core';

export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseKey: string;
  apiBase: string;
}

export const ENVIRONMENT_TOKEN = new InjectionToken<Environment>('ENVIRONMENT_TOKEN');

export function provideEnvironment(env: Environment) {
  return { provide: ENVIRONMENT_TOKEN, useValue: env };
}
