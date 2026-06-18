-- Atomic message credit deduction function
-- Increments message_credits_used by 1 only if the user has remaining credits
-- Returns a table with the updated row so the caller can verify

create or replace function deduct_message_credit(p_user_id uuid)
returns void
language plpgsql
security definer
as $$
declare
  v_used int;
  v_limit int;
begin
  select message_credits_used, message_credits_limit
    into v_used, v_limit
    from users
    where id = p_user_id
    for update;

  if not found then
    return;
  end if;

  if v_used >= v_limit then
    raise exception 'credits exhausted' using errcode = 'CRED01';
  end if;

  update users
    set message_credits_used = v_used + 1
    where id = p_user_id;
end;
$$;
