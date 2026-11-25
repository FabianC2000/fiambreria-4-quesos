-- ============================================================
-- Carga inicial del catálogo, migrada desde assets/js/productos.js
-- Generado el 2026-11-25.
-- ============================================================
USE fiambreria_4quesos;
SET NAMES utf8mb4;
START TRANSACTION;

-- Datos del comercio
INSERT INTO empresa (clave, valor, descripcion) VALUES
  ('nombre', 'Fiambrería 4 Quesos', 'Nombre comercial'),
  ('whatsapp', '5493884380100', 'Número internacional, sin + ni espacios'),
  ('telefono', '388 438-0100', 'Teléfono para mostrar'),
  ('correo', 'hola@4quesos.com.ar', 'Casilla de contacto'),
  ('instagram', 'https://www.instagram.com/fiambreria4queso/', 'Link, vacío oculta el ícono'),
  ('facebook', 'https://www.facebook.com/profile.php?id=100063546760294&locale=es_LA', 'Link, vacío oculta el ícono'),
  ('whatsapp_boton', 'verde', 'blanco | verde | ninguno');

-- Categorías
INSERT INTO categorias (id, nombre, detalle, img, orden, en_portada) VALUES
  ('fiambres', 'Fiambres', 'Jamones, salames y mortadelas', 'fiambres.webp', 1, 1),
  ('quesos', 'Quesos', 'De máquina, de rallar y especiales', 'quesos.webp', 2, 0),
  ('picadas', 'Picadas', 'Armadas para compartir', 'picadas.webp', 3, 0),
  ('lacteos', 'Lácteos', 'Leche, cremas y manteca', 'lacteos.webp', 4, 1),
  ('almacen', 'Almacén', 'Aceites, conservas y aderezos', 'almacen.webp', 5, 0),
  ('panificados', 'Panificados', 'Pan, pebetes y tostadas', 'panificados.webp', 6, 0),
  ('bebidas', 'Bebidas', 'Gaseosas, vinos y cervezas', 'bebidas.webp', 7, 1),
  ('congelados', 'Congelados', 'Rebozados, papas y empanadas', 'congelados.webp', 8, 0),
  ('desayuno', 'Desayuno', 'Café, yerba, té y galletitas', 'desayuno.webp', 9, 1),
  ('aceitunas', 'Aceitunas', 'Verdes, negras y encurtidos', 'aceitunas.webp', 10, 1),
  ('helados', 'Helados', 'Potes, palitos y bombones', 'helados.webp', 11, 1),
  ('reposteria', 'Repostería', 'Harinas, coberturas y decoración', 'reposteria.webp', 12, 1),
  ('golosinas', 'Golosinas', 'Chocolates, caramelos y alfajores', 'golosinas.webp', 13, 1),
  ('limpieza', 'Limpieza', 'Lavandina, detergentes y multiuso', 'limpieza.webp', 14, 1);

-- Subcategorías
INSERT INTO subcategorias (categoria_id, id, nombre, orden) VALUES
  ('fiambres', 'jamones', 'Jamones', 1),
  ('fiambres', 'embutidos', 'Salames y embutidos', 2),
  ('fiambres', 'ahumados', 'Ahumados', 3),
  ('quesos', 'de-maquina', 'De máquina', 1),
  ('quesos', 'duros', 'Duros y de rallar', 2),
  ('quesos', 'para-cocinar', 'Para cocinar', 3),
  ('picadas', 'armadas', 'Picadas armadas', 1),
  ('picadas', 'tablas', 'Tablas', 2),
  ('lacteos', 'leches', 'Leches', 1),
  ('lacteos', 'cremas', 'Cremas y mantecas', 2),
  ('almacen', 'aderezos', 'Aderezos', 1),
  ('almacen', 'aceites', 'Aceites', 2),
  ('almacen', 'conservas', 'Conservas', 3),
  ('panificados', 'pan', 'Panes', 1),
  ('panificados', 'sandwich', 'Pebetes y sándwich', 2),
  ('bebidas', 'vinos', 'Vinos', 1),
  ('bebidas', 'cervezas', 'Cervezas', 2),
  ('bebidas', 'sin-alcohol', 'Sin alcohol', 3),
  ('congelados', 'para-freir', 'Para freír', 1),
  ('congelados', 'empanadas', 'Empanadas', 2);

