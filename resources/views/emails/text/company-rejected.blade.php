Bonjour{!! $name ? ' '.$name : '' !!},

Nous avons examiné la demande d’inscription de {!! $company->name !!}. Nous ne pouvons pas la valider en l’état, pour la raison suivante :

{!! $reason !!}

Corrigez votre dossier puis renvoyez-le depuis votre espace :
{!! $url !!}

—
{!! config('app.name') !!} · Pilotez vos équipes terrain
Vous recevez cet e-mail suite à la demande d’inscription de {!! $company->name !!}.
