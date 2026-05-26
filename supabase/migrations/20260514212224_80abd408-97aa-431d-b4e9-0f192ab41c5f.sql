
revoke execute on function public.reservation_group_create(uuid, text, uuid, uuid, text, int, text, text) from anon, public;
revoke execute on function public.reservation_group_join(text, uuid, text, text, text) from anon, public;
revoke execute on function public.is_group_member(uuid, uuid) from anon, public;
revoke execute on function public.generate_group_coupon(text, int) from anon, public;
revoke execute on function public.reservation_group_on_order_paid() from anon, public;

grant execute on function public.reservation_group_join(text, uuid, text, text, text) to authenticated;
grant execute on function public.is_group_member(uuid, uuid) to authenticated;
