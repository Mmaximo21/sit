create policy "Lumi arquivos: envio proprio"
on storage.objects for insert to authenticated
with check (bucket_id = 'lumi-arquivos' and owner = auth.uid());

create policy "Lumi arquivos: leitura propria"
on storage.objects for select to authenticated
using (bucket_id = 'lumi-arquivos' and owner = auth.uid());

create policy "Lumi arquivos: exclusao propria"
on storage.objects for delete to authenticated
using (bucket_id = 'lumi-arquivos' and owner = auth.uid());