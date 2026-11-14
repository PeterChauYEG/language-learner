import { z } from 'zod';

export const logSessionParameters = z.object({
  situation: z.string(),
  summary: z.string().optional(),
  words_introduced: z.array(z.number().int()).optional(),
  words_reviewed: z.array(z.number().int()).optional(),
});

export type LogSessionParameters = z.infer<typeof logSessionParameters>;
