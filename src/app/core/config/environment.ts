import { InjectionToken } from '@angular/core';

export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseKey: string;
}

export const ENVIRONMENT_TOKEN = new InjectionToken<Environment>('ENVIRONMENT_TOKEN');

export function provideEnvironment(env: Environment) {
  if (!env.supabaseUrl || !env.supabaseKey) {
    console.warn('Advertencia: Supabase URL o Key no han sido configuradas en el entorno.');
  }
  return { provide: ENVIRONMENT_TOKEN, useValue: env };
}
