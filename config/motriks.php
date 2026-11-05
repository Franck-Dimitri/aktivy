<?php

return [

    /*
    |--------------------------------------------------------------------------
    | Default Phone Country Code
    |--------------------------------------------------------------------------
    |
    | Phone numbers typed without an international prefix (e.g. "676383986")
    | are stored with this country calling code, without the leading "+".
    |
    */

    'phone_country_code' => env('PHONE_COUNTRY_CODE', '237'),

    /*
    |--------------------------------------------------------------------------
    | Support
    |--------------------------------------------------------------------------
    |
    | Adresse qui reçoit les demandes envoyées depuis le centre d'aide (par
    | défaut l'adresse d'expédition), et numéro WhatsApp du support au format
    | international sans « + » (ex. 237690000000). Sans numéro, le bouton
    | WhatsApp n'est pas affiché.
    |
    */

    'support' => [
        'email' => env('SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),
        'whatsapp' => env('SUPPORT_WHATSAPP'),
    ],

];
