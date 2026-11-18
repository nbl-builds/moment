import { createMomentApi } from '@moment/shared';
import { supabase } from './supabase';

/** Typed Moment API for the app. Every method throws `ApiError` on failure. */
export const api = createMomentApi(supabase);
