-- agent_publish_post chỉ cần cho anon (bên gọi có mã bí mật); Supabase mặc định cấp thêm cho authenticated nên thu lại.
revoke all on function public.agent_publish_post(jsonb) from public, authenticated;
grant execute on function public.agent_publish_post(jsonb) to anon;
