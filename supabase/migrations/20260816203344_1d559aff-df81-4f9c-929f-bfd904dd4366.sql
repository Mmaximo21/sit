update assessment_periods set due_date = current_date + 5 where id='ec684526-7a42-483e-854d-769aefdfbd02';
update period_deadlines set due_date = current_date + 5 where period_id='ec684526-7a42-483e-854d-769aefdfbd02' and specialty='Geriatria';
update period_deadlines set due_date = current_date + 4 where period_id='ec684526-7a42-483e-854d-769aefdfbd02' and specialty='Nutrição';
insert into assessments (period_id, specialty, resident_name, author_id, status)
select 'ec684526-7a42-483e-854d-769aefdfbd02', 'Geriatria', r.full_name, 'c7e16faa-4f42-44fe-a59c-39994aa24acf', 'rascunho' from residents r order by r.full_name limit 2;
insert into assessments (period_id, specialty, resident_name, author_id, status)
select 'ec684526-7a42-483e-854d-769aefdfbd02', 'Nutrição', r.full_name, 'e299c6dc-9f81-41fd-94d7-13c643d15ee0', 'rascunho' from residents r order by r.full_name limit 1;