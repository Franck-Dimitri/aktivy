import * as DialogPrimitive from '@radix-ui/react-dialog';
import { AlertCircle, Download, ExternalLink, FileText, Printer, RotateCw, X } from 'lucide-react';
import type { PDFDocumentLoadingTask, PDFDocumentProxy } from 'pdfjs-dist';
import { useEffect, useRef, useState } from 'react';
import { buttonClass, Spinner } from '@/components/page/buttons';
import { DialogOverlay, DialogPortal } from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { currencyLabel, number } from '@/pages/reports/format';
import { download as invoiceDownload, preview as invoicePreview } from '@/routes/company/invoices';

export type InvoiceItem = {
    id: number;
    invoice_number: string;
    amount: number;
    currency: string;
    method: string;
    plan: string | null;
    extra_packs?: number;
    paid_at: string;
    period_start?: string | null;
    period_end: string | null;
    reference?: string | null;
    notes?: string | null;
};

/** Mêmes statuts que App\Support\Billing\InvoiceDocument::STATUSES (badge et filigrane du PDF). */
export type InvoiceStatus = 'paid' | 'pending' | 'overdue' | 'cancelled';

const STATUS: Record<InvoiceStatus, { label: string; badge: string; dot: string }> = {
    paid: { label: 'Payée', badge: 'bg-motriks-soft text-motriks-deep ring-green-600/15', dot: 'bg-motriks' },
    pending: { label: 'En attente', badge: 'bg-slate-100 text-slate-600 ring-slate-500/15', dot: 'bg-slate-400' },
    overdue: { label: 'En retard', badge: 'bg-amber-50 text-amber-700 ring-amber-600/15', dot: 'bg-amber-500' },
    cancelled: { label: 'Annulée', badge: 'bg-red-50 text-red-700 ring-red-600/15', dot: 'bg-red-500' },
};

/** Largeur maximale d'une page à l'écran (px CSS). */
const SHEET_WIDTH = 820;

const SHEET_SHADOW = 'shadow-[0_1px_2px_rgba(15,23,42,0.06),0_12px_32px_-12px_rgba(15,23,42,0.22)]';

type Props = {
    invoice: InvoiceItem | null;
    open: boolean;
    onClose: () => void;
    /** Nom de l'entreprise facturée, affiché dans l'en-tête. */
    client?: string | null;
    status?: InvoiceStatus;
    /** Adresses du PDF ; par défaut, celles de l'espace entreprise (l'admin passe les siennes). */
    urls?: InvoiceUrls;
};

/** Adresses de l'aperçu (PDF inline) et du téléchargement d'une facture : à déclarer hors du composant (objet stable). */
export type InvoiceUrls = { preview: (id: number) => string; download: (id: number) => string };

const COMPANY_URLS: InvoiceUrls = { preview: (id) => invoicePreview(id).url, download: (id) => invoiceDownload(id).url };

type Load = { state: 'loading' } | { state: 'ready'; url: string; pdf: PDFDocumentProxy } | { state: 'error'; message: string };

/** Erreur dont le message peut être montré tel quel. */
class ShownError extends Error {}

