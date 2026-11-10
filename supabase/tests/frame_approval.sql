-- Run against a migrated test database; the transaction rolls all synthetic rows back.
begin;
select set_config('app.approval_qa_id',gen_random_uuid()::text,true);
select set_config('app.approval_qa_conflict',gen_random_uuid()::text,true);
select set_config('app.approval_qa_expired',gen_random_uuid()::text,true);
insert into public.frame_submissions(id,name,author_name,author_contact,consent,design,image_base64,expires_at)
values
(current_setting('app.approval_qa_id')::uuid,'QA rollback only','QA author','private@example.invalid',true,'{}','QA',now()+interval '1 hour'),
(current_setting('app.approval_qa_conflict')::uuid,'QA rollback conflict','QA author','private@example.invalid',true,'{}','QA',now()+interval '1 hour');
insert into public.frame_submissions(id,name,author_name,consent,design,image_base64,created_at,expires_at)
values(current_setting('app.approval_qa_expired')::uuid,'QA expired','QA',true,'{}','QA',now()-interval '2 hours',now()-interval '1 hour');
insert into public.frames(id,name,author_name,design,image_base64)
values(current_setting('app.approval_qa_conflict')::uuid,'QA conflict','QA','{}','QA');
set local role authenticated;
select set_config('request.jwt.claims','{"email":"hunghienhoa2110@gmail.com","role":"authenticated"}',true);
do $$
declare item uuid := current_setting('app.approval_qa_id')::uuid;
begin
 if public.approve_frame_submission(item) <> item then raise exception 'Wrong approval result'; end if;
 if exists(select 1 from public.frame_submissions where id=item) then raise exception 'Pending contact retained'; end if;
 if not exists(select 1 from public.frames where id=item and author_name='QA author') then raise exception 'Public credit missing'; end if;
 begin perform public.approve_frame_submission(item); raise exception 'Duplicate approval allowed';
 exception when no_data_found then null; end;
 begin perform public.approve_frame_submission(current_setting('app.approval_qa_expired')::uuid); raise exception 'Expired approval allowed';
 exception when no_data_found then null; end;
 begin perform public.approve_frame_submission(current_setting('app.approval_qa_conflict')::uuid); raise exception 'Expected insertion failure missing';
 exception when unique_violation then null; end;
 if not exists(select 1 from public.frame_submissions where id=current_setting('app.approval_qa_conflict')::uuid) then raise exception 'Failed publication lost pending row'; end if;
end $$;
select set_config('request.jwt.claims','{"email":"not-owner@example.invalid","role":"authenticated"}',true);
do $$ begin
 begin perform public.approve_frame_submission(current_setting('app.approval_qa_conflict')::uuid); raise exception 'Non-owner approved';
 exception when insufficient_privilege then null; end;
 if exists(select 1 from public.frame_submissions) then raise exception 'Non-owner read private queue'; end if;
end $$;
reset role;
set local role anon;
do $$ begin
 begin perform public.approve_frame_submission(current_setting('app.approval_qa_conflict')::uuid); raise exception 'Anonymous approved';
 exception when insufficient_privilege then null; end;
end $$;
reset role;
rollback;
select 'PASS: owner approval, duplicate/expiry rejection, insertion rollback, private queue isolation, anonymous denial; all synthetic data rolled back' as verification;
