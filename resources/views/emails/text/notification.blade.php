{!! $title !!}

@if ($name)
Bonjour {!! $name !!},

@endif
{!! $intro !!}
@if ($items)

@foreach ($items as $item)
• {!! $item !!}
@endforeach
@endif
@if ($quote)

« {!! $quote !!} »
@endif

{!! $action !!} : {!! $url !!}

—
{!! config('app.name') !!} · Pilotez vos équipes terrain
{!! $reason !!}
