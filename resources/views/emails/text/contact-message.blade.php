Nouveau message depuis la page Contact

Sujet : {!! $data['subject'] !!}
Nom : {!! $data['name'] !!}
E-mail : {!! $data['email'] !!}
Téléphone : {!! $data['phone'] ?? '-' !!}
Entreprise : {!! $data['company'] ?? '-' !!}

Message :
{!! $data['message'] !!}
@if (! empty($url))

Ouvrir dans l’administration : {!! $url !!}
@endif

—
Répondez directement à cet e-mail : la réponse partira à son auteur.
