-- Remove o papel 'customer' do usuário e atribui 'super_admin'
DELETE FROM public.user_roles
WHERE user_id = '9be24427-0fa5-461d-980a-ce8fecc63a13';

INSERT INTO public.user_roles (user_id, role)
VALUES ('9be24427-0fa5-461d-980a-ce8fecc63a13', 'super_admin')
ON CONFLICT (user_id, role) DO NOTHING;