-- ENT-48: transferir credenciales Auth al fusionar ficha activa en provisional

create or replace function public.transferir_credenciales_auth_fusion(
  p_origen_id uuid,
  p_destino_id uuid,
  p_email text
)
returns void
language plpgsql
security definer
set search_path = auth, public
as $$
declare
  v_email text;
  v_password varchar;
  v_confirmed timestamptz;
  v_placeholder text;
  v_identities_movidas int;
begin
  if p_origen_id is null or p_destino_id is null then
    raise exception 'Origen y destino son obligatorios';
  end if;

  if p_origen_id = p_destino_id then
    raise exception 'Origen y destino deben ser distintos';
  end if;

  v_email := lower(trim(p_email));
  if v_email is null or length(v_email) < 3 then
    raise exception 'Email inválido para transferir acceso';
  end if;

  select encrypted_password, email_confirmed_at
  into v_password, v_confirmed
  from auth.users
  where id = p_origen_id
    and deleted_at is null;

  if not found then
    raise exception 'Usuario origen no encontrado en auth';
  end if;

  if not exists (
    select 1
    from auth.users
    where id = p_destino_id
      and deleted_at is null
  ) then
    raise exception 'Usuario destino no encontrado en auth';
  end if;

  v_placeholder :=
    'fusionado+' || left(replace(p_origen_id::text, '-', ''), 12) || '@padelnexus.local';

  -- Liberar email del origen antes de asignarlo al destino (índice único en auth.users.email).
  update auth.users
  set
    email = v_placeholder,
    email_confirmed_at = null,
    updated_at = now()
  where id = p_origen_id;

  -- Identidad provisional del destino (si existe) no puede coexistir con la del origen.
  delete from auth.identities
  where user_id = p_destino_id
    and provider = 'email';

  update auth.identities
  set
    user_id = p_destino_id,
    provider_id = p_destino_id::text,
    email = v_email,
    identity_data = jsonb_build_object(
      'sub', p_destino_id::text,
      'email', v_email,
      'email_verified', true
    ),
    updated_at = now()
  where user_id = p_origen_id
    and provider = 'email';

  get diagnostics v_identities_movidas = row_count;

  if v_identities_movidas = 0 then
    insert into auth.identities (
      user_id,
      provider,
      provider_id,
      identity_data,
      email,
      created_at,
      updated_at
    )
    values (
      p_destino_id,
      'email',
      p_destino_id::text,
      jsonb_build_object(
        'sub', p_destino_id::text,
        'email', v_email,
        'email_verified', true
      ),
      v_email,
      now(),
      now()
    );
  end if;

  update auth.users
  set
    email = v_email,
    encrypted_password = v_password,
    email_confirmed_at = coalesce(v_confirmed, now()),
    updated_at = now()
  where id = p_destino_id;
end;
$$;

revoke all on function public.transferir_credenciales_auth_fusion(uuid, uuid, text)
  from public;
revoke all on function public.transferir_credenciales_auth_fusion(uuid, uuid, text)
  from anon;
revoke all on function public.transferir_credenciales_auth_fusion(uuid, uuid, text)
  from authenticated;

grant execute on function public.transferir_credenciales_auth_fusion(uuid, uuid, text)
  to service_role;

comment on function public.transferir_credenciales_auth_fusion(uuid, uuid, text) is
  'ENT-48: en una transacción, transfiere email/contraseña/identidad email del usuario origen al destino al fusionar fichas.';