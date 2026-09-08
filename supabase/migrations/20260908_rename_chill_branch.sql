-- Rename the restaurant branch at the data source so every screen uses the
-- same public name, including signup and admin forms.
update public.branches
set name = 'SABINAGISA'
where key = 'chill';
