Bonjour {!! $user->name !!},

Merci d’avoir créé votre compte{!! $user->company ? ' pour '.$user->company->name : '' !!}.
Confirmez que {!! $user->email !!} est bien votre adresse pour accéder à votre espace :

{!! $url !!}

Ce lien est valable {!! $expire !!} minutes. Vous n’avez rien demandé ? Ignorez cet e-mail : aucun compte ne sera activé.

—
{!! config('app.name') !!} · Pilotez vos équipes terrain
