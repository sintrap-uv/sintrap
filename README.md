# Sintrap — Sistema de Transporte  /  Transport System

> **React Native · Expo 55 · Supabase**

---

## Tabla de Contenido / Table of Contents

- [Descripción General / Overview](#descripción-general--overview)
- [Stack Tecnológico / Tech Stack](#stack-tecnológico--tech-stack)
- [Arquitectura de Carpetas / Folder Architecture](#arquitectura-de-carpetas--folder-architecture)
- [Guía por Área de Trabajo / Work Area Guide](#guía-por-área-de-trabajo--work-area-guide)
- [Base de Datos / Database](#base-de-datos--database)
- [Variables de Entorno / Environment Variables](#variables-de-entorno--environment-variables)
- [Instalación / Installation](#instalación--installation)
- [Reglas del Equipo / Team Rules](#reglas-del-equipo--team-rules)

---

## Descripción General / Overview

**ES:** Sintrap es una aplicación móvil de transporte privado (escalable a público) que permite a conductores y usuarios interactuar en tiempo real.

**EN:** Sintrap is a private transport mobile app (scalable to public) enabling real-time interaction between drivers and passengers.

---

## Stack Tecnológico / Tech Stack

| Capa / Layer | Tecnología / Technology |
|---|---|
| Mobile Framework | React Native + Expo 55 |
| Navigation | Expo Router (file-based) |
| Backend & Auth | Supabase (PostgreSQL + PostGIS) |
| Storage | Supabase Storage (`avatars` bucket) |
| Icons | `@expo/vector-icons` → [icons.expo.fyi](https://icons.expo.fyi/Index) |
| Language | JavaScript (no TypeScript) |

---

## Arquitectura de Carpetas / Folder Architecture

```
sintrap/
├── backend/                        BACKEND ONLY — No tocar / Do not touch
│   ├── index.js
│   ├── package.json
│   └── package-lock.json
│
└── frontend/                       FRONTEND TEAM — Todo el trabajo aquí / All work here
    ├── app/                        NAVEGACIÓN / NAVIGATION (Expo Router)
    │   ├── _layout.jsx             Root layout — sesión, auth, redirección por rol
    │   │                           Root layout — session, auth, role-based redirect
    │   ├── home.js                 Pantalla principal — carga perfil, renderiza tabs
    │   │                           Main screen — loads profile, renders tabs
    │   ├── login.js                Pantalla de login / Login screen
    │   └── (conductor)/            Grupo de rutas del conductor / Conductor route group
    │       ├── editar-perfil.jsx   Ruta: pantalla de edición de perfil del conductor
    │       │                       Route: conductor profile edit screen
    │       ├── profiles.jsx        Ruta: vista de perfiles / Route: profiles view
    │       └── LocationScreen.jsx  Ruta: pantalla de ubicación en tiempo real
    │                               Route: real-time location screen
    │
    ├── src/
    │   ├── components/             COMPONENTES REUTILIZABLES / REUSABLE COMPONENTS
    │   │   ├── forms/
    │   │   │   └── EditarPerfilForm.jsx   Formulario edición de perfil del conductor
    │   │   │                              Conductor profile edit form
    │   │   ├── BottomNavBar.js       No modificar sin coordinación / Do not modify alone
    │   │   ├── Button.js           Botón reutilizable / Reusable button
    │   │   └── Input.js            Input reutilizable / Reusable input field
    │   │
    │   ├── constants/
    │   │   └── theme.js            Tokens de diseño / Design tokens
    │   │                           Consumir como / Use as:
    │   │                           import theme from "../../constants/theme"
    │   │                           const T = theme.lightMode;
    │   │
    │   ├── hooks/
    │   │   └── useAuth.js          Hook de autenticación / Auth hook
    │   │
    │   └── models/
    │       └── conductor.model.js  Modelo JS + validación + GENERO_OPCIONES
    │                               JS model + validation + GENERO_OPCIONES
    │
    ├── services/                   SERVICIOS / SERVICES
    │   │                           (funciones exportadas, no clases / exported functions, not classes)
    │   ├── api.js                  Cliente base de API / Base API client
    │   ├── auth.js                   Supabase Auth — login, logout, onAuthStateChange
    │   ├── profileService.js         getProfile, updateProfile — tabla profiles
    │   ├── supabase.js             Cliente Supabase inicializado / Initialized Supabase client
    │   └── uploadService.js        Storage: subirAvatar, eliminarAvatar, getAvatarUrl
    │
    ├── App.js                      Entry point de Expo / Expo entry point
    ├── app.json                    Configuración de Expo / Expo config
    ├── .env                        Variables de entorno — NO subir a GitHub / Do NOT commit
    ├── package.json
    └── package-lock.json
```

---

## Guía por Área de Trabajo / Work Area Guide

### Nuevas Pantallas / New Screens

**ES:** Si vas a crear una nueva pantalla, créala dentro de `app/`. Si pertenece al flujo del conductor, colócala dentro de `app/(conductor)/`. El nombre del archivo se convierte automáticamente en la ruta gracias a Expo Router.

**EN:** To create a new screen, place it inside `app/`. If it belongs to the conductor flow, place it inside `app/(conductor)/`. The filename becomes the route automatically thanks to Expo Router.

```
app/nueva-pantalla.jsx        →  ruta: /nueva-pantalla
app/(conductor)/mapa.jsx      →  ruta: /conductor/mapa
```

---

### Componentes / Components

**ES:** Los componentes reutilizables van en `src/components/`. Si es un formulario, colócalo en `src/components/forms/`. Si el componente ya fue desarrollado por alguien, coordina antes de modificarlo.

**EN:** Reusable components go in `src/components/`. If it's a form, place it in `src/components/forms/`. If a component was already developed by someone, coordinate before modifying it.

---

### Tema / Theme

**ES:** El archivo `src/constants/theme.js` contiene los tokens de diseño del proyecto. Para usarlos en tus componentes:

**EN:** The `src/constants/theme.js` file contains the project's design tokens. To use them in your components:

```javascript
import theme from "../../constants/theme";
const T = theme.lightMode;

const styles = StyleSheet.create({
  button: {
    backgroundColor: T.Button.primary.background,
  },
  input: {
    borderColor: T.input.border,
  },
  text: {
    color: T.text.primary,
  },
});
```

---

### Servicios / Services

**ES:** Los servicios son archivos de funciones exportadas (no clases). Si necesitas agregar uno nuevo, sigue el patrón existente. No modifiques `auth.js` ni `profileService.js` sin coordinar.

**EN:** Services are files of exported functions (not classes). If you need to add a new one, follow the existing pattern. Do not modify `auth.js` or `profileService.js` without coordinating.

```javascript
//  Correcto / Correct
export async function miNuevoServicio(param) {
  const { data, error } = await supabase.from("tabla").select("*");
  if (error) throw error;
  return data;
}

//  Incorrecto / Incorrect
export class MiServicio { ... }
```

---

### Modelos / Models

**ES:** Los modelos son objetos JS planos con funciones de validación. Colócalos en `src/models/`. Ver `conductor.model.js` como referencia.

**EN:** Models are plain JS objects with validation functions. Place them in `src/models/`. See `conductor.model.js` as reference.

---

## Base de Datos / Database

**ES:** La base de datos está en Supabase y es **gestionada exclusivamente por el backend**. El equipo de frontend solo consume los servicios disponibles en `services/` o crea uno nuevo si lo necesita.

**EN:** The database is on Supabase and is **managed exclusively by the backend**. The frontend team only consumes the services available in `services/` or creates a new one if needed.

### Tablas principales / Main tables

| Tabla / Table | Descripción / Description |
|---|---|
| `profiles` | Extiende Supabase Auth. Campos: `id`, `nombre`, `cedula`, `celular`, `edad`, `genero`, `avatar_url`, `rol_tipo` |
| `ubicacion_conductor` | Ubicación en tiempo real del conductor (PostGIS) / Real-time conductor location |
| `paradas` | Paradas fijas de la ruta (geometría PostGIS) / Fixed route stops |

### ENUMs

```
rol_tipo    →  conductor | usuario | administrador
genero_tipo →  (ver GENERO_OPCIONES en conductor.model.js)
```

---

## Variables de Entorno / Environment Variables

**ES:** Crea un archivo `.env` en la raíz de `frontend/` con las siguientes variables. **Nunca subas este archivo a GitHub.**

**EN:** Create a `.env` file at the root of `frontend/` with the following variables. **Never commit this file to GitHub.**

```env
EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=tu-anon-key
NGROK_URL="URL de ngrok — debe incluir http / must include http"
```

> Las credenciales de Supabase las provee el encargado del backend. La URL de Ngrok se obtiene en [ngrok.com](https://ngrok.com/).  
> Supabase credentials are provided by the backend owner. The Ngrok URL is obtained at [ngrok.com](https://ngrok.com/).

---

## Instalación / Installation

>  **Todos los comandos deben ejecutarse dentro de la carpeta `frontend/`.**  
> **All commands must be run inside the `frontend/` folder.**

---

### Requisitos Previos / Prerequisites

| Requisito / Requirement | Notas / Notes |
|---|---|
| **Node.js LTS** | Versión LTS recomendada → [nodejs.org](https://nodejs.org) |
| **npm** | Viene incluido con Node / Comes with Node |
| **yarn** o **pnpm** | Opcional / Optional |
| **Xcode** *(solo macOS / macOS only)* | Para el simulador iOS / For the iOS simulator |

---

### Pasos / Steps

```bash
# 1. Clonar el repositorio / Clone the repository
git clone https://github.com/tu-org/sintrap.git
cd sintrap/frontend

# 2. Instalar dependencias / Install dependencies
npm install

# 3. Crear el archivo de variables de entorno / Create the env file
# (ver sección Variables de Entorno / see Environment Variables section)

# 4. Iniciar la app / Start the app
npx expo start
```

---

### Expo Go — Probar en dispositivo físico / Test on physical device

**ES:** Permite correr la app directamente en tu celular sin necesidad de compilar.

**EN:** Allows running the app directly on your phone without compiling.

1. Descarga **Expo Go** en tu celular:
   - [Android — Google Play](https://play.google.com/store/apps/details?id=host.exp.exponent)
   - [iOS — App Store](https://apps.apple.com/app/expo-go/id982107779)
2. Ejecuta `npx expo start` en la terminal dentro de `frontend/`.
3. Escanea el **código QR** que aparece en la terminal desde la app Expo Go.
4. La app correrá directamente en tu dispositivo.

---

### Ngrok

**ES:** Ngrok expone el servidor backend local a internet para que tu dispositivo físico pueda conectarse durante el desarrollo.

**EN:** Ngrok exposes the local backend server to the internet so physical devices can connect during development.

1. Crea una cuenta en [ngrok.com](https://ngrok.com/) y obtén tu URL.
2. Agrega la URL al archivo `.env` de `frontend/`:

```env
NGROK_URL="http://xxxx.ngrok-free.app"
```

>  La URL de Ngrok **debe incluir `http`**. / The Ngrok URL **must include `http`**.

---

### Docker

>  **Pendiente** — En organización para la integración con Supabase.  
> **Pending** — Being organized for Supabase integration.

---

### Dependencias del Proyecto / Project Dependencies

```
expo-router
expo-font
expo-splash-screen
expo-constants
expo-linking
react-native-safe-area-context
react-native-screens
react-native-gesture-handler
react-native-reanimated
```

---

## Reglas del Equipo / Team Rules

|  | ES | EN |
|---|---|---|
| 🔴 | No tocar `backend/` | Do not touch `backend/` |
| 🔴 | No modificar `auth.js` ni `profileService.js` sin coordinar | Do not modify `auth.js` or `profileService.js` without coordinating |
| 🟡 | Coordinar antes de modificar `BottomNavBar.js` o `theme.js` | Coordinate before modifying `BottomNavBar.js` or `theme.js` |
| 🟢 | Nuevas pantallas → `app/` o `app/(conductor)/` | New screens → `app/` or `app/(conductor)/` |
| 🟢 | Nuevos componentes → `src/components/` | New components → `src/components/` |
| 🟢 | Nuevos servicios → `services/` (funciones exportadas) | New services → `services/` (exported functions) |
| 🟢 | Sin TypeScript — usar JavaScript | No TypeScript — use JavaScript |
| 🔒 | Nunca subir `.env` a GitHub | Never commit `.env` to GitHub |

---

*Sintrap · React Native + Expo 55 + Supabase*
