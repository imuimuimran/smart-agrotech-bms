import { z } from 'zod';
import { ACTIVITY_ACTION_LIST, ACTIVITY_MODULE_LIST } from '../constants/activityLog.constants.js';

export const createActivityLogSchema = z.object({
  body: z.object({
    action: z.enum(ACTIVITY_ACTION_LIST, {
      errorMap: () => ({ message: 'Invalid or unsupported audit log action operation.' }),
    }),
    module: z.enum(ACTIVITY_MODULE_LIST, {
      errorMap: () => ({ message: 'Invalid or unsupported system infrastructure module mapping.' }),
    }),
    entityId: z
      .string()
      .trim()
      .optional()
      .nullable(), // Safe to accept strings/publicIds dynamically before parsing into the service
    description: z
      .string()
      .trim()
      .max(500, { message: 'Audit presentation description context cannot exceed 500 characters.' })
      .optional(),
    metadata: z
      .record(z.unknown())
      .optional()
      .nullable(), // Captures key contextual changes safely without duplicating complete documents
  }),
});
