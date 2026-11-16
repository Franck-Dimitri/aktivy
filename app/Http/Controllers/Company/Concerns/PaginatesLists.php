<?php

namespace App\Http\Controllers\Company\Concerns;

use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;

/**
 * Outils communs aux listes paginées de l'espace entreprise : les filtres viennent de l'URL
 * (un lien partagé ou un retour arrière rouvre la même vue) et une valeur inconnue est ignorée
 * plutôt que de renvoyer une erreur de validation sur une simple page de consultation.
 */
trait PaginatesLists
{
    /** Texte recherché, nettoyé et borné (une recherche de plusieurs pages n'a pas de sens). */
    protected function searchTerm(Request $request): string
    {
        return mb_substr(trim((string) $request->query('q', '')), 0, 100);
    }

    /**
     * Valeur d'un filtre de l'URL si elle fait partie des choix permis, sinon null (pas de filtre).
     *
     * @param  list<string>  $allowed
     */
    protected function choice(Request $request, string $key, array $allowed): ?string
    {
        $value = $request->query($key);

        return is_string($value) && in_array($value, $allowed, true) ? $value : null;
    }

    /**
     * Page au-delà de la dernière : après une suppression ou un changement de statut, la page
     * courante peut s'être vidée. On renvoie vers la dernière page qui existe, filtres conservés,
     * plutôt que d'afficher un faux « aucun résultat ».
     *
     * @param  LengthAwarePaginator<int, mixed>  $page
     */
    protected function beyondLastPage(LengthAwarePaginator $page): ?RedirectResponse
    {
        if ($page->currentPage() > 1 && $page->currentPage() > $page->lastPage()) {
            return redirect($page->url($page->lastPage()));
        }

        return null;
    }
}
