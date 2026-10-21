const express = require('express');
const db = require('./db');
const { internshipSchema, updateInternshipSchema } = require('./validation');

const app = express();
app.use(express.json({ limit: '100kb' }));

const allowedSorts = new Set(['created_at', 'start_date', 'title', 'company']);
const allowedDirections = new Set(['asc', 'desc']);

function sendError(res, status, code, message, details) {
  const error = { code, message };
  if (details) error.details = details;
  return res.status(status).json({ success: false, error });
}

function validate(schema, body, res) {
  const result = schema.safeParse(body);
  if (!result.success) {
    sendError(res, 400, 'VALIDATION_ERROR', 'Request body is invalid.', result.error.issues.map(issue => ({
      field: issue.path.join('.'),
      message: issue.message
    })));
    return null;
  }
  return result.data;
}

function findById(id) {
  return db.prepare('SELECT * FROM internships WHERE id = ?').get(id);
}

app.get('/api/health', (_req, res) => {
  res.json({ success: true, data: { status: 'ok' } });
});

app.get('/api/internships', (req, res) => {
  const page = Number.parseInt(req.query.page ?? '1', 10);
  const limit = Number.parseInt(req.query.limit ?? '10', 10);
  const sort = req.query.sort ?? 'created_at';
  const direction = String(req.query.direction ?? 'desc').toLowerCase();

  if (!Number.isInteger(page) || page < 1) return sendError(res, 400, 'INVALID_QUERY', 'page must be a positive integer.');
  if (!Number.isInteger(limit) || limit < 1 || limit > 100) return sendError(res, 400, 'INVALID_QUERY', 'limit must be an integer between 1 and 100.');
  if (!allowedSorts.has(sort)) return sendError(res, 400, 'INVALID_QUERY', `sort must be one of: ${[...allowedSorts].join(', ')}.`);
  if (!allowedDirections.has(direction)) return sendError(res, 400, 'INVALID_QUERY', 'direction must be asc or desc.');

  const status = req.query.status;
  if (status && !['open', 'in_progress', 'completed', 'cancelled'].includes(status)) {
    return sendError(res, 400, 'INVALID_QUERY', 'status is not supported.');
  }

  const where = status ? 'WHERE status = ?' : '';
  const params = status ? [status] : [];
  const total = db.prepare(`SELECT COUNT(*) AS count FROM internships ${where}`).get(...params).count;
  const offset = (page - 1) * limit;
  // sort and direction are allowlisted above; values cannot inject SQL.
  const items = db.prepare(
    `SELECT * FROM internships ${where} ORDER BY ${sort} ${direction.toUpperCase()} LIMIT ? OFFSET ?`
  ).all(...params, limit, offset);

  res.json({
    success: true,
    data: items,
    pagination: {
      page, limit, total,
      total_pages: Math.ceil(total / limit),
      has_next_page: page * limit < total,
      has_previous_page: page > 1
    }
  });
});

app.get('/api/internships/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 400, 'INVALID_ID', 'id must be a positive integer.');
  const internship = findById(id);
  if (!internship) return sendError(res, 404, 'NOT_FOUND', `Internship with id ${id} was not found.`);
  res.json({ success: true, data: internship });
});

app.post('/api/internships', (req, res) => {
  const data = validate(internshipSchema, req.body, res);
  if (!data) return;
  const result = db.prepare(`
    INSERT INTO internships
      (title, company, location, mode, status, start_date, end_date, stipend, description, application_url)
    VALUES
      (@title, @company, @location, @mode, @status, @start_date, @end_date, @stipend, @description, @application_url)
  `).run({
    title: data.title,
    company: data.company,
    location: data.location,
    mode: data.mode,
    status: data.status ?? 'open',
    start_date: data.start_date,
    end_date: data.end_date ?? null,
    stipend: data.stipend ?? 0,
    description: data.description ?? '',
    application_url: data.application_url ?? null
  });
  res.location(`/api/internships/${result.lastInsertRowid}`)
    .status(201)
    .json({ success: true, data: findById(result.lastInsertRowid) });
});

app.put('/api/internships/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 400, 'INVALID_ID', 'id must be a positive integer.');
  if (!findById(id)) return sendError(res, 404, 'NOT_FOUND', `Internship with id ${id} was not found.`);
  const data = validate(updateInternshipSchema, req.body, res);
  if (!data) return;
  if (Object.keys(data).length === 0) return sendError(res, 400, 'EMPTY_UPDATE', 'Provide at least one field to update.');

  const current = findById(id);
  const merged = { ...current, ...data };
  if (merged.end_date && merged.end_date < merged.start_date) {
    return sendError(res, 400, 'VALIDATION_ERROR', 'end_date must be on or after start_date.', [
      { field: 'end_date', message: 'end_date must be on or after start_date' }
    ]);
  }

  const fields = Object.keys(data);
  const setClause = fields.map(field => `${field} = @${field}`).join(', ');
  db.prepare(`UPDATE internships SET ${setClause}, updated_at = strftime('%Y-%m-%dT%H:%M:%fZ', 'now') WHERE id = @id`)
    .run({ ...data, id });
  res.json({ success: true, data: findById(id) });
});

app.delete('/api/internships/:id', (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id < 1) return sendError(res, 400, 'INVALID_ID', 'id must be a positive integer.');
  const result = db.prepare('DELETE FROM internships WHERE id = ?').run(id);
  if (result.changes === 0) return sendError(res, 404, 'NOT_FOUND', `Internship with id ${id} was not found.`);
  res.status(204).send();
});

app.use((_req, res) => sendError(res, 404, 'ROUTE_NOT_FOUND', 'The requested route does not exist.'));

app.use((err, _req, res, _next) => {
  if (err instanceof SyntaxError && 'body' in err) {
    return sendError(res, 400, 'INVALID_JSON', 'Request body must contain valid JSON.');
  }
  console.error(err);
  return sendError(res, 500, 'INTERNAL_SERVER_ERROR', 'An unexpected error occurred.');
});

if (require.main === module) {
  const port = Number(process.env.PORT || 3000);
  app.listen(port, () => console.log(`Internship API listening on http://localhost:${port}`));
}

module.exports = app;
