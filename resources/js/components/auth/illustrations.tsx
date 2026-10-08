const INK = '#0f172a';
const MUTED = '#64748b';
const LINE = '#e2e8f0';
const SURFACE = '#f1f5f9';
const GREEN = '#4fc031';
const GREEN_DEEP = '#2b7f1a';
const GREEN_SOFT = '#eaf7e5';
const AMBER = '#f59e0b';
const GREY = '#94a3b8';

function Counter({
    y,
    label,
    count,
}: {
    y: number;
    label: string;
    count: string;
}) {
    return (
        <g>
            <rect
                x="166"
                y={y}
                width="148"
                height="40"
                rx="10"
                fill={SURFACE}
            />
            <text x="178" y={y + 25} fontSize="12" fontWeight="600" fill={INK}>
                {label}
            </text>
            <circle cx="250" cy={y + 20} r="11" fill="white" stroke="#cbd5e1" />
            <path
                d={`M245 ${y + 20}h10`}
                stroke={INK}
                strokeWidth="2"
                strokeLinecap="round"
            />
            <text
                x="273"
                y={y + 25}
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                fill={INK}
            >
                {count}
            </text>
            <circle cx="297" cy={y + 20} r="11" fill={GREEN} />
            <path
                d={`M292 ${y + 20}h10M297 ${y + 15}v10`}
                stroke={INK}
                strokeWidth="2"
                strokeLinecap="round"
            />
        </g>
    );
}

export function FieldEntryIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect
                x="150"
                y="16"
                width="180"
                height="328"
                rx="28"
                fill="white"
            />
            <rect x="210" y="28" width="60" height="7" rx="3.5" fill={LINE} />

            <text x="170" y="66" fontSize="10" fill={MUTED}>
                Vous êtes affectée à
            </text>
            <text x="170" y="86" fontSize="15" fontWeight="700" fill={INK}>
                Carrefour Dakar
            </text>
            <line x1="166" y1="102" x2="314" y2="102" stroke={LINE} />

            <Counter y={116} label="Bissap" count="12" />
            <Counter y={164} label="Yaourt" count="8" />
            <Counter y={212} label="Biscuits" count="5" />

            <rect
                x="166"
                y="282"
                width="148"
                height="38"
                rx="10"
                fill={GREEN}
            />
            <text
                x="240"
                y="306"
                fontSize="13"
                fontWeight="700"
                textAnchor="middle"
                fill={INK}
            >
                Valider la saisie
            </text>

            <g transform="translate(0 -44)">
                <rect
                    x="296"
                    y="52"
                    width="164"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <circle cx="319" cy="74" r="11" fill={GREEN} />
                <path
                    d="M314 74l3.5 3.5 6.5-7"
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <text
                    x="338"
                    y="79"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Saisie envoyée
                </text>
            </g>

            <g transform="translate(-10 12)">
                <rect
                    x="24"
                    y="226"
                    width="150"
                    height="58"
                    rx="14"
                    fill={INK}
                />
                <text x="40" y="250" fontSize="10" fill="#cbd5e1">
                    Total encaissé
                </text>
                <text
                    x="40"
                    y="271"
                    fontSize="15"
                    fontWeight="700"
                    fill="white"
                >
                    18 500 FCFA
                </text>
            </g>
        </svg>
    );
}

function Pin({
    x,
    y,
    color,
    done,
}: {
    x: number;
    y: number;
    color: string;
    done?: boolean;
}) {
    return (
        <g>
            <path
                d={`M${x} ${y + 28}c-9-11-16-18-16-27a16 16 0 0 1 32 0c0 9-7 16-16 27z`}
                fill={color}
            />
            {done ? (
                <path
                    d={`M${x - 6} ${y}l4 4 8-8`}
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            ) : (
                <circle cx={x} cy={y} r="5.5" fill="white" />
            )}
        </g>
    );
}

