Demande de support : {!! $topic !!}

{!! $body !!}

@foreach ($details as $label => $value)
{!! $label !!} : {!! str_starts_with((string) $value, '/') ? url($value) : $value !!}
@endforeach
@if (! empty($url))

Ouvrir dans l’administration : {!! $url !!}
@endif

—
Répondez directement à cet e-mail : la réponse partira à son auteur.
