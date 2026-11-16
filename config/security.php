<?php

return [

    /*
    | Politique de contenu (CSP) en mode « rapport seulement » : rien n'est bloqué, les violations sont
    | seulement journalisées (route csp-rapport). À n'utiliser que le temps d'une vérification.
    */
    'csp_report_only' => (bool) env('CSP_REPORT_ONLY', false),

];
