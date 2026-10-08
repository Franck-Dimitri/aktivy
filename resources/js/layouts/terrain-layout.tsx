import { Link, router, usePage } from '@inertiajs/react';
import { LogOut } from 'lucide-react';
import AppLogoIcon from '@/components/app-logo-icon';
import { Button } from '@/components/ui/button';
import { logout } from '@/routes';

export default function TerrainLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const { auth, name } = usePage().props;

    return (
        <div className="flex min-h-svh flex-col bg-background">
            <header className="sticky top-0 z-10 flex items-center justify-between border-b bg-background px-4 py-3">
                <div className="flex items-center gap-2">
                    <AppLogoIcon className="size-6 fill-current" />
                    <div className="leading-tight">
                        <p className="text-sm font-semibold">{name}</p>
                        {auth.company && (
                            <p className="text-xs text-muted-foreground">
                                {auth.company.name}
                            </p>
                        )}
                    </div>
                </div>
                <Button variant="ghost" size="icon" asChild>
                    <Link
                        href={logout()}
                        as="button"
                        onClick={() => router.flushAll()}
                        aria-label="Se déconnecter"
                    >
                        <LogOut />
                    </Link>
                </Button>
            </header>
            <main className="mx-auto w-full max-w-md flex-1 p-4">
                {children}
            </main>
        </div>
    );
}