/** pdf.js (le moteur PDF de Firefox), chargé seulement à la première ouverture d'un aperçu. */
async function loadPdfJs() {
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs');
    const options = pdfjs.GlobalWorkerOptions;

    if (!options.workerPort && !options.workerSrc) {
        if (import.meta.env.DEV) {
            // En développement, les scripts viennent du serveur Vite (autre origine) : pdf.js crée lui-même
            // un worker relais à partir de cette adresse
            options.workerSrc = (await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?url')).default;
        } else {
            // En production : worker empaqueté par Vite en .js classique, même origine, servi avec le bon type
            // par tout serveur web (le .mjs ne l'est pas toujours) ; un seul pour toute la session
            const { default: PdfWorker } = await import('pdfjs-dist/legacy/build/pdf.worker.min.mjs?worker');
            options.workerPort = new PdfWorker();
        }
    }

    return pdfjs;
}

/**
 * Aperçu d'une facture : le PDF exact (même gabarit, même fichier mis en cache que le téléchargement),
 * dessiné page par page sur fond clair, sans la visionneuse du navigateur : même rendu sur ordinateur
 * et sur téléphone. Le PDF n'est demandé qu'à l'ouverture.
 */
export function InvoicePreviewModal({ invoice, open, onClose, client, status = 'paid', urls = COMPANY_URLS }: Props) {
    // Garde la dernière facture pendant l'animation de fermeture (le parent remet souvent `invoice` à null)
    const [shown, setShown] = useState(invoice);
    if (invoice && invoice.id !== shown?.id) {
        setShown(invoice);
    }

    const [load, setLoad] = useState<Load>({ state: 'loading' });
    const [drawn, setDrawn] = useState(false);
    const [attempt, setAttempt] = useState(0);
    // Sans <Dialog.Trigger>, Radix ne sait pas où rendre le focus : on le rend au bouton qui a ouvert l’aperçu
    const opener = useRef<HTMLElement | null>(null);
    const id = open ? shown?.id : undefined;

    useEffect(() => {
        if (id === undefined) {
            return;
        }

        const controller = new AbortController();
        let objectUrl: string | null = null;
        let task: PDFDocumentLoadingTask | null = null;
        setLoad({ state: 'loading' });
        setDrawn(false);

        (async () => {
            const [response, pdfjs] = await Promise.all([
                fetch(urls.preview(id), { credentials: 'same-origin', headers: { Accept: 'application/pdf' }, signal: controller.signal }),
                loadPdfJs(),
            ]);

            if (response.redirected) {
                throw new ShownError('Votre session a expiré. Rechargez la page pour vous reconnecter.');
            }

            if (response.status === 404) {
                throw new ShownError('Cette facture est introuvable.');
            }

            if (!response.ok || !(response.headers.get('content-type') ?? '').includes('application/pdf')) {
                throw new ShownError('La facture n’a pas pu être préparée. Réessayez dans un instant.');
            }

            const blob = await response.blob();
            objectUrl = URL.createObjectURL(blob);
            task = pdfjs.getDocument({ data: new Uint8Array(await blob.arrayBuffer()) });
            const pdf = await task.promise;

            if (!controller.signal.aborted) {
                setLoad({ state: 'ready', url: objectUrl, pdf });
            }
        })().catch((error: unknown) => {
            if (controller.signal.aborted) {
                return;
            }

            console.error('Aperçu de facture', error);
            setLoad({
                state: 'error',
                message:
                    error instanceof ShownError
                        ? error.message
                        : error instanceof TypeError && String(error.message).toLowerCase().includes('fetch')
                          ? 'Connexion impossible. Vérifiez votre réseau, puis réessayez.'
                          : 'L’aperçu n’a pas pu être affiché sur cet appareil. Vous pouvez ouvrir le PDF directement.',
            });
        });

        return () => {
            controller.abort();
            void task?.destroy();
            if (objectUrl) {
                URL.revokeObjectURL(objectUrl);
            }
        };
    }, [id, attempt, urls]);

    // Impression du PDF lui-même (pas de la page), via un cadre invisible ; à défaut, ouverture dans un onglet
    const print = () => {
        if (load.state !== 'ready') {
            return;
        }

        const url = load.url;
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
        frame.src = url;
        frame.onload = () => {
            try {
                frame.contentWindow?.focus();
                frame.contentWindow?.print();
            } catch {
                window.open(url, '_blank', 'noopener');
            }

            setTimeout(() => frame.remove(), 60_000);
        };
        document.body.appendChild(frame);
    };

    const badge = STATUS[status];
    const amount = shown ? `${number.format(shown.amount)} ${currencyLabel(shown.currency)}` : '';
    const pages = load.state === 'ready' ? load.pdf.numPages : 0;

    return (
        <DialogPrimitive.Root open={open} onOpenChange={(next) => !next && onClose()}>
            <DialogPortal>
                <DialogOverlay className="duration-200" />
                <DialogPrimitive.Content
                    aria-modal="true"
                    onOpenAutoFocus={() => {
                        opener.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
                    }}
                    onCloseAutoFocus={(event) => {
                        event.preventDefault();
                        opener.current?.focus();
                    }}
                    className={cn(
                        'fixed inset-0 z-50 flex flex-col overflow-hidden bg-white outline-none',
                        'duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[state=open]:animate-in data-[state=open]:fade-in-0 data-[state=open]:zoom-in-95',
                        'sm:inset-auto sm:top-1/2 sm:left-1/2 sm:h-[90vh] sm:w-[calc(100%-2rem)] sm:max-w-5xl sm:-translate-x-1/2 sm:-translate-y-1/2 sm:rounded-3xl',
                        'sm:shadow-[0_24px_80px_-12px_rgba(15,23,42,0.35)] sm:ring-1 sm:ring-slate-900/5',
                    )}
                >
                    {/* En-tête : numéro, client, statut */}
                    <header className="flex items-start gap-3 border-b border-slate-200/80 px-5 py-4 sm:px-6">
                        <span className="mt-0.5 hidden size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-500 sm:flex">
                            <FileText className="size-[18px]" />
                        </span>
                        <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1">
                                <DialogPrimitive.Title className="text-[15px] font-semibold text-ink">
                                    {shown ? `Facture ${shown.invoice_number}` : 'Facture'}
                                </DialogPrimitive.Title>
                                <span
                                    className={cn(
                                        'inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1',
                                        badge.badge,
                                    )}
                                >
                                    <span className={cn('size-1.5 rounded-full', badge.dot)} />
                                    {badge.label}
                                </span>
                            </div>
                            <DialogPrimitive.Description className="mt-1 truncate text-[13px] text-slate-500">
                                {[client, amount, shown && `payée le ${shown.paid_at}`].filter(Boolean).join(' · ')}
                            </DialogPrimitive.Description>
                        </div>
                        <DialogPrimitive.Close
                            aria-label="Fermer l’aperçu"
                            className="-mt-1 -mr-2 rounded-full p-2 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:ring-2 focus-visible:ring-motriks focus-visible:outline-none"
                        >
                            <X className="size-5" />
                        </DialogPrimitive.Close>
                    </header>

                    {/* Les pages, sur fond clair */}
                    <div className="relative min-h-0 flex-1 bg-slate-100/80">
                        {load.state === 'ready' && shown && (
                            <PdfSheets pdf={load.pdf} title={`Facture ${shown.invoice_number}`} visible={drawn} onDrawn={() => setDrawn(true)} />
                        )}
                        {(load.state === 'loading' || (load.state === 'ready' && !drawn)) && <SheetSkeleton />}
                        {load.state === 'error' && shown && (
                            <LoadError message={load.message} openHref={urls.preview(shown.id)} onRetry={() => setAttempt((n) => n + 1)} />
                        )}
                    </div>

                    {/* Actions (en bas de l'écran sur téléphone) */}
                    <footer className="flex items-center gap-3 border-t border-slate-200/80 bg-white px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:px-6">
                        <p className="hidden flex-1 text-xs text-slate-400 sm:block">
                            {pages > 0 && `${pages} page${pages > 1 ? 's' : ''} · `}Identique au PDF téléchargé.
                        </p>
                        <button type="button" onClick={print} disabled={!drawn} className={cn(buttonClass('secondary'), 'hidden sm:inline-flex')}>
                            <Printer />
                            Imprimer
                        </button>
                        {shown && (
                            <a href={urls.download(shown.id)} className={cn(buttonClass('primary'), 'flex-1 sm:flex-none')}>
                                <Download />
                                Télécharger le PDF
                            </a>
                        )}
                    </footer>
                </DialogPrimitive.Content>
            </DialogPortal>
        </DialogPrimitive.Root>
    );
}

/**
 * Chaque page du PDF dessinée sur un canevas, comme une feuille posée sur la table.
 * Dessinée à 2 ou 3 fois sa taille affichée, pour un texte net sur tout écran.
 */
function PdfSheets({ pdf, title, visible, onDrawn }: { pdf: PDFDocumentProxy; title: string; visible: boolean; onDrawn: () => void }) {
    const scroller = useRef<HTMLDivElement>(null);
    const canvases = useRef<(HTMLCanvasElement | null)[]>([]);
    const drawnRef = useRef(onDrawn);

    useEffect(() => {
        drawnRef.current = onDrawn;
    });

    useEffect(() => {
        let cancelled = false;
        const tasks: { cancel: () => void }[] = [];
        const cssWidth = Math.min(SHEET_WIDTH, (scroller.current?.clientWidth ?? SHEET_WIDTH) - 32);
        // Au moins 2× : sur un écran ordinaire, un rendu à la taille exacte rend les petits caractères flous et mal espacés
        const ratio = Math.min(Math.max(window.devicePixelRatio || 1, 2), 3);

        (async () => {
            for (let n = 1; n <= pdf.numPages && !cancelled; n++) {
                const page = await pdf.getPage(n);
                const canvas = canvases.current[n - 1];
                if (!canvas || cancelled) {
                    return;
                }

                const viewport = page.getViewport({ scale: (cssWidth / page.getViewport({ scale: 1 }).width) * ratio });
                canvas.width = Math.floor(viewport.width);
                canvas.height = Math.floor(viewport.height);
                const task = page.render({ canvas, viewport });
                tasks.push(task);
                await task.promise;

                if (n === 1 && !cancelled) {
                    drawnRef.current();
                }
            }
        })().catch(() => {
            // Rendu interrompu (fermeture de l'aperçu) : rien à signaler
        });

        return () => {
            cancelled = true;
            tasks.forEach((t) => t.cancel());
        };
    }, [pdf]);

    return (
        <div
            ref={scroller}
            className={cn(
                'absolute inset-0 overflow-y-auto overscroll-contain transition-opacity duration-300',
                visible ? 'opacity-100' : 'opacity-0',
            )}
        >
            <div className="flex flex-col items-center gap-6 px-4 py-6 sm:py-8">
                {Array.from({ length: pdf.numPages }, (_, i) => (
                    <canvas
                        key={i}
                        ref={(el) => {
                            canvases.current[i] = el;
                        }}
                        role="img"
                        aria-label={`${title}, page ${i + 1} sur ${pdf.numPages}`}
                        className={cn('block aspect-[1/1.414] h-auto w-full rounded-[3px] bg-white ring-1 ring-slate-900/[0.04]', SHEET_SHADOW)}
                        style={{ maxWidth: SHEET_WIDTH }}
                    />
                ))}
            </div>
        </div>
    );
}

/** Une page A4 esquissée, le temps que le PDF arrive. */
function SheetSkeleton() {
    return (
        <div role="status" className="absolute inset-0 flex flex-col items-center overflow-hidden px-4 py-6 sm:py-8">
            <div
                className={cn('flex aspect-[1/1.414] w-full animate-pulse flex-col gap-5 rounded-[3px] bg-white p-[7%]', SHEET_SHADOW)}
                style={{ maxWidth: SHEET_WIDTH }}
            >
                <div className="flex justify-between">
                    <div className="h-5 w-32 rounded bg-slate-200" />
                    <div className="h-7 w-40 rounded bg-green-100" />
                </div>
                <div className="ml-auto h-3 w-32 rounded bg-slate-100" />
                <div className="mt-6 grid grid-cols-2 gap-8">
                    <div className="flex flex-col gap-2.5">
                        <div className="h-2.5 w-16 rounded bg-slate-200" />
                        <div className="h-3 w-32 rounded bg-slate-100" />
                        <div className="h-3 w-24 rounded bg-slate-100" />
                    </div>
                    <div className="flex flex-col gap-2.5">
                        <div className="h-2.5 w-16 rounded bg-slate-200" />
                        <div className="h-3 w-40 rounded bg-slate-100" />
                        <div className="h-3 w-28 rounded bg-slate-100" />
                    </div>
                </div>
                <div className="mt-6 h-px bg-green-200" />
                <div className="flex flex-col gap-3">
                    <div className="h-3 w-3/5 rounded bg-slate-100" />
                    <div className="h-3 w-2/5 rounded bg-slate-100" />
                </div>
                <div className="mt-6 ml-auto h-10 w-2/5 rounded bg-green-50" />
            </div>
            <p className="absolute top-1/2 left-1/2 flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-full bg-white/95 px-4 py-2 text-sm text-slate-600 shadow-sm ring-1 ring-slate-900/5">
                <Spinner className="size-4 text-motriks" />
                Chargement de la facture…
            </p>
        </div>
    );
}

function LoadError({ message, openHref, onRetry }: { message: string; openHref: string; onRetry: () => void }) {
    return (
        <div role="alert" className="absolute inset-0 flex flex-col items-center justify-center gap-4 px-6 text-center">
            <span className="flex size-12 items-center justify-center rounded-2xl bg-red-50 text-red-600">
                <AlertCircle className="size-5" />
            </span>
            <div>
                <p className="font-semibold text-ink">Aperçu indisponible</p>
                <p className="mt-1 max-w-sm text-sm text-slate-500">{message}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                <button type="button" onClick={onRetry} className={buttonClass('secondary')}>
                    <RotateCw />
                    Réessayer
                </button>
                <a href={openHref} target="_blank" rel="noopener" className={buttonClass('ghost')}>
                    <ExternalLink />
                    Ouvrir le PDF
                </a>
            </div>
        </div>
    );
}