-- Productos
INSERT INTO productos (id, nombre, marca, categoria_id, sub_id, tipo, img, destacado, etiqueta, antes, semana, orden) VALUES
  ('p01', 'Jamón cocido natural', 'Paladini', 'fiambres', 'jamones', 'fiambre', NULL, 1, 'Más vendido', NULL, 0, 1),
  ('p02', 'Jamón crudo estacionado', 'Cagnoli', 'fiambres', 'jamones', 'fiambre', NULL, 1, NULL, NULL, 0, 2),
  ('p03', 'Salame tipo Milán', 'La Pampa', 'fiambres', 'embutidos', 'fiambre', NULL, 1, 'Oferta', NULL, 0, 3),
  ('p04', 'Mortadela con pistachos', 'Vitali', 'fiambres', 'embutidos', 'fiambre', NULL, 0, NULL, NULL, 0, 4),
  ('p05', 'Bondiola ahumada', 'Paladini', 'fiambres', 'ahumados', 'fiambre', NULL, 1, NULL, NULL, 0, 5),
  ('p06', 'Lomito ahumado', 'Cagnoli', 'fiambres', 'ahumados', 'fiambre', NULL, 0, NULL, NULL, 0, 6),
  ('p07', 'Queso de máquina Danbo', 'La Serenísima', 'quesos', 'de-maquina', 'fiambre', NULL, 1, 'Oferta', NULL, 0, 7),
  ('p08', 'Queso cremoso', 'Verónica', 'quesos', 'de-maquina', 'fiambre', NULL, 0, NULL, NULL, 0, 8),
  ('p09', 'Queso Pategrás', 'Ilolay', 'quesos', 'duros', 'fiambre', NULL, 0, NULL, NULL, 0, 9),
  ('p10', 'Queso Sardo para rallar', 'Santa Rosa', 'quesos', 'duros', 'fiambre', NULL, 1, NULL, NULL, 0, 10),
  ('p11', 'Provoleta para parrilla', 'Tregar', 'quesos', 'para-cocinar', 'unidad', NULL, 0, 'Nuevo', NULL, 0, 11),
  ('p12', 'Picada clásica para 2', '4 Quesos', 'picadas', 'armadas', 'unidad', NULL, 1, 'Más vendido', NULL, 0, 12),
  ('p13', 'Picada premium para 4', '4 Quesos', 'picadas', 'armadas', 'unidad', NULL, 1, NULL, NULL, 0, 13),
  ('p14', 'Tabla de quesos y frutos secos', '4 Quesos', 'picadas', 'tablas', 'unidad', NULL, 0, 'Nuevo', NULL, 0, 14),
  ('p15', 'Leche entera 1 L', 'La Serenísima', 'lacteos', 'leches', 'unidad', NULL, 0, NULL, NULL, 0, 15),
  ('p16', 'Crema Chantilly 1 kg + manga 500 g', 'Ledevit', 'lacteos', 'cremas', 'unidad', NULL, 1, 'Oferta', 6800, 1, 16),
  ('p17', 'Manteca 200 g', 'Ilolay', 'lacteos', 'cremas', 'unidad', NULL, 0, NULL, NULL, 0, 17),
  ('p18', 'Mayonesa clásica cremosa 500 g', 'Sabormax', 'almacen', 'aderezos', 'unidad', NULL, 1, 'Oferta', 2859, 0, 18),
  ('p19', 'Aceite de oliva 500 ml', 'Nucete', 'almacen', 'aceites', 'unidad', NULL, 0, NULL, NULL, 0, 19),
  ('p20', 'Aceitunas verdes 360 g', 'Nucete', 'almacen', 'conservas', 'unidad', NULL, 0, NULL, NULL, 0, 20),
  ('p21', 'Pebetes x 6', 'Panadería del barrio', 'panificados', 'sandwich', 'unidad', NULL, 1, NULL, NULL, 0, 21),
  ('p22', 'Pan de campo 500 g', 'Panadería del barrio', 'panificados', 'pan', 'unidad', NULL, 0, NULL, NULL, 0, 22),
  ('p23', 'Vino Malbec 750 ml', 'Finca Jujuy', 'bebidas', 'vinos', 'unidad', NULL, 1, NULL, NULL, 0, 23),
  ('p24', 'Gaseosa línea 2,25 L', 'Coca-Cola', 'bebidas', 'sin-alcohol', 'unidad', NULL, 0, NULL, NULL, 0, 24),
  ('p25', 'Cerveza artesanal 500 ml', 'Volcán', 'bebidas', 'cervezas', 'unidad', NULL, 0, 'Nuevo', NULL, 0, 25),
  ('p26', 'Empanadas congeladas x 12', 'La Casera', 'congelados', 'empanadas', 'unidad', NULL, 1, NULL, NULL, 0, 26),
  ('p27', 'Papas bastón 1 kg', 'McCain', 'congelados', 'para-freir', 'unidad', NULL, 0, NULL, NULL, 0, 27),
  ('p28', 'Milanesas de pollo x 6', 'Granja Norte', 'congelados', 'para-freir', 'unidad', NULL, 0, NULL, NULL, 0, 28);