export function LiveSitesIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="32" y="20" width="400" height="300" rx="24" fill="white" />
            <text x="58" y="56" fontSize="14" fontWeight="700" fill={INK}>
                Vos sites aujourd’hui
            </text>

            <ellipse cx="350" cy="240" rx="62" ry="36" fill={GREEN_SOFT} />
            <g fill="none" stroke={LINE} strokeWidth="10" strokeLinecap="round">
                <path d="M32 140c120-26 230 34 400-6" />
                <path d="M178 76c22 92-20 160 26 244" />
                <path d="M318 76c-10 70 30 150 6 244" />
            </g>
            <g fill="none" stroke={LINE} strokeWidth="4" strokeLinecap="round">
                <path d="M60 230h120" />
                <path d="M230 200h80" />
                <path d="M90 100l60 0" />
            </g>

            <Pin x={110} y={110} color={GREEN} done />
            <Pin x={236} y={170} color={GREEN} done />
            <Pin x={378} y={110} color={AMBER} />
            <Pin x={120} y={252} color={GREY} />
            <Pin x={256} y={262} color={GREEN} done />

            <g>
                <rect
                    x="300"
                    y="236"
                    width="160"
                    height="104"
                    rx="16"
                    fill={INK}
                />
                <circle cx="322" cy="264" r="6" fill={GREEN} />
                <text
                    x="336"
                    y="268"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Clôture validée
                </text>
                <circle cx="322" cy="290" r="6" fill={AMBER} />
                <text
                    x="336"
                    y="294"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Saisie en cours
                </text>
                <circle cx="322" cy="316" r="6" fill={GREY} />
                <text
                    x="336"
                    y="320"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Pas encore ouvert
                </text>
            </g>
        </svg>
    );
}

export function ReportsIllustration() {
    const bars = [40, 58, 46, 70, 62, 84];

    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <defs>
                <clipPath id="auth-photo-clip">
                    <rect x="20" y="24" width="360" height="236" rx="22" />
                </clipPath>
            </defs>
            <image
                href="/images/hero-bg.png"
                x="20"
                y="24"
                width="360"
                height="236"
                preserveAspectRatio="xMidYMid slice"
                clipPath="url(#auth-photo-clip)"
            />

            <g>
                <rect
                    x="246"
                    y="168"
                    width="214"
                    height="176"
                    rx="18"
                    fill="white"
                />
                <text x="266" y="198" fontSize="13" fontWeight="700" fill={INK}>
                    Rapport hebdo
                </text>
                <text x="266" y="216" fontSize="10" fill={MUTED}>
                    Généré automatiquement
                </text>
                <rect
                    x="398"
                    y="184"
                    width="44"
                    height="22"
                    rx="6"
                    fill={INK}
                />
                <text
                    x="420"
                    y="199"
                    fontSize="10"
                    fontWeight="700"
                    textAnchor="middle"
                    fill="white"
                >
                    PDF
                </text>
                <line x1="266" y1="324" x2="440" y2="324" stroke={LINE} />
                {bars.map((height, index) => (
                    <rect
                        key={index}
                        x={270 + index * 28}
                        y={324 - height}
                        width="16"
                        height={height}
                        rx="4"
                        fill={index === bars.length - 1 ? GREEN_DEEP : GREEN}
                    />
                ))}
            </g>
        </svg>
    );
}

function StatusPill({
    x,
    y,
    label,
    tone,
}: {
    x: number;
    y: number;
    label: string;
    tone: 'done' | 'pending' | 'late';
}) {
    const colors = {
        done: { fill: GREEN_SOFT, text: GREEN_DEEP },
        pending: { fill: '#fef3c7', text: '#b45309' },
        late: { fill: '#fee2e2', text: '#b91c1c' },
    }[tone];

    return (
        <g>
            <rect
                x={x}
                y={y}
                width="78"
                height="22"
                rx="11"
                fill={colors.fill}
            />
            <text
                x={x + 39}
                y={y + 15}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fill={colors.text}
            >
                {label}
            </text>
        </g>
    );
}

