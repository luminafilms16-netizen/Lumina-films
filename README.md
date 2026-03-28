# 🎬 Lumina Films — Sistema de Gestión de Cine

Sistema web completo para la gestión de una sala de cine: películas, funciones, venta de tiquetes con QR y validación de acceso.

---

## 🛠️ Tecnologías

| Capa | Tecnología |
|------|-----------|
| Frontend | HTML5, CSS3 Vanilla, JavaScript Vanilla |
| Backend | Node.js + Express |
| Base de Datos | MySQL 8.0+ |
| Autenticación | JWT (jsonwebtoken) |
| Contraseñas | bcryptjs |
| Correos | Nodemailer + SMTP Gmail |
| QR | qrcode (npm) |

---

## 📁 Estructura del Proyecto

```
lumina-films/
├── backend/
│   ├── config/
│   │   └── db.js                  # Pool de conexión MySQL
│   ├── controllers/
│   │   ├── authController.js      # Registro, login, recuperación
│   │   ├── peliculasController.js # CRUD películas
│   │   ├── funcionesController.js # Funciones (con antitraslape)
│   │   ├── asientosController.js  # Asientos por función
│   │   ├── tiquetesController.js  # Compra + validación + QR
│   │   ├── salasController.js     # Listar salas
│   │   └── dashboardController.js # Stats admin
│   ├── middleware/
│   │   └── auth.js                # JWT middleware + adminOnly
│   ├── routes/
│   │   ├── auth.js
│   │   ├── peliculas.js
│   │   ├── funciones.js
│   │   ├── tiquetes.js
│   │   └── extras.js              # Salas + dashboard
│   ├── services/
│   │   └── emailService.js        # Nodemailer (tickets + recovery)
│   ├── .env.example
│   ├── package.json
│   └── server.js                  # Entry point Express
│
├── frontend/
│   ├── css/
│   │   └── main.css               # Estilos globales Lumina Films
│   ├── js/
│   │   └── api.js                 # Helpers HTTP, Auth, Toast, Navbar
│   ├── pages/
│   │   ├── cartelera.html
│   │   ├── pelicula.html          # Detalle + selección asientos
│   │   ├── login.html
│   │   ├── registro.html
│   │   ├── recuperar.html
│   │   ├── reset-password.html
│   │   ├── mis-tiquetes.html
│   │   └── admin/
│   │       ├── dashboard.html     # Stats, gráficas, top películas
│   │       ├── peliculas.html     # CRUD películas
│   │       ├── funciones.html     # Programar funciones
│   │       └── validar.html       # Escáner QR + validación manual
│   └── index.html                 # Home con hero + cartelera
│
└── database/
    └── script.sql                 # Esquema + datos iniciales
```

---

## ⚙️ Instalación paso a paso

### 1. Clonar / descomprimir el proyecto

```bash
cd lumina-films
```

### 2. Configurar la base de datos

Abre MySQL y ejecuta:

```bash
mysql -u root -p < database/script.sql
```

Esto crea la base de datos `lumina_films`, las tablas, los 150 asientos por sala y un admin por defecto.

**Credenciales del admin:**
- Email: `admin@luminafilms.com`
- Password: `Admin1234!`

### 3. Configurar variables de entorno

```bash
cd backend
cp .env.example .env
```

Edita `.env`:

```env
PORT=3000

# MySQL
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=tu_password
DB_NAME=lumina_films

# JWT
JWT_SECRET=una_clave_secreta_larga_y_segura

# Gmail SMTP (crea una App Password en myaccount.google.com/apppasswords)
SMTP_USER=luminafilms16@gmail.com
SMTP_PASS=woyvlfbdohxuhkno
EMAIL_FROM=Lumina Films <noreply@luminafilms.com>

FRONTEND_URL=http://localhost:3000
```

### 4. Instalar dependencias y ejecutar

```bash
cd backend
npm install
npm start          # producción
# o
npm run dev        # desarrollo con nodemon
```

Abre el navegador en: **http://localhost:3000**

---

## 🔐 API Endpoints

### Autenticación
| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/registro` | Registro de usuario |
| POST | `/api/auth/login` | Login, retorna JWT |
| POST | `/api/auth/recuperar-password` | Envía email de recuperación |
| POST | `/api/auth/reset-password` | Cambia contraseña con token |

### Películas
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/peliculas` | ❌ | Listar todas |
| GET | `/api/peliculas/:id` | ❌ | Obtener una |
| POST | `/api/peliculas` | Admin | Crear |
| PUT | `/api/peliculas/:id` | Admin | Editar |
| DELETE | `/api/peliculas/:id` | Admin | Eliminar |

### Funciones
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/funciones` | ❌ | Listar disponibles |
| GET | `/api/funciones/admin` | Admin | Listar todas |
| POST | `/api/funciones` | Admin | Crear (valida traslape) |
| GET | `/api/funciones/:id/asientos` | ❌ | Estado asientos |

### Tiquetes
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| POST | `/api/tiquetes` | Usuario | Comprar (genera QR) |
| POST | `/api/tiquetes/validar` | ❌ | Validar código |
| GET | `/api/tiquetes/mis-tiquetes` | Usuario | Historial |

### Dashboard
| Método | Ruta | Auth | Descripción |
|--------|------|------|-------------|
| GET | `/api/dashboard` | Admin | Stats completas |
| GET | `/api/salas` | ❌ | Listar salas |

---

## 📊 Modelo de Base de Datos

```
usuarios ──┐
           │
peliculas ─┼──> funciones ──> tiquetes ──> detalle_tiquete
           │         │                            │
salas ─────┘    asientos ◄────────────────────────┘
```

**Regla crítica:** `UNIQUE(tiquete_id, asiento_id)` en `detalle_tiquete` previene la doble venta de asientos.

---

## ✉️ Configurar Gmail para correos

1. Ve a [myaccount.google.com](https://myaccount.google.com)
2. Seguridad → Verificación en 2 pasos → Activa
3. Seguridad → Contraseñas de aplicación
4. Crea una contraseña para "Correo" en "Otro dispositivo"
5. Copia esa contraseña de 16 caracteres en `SMTP_PASS` del `.env`

---

## 🎨 Diseño UI

El sistema usa un estilo **Dark Cinema Luxury**:
- Fondo negro profundo `#080808`
- Acento dorado `#c8a96e`
- Tipografía: **Playfair Display** (serif, títulos) + **DM Sans** (sans, cuerpo)
- Animaciones CSS suaves
- Responsive: móvil, tablet y desktop

---

## 👥 Roles

| Rol | Permisos |
|-----|---------|
| **cliente** | Ver cartelera, comprar tiquetes, ver mis tiquetes |
| **admin** | Todo lo anterior + CRUD películas, crear funciones, dashboard, validar tiquetes |

---

## 📋 Criterios de evaluación cubiertos

| Criterio | Implementado |
|---------|-------------|
| Funcionamiento del sistema | ✅ Completo |
| Estructura y calidad del código | ✅ MVC + capas |
| Diseño de interfaz (UX/UI) | ✅ Minimalista / luxury |
| Implementación de base de datos | ✅ MySQL con relaciones |
| Sistema de correos | ✅ Nodemailer |
| QR Code | ✅ qrcode npm |
| Validación antitraslape | ✅ Backend + transacciones |
| Gestión de asientos | ✅ Grid visual |

---

*SENA CNCA – Nodo TIC ADSO19 · Taller de Desarrollo de Software*
