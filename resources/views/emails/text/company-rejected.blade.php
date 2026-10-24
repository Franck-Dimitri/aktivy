Bonjour{!! $name ? ' '.$name : '' !!},

Nous avons examiné la demande d'inscription de {!! $company->name !!} et ne pouvons pas la valider en l'état, pour la raison suivante :

{!! $reason !!}

Vous pouvez corriger votre dossier et le soumettre à nouveau depuis votre espace :
{!! $url !!}

—
L'équipe {!! config('app.name') !!}
Vous recevez cet email car vous avez demandé l'inscription de {!! $company->name !!} sur {!! config('app.name') !!}.
