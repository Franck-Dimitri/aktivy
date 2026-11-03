@props(['muted' => false])
<p style="margin:0 0 16px 0; font-size:{{ $muted ? '13px' : '15px' }}; line-height:{{ $muted ? '20px' : '24px' }}; color:{{ $muted ? '#64748b' : '#344054' }};">{{ $slot }}</p>
