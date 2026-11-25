<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

fb_exigir_post();
fb_exigir_csrf(fb_entrada());
fb_cerrar_sesion();
fb_json(['ok' => true]);
