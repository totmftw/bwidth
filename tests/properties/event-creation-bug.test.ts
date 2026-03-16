import { describe, it, expect } from 'vitest';
import { createEventSchema } from '../../shared/routes';
import fs from 'fs';
import path from 'path';

describe('Property 1: Expected Behavior - Bug Condition Exploration', () => {

  it('uses separate date and time inputs instead of datetime-local for better mobile UX', () => {
    const formCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/organizer/OrganizerEventCreate.tsx'), 'utf-8');
    
    // Expected behavior: uses Calendar (Shadcn DatePicker) and type="time" instead of type="datetime-local"
    expect(formCode).not.toContain('type="datetime-local"');
    expect(formCode).toContain('<Calendar');
    expect(formCode).toContain('type="time"');
  });

  it('doorTime field is completely removed from schema and form', () => {
    const schemaShape = createEventSchema.shape;
    // Expected behavior: no doorTime field
    expect(schemaShape).not.toHaveProperty('doorTime');
    
    const formCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/organizer/OrganizerEventCreate.tsx'), 'utf-8');
    expect(formCode).not.toContain('doorTime');
  });

  it('supports temporary venue creation in schema and form', () => {
    const schemaShape = createEventSchema.shape;
    // Expected behavior: temporaryVenue is supported
    expect(schemaShape).toHaveProperty('temporaryVenue');
    
    const formCode = fs.readFileSync(path.resolve(__dirname, '../../client/src/pages/organizer/OrganizerEventCreate.tsx'), 'utf-8');
    expect(formCode).toContain('Add Temporary Venue');
  });
});
