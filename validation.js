const { z } = require('zod');

const dateString = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be a valid date in YYYY-MM-DD format')
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
  }, 'Must be a real calendar date');

const internshipSchema = z.object({
  title: z.string().trim().min(2).max(120),
  company: z.string().trim().min(2).max(120),
  location: z.string().trim().min(2).max(120),
  mode: z.enum(['onsite', 'remote', 'hybrid']),
  status: z.enum(['open', 'in_progress', 'completed', 'cancelled']).optional(),
  start_date: dateString,
  end_date: dateString.nullable().optional(),
  stipend: z.number().int().min(0).max(100000000).optional(),
  description: z.string().trim().max(2000).optional(),
  application_url: z.string().url().max(2048).nullable().optional()
}).strict().superRefine((data, ctx) => {
  if (data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'end_date must be on or after start_date' });
  }
});

const updateInternshipSchema = internshipSchema.partial().superRefine((data, ctx) => {
  if (data.start_date && data.end_date && data.end_date < data.start_date) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ['end_date'], message: 'end_date must be on or after start_date' });
  }
});

module.exports = { internshipSchema, updateInternshipSchema };