-- Precios
INSERT INTO precios (producto_id, unidad, valor) VALUES
  ('p01', 'g100', 1290),
  ('p01', 'media', 8900),
  ('p01', 'kg', 16900),
  ('p02', 'g100', 3450),
  ('p02', 'media', 24500),
  ('p02', 'kg', 47900),
  ('p03', 'g100', 1690),
  ('p03', 'media', 11200),
  ('p03', 'kg', 21500),
  ('p04', 'g100', 1150),
  ('p04', 'media', 7600),
  ('p04', 'kg', 14500),
  ('p05', 'g100', 2390),
  ('p05', 'media', 16400),
  ('p05', 'kg', 31500),
  ('p06', 'g100', 2190),
  ('p06', 'media', 14900),
  ('p06', 'kg', 28900),
  ('p07', 'g100', 1490),
  ('p07', 'media', 9900),
  ('p07', 'kg', 18900),
  ('p08', 'g100', 1390),
  ('p08', 'media', 9200),
  ('p08', 'kg', 17600),
  ('p09', 'g100', 1790),
  ('p09', 'media', 11900),
  ('p09', 'kg', 22900),
  ('p10', 'g100', 2290),
  ('p10', 'media', 15600),
  ('p10', 'kg', 29900),
  ('p11', 'u1', 3890),
  ('p11', 'u2', 7200),
  ('p11', 'u6', 20400),
  ('p12', 'u1', 12900),
  ('p12', 'u2', 24500),
  ('p12', 'u6', 69900),
  ('p13', 'u1', 24900),
  ('p13', 'u2', 47900),
  ('p13', 'u6', 136900),
  ('p14', 'u1', 18900),
  ('p14', 'u2', 36500),
  ('p14', 'u6', 104900),
  ('p15', 'u1', 1450),
  ('p15', 'u2', 2750),
  ('p15', 'u6', 7900),
  ('p16', 'u1', 4990),
  ('p16', 'u2', 9500),
  ('p16', 'u6', 27900),
  ('p17', 'u1', 2290),
  ('p17', 'u2', 4400),
  ('p17', 'u6', 12600),
  ('p18', 'u1', 1999),
  ('p18', 'u2', 3800),
  ('p18', 'u6', 10900),
  ('p19', 'u1', 6900),
  ('p19', 'u2', 13200),
  ('p19', 'u6', 37900),
  ('p20', 'u1', 2490),
  ('p20', 'u2', 4700),
  ('p20', 'u6', 13400),
  ('p21', 'u1', 2200),
  ('p21', 'u2', 4200),
  ('p21', 'u6', 11900),
  ('p22', 'u1', 2900),
  ('p22', 'u2', 5500),
  ('p22', 'u6', 15900),
  ('p23', 'u1', 7900),
  ('p23', 'u2', 15000),
  ('p23', 'u6', 42900),
  ('p24', 'u1', 3290),
  ('p24', 'u2', 6300),
  ('p24', 'u6', 17900),
  ('p25', 'u1', 3490),
  ('p25', 'u2', 6600),
  ('p25', 'u6', 18900),
  ('p26', 'u1', 9900),
  ('p26', 'u2', 19000),
  ('p26', 'u6', 54900),
  ('p27', 'u1', 4790),
  ('p27', 'u2', 9100),
  ('p27', 'u6', 25900),
  ('p28', 'u1', 8900),
  ('p28', 'u2', 17000),
  ('p28', 'u6', 48900);

