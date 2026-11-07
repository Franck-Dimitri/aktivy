Bonjour{!! $name ? ' '.$name : '' !!},

L'équipe {!! config('app.name') !!} a créé l'espace de {!! $company->name !!}, dont vous êtes le gérant. Il ne vous reste qu'à choisir votre mot de passe pour y accéder.

Ensuite : ajoutez vos points de vente et vos produits, invitez votre équipe, puis affectez vos hôtesses. Vous profitez de 14 jours d'essai avec toutes les fonctionnalités.

Choisir mon mot de passe : {!! $url !!}

Ce lien est valable {!! $days !!} jours et ne sert qu'une fois.

—
{!! config('app.name') !!} · Pilotez vos équipes terrain
Vous recevez cet e-mail parce que vous avez été inscrit comme gérant de {!! $company->name !!}. Si ce n'est pas le cas, ignorez-le.
