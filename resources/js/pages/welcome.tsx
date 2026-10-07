import { Head } from '@inertiajs/react';
import { useState, useEffect, type FormEvent } from 'react';
import { Clock, ArrowRight, CheckCircle2 } from 'lucide-react';

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
    // Date cible par défaut : 60 jours
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
            <Head>
                <title>{`${appName} — Bientôt disponible`}</title>
            </Head>

            {/* Conteneur principal avec image nette et overlay réduit */}
            <div className="relative min-h-screen flex flex-col justify-between overflow-hidden font-sans text-slate-900">
                
                {/* Image de fond nette (sans flou excessif) */}
                <div 
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url('/images/hero-bg.png')` }}
                    aria-hidden="true"
                />

                {/* Overlay blanc ajusté à 70% pour garantir un contraste et une lisibilité parfaite des textes */}
                <div 
                    className="absolute inset-0 bg-white/70"
                    aria-hidden="true"
                />

                {/* Contenu principal */}
                <div className="relative z-10 flex flex-col min-h-screen justify-between">
                    
                    {/* En-tête avec logo et boutons figés (non-cliquables) */}
                    <header className="max-w-6xl w-full mx-auto px-6 py-6 flex justify-between items-center">
                        {/* Logo avec touche #4FC031 */}
                        <div className="flex items-center gap-2.5">
                            <div className="h-9 w-9 rounded-xl bg-slate-900 text-white flex items-center justify-center font-bold text-lg shadow-sm">
                                A
                            </div>
                            <div className="flex items-baseline">
                                <span className="font-extrabold text-2xl tracking-tight text-slate-900">{appName}</span>
                                <span className="text-2xl font-black leading-none ml-0.5" style={{ color: '#4FC031' }}>.</span>
                            </div>
                        </div>

                        {/* Boutons Connexion et Inscription figés (non-cliquables) */}
                        <nav className="flex items-center gap-3">
                            <button
                                type="button"
                                disabled
                                className="px-4 py-2 text-sm font-semibold text-slate-600 bg-white/90 border border-slate-300 rounded-lg cursor-not-allowed select-none opacity-80 shadow-2xs"
                                title="Accès temporairement verrouillé"
                            >
                                Connexion
                            </button>
                            <button
                                type="button"
                                disabled
                                className="px-4 py-2 text-sm font-semibold text-slate-200 bg-slate-900/85 rounded-lg cursor-not-allowed select-none opacity-80 shadow-xs"
                                title="Inscriptions temporairement verrouillées"
                            >
                                Inscription
                            </button>
                        </nav>
                    </header>

                    {/* Section Hero : Suspense & Décompte */}
                    <main className="max-w-4xl w-full mx-auto px-6 py-10 flex-1 flex flex-col items-center justify-center text-center">
                        
                        {/* Statut discret */}
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white border border-slate-300 text-slate-900 text-xs font-semibold tracking-wide shadow-xs mb-6">
                            <span 
                                className="h-2 w-2 rounded-full" 
                                style={{ backgroundColor: '#4FC031' }}
                            />
                            <span>Bientôt disponible</span>
                        </div>

                        {/* Gros titre en palier de 3 lignes avec 'équipes' et 'terrain' en vert #4FC031 */}
                        <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-black tracking-tight text-slate-900 max-w-4xl leading-[1.15]">
                            <span className="block">La nouvelle façon</span>
                            <span className="block">de piloter vos <span style={{ color: '#4FC031' }}>équipes</span></span>
                            <span className="block">sur le <span style={{ color: '#4FC031' }}>terrain</span>.</span>
                        </h1>

                        {/* Description nette, contrastée et bien visible en noir profond */}
                        <p className="mt-6 text-base sm:text-lg md:text-xl text-slate-900 max-w-2xl font-medium leading-relaxed">
                            Une expérience fluide pensée pour les gestionnaires, superviseurs et équipes mobiles. Quelque chose de grand arrive.
                        </p>

                        {/* Compte à rebours épuré */}
                        <div className="mt-10 w-full max-w-2xl bg-white/95 backdrop-blur-md border border-slate-300/90 rounded-2xl p-6 sm:p-8 shadow-md">
                            <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-6 flex items-center justify-center gap-2">
                                <Clock className="w-3.5 h-3.5 text-slate-400" />
                                <span>Ouverture officielle dans</span>
                            </p>

                            {/* 4 Blocs de décompte */}
                            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                                {[
                                    { label: 'Jours', value: timeLeft.days },
                                    { label: 'Heures', value: timeLeft.hours },
                                    { label: 'Minutes', value: timeLeft.minutes },
                                    { label: 'Secondes', value: timeLeft.seconds },
                                ].map((unit, idx) => (
                                    <div 
                                        key={idx} 
                                        className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex flex-col items-center justify-center shadow-2xs"
                                    >
                                        <span className="text-3xl sm:text-5xl font-black text-slate-900 tracking-tight font-sans">
                                            {String(unit.value).padStart(2, '0')}
                                        </span>
                                        <span className="mt-1 text-[10px] sm:text-xs uppercase font-bold text-slate-500 tracking-wider">
                                            {unit.label}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Formulaire d'invitation sobre */}
                        <div className="mt-10 w-full max-w-md">
                            {submitted ? (
                                <div className="bg-white/95 border border-slate-300 text-slate-900 rounded-xl p-4 flex items-center justify-center gap-2.5 text-sm font-semibold shadow-sm">
                                    <CheckCircle2 className="w-4 h-4 shrink-0" style={{ color: '#4FC031' }} />
                                    <span>C'est noté. Vous recevrez une invitation prioritaire.</span>
                                </div>
                            ) : (
                                <form onSubmit={handleSubscribe} className="flex flex-col sm:flex-row gap-2">
                                    <input
                                        type="email"
                                        required
                                        value={email}
                                        onChange={(e) => setEmail(e.target.value)}
                                        placeholder="Votre adresse email professionnelle..."
                                        className="flex-1 px-4 py-3 rounded-xl bg-white border border-slate-300 text-slate-900 placeholder-slate-400 focus:outline-none focus:border-slate-800 text-sm shadow-xs transition"
                                    />
                                    <button
                                        type="submit"
                                        className="px-5 py-3 rounded-xl text-white font-semibold text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-sm hover:opacity-95"
                                        style={{ backgroundColor: '#4FC031' }}
                                    >
                                        <span>Être prévenu</span>
                                        <ArrowRight className="w-4 h-4 text-white" />
                                    </button>
                                </form>
                            )}
                            <p className="text-xs text-slate-600 font-medium mt-2">
                                Accès anticipé réservé aux premières entreprises inscrites.
                            </p>
                        </div>

                    </main>

                    {/* Pied de page minimaliste */}
                    <footer className="w-full py-6 text-center text-xs text-slate-600 font-medium">
                        <div className="max-w-6xl mx-auto px-6 flex flex-col sm:flex-row justify-between items-center gap-2">
                            <span>&copy; {new Date().getFullYear()} {appName}. Tous droits réservés.</span>
                            <span>Conçu pour le terrain.</span>
                        </div>
                    </footer>

                </div>

            </div>
        </>
    );
}
