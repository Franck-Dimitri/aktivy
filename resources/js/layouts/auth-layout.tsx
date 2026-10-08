import AuthLayoutTemplate from '@/layouts/auth/auth-showcase-layout';
import type { AuthLayoutProps } from '@/types';

export default function AuthLayout({
    title = '',
    description = '',
    children,
    ...props
}: AuthLayoutProps) {
    return (
        <AuthLayoutTemplate title={title} description={description} {...props}>
            {children}
        </AuthLayoutTemplate>
    );
}
