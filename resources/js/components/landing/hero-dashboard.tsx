/*
 * Tableau de bord du hero : vraie capture de l'espace gérant (entreprise vitrine aux données fictives,
 * générée par database/seeders/ShowcaseSeeder.php). Fondu vers le bas, comme une fenêtre qui se prolonge.
 */
export function HeroDashboard() {
    return (
        <div
            className="overflow-hidden rounded-3xl border border-slate-200/80 bg-white shadow-2xl shadow-slate-900/10"
            style={{
                WebkitMaskImage:
                    'linear-gradient(to bottom, #000 0%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 98%)',
                maskImage:
                    'linear-gradient(to bottom, #000 0%, #000 55%, rgba(0,0,0,0.6) 78%, transparent 98%)',
            }}
        >
            <img
                src="/images/landing/tableau-de-bord.webp"
                alt="Tableau de bord du gérant dans Motriks : chiffre d’affaires du jour, visites, unités vendues et hôtesses en poste"
                width={1840}
                height={1150}
                fetchPriority="high"
                className="block w-full"
            />
        </div>
    );
}