-- Sucursales
INSERT INTO sucursales (id, nombre, direccion, tel, img, horario, orden) VALUES
  (1, 'Fiambreria 4 Quesos - Monterrico', 'Santa Fe 111 esquina Jujuy, Monterrico', '388 438-0100', '01-sucursal-1-frente.webp', 'Lun a vier 8:30 a 13:00 y 17:00 a 21:30 · Sáb 8:30 a 13:00 y 16:30 a 20:30 · Dom 9:00 a 12:15', 1),
  (2, 'Fiambreria 4 Quesos - Perico', 'San José 1327, Perico', '388 310-2497', '02-sucursal-2-frente.webp', 'Lun a Sáb 8:30 a 13:00 y 17:00 a 21:30 · Dom 9:00 a 12:00', 2);

-- Horarios, un turno por fila
INSERT INTO horarios (sucursal_id, dia, desde, hasta) VALUES
  (1, 'lun', '08:30:00', '13:00:00'),
  (1, 'lun', '17:00:00', '21:30:00'),
  (1, 'mar', '08:30:00', '13:00:00'),
  (1, 'mar', '17:00:00', '21:30:00'),
  (1, 'mie', '08:30:00', '13:00:00'),
  (1, 'mie', '17:00:00', '21:30:00'),
  (1, 'jue', '08:30:00', '13:00:00'),
  (1, 'jue', '17:00:00', '21:30:00'),
  (1, 'vie', '08:30:00', '13:00:00'),
  (1, 'vie', '17:00:00', '21:30:00'),
  (1, 'sab', '08:30:00', '13:00:00'),
  (1, 'sab', '16:30:00', '20:30:00'),
  (1, 'dom', '09:00:00', '12:15:00'),
  (2, 'lun', '08:30:00', '13:00:00'),
  (2, 'lun', '17:00:00', '21:30:00'),
  (2, 'mar', '08:30:00', '13:00:00'),
  (2, 'mar', '17:00:00', '21:30:00'),
  (2, 'mie', '08:30:00', '13:00:00'),
  (2, 'mie', '17:00:00', '21:30:00'),
  (2, 'jue', '08:30:00', '13:00:00'),
  (2, 'jue', '17:00:00', '21:30:00'),
  (2, 'vie', '08:30:00', '13:00:00'),
  (2, 'vie', '17:00:00', '21:30:00'),
  (2, 'sab', '08:30:00', '13:00:00'),
  (2, 'sab', '17:00:00', '21:30:00'),
  (2, 'dom', '09:00:00', '12:00:00');

COMMIT;

-- Control rápido de la carga:
SELECT 'categorias' t, COUNT(*) n FROM categorias
UNION ALL SELECT 'subcategorias', COUNT(*) FROM subcategorias
UNION ALL SELECT 'productos', COUNT(*) FROM productos
UNION ALL SELECT 'precios', COUNT(*) FROM precios
UNION ALL SELECT 'sucursales', COUNT(*) FROM sucursales
UNION ALL SELECT 'horarios', COUNT(*) FROM horarios;