export function TodayOverviewIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="40" y="24" width="380" height="290" rx="24" fill="white" />
            <text x="66" y="62" fontSize="15" fontWeight="700" fill={INK}>
                Activité du jour
            </text>
            <text x="66" y="80" fontSize="10" fill={MUTED}>
                Saisies reçues par site
            </text>

            {[
                { y: 100, name: 'Carrefour Dakar', width: 150 },
                { y: 152, name: 'Auchan Mermoz', width: 96 },
                { y: 204, name: 'Casino Almadies', width: 40 },
                { y: 256, name: 'Super U Ouakam', width: 128 },
            ].map((row) => (
                <g key={row.y}>
                    <line
                        x1="66"
                        y1={row.y - 8}
                        x2="394"
                        y2={row.y - 8}
                        stroke={LINE}
                    />
                    <text
                        x="66"
                        y={row.y + 16}
                        fontSize="12"
                        fontWeight="600"
                        fill={INK}
                    >
                        {row.name}
                    </text>
                    <rect
                        x="66"
                        y={row.y + 26}
                        width="170"
                        height="6"
                        rx="3"
                        fill={SURFACE}
                    />
                    <rect
                        x="66"
                        y={row.y + 26}
                        width={row.width}
                        height="6"
                        rx="3"
                        fill={GREEN}
                    />
                </g>
            ))}
            <StatusPill x={316} y={106} label="Clôturé" tone="done" />
            <StatusPill x={316} y={158} label="En cours" tone="pending" />
            <StatusPill x={316} y={210} label="En retard" tone="late" />
            <StatusPill x={316} y={262} label="Clôturé" tone="done" />

            <g>
                <rect
                    x="250"
                    y="0"
                    width="200"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <circle cx="274" cy="22" r="11" fill={AMBER} />
                <text
                    x="274"
                    y="26"
                    fontSize="11"
                    fontWeight="800"
                    textAnchor="middle"
                    fill={INK}
                >
                    3
                </text>
                <text
                    x="294"
                    y="26"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    clôtures à valider
                </text>
            </g>
        </svg>
    );
}

export function CompanySpaceIllustration() {
    const swatches = ['#4fc031', '#2563eb', '#db2777', '#f59e0b', '#0f172a'];

    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="60" y="30" width="340" height="280" rx="24" fill="white" />

            <circle cx="112" cy="94" r="30" fill={GREEN_SOFT} />
            <text
                x="112"
                y="101"
                fontSize="18"
                fontWeight="800"
                textAnchor="middle"
                fill={GREEN_DEEP}
            >
                PS
            </text>
            <text x="160" y="88" fontSize="15" fontWeight="700" fill={INK}>
                Promo Services SARL
            </text>
            <text x="160" y="108" fontSize="10" fill={MUTED}>
                Espace entreprise
            </text>

            <text x="88" y="160" fontSize="11" fontWeight="600" fill={INK}>
                Couleur de vos documents
            </text>
            {swatches.map((color, index) => (
                <circle
                    key={color}
                    cx={104 + index * 40}
                    cy="190"
                    r="14"
                    fill={color}
                />
            ))}
            <circle
                cx="104"
                cy="190"
                r="19"
                fill="none"
                stroke={INK}
                strokeWidth="2"
            />

            <text x="88" y="240" fontSize="11" fontWeight="600" fill={INK}>
                En-tête des rapports
            </text>
            <rect
                x="88"
                y="252"
                width="284"
                height="34"
                rx="8"
                fill={SURFACE}
            />
            <rect x="88" y="252" width="8" height="34" rx="4" fill={GREEN} />
            <rect x="108" y="264" width="90" height="10" rx="5" fill={LINE} />

            <g>
                <rect
                    x="300"
                    y="4"
                    width="160"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <circle cx="323" cy="26" r="11" fill={GREEN} />
                <path
                    d="M318 26l3.5 3.5 6.5-7"
                    fill="none"
                    stroke={INK}
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
                <text
                    x="342"
                    y="31"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Espace créé
                </text>
            </g>
        </svg>
    );
}

function Member({
    y,
    initials,
    name,
    role,
    accent,
}: {
    y: number;
    initials: string;
    name: string;
    role: string;
    accent: string;
}) {
    return (
        <g>
            <circle cx="100" cy={y} r="20" fill={accent} />
            <text
                x="100"
                y={y + 5}
                fontSize="12"
                fontWeight="800"
                textAnchor="middle"
                fill={INK}
            >
                {initials}
            </text>
            <text x="134" y={y + 5} fontSize="13" fontWeight="600" fill={INK}>
                {name}
            </text>
            <rect
                x="270"
                y={y - 12}
                width="104"
                height="24"
                rx="12"
                fill={SURFACE}
            />
            <text
                x="322"
                y={y + 4}
                fontSize="10"
                fontWeight="700"
                textAnchor="middle"
                fill={INK}
            >
                {role}
            </text>
        </g>
    );
}

