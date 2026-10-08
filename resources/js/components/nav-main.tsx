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
                <SidebarGroup key={group.label} className="px-3 py-2">
                    <SidebarGroupLabel className="px-2 text-[11px] font-semibold tracking-wide text-slate-400">
                        {group.label}
                    </SidebarGroupLabel>
                    <SidebarMenu className="gap-0.5">
                        {group.items.map((item) =>
                            item.href ? (
                                <SidebarMenuItem key={item.title}>
                                    <SidebarMenuButton
                                        asChild
                                        isActive={isCurrentOrParentUrl(
                                            item.href,
                                        )}
                                        tooltip={{ children: item.title }}
                                        className="h-9 rounded-lg px-2.5 text-[13.5px] font-medium data-[active=true]:bg-aktivy-soft data-[active=true]:font-semibold data-[active=true]:text-aktivy-deep [&>svg]:size-[18px] data-[active=true]:[&>svg]:text-aktivy-deep"
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
                                        tooltip={{
                                            children: `${item.title} (bientôt disponible)`,
                                        }}
                                        className="h-9 cursor-default rounded-lg px-2.5 text-[13.5px] font-medium text-slate-400 hover:bg-transparent hover:text-slate-400 aria-disabled:pointer-events-auto aria-disabled:opacity-100 [&>svg]:size-[18px]"
                                    >
                                        <item.icon />
                                        <span className="min-w-0 flex-1 truncate">
                                            {item.title}
                                        </span>
                                        <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-500 group-data-[collapsible=icon]:hidden">
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
