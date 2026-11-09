/** Traduit la règle du serveur (« minlength: 8; required: upper; required: lower; required: digit ») en une phrase courte. */
export function passwordHint(rules: string): string {
    const min = /minlength:\s*(\d+)/.exec(rules)?.[1] ?? '8';
    const needs = [
        /required:\s*upper/.test(rules) && 'une majuscule',
        /required:\s*lower/.test(rules) && 'une minuscule',
        /required:\s*digit/.test(rules) && 'un chiffre',
        /required:\s*special/.test(rules) && 'un symbole',
    ].filter(Boolean) as string[];

    if (needs.length === 0) return `${min} caractères minimum.`;
    const list = needs.length > 1 ? `${needs.slice(0, -1).join(', ')} et ${needs[needs.length - 1]}` : needs[0];
    return `${min} caractères minimum, avec ${list}.`;
}
