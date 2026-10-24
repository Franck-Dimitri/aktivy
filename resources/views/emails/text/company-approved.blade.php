Bonjour{!! $name ? ' '.$name : '' !!},

Nous avons vérifié le dossier de {!! $company->name !!} : votre inscription sur {!! config('app.name') !!} est validée.
Toutes les fonctionnalités de votre espace sont maintenant débloquées.

Accéder à mon espace : {!! $url !!}

Vous pouvez dès à présent ajouter vos sites, votre personnel et planifier vos premières affectations.

—
L'équipe {!! config('app.name') !!}
Vous recevez cet email car vous gérez l'entreprise {!! $company->name !!} sur {!! config('app.name') !!}.
