Bonjour {!! $name !!},

{!! $body !!}

--- Votre message (demande n° {!! $number !!}) ---
{!! \Illuminate\Support\Str::limit($original, 800) !!}

Pour poursuivre l'échange, répondez simplement à cet e-mail.

—
{!! config('app.name') !!} · Support
