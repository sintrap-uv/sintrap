// ============================================================
// theme.js — TEMA GLOBAL DE LA APLICACIÓN DE TRANSPORTE
// ============================================================
// Este archivo centraliza todos los colores, tipografías y
// estilos visuales de la app. Cualquier cambio de diseño
// debe hacerse aquí para mantener consistencia en toda la app.
//
// MODOS DISPONIBLES:
//   - lightMode: colores para modo claro (día)
//   - darkMode:  colores para modo oscuro (noche)
//
// USO:
//   import theme from '@/styles/theme';
//   color: theme.lightMode.background


const tipografia = {
  fonts: {
    regular: "DMSans_400Regular",
    medium: "DMSans_500Medium",
    bold: "DMSans_700Bold",
  },
  fontSize: {
    // Títulos
    titleLarge: 24,
    title: 22,

    // Inputs
    input: 16,          // inputs de registro
    inputSearch: 14,    // input de búsqueda

    // Tarjetas
    cardHome: 13,       // 3 tarjetas del home
    card: 14,           // tarjetas generales
  },
  fontWeight: {
    regular: "DMSans_400Regular",
    medium: "DMSans_500Medium",
    bold: "DMSans_700Bold",
  },
}

const shadows = {
  card: {
    shadowColor: "#000000",
    shadowOffset: {
      width: 0,   // X
      height: 4,  // Y
    },
    shadowOpacity: 0.1,  // ajusta según Figma
    shadowRadius: 10,    // desenfocar
    elevation: 8,        // propagación → Android
  },
}

const theme = {
    
    //MODO CLARO

    lightMode : {
        //Fondo general de todas las pantallas 
        background: "#F8FAFC",

        //Header (el cuadro verde que sale en la parte superior del Home, Perfil etc) 
        // Usar con <LinearGradient colors={theme.lightMode.headers.gradientColors}>

        Headers: {
            innerColor:"#16A34A",
            outerColor : "#22C55E",
            cx: "50%",
            cy: "50%",
            rx: "50%",
            ry: "50%",
        },

        //Cards 
        //Contenedores de rutas, favoritos y perfil 
        cards: {
            background:"#FFFFFF",
            border: "#E2E8F0",
            borderRadius: 16,
        },
        
        //Botones
        Button:{
            //Boton principal: "Guardar cambios", "Activar alerta"
            primary:{
                background: "#22C55E",
                Text : "#FFFFFF",
                borderRadius: 16,
            },
            //Boton secundario: "cancelar" y acciones secundarias 
            secondary: {
                background: "#FFFFFF",
                border: "#E2E8F0",
                text : "#475569",
                borderRadius: 16,
            },
        },
         //INPUTS (Campos de formulario)
         // Uso: editar perfil, búsqueda de rutas
        input: {
            background: "#FFFFFF",
            border: "#E2E8F0",
            borderRadius: 12,
            text: "#0F172A",
            placeholder:"#94A3B8",
        },

        //Textos 

        text:{
            primary: "#0F172A",  //Titulos, nombres de rutas
            secondary:"#475569", //Descripcion o informacion adicional
            tertiary: "#64748B", //Informacion como tiempos de llegada
            routName:"#16A34A" , //NOmbre de rutas ejemplo (Ruta 12)
        },

        //iconos 
        //Los iconos que use en figma casi todos fueron de Boostrap
         icon: {
            default: "#475569",   // Iconos principales en modo claro
            active: "#22C55E",    // Icono seleccionado en navegación
            alert: "#FACC15",     // Notificaciones / advertencias
            error: "#EF4444",     // Cerrar sesión o errores críticos (como que el bus va lleno)
        },

        //Barra de navegacion Inferior
        BottomNavBar: {
            background: "#FFFFFF",
            borderRadius: 24 ,
            iconoActivo: "#22C55E", // Este va con el texto #0F172A
            iconoInactivo : "#94A3B8" ,//Texto debajo del icono es el mismo color
        },

        // Asterisico para formulario
        asterisk: {color: "#EF4444" }
    },

    //Modo oscuro 
    darkMode : {
        //Fondo general de todas las pantallas 
        background: "#0F172A",

        //Header (el cuadro verde que sale en la parte superior del Home, Perfil etc)
         Headers: {
            gradientColors:["#16A34A", "#16A34A"],
            cx: "50%",
            cy: "50%",
            rx: "50%",
            ry: "50%",
        },

        //Cards 
        //Contenedores de rutas, favoritos y perfil 
        cards: {
            background:"#1E293B",
            border: "#334155",
            borderRadius: 16 ,
        },
        
        //Botones
        Button:{
            //Boton principal: "Guardar cambios", "Activar alerta"
            primary:{
                background: "#22C55E",
                Text : "#FFFFFF",
            },
            //Boton secundario: "cancelar" y acciones secundarias 
            secondary: {
                background: "#1E293B",
                border: "#334155",
                text : "#94A3B8",
            },
        },
         //INPUTS (Campos de formulario) 
         // Uso: editar perfil, búsqueda de rutas
        input: {
            background: "#1E293B",
            border: "#334155",
            text: "#64748B",
            placeholder:"#94A3B8",
        },

        //Textos 

        text:{
            primary: "#22C55E",  //Titulos, nombres de rutas
            secondary:"#475569", //Descripcion o informacion adicional
            tertiary: "#64748B", //Informacion como tiempos de llegada
            routName:"#16A34A" , //NOmbre de rutas ejemplo (Ruta 12)
        },

        //iconos 
        //Los iconos que use en figma casi todos fueron de Boostrap
         icon: {
            default: "#475569",   // Iconos principales en modo claro
            active: "#22C55E",    // Icono seleccionado en navegación
            alert: "#FACC15",     // Notificaciones / advertencias
            error: "#EF4444",     // Cerrar sesión o errores críticos (como que el bus va lleno)
        },

        //Barra de navegacion Inferior
        BottomNavBar: {
            background: "#020617",
            iconoActivo: "#22C55E", // Este va con el texto #22C55E
            iconoInactivo : "#94A3B8" ,//Texto debajo del icono es el mismo color
        },


    }

}
export default theme;
