-- ============================================================
-- LUMINA FILMS - Script de Base de Datos
-- Motor: MySQL 8.0+
-- ============================================================

CREATE DATABASE IF NOT EXISTS lumina_films
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE lumina_films;

-- ------------------------------------------------------------
-- TABLA: usuarios
-- ------------------------------------------------------------
CREATE TABLE usuarios (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(100)        NOT NULL,
  email         VARCHAR(150)        NOT NULL UNIQUE,
  password      VARCHAR(255)        NOT NULL,
  rol           ENUM('admin','cliente') NOT NULL DEFAULT 'cliente',
  reset_token   VARCHAR(255)        NULL,
  reset_expires DATETIME            NULL,
  fecha_creacion DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: peliculas
-- ------------------------------------------------------------
CREATE TABLE peliculas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  titulo        VARCHAR(200)        NOT NULL,
  descripcion   TEXT                NOT NULL,
  duracion      INT                 NOT NULL COMMENT 'En minutos',
  genero        VARCHAR(80)         NOT NULL,
  clasificacion VARCHAR(10)         NOT NULL COMMENT 'Ej: G, PG, PG-13, R, +18',
  imagen_url    VARCHAR(500)        NULL,
  trailer_url   VARCHAR(500)        NULL,
  estado        ENUM('activa','inactiva') NOT NULL DEFAULT 'activa',
  fecha_creacion DATETIME           NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: salas
-- ------------------------------------------------------------
CREATE TABLE salas (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  nombre        VARCHAR(80)         NOT NULL,
  capacidad     INT                 NOT NULL DEFAULT 150
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: asientos  (estructura fija por sala)
-- ------------------------------------------------------------
CREATE TABLE asientos (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  sala_id       INT                 NOT NULL,
  fila          CHAR(1)             NOT NULL COMMENT 'A–O',
  columna       TINYINT             NOT NULL COMMENT '1–10',
  numero        SMALLINT            NOT NULL COMMENT '1–150',
  estado        ENUM('activo','inactivo') NOT NULL DEFAULT 'activo',
  CONSTRAINT fk_asiento_sala FOREIGN KEY (sala_id) REFERENCES salas(id),
  CONSTRAINT uq_asiento UNIQUE (sala_id, fila, columna)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: funciones
-- ------------------------------------------------------------
CREATE TABLE funciones (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  pelicula_id   INT                 NOT NULL,
  sala_id       INT                 NOT NULL,
  fecha         DATE                NOT NULL,
  hora          TIME                NOT NULL,
  precio        DECIMAL(10,2)       NOT NULL,
  estado        ENUM('disponible','cancelada') NOT NULL DEFAULT 'disponible',
  CONSTRAINT fk_funcion_pelicula FOREIGN KEY (pelicula_id) REFERENCES peliculas(id),
  CONSTRAINT fk_funcion_sala     FOREIGN KEY (sala_id)     REFERENCES salas(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: tiquetes
-- ------------------------------------------------------------
CREATE TABLE tiquetes (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  codigo        VARCHAR(30)         NOT NULL UNIQUE,
  usuario_id    INT                 NULL,
  funcion_id    INT                 NOT NULL,
  fecha_compra  DATETIME            NOT NULL DEFAULT CURRENT_TIMESTAMP,
  total         DECIMAL(10,2)       NOT NULL,
  estado        ENUM('activo','usado','cancelado') NOT NULL DEFAULT 'activo',
  CONSTRAINT fk_tiquete_usuario  FOREIGN KEY (usuario_id)  REFERENCES usuarios(id),
  CONSTRAINT fk_tiquete_funcion  FOREIGN KEY (funcion_id)  REFERENCES funciones(id)
) ENGINE=InnoDB;

-- ------------------------------------------------------------
-- TABLA: detalle_tiquete
-- ------------------------------------------------------------
CREATE TABLE detalle_tiquete (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  tiquete_id    INT                 NOT NULL,
  asiento_id    INT                 NOT NULL,
  precio_unitario DECIMAL(10,2)     NOT NULL,
  CONSTRAINT fk_detalle_tiquete  FOREIGN KEY (tiquete_id) REFERENCES tiquetes(id),
  CONSTRAINT fk_detalle_asiento  FOREIGN KEY (asiento_id) REFERENCES asientos(id),
  CONSTRAINT uq_asiento_funcion  UNIQUE (tiquete_id, asiento_id)
) ENGINE=InnoDB;

-- ============================================================
-- DATOS INICIALES
-- ============================================================

-- Salas
INSERT INTO salas (nombre, capacidad) VALUES
  ('Sala 1 – IMAX',  150),
  ('Sala 2 – Premium', 150);

-- Asientos sala 1 (filas A–O, columnas 1–10 = 150 asientos)
INSERT INTO asientos (sala_id, fila, columna, numero)
SELECT 1, fila, columna,
       (ASCII(fila) - ASCII('A')) * 10 + columna AS numero
FROM (
  SELECT f.fila, c.columna
  FROM (
    SELECT 'A' AS fila UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D'
    UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H'
    UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L'
    UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O'
  ) f
  CROSS JOIN (
    SELECT 1 AS columna UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
    UNION SELECT 9 UNION SELECT 10
  ) c
  ORDER BY f.fila, c.columna
) seats;

-- Asientos sala 2
INSERT INTO asientos (sala_id, fila, columna, numero)
SELECT 2, fila, columna,
       (ASCII(fila) - ASCII('A')) * 10 + columna AS numero
FROM (
  SELECT f.fila, c.columna
  FROM (
    SELECT 'A' AS fila UNION SELECT 'B' UNION SELECT 'C' UNION SELECT 'D'
    UNION SELECT 'E' UNION SELECT 'F' UNION SELECT 'G' UNION SELECT 'H'
    UNION SELECT 'I' UNION SELECT 'J' UNION SELECT 'K' UNION SELECT 'L'
    UNION SELECT 'M' UNION SELECT 'N' UNION SELECT 'O'
  ) f
  CROSS JOIN (
    SELECT 1 AS columna UNION SELECT 2 UNION SELECT 3 UNION SELECT 4
    UNION SELECT 5 UNION SELECT 6 UNION SELECT 7 UNION SELECT 8
    UNION SELECT 9 UNION SELECT 10
  ) c
  ORDER BY f.fila, c.columna
) seats;

-- Admin por defecto  (password: Admin1234!)
INSERT INTO usuarios (nombre, email, password, rol) VALUES
  ('Administrador', 'admin@luminafilms.com',
   '$2b$10$AUdBRGFMi388UFE7tug.ueynPttMoqCZ34xZH9jE6nbjssCAEMfaa', 'admin');

-- Películas de ejemplo (14 títulos con imágenes verificadas)
INSERT INTO peliculas (titulo, descripcion, duracion, genero, clasificacion, imagen_url, trailer_url, estado) VALUES
  ('Interstellar',
   'Un equipo de exploradores viaja a través de un agujero de gusano en busca de un nuevo hogar para la humanidad. Una épica aventura sobre amor, tiempo y supervivencia.',
   169,'Ciencia Ficción','PG-13',
   'https://image.tmdb.org/t/p/w500/gEU2QniE6E77NI6lCU6MxlNBvIx.jpg',
   'https://www.youtube.com/watch?v=zSWdZVtXT7E','activa'),

  ('El Padrino',
   'La historia de la poderosa familia Corleone y su ascenso al poder en el submundo criminal de Nueva York. Una obra maestra del cine estadounidense.',
   175,'Drama','R',
   'https://image.tmdb.org/t/p/w500/rPdtLWNsZmAtoZl9ueVjasiyu12.jpg',
   'https://www.youtube.com/watch?v=sY1S34973zA','activa'),

  ('Dune: Parte Dos',
   'Paul Atreides se une a los Fremen y comienza un viaje espiritual para convertirse en Muad''Dib, mientras intenta vengar la destrucción de su familia.',
   166,'Ciencia Ficción','PG-13',
   'https://image.tmdb.org/t/p/w500/1pdfLvkbY9ohJlCjQH2CZjjYVvJ.jpg',
   'https://www.youtube.com/watch?v=Way9Dexny3w','activa'),

  ('Oppenheimer',
   'La historia del físico J. Robert Oppenheimer y su papel en el desarrollo de la bomba atómica durante la Segunda Guerra Mundial.',
   180,'Drama Histórico','R',
   'https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg',
   'https://www.youtube.com/watch?v=uYPbbksJxIg','activa'),

  ('El Señor de los Anillos: El Retorno del Rey',
   'Frodo y Sam se acercan al Monte del Destino mientras Aragorn lidera las fuerzas del bien en la batalla final por la Tierra Media.',
   201,'Fantasía','PG-13',
   'https://image.tmdb.org/t/p/w500/rCzpDGLbOoPwLjy3OAm5NUPOTrC.jpg',
   'https://www.youtube.com/watch?v=r5X-hFf6Bwo','activa'),

  ('Gladiator II',
   'Lucius, sobrino de Commodus, es capturado por el poderoso ejército romano. Para sobrevivir en el Coliseo deberá recordar su pasado y luchar por su futuro.',
   148,'Acción','R',
   'https://image.tmdb.org/t/p/w500/2cxhvwyE0RAN098ykFsxa8r4WKg.jpg',
   'https://www.youtube.com/watch?v=luXA7rp_7ZE','activa'),

  ('Avatar: El Camino del Agua',
   'Jake Sully y Neytiri forman una familia en Pandora. Cuando una amenaza antigua los obliga a abandonar su hogar, emprenden un peligroso viaje al mundo del agua.',
   192,'Ciencia Ficción','PG-13',
   'https://image.tmdb.org/t/p/w500/t6HIqrRAclMCA60NsSmeqe9RmNV.jpg',
   'https://www.youtube.com/watch?v=d9MyW72ELq0','activa'),

  ('Joker: Folie à Deux',
   'Arthur Fleck, confinado en la institución de Arkham, descubre el amor mientras enfrenta la disyuntiva entre su identidad real y el alter ego que él mismo creó.',
   138,'Thriller Psicológico','R',
   'https://image.tmdb.org/t/p/w500/oVKlgLTMFm6wRPbhb0MRCU4ACGD.jpg',
   'https://www.youtube.com/watch?v=_OBGmJKd7xg','activa'),

  ('Alien: Romulus',
   'Un grupo de colonos jóvenes en el espacio profundo se enfrenta a la forma de vida más aterradora del universo mientras saquean una estación espacial abandonada.',
   119,'Terror','R',
   'https://image.tmdb.org/t/p/w500/b33nnKl1GSFbao4l3fZDDqsMx0F.jpg',
   'https://www.youtube.com/watch?v=H0VW6sg50Pk','activa'),

  ('Wicked',
   'La improbable amistad entre dos mujeres en el País de Oz: la popular Glinda y la incomprendida Elphaba, destinadas a convertirse en brujas rivales.',
   160,'Musical','PG',
   'https://image.tmdb.org/t/p/w500/c5ShHp2cSxDmOIYPh7kV4EPQVYG.jpg',
   'https://www.youtube.com/watch?v=6COmYeLsz4c','activa'),

  ('Deadpool & Wolverine',
   'Deadpool recluta a Wolverine para una misión que pondrá en jaque la existencia del Universo Marvel. La unión más inesperada del cine de superhéroes.',
   128,'Acción/Comedia','R',
   'https://image.tmdb.org/t/p/w500/8cdWjvZQUExUUTzyp4SjiKTSeTj.jpg',
   'https://www.youtube.com/watch?v=73_1biulkYk','activa'),

  ('Twisters',
   'Kate Cooper, excelente cazadora de tornados, regresa al campo cuando una nueva temporada de tormentas devastadoras amenaza el centro de los Estados Unidos.',
   122,'Acción/Aventura','PG-13',
   'https://image.tmdb.org/t/p/w500/pjnD08FlMAIXsfOLKQbOrjYKPSC.jpg',
   'https://www.youtube.com/watch?v=3mBo_q1LfH8','activa'),

  ('Misión Imposible: Sentencia Mortal',
   'Ethan Hunt y su equipo se enfrentan a una entidad oscura que amenaza a toda la humanidad. Una persecución global sin precedentes.',
   163,'Acción/Espionaje','PG-13',
   'https://image.tmdb.org/t/p/w500/NNxYkU70HPurnNCSiCjYAmacwm.jpg',
   'https://www.youtube.com/watch?v=avz06PDqDbM','activa'),

  ('Pobres Criaturas',
   'Bella Baxter, una joven revivida por un excéntrico científico, escapa con un abogado libertino para vivir aventuras que transformarán su visión del mundo.',
   141,'Drama/Fantasía','R',
   'https://image.tmdb.org/t/p/w500/kCGlIMHnOm8JPXEaM7oGl5KhGe.jpg',
   'https://www.youtube.com/watch?v=RlbR5N6veqw','activa');

-- Funciones de ejemplo
INSERT INTO funciones (pelicula_id, sala_id, fecha, hora, precio, estado) VALUES
  (1, 1, CURDATE(), '14:00:00', 18000, 'disponible'),
  (1, 2, CURDATE(), '17:30:00', 22000, 'disponible'),
  (2, 1, CURDATE(), '20:00:00', 18000, 'disponible'),
  (3, 2, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '15:00:00', 20000, 'disponible'),
  (4, 1, DATE_ADD(CURDATE(), INTERVAL 1 DAY), '18:00:00', 18000, 'disponible'),
  (5, 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '16:00:00', 22000, 'disponible'),
  (6, 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), '19:30:00', 18000, 'disponible'),
  (7, 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '14:30:00', 20000, 'disponible'),
  (8, 1, DATE_ADD(CURDATE(), INTERVAL 3 DAY), '21:00:00', 18000, 'disponible');