export function TeamIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="56" y="28" width="344" height="296" rx="24" fill="white" />
            <text x="80" y="66" fontSize="15" fontWeight="700" fill={INK}>
                Votre équipe
            </text>

            <Member
                y={110}
                initials="AD"
                name="Awa Diop"
                role="Gérante"
                accent={GREEN}
            />
            <Member
                y={166}
                initials="MN"
                name="Moussa Ndiaye"
                role="Superviseur"
                accent="#bfdbfe"
            />
            <Member
                y={222}
                initials="FS"
                name="Fatou Sarr"
                role="Hôtesse"
                accent="#fde68a"
            />
            <Member
                y={278}
                initials="IK"
                name="Ibrahima Kane"
                role="Comptable"
                accent="#e9d5ff"
            />

            <g>
                <rect
                    x="320"
                    y="0"
                    width="140"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <path
                    d="M343 22h12M349 16v12"
                    stroke={GREEN}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                />
                <text
                    x="364"
                    y="27"
                    fontSize="12"
                    fontWeight="600"
                    fill="white"
                >
                    Ajouter
                </text>
            </g>
        </svg>
    );
}

function ModuleRow({
    y,
    name,
    note,
    on,
}: {
    y: number;
    name: string;
    note: string;
    on: boolean;
}) {
    return (
        <g>
            <text x="84" y={y} fontSize="13" fontWeight="600" fill={INK}>
                {name}
            </text>
            <text
                x="84"
                y={y + 18}
                fontSize="10"
                fill={on ? GREEN_DEEP : MUTED}
            >
                {note}
            </text>
            <rect
                x="334"
                y={y - 12}
                width="44"
                height="24"
                rx="12"
                fill={on ? GREEN : LINE}
            />
            <circle cx={on ? 366 : 346} cy={y} r="9" fill="white" />
        </g>
    );
}

export function ModulesIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="56" y="28" width="350" height="290" rx="24" fill="white" />
            <text x="84" y="68" fontSize="15" fontWeight="700" fill={INK}>
                Vos modules
            </text>

            <ModuleRow y={110} name="Socle entreprise" note="Gratuit" on />
            <line x1="84" y1="142" x2="378" y2="142" stroke={LINE} />
            <ModuleRow y={172} name="Statistiques de base" note="Gratuit" on />
            <line x1="84" y1="204" x2="378" y2="204" stroke={LINE} />
            <ModuleRow
                y={234}
                name="Suivi terrain"
                note="Essai de 14 jours"
                on
            />
            <line x1="84" y1="266" x2="378" y2="266" stroke={LINE} />
            <ModuleRow
                y={292}
                name="Reporting & documents"
                note="Quand vous voulez"
                on={false}
            />
        </svg>
    );
}

export function SecurityIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <path
                d="M240 30l110 40v86c0 78-48 136-110 164-62-28-110-86-110-164V70z"
                fill="white"
            />
            <path
                d="M240 62l80 29v66c0 58-34 102-80 124-46-22-80-66-80-124V91z"
                fill={GREEN_SOFT}
            />
            <rect x="206" y="160" width="68" height="56" rx="12" fill={INK} />
            <path
                d="M220 160v-14a20 20 0 0 1 40 0v14"
                fill="none"
                stroke={INK}
                strokeWidth="9"
            />
            <circle cx="240" cy="184" r="7" fill={GREEN} />
            <rect x="237" y="186" width="6" height="16" rx="3" fill={GREEN} />

            <g>
                <rect
                    x="16"
                    y="94"
                    width="148"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <circle cx="39" cy="116" r="10" fill={GREEN} />
                <text
                    x="56"
                    y="121"
                    fontSize="11"
                    fontWeight="600"
                    fill="white"
                >
                    Données isolées
                </text>
            </g>
            <g>
                <rect
                    x="320"
                    y="224"
                    width="148"
                    height="44"
                    rx="22"
                    fill={INK}
                />
                <circle cx="343" cy="246" r="10" fill={GREEN} />
                <text
                    x="360"
                    y="251"
                    fontSize="11"
                    fontWeight="600"
                    fill="white"
                >
                    Accès chiffré
                </text>
            </g>
        </svg>
    );
}

