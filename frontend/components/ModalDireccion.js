import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from "react-native";
import Input from "./Input"
import theme from "../constants/theme";
import { useState } from "react";
import * as Location from 'expo-location';
import { obtenerCordenadas, ubicacionUsuario } from "../services/geocalizacion";

const CajaDireccion = ({ id, onGuardado }) => {

    const [mostrarFormulario, setMostrarFormulario] = useState(false);
    const [tipoVia, setTipoVia] = useState('Calle');
    const [numeroVia, setNumeroVia] = useState('');
    const [numeroPlaca, setNumeroPlaca] = useState('');
    const [complemento, setComplemento] = useState('');
    const [barrio, setBarrio] = useState('');
    const [ciudad, setCiudad] = useState('');
    const [codigoPostal, setCodigoPostal] = useState('');
    const [buscando, setBuscando] = useState(false);

    const ObtenerUbicacion = async () => {
        const { status } = await Location.requestForegroundPermissionsAsync();

        if (status !== 'granted') {
            return;
        }
        // Obtener coordenadas
        const ubicacion = await Location.getCurrentPositionAsync({});
        console.log(ubicacion.coords.latitude, ubicacion.coords.longitude);


        const latidud = ubicacion.coords.latitude;
        const longitud = ubicacion.coords.longitude;

        let direccionTextoPlano = await Location.reverseGeocodeAsync({
            latitude: latidud,
            longitude: longitud,
        })

        const direccion = direccionTextoPlano[0]?.formattedAddress ?? "";
        console.log(direccion)

        await ubicacionUsuario(id, direccion, latidud, longitud)
        onGuardado();
    }

    // Función para formatear la dirección y verla en vivo
    const formatearDireccionPreview = () => {
        const partes = [];

        // Tipo de vía + número de vía
        if (tipoVia && numeroVia) {
            partes.push(`${tipoVia} ${numeroVia}`);
        } else if (tipoVia) {
            partes.push(tipoVia);
        } else if (numeroVia) {
            partes.push(numeroVia);
        }

        // Número de placa y complemento (formato #20-45)
        if (numeroPlaca) {
            const placaCompleta = complemento ? `#${numeroPlaca}-${complemento}` : `#${numeroPlaca}`;
            partes.push(placaCompleta);
        } else if (complemento) {
            partes.push(complemento);
        }

        // Barrio
        if (barrio) partes.push(barrio);

        // Ciudad
        if (ciudad) partes.push(ciudad);

        // Código postal
        if (codigoPostal) partes.push(codigoPostal);

        return partes.length > 0 ? partes.join(', ') : '';
    };

    // Función para resetear el formulario
    const resetFormulario = () => {
        setTipoVia('Calle');
        setNumeroVia('');
        setNumeroPlaca('');
        setComplemento('');
        setBarrio('');
        setCiudad('');
        setCodigoPostal('');
    };

    const handleGuardadoFormulario = async () => {
        setBuscando(true);

        // Construir dirección completa
        const direccionCompleta = formatearDireccionPreview();

        if (!direccionCompleta || direccionCompleta.length < 5) {
            alert("Por favor completa los campos obligatorios");
            setBuscando(false);
            return;
        }

        // Buscar coordenadas en OpenStreetMap
        const coordenadas = await obtenerCordenadas(direccionCompleta);

        if (!coordenadas) {
            alert("No pudimos encontrar esa dirección. Verifica los datos.");
            setBuscando(false);
            return;
        }

        // Guardar en Supabase
        await ubicacionUsuario(
            id,
            direccionCompleta,
            coordenadas.longitud,
            coordenadas.latitud,
            

        );

        setBuscando(false);

        setMensajeExito('¡Regsitro exitoso! \n \n Tu direccion ha sido guardada correctamente.')
        setMostrarMensaje(true);

        setTimeout(() => {
            setMostrarMensaje(false)
            onGuardado();
        }, 2000);

    };

    return (

        <View style={styles.overlay}>
            <View style={styles.tarjeta}>
                <ScrollView showsVerticalScrollIndicator={true}
                    contentContainerStyle={styles.scrollContent}
                >

                    {!mostrarFormulario && (
                        <>
                            <Text style={styles.titulo}>¡Hola! Antes de continuar...</Text>
                            <Text style={styles.subtitulo}>
                                Necesitamos la direccion de tu hogar para asignarte la ruta de transporte más cercana
                                a tu hogar. Solo tomará un momento.
                            </Text>
                            <View style={styles.separator} />

                            <Text style={styles.subtitulo}>
                                Si estás en casa, presiona el botón para obtener tu ubicación actual.
                            </Text>

                            <TouchableOpacity style={styles.btnUbicacion} onPress={ObtenerUbicacion}>
                                <Text style={styles.btnUbicacionTexto}>Obtener ubicacion actual</Text>
                            </TouchableOpacity>

                            <TouchableOpacity onPress={() => setMostrarFormulario(true)}>
                                <Text style={styles.oManual}>o escríbela manualmente</Text>
                            </TouchableOpacity>
                        </>

                    )}


                    {mostrarFormulario && (
                        <>
                            <Text style={styles.tituloManual}>Ingresa tu dirección</Text>

                            {/* Selector de tipo de vía */}
                            <View style={styles.tipoViaContainer}>
                                <Text style={styles.label}>Tipo de vía *</Text>
                                <View style={styles.botonesGrupo}>
                                    {['Calle', 'Carrera', 'Transversal', 'Diagonal', 'Avenida', 'Circular'].map((tipo) => (
                                        <TouchableOpacity
                                            key={tipo}
                                            style={[
                                                styles.tipoViaBoton,
                                                tipoVia === tipo && styles.tipoViaBotonActivo
                                            ]}
                                            onPress={() => setTipoVia(tipo)}
                                        >
                                            <Text style={[
                                                styles.tipoViaTexto,
                                                tipoVia === tipo && styles.tipoViaTextoActivo
                                            ]}>
                                                {tipo}
                                            </Text>
                                        </TouchableOpacity>
                                    ))}
                                </View>
                            </View>

                            {/* Número de la vía */}
                            <Text style={styles.label}>Número de la vía *</Text>
                            <Input
                                value={numeroVia}
                                onChangeText={setNumeroVia}
                                placeholder="Ej: 10, 15B, 1A"
                            />

                            {/* Número de placa y complemento en dos columnas */}
                            <View style={styles.rowContainer}>
                                <View style={styles.halfContainer}>
                                    <Text style={styles.label}>Número de vivienda *</Text>
                                    <Input
                                        value={numeroPlaca}
                                        onChangeText={setNumeroPlaca}
                                        placeholder="Ej: 20-46"
                                        keyboardType="numeric"
                                    />
                                </View>
                                <View style={styles.halfContainer}>
                                    <Text style={styles.label}>Complemento</Text>
                                    <Input
                                        value={complemento}
                                        onChangeText={setComplemento}
                                        placeholder="Ej: 54, Apto 101"
                                    />
                                </View>
                            </View>

                            {/* Barrio */}
                            <Text style={styles.label}>Barrio o urbanización *</Text>
                            <Input
                                value={barrio}
                                onChangeText={setBarrio}
                                placeholder="Ej: El Prado, Centro"
                            />

                            {/* Ciudad y código postal en dos columnas */}
                            <View style={styles.rowContainer}>
                                <View style={styles.halfContainer}>
                                    <Text style={styles.label}>Ciudad *</Text>
                                    <Input
                                        value={ciudad}
                                        onChangeText={setCiudad}
                                        placeholder="Tuluá"
                                    />
                                </View>
                                <View style={styles.halfContainer}>
                                    <Text style={styles.label}>Código postal</Text>
                                    <Input
                                        value={codigoPostal}
                                        onChangeText={setCodigoPostal}
                                        placeholder="760001"
                                        keyboardType="numeric"
                                    />
                                </View>
                            </View>



                            {/* Vista previa de la dirección */}
                            {(tipoVia || numeroVia || numeroPlaca) && (
                                <View style={styles.vistaPrevia}>
                                    <Text style={styles.vistaPreviaTitulo}> Vista previa:</Text>
                                    <Text style={styles.vistaPreviaTexto}>
                                        {formatearDireccionPreview()}
                                    </Text>
                                </View>
                            )}

                            {/* Botones de acción */}
                            <TouchableOpacity style={styles.btnGuardar} onPress={handleGuardadoFormulario}>
                                <Text style={styles.btnGuardarTexto}>Guardar dirección</Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                                style={styles.btnVolver}
                                onPress={() => {
                                    setMostrarFormulario(false);
                                    resetFormulario();
                                }}
                            >
                                <Text style={styles.btnVolverTexto}>← Volver</Text>
                            </TouchableOpacity>
                        </>
                    )}
                </ScrollView>
            </View>
        </View>


    )

}
const T = theme.lightMode;
const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: T.background,
        padding: 24,
        justifyContent: 'center',

    },
    titulo: {
        fontSize: 22,
        fontWeight: 'bold',
        color: T.text.primary,
        marginBottom: 30,
    },
    subtitulo: {
        fontSize: 14,
        color: T.text.secondary,
        lineHeight: 22,
        marginBottom: 22,
    },
    btnUbicacion: {
        backgroundColor: T.Button.primary.background,
        padding: 14,
        borderRadius: T.cards.borderRadius,
        alignItems: 'center',
        marginBottom: 16,
    },
    btnUbicacionTexto: {
        color: T.Button.primary.Text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    oManual: {
        color: T.text.routName,  // verde como un link
        textDecorationLine: 'underline',
        textAlign: 'center',
        marginBottom: 16,
    },
    label: {
        color: T.text.secondary,
        fontSize: 14,
        marginBottom: 4,
        marginTop: 12,
    },
    btnGuardarTexto: {
        color: T.Button.primary.Text,
        fontWeight: 'bold',
        fontSize: 15,
    },
    // El fondo oscuro detrás
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.6)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    // La tarjeta blanca
    tarjeta: {
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        padding: 24,
        width: '100%',
        maxWidth: 400,
        shadowColor: "#000",
        maxHeight: '90%',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.25,
        shadowRadius: 25,
        elevation: 10,
    },
    separator: {
        height: 1,
        backgroundColor: '#E5E7EB',
        marginVertical: 20,
    },

    tipoViaContainer: {
        marginBottom: 8,
    },
    botonesGrupo: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        marginTop: 8,
        marginBottom: 8,
    },
    tipoViaBoton: {
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 20,
        backgroundColor: '#F3F4F6',
        borderWidth: 1,
        borderColor: '#E5E7EB',
    },
    tipoViaBotonActivo: {
        backgroundColor: T.Button.primary.background,
        borderColor: T.Button.primary.background,
    },
    tipoViaTexto: {
        fontSize: 14,
        color: '#4B5563',
        fontWeight: '500',
    },
    tipoViaTextoActivo: {
        color: '#FFFFFF',
    },
    rowContainer: {
        flexDirection: 'row',
        gap: 12,
        marginBottom: 8,
    },
    halfContainer: {
        flex: 1,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: T.text.primary,
        marginBottom: 6,
        marginTop: 12,
    },
    vistaPrevia: {
        backgroundColor: '#F0FDF4',
        padding: 14,
        borderRadius: 12,
        marginVertical: 16,
        borderWidth: 1,
        borderColor: '#DCFCE7',
    },
    vistaPreviaTitulo: {
        fontSize: 12,
        fontWeight: '600',
        color: '#166534',
        marginBottom: 6,
        textTransform: 'uppercase',
    },
    vistaPreviaTexto: {
        fontSize: 14,
        color: '#14532D',
        fontWeight: '500',
    },
    btnGuardar: {
        backgroundColor: T.Button.primary.background,
        padding: 16,
        borderRadius: 16,
        alignItems: 'center',
        marginTop: 8,
        marginBottom: 12,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
    },
    btnGuardarTexto: {
        color: T.Button.primary.Text,
        fontWeight: 'bold',
        fontSize: 16,
    },
    btnVolver: {
        padding: 12,
        alignItems: 'center',
        marginTop: 4,
    },
    btnVolverTexto: {
        color: T.text.secondary,
        fontSize: 14,
        fontWeight: '500',
    },
    tituloManual: {
        fontSize: 20,
        fontWeight: 'bold',
        color: T.text.primary,
        marginBottom: 16,
        textAlign: 'center',
    },
    scrollContent: {
        paddingBottom: 20,  // Espacio al final del scroll
    },
    

})
export default CajaDireccion