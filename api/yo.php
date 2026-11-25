<?php
declare(strict_types=1);
require_once __DIR__ . '/auth.php';

/* Estado de la sesión y token CSRF para los formularios.
   Lo llaman todas las páginas al cargar. */

try {
    $cliente = fb_cliente_actual();
    $salida = ['ok' => true, 'csrf' => fb_token_csrf(), 'sesion' => $cliente !== null];
    if ($cliente) {
        $db = fb_db();
        $salida['cliente'] = [
            'nombre'   => $cliente['nombre'],
            'apellido' => $cliente['apellido'],
            'correo'   => $cliente['correo'],
            'rol'      => $cliente['rol'],
            'ofertas'  => fb_consentimiento_vigente($db, (int) $cliente['id'], 'ofertas'),
        ];
    }
    fb_json($salida);
} catch (Throwable $e) {
    $c = fb_config();
    fb_morir(500, 'No pude leer la sesión.' . (!empty($c['depurar']) ? ' ' . $e->getMessage() : ''));
}
