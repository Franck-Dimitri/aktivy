import { Head, Link, usePage } from '@inertiajs/react';
import { useState, useEffect, type FormEvent } from 'react';
import { 
    Clock, 
    Sparkles, 
    Smartphone, 
    Calculator, 
    MapPin, 
    WifiOff, 
    CheckCircle2, 
    ArrowRight, 
    Layers, 
    BarChart3,
    Shield,
    Users
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

    // Date de cible par défaut : 60 jours à partir de maintenant si non transmise
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
            <Head title={`${appName} - Plateforme de pilotage terrain & IA`} />

            {/* Arrière-plan clair et lumineux */}
            <div className="min-h-screen bg-slate-50 text-slate-800 flex flex-col selection:bg-indigo-500 selection:text-white">
                
                {/* Bandeau d'annonce supérieur */}
                <div className="bg-indigo-50/80 border-b border-indigo-100 text-indigo-900 px-4 py-2 text-xs md:text-sm font-medium text-center">
                    <span className="inline-flex items-center gap-2">
                        <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
                        <strong>Projet en cours de développement</strong> : Phase 1 MVP — Sortie officielle prévue dans 2 mois
                    </span>
                </div>

                {/* En-tête */}
                <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
                    {/* Logo */}
                    <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center font-black text-xl text-white shadow-md shadow-indigo-200">
                            A
                        </div>
                        <div className="flex flex-col">
                            <span className="font-extrabold text-2xl tracking-tight text-slate-900">{appName}</span>
                            <span className="text-[10px] uppercase font-bold tracking-widest text-indigo-600 -mt-1">
                                Terrain &bull; Reporting &bull; IA
                            </span>
                        </div>
                    </div>

                    {/* Navigation */}
                    <nav className="flex items-center gap-3">
                        {auth?.user ? (
                            <Link
                                href={dashboard()}
                                className="px-4 py-2 text-sm font-medium text-indigo-700 bg-indigo-100/70 hover:bg-indigo-200 rounded-lg transition"
                            >
                                Accéder au Dashboard
                            </Link>
                        ) : (
                            <>
                                <Link
                                    href={login()}
                                    className="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                                >
                                    Connexion
                                </Link>
                                <Link
                                    href={register()}
                                    className="px-4 py-2 text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm shadow-indigo-200 transition"
                                >
                                    Créer un compte
                                </Link>
                            </>
                        )}
                    </nav>
                </header>

                {/* Section Hero */}
                <main className="flex-1 max-w-5xl w-full mx-auto px-6 pt-10 pb-16 flex flex-col items-center text-center">
                    
                    {/* Badge Pillule */}
                    <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-200/90 text-slate-700 text-xs md:text-sm font-medium shadow-xs mb-6">
                        <Sparkles className="w-4 h-4 text-amber-500" />
                        <span>Fini les messages WhatsApp et les tableurs éparpillés</span>
                    </div>

                    {/* Titre Principal */}
                    <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 max-w-4xl leading-tight">
                        Pilotez vos équipes terrain <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-violet-600">en temps réel</span>, sans saisie manuelle.
                    </h1>

                    {/* Sous-titre */}
                    <p className="mt-5 text-base sm:text-lg md:text-xl text-slate-600 max-w-2xl font-normal leading-relaxed">
                        La plateforme modulaire pour entreprises et agences qui gèrent des hôtesses, promotrices et commerciaux. Saisie mobile ultra-rapide, calculs automatiques et intelligence artificielle décisionnelle.
                    </p>

                    {/* Bloc Compte à rebours 2 Mois */}
                    <div className="mt-10 w-full max-w-3xl bg-white border border-slate-200/90 rounded-3xl p-6 sm:p-8 shadow-sm">
                        <div className="flex items-center justify-center gap-2 text-xs sm:text-sm font-semibold uppercase tracking-wider text-slate-500 mb-6">
                            <Clock className="w-4 h-4 text-indigo-600" />
                            <span>Mise en ligne opérationnelle dans</span>
                        </div>

                        {/* Cartes des chiffres */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                            {[
                                { label: 'Jours', value: timeLeft.days },
                                { label: 'Heures', value: timeLeft.hours },
                                { label: 'Minutes', value: timeLeft.minutes },
                                { label: 'Secondes', value: timeLeft.seconds },
                            ].map((unit, idx) => (
                                <div 
                                    key={idx} 
                                    className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 sm:p-5 flex flex-col items-center justify-center shadow-xs"
                                >
                                    <span className="text-3xl sm:text-5xl font-mono font-extrabold text-indigo-600 tracking-tight">
                                        {String(unit.value).padStart(2, '0')}
                                    </span>
                                    <span className="mt-1 text-[11px] sm:text-xs uppercase font-semibold text-slate-500 tracking-wider">
                                        {unit.label}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Indicateur de phase */}
                        <div className="mt-6 pt-5 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
                            <div className="flex items-center gap-2">
                                <span className="h-2 w-2 rounded-full bg-indigo-600"></span>
                                <span>Phase actuelle : <strong>Développement MVP (FN-01 à FN-13)</strong></span>
                            </div>
                            <span className="font-medium text-indigo-600 bg-indigo-50 px-2.5 py-1 rounded-md">
                                Test pilote en entreprise à venir
                            </span>
                        </div>
                    </div>

                    {/* Formulaire Early Access */}
                    <div className="mt-10 w-full max-w-md">
                        {submitted ? (
                            <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 flex items-center justify-center gap-3 text-sm font-medium">
                                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                                <span>Merci ! Vous serez averti dès l'ouverture des accès pilotes.</span>
                            </div>
                        ) : (
                            <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                                <input
                                    type="email"
                                    required
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="Entrez votre email professionnel..."
                                    className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 text-sm shadow-xs transition"
                                />
                                <button
                                    type="submit"
                                    className="px-5 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-sm transition flex items-center justify-center gap-2 shadow-sm shadow-indigo-300 cursor-pointer"
                                >
                                    <span>M'avertir</span>
                                    <ArrowRight className="w-4 h-4" />
                                </button>
                            </form>
                        )}
                        <p className="text-xs text-slate-500 mt-2">
                            Période d'essai gratuite de 14 jours incluse &bull; Aucun paiement requis
                        </p>
                    </div>

                    {/* Grille des caractéristiques clés issues du Cahier des Charges */}
                    <div className="mt-16 w-full text-left">
                        <div className="text-center mb-8">
                            <h2 className="text-2xl font-bold text-slate-900">
                                Ce qui arrive avec la version MVP
                            </h2>
                            <p className="text-sm text-slate-500 mt-1">
                                Conçu pour s'adapter aux réalités du terrain et aux connexions variables.
                            </p>
                        </div>

                        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5">
                            
                            {/* Carte 1 */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-indigo-200 hover:shadow-sm transition">
                                <div className="h-10 w-10 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                                    <Smartphone className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Saisie en &lt; 2 minutes</h3>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Compteurs ergonomiques (+ / -) pensés pour smartphone entrée de gamme avec contrôles bloquants contre les erreurs.
                                </p>
                            </div>

                            {/* Carte 2 */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-emerald-200 hover:shadow-sm transition">
                                <div className="h-10 w-10 rounded-xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600 mb-4">
                                    <WifiOff className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Mode 100% Hors-ligne</h3>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Les données sont conservées localement sur le smartphone et synchronisées automatiquement au retour du réseau.
                                </p>
                            </div>

                            {/* Carte 3 */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-amber-200 hover:shadow-sm transition">
                                <div className="h-10 w-10 rounded-xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600 mb-4">
                                    <Calculator className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Zéro calcul manuel</h3>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    L'hôtesse saisit les faits, la plateforme déduit instantanément les montants, soldes et stocks de clôture.
                                </p>
                            </div>

                            {/* Carte 4 */}
                            <div className="bg-white border border-slate-200/90 rounded-2xl p-5 shadow-xs hover:border-violet-200 hover:shadow-sm transition">
                                <div className="h-10 w-10 rounded-xl bg-violet-50 border border-violet-100 flex items-center justify-center text-violet-600 mb-4">
                                    <Sparkles className="w-5 h-5" />
                                </div>
                                <h3 className="font-bold text-slate-900 text-base mb-1">Intelligence Artificielle</h3>
                                <p className="text-xs leading-relaxed text-slate-600">
                                    Contrôle de plausibilité en direct, détection d'anomalies de vente et synthèses automatisées pour le gérant.
                                </p>
                            </div>

                        </div>
                    </div>

                    {/* Section Cibles & Rôles */}
                    <div className="mt-12 w-full bg-white border border-slate-200/80 rounded-2xl p-6 text-left shadow-xs flex flex-col md:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                            <div className="h-12 w-12 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
                                <Users className="w-6 h-6" />
                            </div>
                            <div>
                                <h4 className="font-bold text-slate-900 text-sm">Prévu pour toutes vos équipes</h4>
                                <p className="text-xs text-slate-500 mt-0.5">
                                    Gérants de PME, superviseurs commerciaux, hôtesses terrain et comptabilité.
                                </p>
                            </div>
                        </div>

                        <div className="flex flex-wrap gap-2 text-xs font-semibold text-slate-600">
                            <span className="bg-slate-100 px-3 py-1.5 rounded-lg">Multi-entreprises isolé</span>
                            <span className="bg-slate-100 px-3 py-1.5 rounded-lg">Mobile Money intégré</span>
                            <span className="bg-slate-100 px-3 py-1.5 rounded-lg">PWA installable</span>
                        </div>
                    </div>

                </main>

                {/* Pied de page clair */}
                <footer className="w-full border-t border-slate-200/80 bg-white py-6 text-center text-xs text-slate-500">
                    <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                        <span>&copy; {new Date().getFullYear()} {appName}. Tous droits réservés.</span>
                        <span className="text-slate-400">
                            Cahier des charges v2.1 &bull; Architecture Laravel &amp; React Inertia
                        </span>
                    </div>
                </footer>

            </div>
        </>
    );
}
