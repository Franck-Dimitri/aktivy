Bonjour {!! $user->name !!},

Merci d'avoir rejoint {!! config('app.name') !!}@if ($user->company) avec {!! $user->company->name !!}@endif.
Pour sécuriser votre compte et accéder à votre espace, confirmez que l'adresse {!! $user->email !!} vous appartient bien :

{!! $url !!}

Ce lien est valable {!! $expire !!} minutes.

Si vous n'êtes pas à l'origine de cette inscription, ignorez simplement cet email : aucun compte ne sera activé.

—
L'équipe {!! config('app.name') !!}
