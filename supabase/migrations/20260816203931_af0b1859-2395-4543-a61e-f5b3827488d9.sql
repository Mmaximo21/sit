delete from assessments where period_id='ec684526-7a42-483e-854d-769aefdfbd02' and status='rascunho' and data = '{}'::jsonb;
update assessment_periods set due_date = '2026-08-16' where id='ec684526-7a42-483e-854d-769aefdfbd02';
update period_deadlines set due_date = '2026-08-16' where period_id='ec684526-7a42-483e-854d-769aefdfbd02';