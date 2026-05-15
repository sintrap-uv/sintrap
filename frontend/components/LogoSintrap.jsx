 /**
 * LogoSintrap.jsx
 * Componente del logo oficial de Sintrap en SVG.
 * Uso: <LogoSintrap size={100} color="#353535" />
 */

import React from "react";
import Svg, { Path, G, Circle } from "react-native-svg";

export default function LogoSintrap({ size = 100, color = "#353535" }) {
  return (
    <Svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
    >
      {/* Marcador de mapa */}
      <Path
        d="M50,5 c-19.3,0 -35,15.7 -35,35 c0,26.2 35,55 35,55 s35,-28.8 35,-55 C85,20.7 69.3,5 50,5 z"
        fill={color}
      />

      {/* Grupo del autobús */}
      <G transform="translate(28, 18) scale(0.35)">
        {/* Cuerpo del bus en blanco */}
        <Path
          fill="#FFFFFF"
          d="M110.8,103.6h-7.6V114c0,3.6-2.9,6.5-6.5,6.5h-9c-3.6,0-6.5-2.9-6.5-6.5v-10.3H41.5V114c0,3.6-2.9,6.5-6.5,6.5 h-9c-3.6,0-6.5-2.9-6.5-6.5v-10.3H12v-82c0-7.6,4.4-13.1,13.3-16.5c17.6-6.9,54.6-6.9,72.3,0c8.9,3.4,13.3,8.9,13.3,16.5V103.6 L110.8,103.6L110.8,103.6z M118.6,40.4h-3.8V62h3.8c2.4,0,4.3-1.9,4.3-4.3V44.7C122.9,42.3,121,40.4,118.6,40.4L118.6,40.4z M4.3,40.4h3.8V62H4.3C1.9,62,0,60.1,0,57.7V44.7C0,42.3,1.9,40.4,4.3,40.4L4.3,40.4z"
        />

        {/* Detalles internos del bus */}
        <G fill={color}>
          {/* Letrero de ruta superior */}
          <Path d="M46.4,8.6h30.1c0.9,0,1.6,0.7,1.6,1.6v5.2 c0,0.9-0.7,1.6-1.6,1.6H46.4c-0.9,0-1.6-0.7-1.6-1.6v-5.2C44.8,9.3,45.5,8.6,46.4,8.6L46.4,8.6z" />
          {/* Ventana principal */}
          <Path d="M22.9,23.2h76.7 c1,0,1.9,0.9,1.9,1.9v42.8c0,1-0.9,1.9-1.9,1.9H22.9c-1,0-1.9-0.9-1.9-1.9V25.1C21,24.1,21.8,23.2,22.9,23.2z" />
          {/* Faro izquierdo */}
          <Circle cx="91.7" cy="84.9" r="6.9" />
          {/* Faro derecho */}
          <Circle cx="31.2" cy="84.9" r="6.9" />
        </G>
      </G>
    </Svg>
  );
}