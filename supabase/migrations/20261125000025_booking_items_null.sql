-- A services cart sends "items": null for services without options; that is
-- JSON null, not SQL null, so treat anything that isn't an array as no items.
create or replace function private.booking_subtotal(
  p_listing public.listings,
  p_guest_count integer,
  p_items jsonb,
  p_private boolean
)
returns integer
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_total integer := 0;
  v_item jsonb;
  v_option public.listing_options;
  v_qty integer;
begin
  if p_private then
    if p_listing.private_price_amount is null then
      raise exception 'Private bookings aren''t offered for this experience' using errcode = '22023';
    end if;
    return p_listing.private_price_amount;
  end if;
  if jsonb_typeof(p_items) = 'array' and jsonb_array_length(p_items) > 0 then
    for v_item in select * from jsonb_array_elements(p_items) loop
      select * into v_option from public.listing_options
      where id = (v_item ->> 'option_id')::uuid and listing_id = p_listing.id and is_active;
      if not found then
        raise exception 'Unknown option %', v_item ->> 'option_id' using errcode = '22023';
      end if;
      v_qty := coalesce((v_item ->> 'quantity')::int, 1);
      v_total := v_total + v_option.price_amount * v_qty;
    end loop;
    return v_total;
  end if;
  return p_listing.price_amount * case when p_listing.price_unit = 'per_person' then p_guest_count else 1 end;
end;
$$;
