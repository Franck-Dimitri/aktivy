import { Link } from '@inertiajs/react';
import {
    SidebarGroup,
    SidebarGroupLabel,
    SidebarMenu,
    SidebarMenuButton,
    SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useCurrentUrl } from '@/hooks/use-current-url';
import type { MenuGroup } from '@/types';

export function NavMain({ groups }: { groups: MenuGroup[] }) {
    const { isCurrentOrParentUrl } = useCurrentUrl();

    return (
        <>
            {groups.map((group) => (
                <SidebarGroup key={group.label} className="px-3 py-2 group-data-[collapsible=icon]:px-2">
                    <SidebarGroupLabel className="mb-1 px-3 text-xs font-semibold text-green-100/60">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-1">
                        {group.items.map((item) =>
                            item.href ? (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentOrParentUrl(item.href)}
                                        tooltip={{ children: item.title }}
                                        className="h-11 rounded-xl px-3 text-[13.5px] font-medium text-green-50/90 transition-all hover:bg-white/10 hover:text-white active:bg-white/15 active:text-white data-[active=true]:bg-white data-[active=true]:font-semibold data-[active=true]:text-green-700 data-[active=true]:shadow-lg data-[active=true]:shadow-green-950/20 [&>svg]:size-[18px] data-[active=true]:[&>svg]:text-green-600"
                                    >
                                        <Link href={item.href} prefetch>
                                            <item.icon />
                                            <span>{item.title}</span>
                                        </Link>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ) : (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        aria-disabled
                                        tooltip={{ children: `${item.title} (bientôt disponible)` }}
                                        className="h-11 cursor-default rounded-xl px-3 text-[13.5px] font-medium text-green-100/50 hover:bg-transparent hover:text-green-100/50 aria-disabled:pointer-events-auto aria-disabled:opacity-100 [&>svg]:size-[18px]"
                                    >
                                        <item.icon />
                                        <span className="min-w-0 flex-1 truncate">{item.title}</span>
                                        <span className="rounded-full bg-white/15 px-2 py-0.5 text-[10px] font-semibold text-green-50 group-data-[collapsible=icon]:hidden">
                                            Bientôt
                                        </span>
                                    </SidebarMenuButton>
                                </SidebarMenuItem>
                            ),
                        )}
                    </SidebarMenu>
                </SidebarGroup>
            ))}
        </>
    );
}
