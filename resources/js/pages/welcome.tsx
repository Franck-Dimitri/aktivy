import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect, type FormEvent } from 'react';
import { 
    Clock, 
    Smartphone, 
    Calculator, 
    MapPin, 
    FileSpreadsheet, 
    PackageCheck, 
    ShieldCheck, 
    CheckCircle2, 
    ArrowRight,
    Users2,
    CalendarCheck
} from 'lucide-react';
import { dashboard, login, register } from '@/routes';

interface WelcomeProps {
    targetDate?: string;
    appName?: string;
}

interface TimeLeft {
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isFinished: boolean;
}

export default function Welcome({ targetDate, appName = 'Aktivy' }: WelcomeProps) {
    const page = usePage();
    const auth = (page.props as Record<string, any>).auth;

    // Date cible par défaut : 60 jours (2 mois)
    const resolvedTarget = targetDate || new Date(Date.now() + 60 * 24 * 60 * 60 * 1000).toISOString();

    const [timeLeft, setTimeLeft] = useState<TimeLeft>({
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        isFinished: false,
    });

    const [email, setEmail] = useState('');
    const [submitted, setSubmitted] = useState(false);

    useEffect(() => {
        const calculateTime = () => {
            const difference = +new Date(resolvedTarget) - +new Date();
            if (difference <= 0) {
                setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isFinished: true });
                return;
            }

            setTimeLeft({
                days: Math.floor(difference / (1000 * 60 * 60 * 24)),
                hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
                minutes: Math.floor((difference / 1000 / 60) % 60),
                seconds: Math.floor((difference / 1000) % 60),
                isFinished: false,
            });
        };

        calculateTime();
        const interval = setInterval(calculateTime, 1000);
        return () => clearInterval(interval);
    }, [resolvedTarget]);

    const handleSubscribe = (e: FormEvent) => {
        e.preventDefault();
        if (email.trim()) {
            setSubmitted(true);
        }
    };

    return (
        <>
            <Head title={`${appName} - Gestion d'équipes terrain & reporting opérationnel`} />

            {/* Fond clair, sobre et professionnel en typographie Montserrat */}
            <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col font-sans selection:bg-slate-900 selection:text-white">
                
                {/* Barre de statut supérieure sobre */}
                <div className="bg-slate-100 border-b border-slate-200 text-slate-700 px-4 py-2 text-xs md:text-sm font-medium text-center">
                    <span className="inline-flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full bg-amber-500"></span>
                        <span>Plateforme en cours de développement &bull; Phase 1 (MVP) &bull; Déploiement pilote prévu dans 2 mois</span>
                    </span>
                </div>

                {/* En-tête */}
                <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center border-b border-slate-200/80 bg-white">
                    {/* Logo d'entreprise sobre */}
                    <div className="flex items-center gap-3">
                        <div className="h-9 w-9 rounded-lg bg-slate-900 text-white flex items-center justify-center font-bold text-lg tracking-wider">
                            A
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-xl tracking-tight text-slate-900">{appName}</span>
                            <span className="text-[10px] uppercase font-semibold tracking-wider text-slate-500">
                                Gestion terrain &amp; reporting
                            </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-3">
                        {auth?.user ? (
                            <Link
                                href={dashboard()}
                                className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                            >
                                Accéder au tableau de bord
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Connexion
                                </Link>
                                <Link
                                    href={register()}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-lg transition"
                                >
                                    Espace client
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Contenu principal */}
                <main className="flex-1 max-w-5xl w-full mx-auto px-6 py-12 flex flex-col items-center text-center">
                    
                    {/* Badge contextuel */}
                    <div className="inline-flex items-center gap-2 px-3 py-1 rounded-md bg-slate-200 text-slate-800 text-xs font-semibold uppercase tracking-wider mb-6">
                        Cahier des charges v2.1 &bull; Socle entreprise &amp; suivi terrain
                    </div>

                    {/* Titre principal */}
                    <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight">
                        Pilotez vos équipes terrain en temps réel, sans saisie manuelle.
                    </h1>

                    {/* Sous-titre opérationnel */}
                    <p className="mt-4 text-base sm:text-lg text-slate-600 max-w-2xl font-normal leading-relaxed">
                        L'outil de gestion conçu pour les entreprises et agences qui supervisent des hôtesses, promotrices et commerciaux. Centralisation des pointages, suivi des stocks et consolidation automatique des rapports.
                    </p>

                    {/* Bloc Compte à rebours 2 Mois - Design épuré et solide */}
                    <div className="mt-10 w-full max-w-3xl bg-white border border-slate-300 rounded-2xl p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-bold uppercase tracking-wider text-slate-600 mb-6">
                            <Clock className="w-4 h-4 text-slate-700" />
                            <span>Mise en service opérationnelle dans</span>
                        </div>

                        {/* Les 4 blocs de chiffres */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { label: 'Jours', value: timeLeft.days },
                                { label: 'Heures', value: timeLeft.hours },
                                { label: 'Minutes', value: timeLeft.minutes },
                                { label: 'Secondes', value: timeLeft.seconds },
                            ].map((unit, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center"
                                >
                                    <span className="text-3xl sm:text-5xl font-extrabold text-slate-900 tracking-tight font-sans">
                                        {String(unit.value).padStart(2, '0')}
                                    </span>
                                    <span className="mt-1 text-[11px] sm:text-xs uppercase font-bold text-slate-500 tracking-wider">
                                        {unit.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Informations d'avancement */}
                        <div className="mt-6 pt-5 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                            <div className="flex items-center gap-2 font-medium">
                                <CalendarCheck className="w-4 h-4 text-slate-700" />
                                <span>Échéance de livraison : <strong>Phase 1 MVP (8 semaines)</strong></span>
                            </div>
                            <span className="text-slate-500">
                                14 jours d'essai prévus dès l'ouverture des accès pilotes
                            </span>
                        </div>
                    </div>

                    {/* Formulaire d'information d'ouverture */}
                    <div className="mt-8 w-full max-w-md">
                        {submitted ? (
                            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-xl p-4 flex items-center justify-center gap-3 text-sm font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-700 shrink-0" />
                                <span>Votre demande a été enregistrée. Vous recevrez l'accès dès l'ouverture.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Votre email d'entreprise..."
                                    className="flex-1 px-4 py-3 rounded-lg bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 focus:ring-1 focus:ring-slate-800 text-sm transition"
                                />
                                <button
                                    type="submit"
                                    className="px-5 py-3 rounded-lg bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm"
                                >
                                    <span>M'avertir</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                            Réservé aux agences, marques et gestionnaires d'équipes de vente.
                        </p>
                    </div>

                    {/* Grille opérationnelle - Réponse directe aux problèmes du CdC */}
                    <div className="mt-16 w-full text-left">
                        <div className="border-b border-slate-200 pb-4 mb-6">
                            <h2 className="text-xl font-bold text-slate-900">
                                Ce que remplace Aktivy dans votre gestion quotidienne
                            </h2>
                            <p className="text-xs sm:text-sm text-slate-500 mt-1">
                                Remplacement des messages WhatsApp, des tableurs éparpillés et des compilations manuelles du weekend.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
                            
                            {/* Problème 1 */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Saisie terrain &lt; 2 minutes</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Conçu pour smartphone d'entrée de gamme, utilisable hors-ligne avec synchronisation dès le retour du réseau.
                                </p>
                            </div>

                            {/* Problème 2 */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                                    <Calculator className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Zéro calcul manuel</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    L'agent saisit les chiffres réels ; l'outil déduit automatiquement les totaux, écarts de stock et primes.
                                </p>
                            </div>

                            {/* Problème 3 */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Pointage &amp; présence</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Enregistrement horodaté des arrivées et départs par site, éliminant les litiges d'absence ou d'horaires.
                                </p>
                            </div>

                            {/* Problème 4 */}
                            <div className="bg-white border border-slate-200 rounded-xl p-5">
                                <div className="h-9 w-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 mb-3">
                                    <FileSpreadsheet className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-sm mb-1">Rapports consolidés</h3>
                                <p className="text-xs text-slate-600 leading-relaxed">
                                    Exports PDF et Excel en un clic par site, par agent ou par produit pour les réunions et la comptabilité.
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Organisation technique & Rôles */}
                    <div className="mt-8 w-full bg-white border border-slate-200 rounded-xl p-5 text-left flex flex-col md:flex-row items-center justify-between gap-4">
                        <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-lg bg-slate-100 flex items-center justify-center text-slate-700 shrink-0">
                                <Users2 className="w-5 h-5" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Gestion des 5 profils d'utilisateurs</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Administrateur, responsable d'équipe, hôtesse/agent terrain, comptabilité et client final.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span className="bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">Données multi-entreprises isolées</span>
                            <span className="bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">Application PWA</span>
                            <span className="bg-slate-100 px-3 py-1.5 rounded-md border border-slate-200">PostgreSQL</span>
                        </div>
                    </div>

                </main>

                {/* Pied de page sobre */}
                <footer className="w-full border-t border-slate-200 bg-white py-6 text-center text-xs text-slate-500">
                    <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                        <span>&copy; {new Date().getFullYear()} {appName}. Plateforme de pilotage terrain modulaire.</span>
                        <span className="text-slate-500 font-medium">
                            Feuille de route MVP &bull; Stack Laravel 13, Inertia &amp; React
                        </span>
                    </div>
                </footer>

            </div>
        </>
    );
}
