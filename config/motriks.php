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
    | international sans « + » (ex. 237690000000). Par défaut, le numéro de
    | contact de la plateforme (le même que sur le site, resources/js/lib/contact.ts).
    |
    */

    'support' => [
        'email' => env('SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS')),
        // « ?: » : une ligne SUPPORT_WHATSAPP= laissée vide dans .env garde le numéro par défaut
        'whatsapp' => env('SUPPORT_WHATSAPP') ?: '237657439465',
    ],

    /*
    |--------------------------------------------------------------------------
    | Facturation
    |--------------------------------------------------------------------------
    |
    | Mentions de Motriks sur les factures d'abonnement. Le NIU et le RCCM
    | s'affichent seulement s'ils sont renseignés.
    |
    */

    'billing' => [
        'name' => env('BILLING_NAME', 'Motriks'),
        'address' => env('BILLING_ADDRESS'),
        'city' => env('BILLING_CITY', 'Yaoundé, Cameroun'),
        'phone' => env('BILLING_PHONE') ?: '+237 657 43 94 65',
        'email' => env('BILLING_EMAIL', env('SUPPORT_EMAIL', env('MAIL_FROM_ADDRESS'))),
        'niu' => env('BILLING_NIU'),
        'rccm' => env('BILLING_RCCM'),
        // Moyens de paiement affichés sur les factures (seuls ceux renseignés apparaissent)
        'orange_money' => env('BILLING_ORANGE_MONEY'),
        'mtn_momo' => env('BILLING_MTN_MOMO'),
        'bank' => env('BILLING_BANK'),
        'card' => env('BILLING_CARD'),
        // Conditions et mentions de bas de facture (ex. « TVA non applicable »), si besoin
        'terms' => env('BILLING_TERMS'),
    ],

];
