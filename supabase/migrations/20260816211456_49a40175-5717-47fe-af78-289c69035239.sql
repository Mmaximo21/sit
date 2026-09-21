insert into public.coordinator_scopes (user_id, specialty)
select p.id, s.spec
from public.profiles p
cross join (values ('Nutrição'),('Psicologia'),('Serviço Social'),('Fonoaudiologia')) as s(spec)
where p.username = 'tecnica'
and not exists (
  select 1 from public.coordinator_scopes cs where cs.user_id = p.id and cs.specialty = s.spec
);