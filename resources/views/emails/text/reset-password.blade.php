Bonjour {!! $user->name !!},

Vous avez demandé à changer le mot de passe de votre compte {!! config('app.name') !!}. Choisissez-en un nouveau ici :

{!! $url !!}

Ce lien est valable {!! $expire !!} minutes. Vous n’êtes pas à l’origine de cette demande ? Ignorez cet e-mail : votre mot de passe actuel reste valable.

—
{!! config('app.name') !!} · Pilotez vos équipes terrain
