import { InjectionToken } from '@angular/core';

export interface Environment {
  production: boolean;
  supabaseUrl: string;
  supabaseKey: string;
}

export const ENVIRONMENT_TOKEN = new InjectionToken<Environment>('ENVIRONMENT_TOKEN');

export function provideEnvironment(env: Environment) {
  if (!env.supabaseUrl || !env.supabaseKey) {
    const errorMsg = 'Error CRÍTICO: Supabase URL o Key no han sido configuradas en el entorno.';
    if (env.production) {
      throw new Error(errorMsg);
    }
    console.error(errorMsg);
  }
  return { provide: ENVIRONMENT_TOKEN, useValue: env };
}