function LogRow({
    y,
    action,
    who,
    time,
}: {
    y: number;
    action: string;
    who: string;
    time: string;
}) {
    return (
        <g>
            <circle cx="88" cy={y} r="5" fill={GREEN} />
            <text x="104" y={y + 4} fontSize="12" fontWeight="600" fill={INK}>
                {action}
            </text>
            <text x="104" y={y + 22} fontSize="10" fill={MUTED}>
                {who}
            </text>
            <text
                x="384"
                y={y + 4}
                fontSize="11"
                fontWeight="600"
                textAnchor="end"
                fill={MUTED}
            >
                {time}
            </text>
        </g>
    );
}

export function AuditLogIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="56" y="28" width="356" height="296" rx="24" fill="white" />
            <text x="80" y="68" fontSize="15" fontWeight="700" fill={INK}>
                Journal d’audit
            </text>
            <line
                x1="88"
                y1="104"
                x2="88"
                y2="290"
                stroke={LINE}
                strokeWidth="2"
            />
            <LogRow y={104} action="Connexion" who="Awa Diop" time="08:12" />
            <LogRow
                y={156}
                action="Export du rapport"
                who="Ibrahima Kane"
                time="09:40"
            />
            <LogRow y={208} action="Rôle modifié" who="Awa Diop" time="11:05" />
            <LogRow
                y={260}
                action="Mot de passe changé"
                who="Fatou Sarr"
                time="14:30"
            />
        </svg>
    );
}

export function EmailSentIllustration() {
    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect x="110" y="60" width="260" height="210" rx="18" fill={INK} />
            <rect
                x="140"
                y="30"
                width="200"
                height="190"
                rx="14"
                fill="white"
            />
            <text x="164" y="70" fontSize="13" fontWeight="700" fill={INK}>
                Confirmez votre adresse
            </text>
            <rect x="164" y="88" width="152" height="8" rx="4" fill={LINE} />
            <rect x="164" y="104" width="120" height="8" rx="4" fill={LINE} />
            <rect
                x="164"
                y="132"
                width="152"
                height="36"
                rx="10"
                fill={GREEN}
            />
            <text
                x="240"
                y="155"
                fontSize="12"
                fontWeight="700"
                textAnchor="middle"
                fill={INK}
            >
                Confirmer mon adresse
            </text>
            <path
                d="M110 150l130 86 130-86v102a18 18 0 0 1-18 18H128a18 18 0 0 1-18-18z"
                fill="#1e293b"
            />
            <path
                d="M110 270l100-74M370 270l-100-74"
                stroke={INK}
                strokeWidth="2"
            />

            <g>
                <circle cx="372" cy="62" r="26" fill={GREEN} />
                <path
                    d="M360 62l8 8 16-17"
                    fill="none"
                    stroke={INK}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                />
            </g>
        </svg>
    );
}

export function TwoFactorIllustration() {
    const digits = ['4', '8', '2', '9', '1', '3'];

    return (
        <svg viewBox="0 0 480 360" className="h-full w-full" aria-hidden="true">
            <rect
                x="150"
                y="16"
                width="180"
                height="328"
                rx="28"
                fill="white"
            />
            <rect x="210" y="28" width="60" height="7" rx="3.5" fill={LINE} />
            <text
                x="240"
                y="92"
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
                fill={MUTED}
            >
                Code Aktivy
            </text>
            {digits.map((digit, index) => (
                <g key={index}>
                    <rect
                        x={170 + index * 24 + (index > 2 ? 8 : 0)}
                        y="108"
                        width="20"
                        height="30"
                        rx="6"
                        fill={SURFACE}
                    />
                    <text
                        x={180 + index * 24 + (index > 2 ? 8 : 0)}
                        y="129"
                        fontSize="15"
                        fontWeight="800"
                        textAnchor="middle"
                        fill={INK}
                    >
                        {digit}
                    </text>
                </g>
            ))}
            <circle
                cx="240"
                cy="210"
                r="34"
                fill="none"
                stroke={SURFACE}
                strokeWidth="8"
            />
            <path
                d="M240 176a34 34 0 1 1-29.4 17"
                fill="none"
                stroke={GREEN}
                strokeWidth="8"
                strokeLinecap="round"
            />
            <text
                x="240"
                y="216"
                fontSize="16"
                fontWeight="800"
                textAnchor="middle"
                fill={INK}
            >
                24 s
            </text>
            <text
                x="240"
                y="282"
                fontSize="10"
                textAnchor="middle"
                fill={MUTED}
            >
                Nouveau code dans 24 s
            </text>
        </svg>
    );
}
