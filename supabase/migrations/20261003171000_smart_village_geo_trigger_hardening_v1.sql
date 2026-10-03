create or replace function public.sv_set_point_from_latlon() returns trigger language plpgsql set search_path=public as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.point := st_setsrid(st_makepoint(new.longitude,new.latitude),4326);
  end if;
  return new;
end $$;