-- The study role is intentionally append-only (SELECT + INSERT). A row-locking
-- read also requires UPDATE privilege in PostgreSQL, so rely on the unique case_id
-- constraints to serialize competing locks without widening table permissions.

create or replace function public.lock_preservation_study_intent(
  p_case_id uuid,
  p_expected_change text,
  p_expected_preservation text,
  p_unacceptable_notes text,
  p_candidate_a text,
  p_candidate_a_id uuid,
  p_candidate_b text,
  p_candidate_b_id uuid
) returns jsonb
language plpgsql
set search_path = public
as $$
declare
  v_case public.preservation_study_cases%rowtype;
  v_intent public.preservation_study_intents%rowtype;
  v_presentation public.preservation_study_presentations%rowtype;
begin
  select * into strict v_case
  from public.preservation_study_cases
  where id = p_case_id;

  if exists (select 1 from public.preservation_study_intents where case_id = p_case_id)
     or exists (select 1 from public.preservation_study_presentations where case_id = p_case_id) then
    raise exception 'Study intent and presentation are already locked';
  end if;

  if not (
    (p_candidate_a = 'RAW' and p_candidate_a_id = v_case.raw_candidate_id and p_candidate_b = 'PRESERVED' and p_candidate_b_id = v_case.preserved_candidate_id)
    or
    (p_candidate_a = 'PRESERVED' and p_candidate_a_id = v_case.preserved_candidate_id and p_candidate_b = 'RAW' and p_candidate_b_id = v_case.raw_candidate_id)
  ) then
    raise exception 'Randomized presentation does not match frozen candidates';
  end if;

  insert into public.preservation_study_intents (case_id, expected_change, expected_preservation, unacceptable_notes)
  values (p_case_id, p_expected_change, p_expected_preservation, p_unacceptable_notes)
  returning * into v_intent;

  insert into public.preservation_study_presentations (case_id, candidate_a, candidate_a_id, candidate_b, candidate_b_id)
  values (p_case_id, p_candidate_a, p_candidate_a_id, p_candidate_b, p_candidate_b_id)
  returning * into v_presentation;

  return jsonb_build_object('intent', to_jsonb(v_intent), 'presentation', to_jsonb(v_presentation));
end;
$$;

revoke all on function public.lock_preservation_study_intent(uuid, text, text, text, text, uuid, text, uuid)
  from public, anon, authenticated;
grant execute on function public.lock_preservation_study_intent(uuid, text, text, text, text, uuid, text, uuid)
  to service_role;
