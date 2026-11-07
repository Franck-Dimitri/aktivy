/** Traduit la règle du serveur (« minlength: 12; required: upper; … ») en une phrase courte. */
export function passwordHint(rules: string): string {
    const min = /minlength:\s*(\d+)/.exec(rules)?.[1] ?? '8';
    const strict = /required:\s*(upper|digit|special)/.test(rules);
    return strict ? `${min} caractères minimum, avec majuscule, chiffre et symbole.` : `${min} caractères minimum.`;
}
